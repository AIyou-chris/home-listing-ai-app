const { supabaseAdmin: supabase } = require('./supabase');
const FormData = require('form-data');
const fetch = require('node-fetch');

const VOICE_API_URL = process.env.VOICE_API_URL || 'http://localhost:8000';

/**
 * Submit a new voice clone request
 */
async function submitVoiceClone(agentId, audioFile, voiceName = null) {
    try {
        // 1. Upload audio to Supabase Storage
        const fileName = `voice-samples/${agentId}/${Date.now()}.wav`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('agent-assets')
            .upload(fileName, audioFile, {
                contentType: 'audio/wav',
                upsert: false
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('agent-assets')
            .getPublicUrl(fileName);

        // 2. Create voice clone record
        const { data: voiceClone, error: dbError } = await supabase
            .from('voice_clones')
            .insert({
                agent_id: agentId,
                audio_url: publicUrl,
                voice_name: voiceName || `${agentId.substring(0, 8)}-voice`,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }

        console.log(`✅ Voice clone submitted for agent ${agentId}`);
        return voiceClone;

    } catch (error) {
        console.error('Error submitting voice clone:', error);
        throw error;
    }
}

/**
 * Get all pending voice clone requests (for admin)
 */
async function getPendingVoiceClones() {
    const { data, error } = await supabase
        .from('voice_clones')
        .select(`
            *,
            agent:agents(id, name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch pending clones: ${error.message}`);
    }

    return data;
}

/**
 * Approve a voice clone and trigger processing
 */
async function approveVoiceClone(voiceCloneId, adminId, adminNotes = null) {
    try {
        // 1. Update status to approved
        const { data: voiceClone, error: updateError } = await supabase
            .from('voice_clones')
            .update({
                status: 'approved',
                approved_by: adminId,
                approved_at: new Date().toISOString(),
                admin_notes: adminNotes
            })
            .eq('id', voiceCloneId)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to approve: ${updateError.message}`);
        }

        // 2. Trigger processing (async)
        processVoiceClone(voiceCloneId).catch(err => {
            console.error(`Background processing failed for ${voiceCloneId}:`, err);
        });

        return voiceClone;

    } catch (error) {
        console.error('Error approving voice clone:', error);
        throw error;
    }
}

/**
 * Process the voice clone (call Python TTS API)
 */
async function processVoiceClone(voiceCloneId) {
    try {
        // Update to processing
        await supabase
            .from('voice_clones')
            .update({ status: 'processing' })
            .eq('id', voiceCloneId);

        // Get voice clone data
        const { data: voiceClone } = await supabase
            .from('voice_clones')
            .select('*')
            .eq('id', voiceCloneId)
            .single();

        if (!voiceClone) {
            throw new Error('Voice clone not found');
        }

        // For now, we'll just mark it as active
        // In the future, this will call the Python API to actually clone the voice
        // and generate a voice_id that can be used for TTS generation

        const voiceId = `agent_${voiceClone.agent_id.replace(/-/g, '_')}`;

        const { error: activateError } = await supabase
            .from('voice_clones')
            .update({
                status: 'active',
                voice_id: voiceId
            })
            .eq('id', voiceCloneId);

        if (activateError) {
            throw activateError;
        }

        // Set as agent's active voice
        await supabase
            .from('agents')
            .update({ active_voice_id: voiceCloneId })
            .eq('id', voiceClone.agent_id);

        console.log(`✅ Voice clone ${voiceCloneId} is now active`);

    } catch (error) {
        console.error('Error processing voice clone:', error);

        // Mark as failed
        await supabase
            .from('voice_clones')
            .update({
                status: 'failed',
                rejection_reason: error.message
            })
            .eq('id', voiceCloneId);

        throw error;
    }
}

/**
 * Reject a voice clone
 */
async function rejectVoiceClone(voiceCloneId, adminId, reason) {
    const { data, error } = await supabase
        .from('voice_clones')
        .update({
            status: 'rejected',
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            rejection_reason: reason
        })
        .eq('id', voiceCloneId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to reject: ${error.message}`);
    }

    return data;
}

/**
 * Get agent's active voice clone
 */
async function getAgentVoiceClone(agentId) {
    const { data, error } = await supabase
        .from('voice_clones')
        .select('*')
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw new Error(`Failed to get voice clone: ${error.message}`);
    }

    return data;
}

/**
 * Generate TTS using agent's cloned voice
 */
async function generateWithAgentVoice(agentId, text) {
    try {
        // Get agent's voice
        const voiceClone = await getAgentVoiceClone(agentId);

        if (!voiceClone) {
            // Fallback to default voice
            return await generateTTS(text, 'sales_pro');
        }

        // Use the cloned voice (for now using voice_id as preset)
        // In the future, this will actually use the cloned audio
        return await generateTTS(text, voiceClone.voice_id);

    } catch (error) {
        console.error('Error generating with agent voice:', error);
        // Fallback to default
        return await generateTTS(text, 'sales_pro');
    }
}

/**
 * Generate TTS with any voice
 */
async function generateTTS(text, voiceId = 'sales_pro') {
    try {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice_id', voiceId);

        const response = await fetch(`${VOICE_API_URL}/tts/generate`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`TTS API error: ${response.statusText}`);
        }

        return await response.buffer();

    } catch (error) {
        console.error('Error generating TTS:', error);
        throw error;
    }
}

/**
 * API-compatible wrappers
 */
async function submitVoiceRecording(agentId, audioFilePath) {
    const fs = require('fs');
    const audioFile = fs.readFileSync(audioFilePath);
    return await submitVoiceClone(agentId, audioFile);
}

async function getPendingRecordings() {
    const clones = await getPendingVoiceClones();
    return clones.map(clone => ({
        id: clone.id,
        agent_id: clone.agent_id,
        agent_name: clone.agent?.name || 'Unknown Agent',
        audio_url: clone.audio_url,
        status: clone.status,
        submitted_at: clone.created_at,
        rejection_reason: clone.rejection_reason
    }));
}



async function approveRecording(recordingId, adminId) {
    return await approveVoiceClone(recordingId, adminId);
}

async function rejectRecording(recordingId, adminId, reason) {
    return await rejectVoiceClone(recordingId, adminId, reason);
}

async function getAgentRecording(agentId) {
    // Get the most recent recording for this agent (any status)
    const { data, error } = await supabase
        .from('voice_clones')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data;
}

module.exports = {
    submitVoiceClone,
    getPendingVoiceClones,
    approveVoiceClone,
    rejectVoiceClone,
    getAgentVoiceClone,
    generateWithAgentVoice,
    generateTTS,
    processVoiceClone,
    // API-compatible exports
    submitVoiceRecording,
    getPendingRecordings,
    approveRecording,
    rejectRecording,
    getAgentRecording
};
