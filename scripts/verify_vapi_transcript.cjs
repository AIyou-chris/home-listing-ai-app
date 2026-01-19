const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load envs
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('🔍 Fetching an active Agent to assign transcript to...');

    // Get an agent
    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, email')
        .limit(1);

    if (error || !agents || agents.length === 0) {
        console.error('❌ Failed to find any agents in DB');
        console.error(error);
        process.exit(1);
    }

    const agent = agents[0];
    console.log(`✅ Found Agent: ${agent.email} (${agent.id})`);

    // Construct Payload
    const payload = {
        message: {
            type: "end-of-call-report",
            call: {
                id: `call_${Date.now()}`,
                metadata: {
                    agentId: agent.id,
                    leadId: null // Generic call
                },
                transcript: "Hello, this is a test call from the verification script. I am checking if the transcript is saved correctly with new fields.",
                analysis: {
                    summary: "Test call verification summary."
                },
                recordingUrl: "https://example.com/recording.mp3"
            },
            durationSeconds: 120,
            cost: 0.05
        }
    };

    console.log('🚀 Sending Webhook to localhost:3002...');

    try {
        const response = await fetch('http://localhost:3002/api/vapi/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✅ Webhook accepted (200 OK)');
        } else {
            console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
        }

        // Verification Query
        console.log('🔍 Verifying DB record...');
        // Wait a sec for async processing if any
        await new Promise(r => setTimeout(r, 2000));

        const { data: convs, error: verifyError } = await supabase
            .from('ai_conversations')
            .select('id, voice_transcript, last_message, message_count, contact_name')
            .eq('user_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (verifyError) {
            console.error('❌ Verification query failed', verifyError);
        } else if (convs && convs.length > 0) {
            const c = convs[0];
            console.log('📊 Retrieve Conversation Record:');
            console.log(`   ID: ${c.id}`);
            console.log(`   Internal Count: ${c.message_count} (Expected >= 1)`);
            console.log(`   Voice Transcript: ${c.voice_transcript ? c.voice_transcript.substring(0, 50) + '...' : 'NULL'}`);
            console.log(`   Last Message: ${c.last_message}`);

            if (c.voice_transcript && c.voice_transcript.includes("Hello, this is a test call")) {
                console.log('✅ SUCCESS: Transcript field populated correctly.');
            } else {
                console.warn('⚠️ WARNING: Transcript text mismatch or missing.');
            }

        } else {
            console.warn('⚠️ No conversation found for this agent recently.');
        }

    } catch (err) {
        console.error('❌ Request failed:', err);
    }
}

run();
