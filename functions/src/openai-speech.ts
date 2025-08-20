import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { Readable } from 'stream';

// Voice transcription using OpenAI Whisper
export const transcribeVoice = functions.https.onCall(async (data: any, context) => {
    try {
        const { audioData } = data;
        
        if (!audioData) {
            throw new functions.https.HttpsError("invalid-argument", "Audio data is required");
        }
        
        // Check OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
            console.error("transcribeVoice: OpenAI API key is not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service is not properly configured");
        }
        
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        console.log("transcribeVoice: Calling OpenAI Whisper API");
        
        // Convert base64 audio to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Create a file-like object for OpenAI
        const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
        
        // Call OpenAI Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en"
        });
        
        console.log("transcribeVoice: Transcription successful");
        
        return { text: transcription.text };
    } catch (error) {
        console.error("Transcription error:", error);
        throw new functions.https.HttpsError("internal", "Failed to transcribe audio");
    }
});

// Voice transcription using OpenAI Whisper (HTTP Function with CORS)
export const transcribeVoiceHttp = functions.https.onRequest(async (req: any, res: any) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    try {
        const { audioData } = req.body;
        
        if (!audioData) {
            res.status(400).json({ error: "Audio data is required" });
            return;
        }
        
        // Check OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
            console.error("transcribeVoiceHttp: OpenAI API key is not configured");
            res.status(500).json({ error: "AI service is not properly configured" });
            return;
        }
        
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        console.log("transcribeVoiceHttp: Calling OpenAI Whisper API");
        
        // Convert base64 audio to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Create a file-like object for OpenAI
        const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
        
        // Call OpenAI Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en"
        });
        
        console.log("transcribeVoiceHttp: Transcription successful");
        
        res.json({ text: transcription.text });
    } catch (error) {
        console.error("Transcription error:", error);
        res.status(500).json({ error: "Failed to transcribe audio" });
    }
});

// Generate speech using OpenAI
export const generateSpeech = functions.https.onCall(async (data: any, context) => {
    try {
        console.log("generateSpeech: Function started with OpenAI");
        
        // Validate data parameter
        if (!data) {
            console.error("generateSpeech: No data provided");
            throw new functions.https.HttpsError("invalid-argument", "No data provided");
        }
        
        // Validate text parameter
        if (!data.text || typeof data.text !== 'string' || data.text.trim() === '') {
            console.error("generateSpeech: Invalid or missing text", data);
            throw new functions.https.HttpsError("invalid-argument", "Text must be a non-empty string");
        }
        
        const { text } = data;
        const voice = data.voice || "alloy"; // Default voice
        
        // Log text for debugging (truncated to avoid huge logs)
        console.log("generateSpeech: Text to convert (truncated):", 
            text.substring(0, 100) + (text.length > 100 ? "..." : ""));
        
        // Check API key configuration
        if (!process.env.OPENAI_API_KEY) {
            console.error("generateSpeech: OpenAI API key is not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service is not properly configured");
        }
        
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        console.log("generateSpeech: OpenAI client initialized");
        
        try {
            console.log("generateSpeech: Calling OpenAI TTS API");
            
            // Call OpenAI API for text-to-speech with the latest model
            const mp3Response = await openai.audio.speech.create({
                model: "tts-1-hd", // Using the high-definition model for better quality
                voice: voice,
                input: text,
                speed: 1.0, // Normal speed
                response_format: "mp3", // Specify mp3 format explicitly
            });
            
            console.log("generateSpeech: OpenAI TTS response received");
            
            // Get the audio buffer
            const buffer = Buffer.from(await mp3Response.arrayBuffer());
            
            // Generate a unique filename
            const filename = `speech_${Date.now()}.mp3`;
            const bucket = admin.storage().bucket();
            const file = bucket.file(`speech/${filename}`);
            
            // Create a stream from the buffer
            const stream = new Readable();
            stream.push(buffer);
            stream.push(null);
            
            // Upload to Firebase Storage
            await new Promise<void>((resolve, reject) => {
                stream
                    .pipe(file.createWriteStream({
                        metadata: {
                            contentType: 'audio/mpeg',
                        },
                    }))
                    .on('error', reject)
                    .on('finish', resolve);
            });
            
            // Make the file publicly accessible
            await file.makePublic();
            
            // Get the public URL
            const audioUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
            
            console.log("generateSpeech: Audio file uploaded to:", audioUrl);
            
            return { 
                success: true,
                audioUrl,
                duration: buffer.length / 1024, // Rough estimate of duration in seconds
            };
        } catch (ttsError) {
            console.error("generateSpeech: OpenAI TTS-HD API error:", ttsError);
            
            // Try with standard TTS model as fallback
            try {
                console.log("generateSpeech: Trying fallback to standard TTS model");
                
                const fallbackMp3Response = await openai.audio.speech.create({
                    model: "tts-1", // Standard model as fallback
                    voice: voice,
                    input: text,
                });
                
                console.log("generateSpeech: Fallback TTS response received");
                
                // Get the audio buffer
                const buffer = Buffer.from(await fallbackMp3Response.arrayBuffer());
                
                // Generate a unique filename
                const filename = `speech_fallback_${Date.now()}.mp3`;
                const bucket = admin.storage().bucket();
                const file = bucket.file(`speech/${filename}`);
                
                // Create a stream from the buffer
                const stream = new Readable();
                stream.push(buffer);
                stream.push(null);
                
                // Upload to Firebase Storage
                await new Promise<void>((resolve, reject) => {
                    stream
                        .pipe(file.createWriteStream({
                            metadata: {
                                contentType: 'audio/mpeg',
                            },
                        }))
                        .on('error', reject)
                        .on('finish', resolve);
                });
                
                // Make the file publicly accessible
                await file.makePublic();
                
                // Get the public URL
                const audioUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
                
                console.log("generateSpeech: Fallback audio file uploaded to:", audioUrl);
                
                return { 
                    success: true,
                    audioUrl,
                    duration: buffer.length / 1024, // Rough estimate of duration in seconds
                    fallback: true // Indicate that this is a fallback response
                };
            } catch (fallbackError) {
                console.error("generateSpeech: Fallback TTS also failed:", fallbackError);
                throw new functions.https.HttpsError(
                    "internal", 
                    "Speech generation failed with all models: " + 
                    (ttsError instanceof Error ? ttsError.message : String(ttsError))
                );
            }
        }
    } catch (error) {
        console.error("generateSpeech: Speech generation error:", error);
        throw new functions.https.HttpsError(
            "internal", 
            "Failed to generate speech: " + 
            (error instanceof Error ? error.message : String(error))
        );
    }
});