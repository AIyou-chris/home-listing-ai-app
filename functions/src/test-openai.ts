import * as dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Test OpenAI integration
async function testOpenAI() {
  try {
    console.log("Testing OpenAI integration...");
    
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error("Error: OPENAI_API_KEY is not set in .env file");
      return;
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log("OpenAI client initialized");
    
    // Test models in sequence
    const models = ["gpt-5", "gpt-4", "gpt-3.5-turbo"];
    let success = false;
    
    for (const model of models) {
      try {
        console.log(`Testing model: ${model}`);
        
        // Simple test prompt
        const params: any = {
          model: model,
          messages: [
            { role: "system", content: "You are a helpful assistant for a real estate app." },
            { role: "user", content: "What are the key features to highlight when selling a luxury home?" }
          ],
          temperature: 0.7
        };
        
        // Use the correct parameter name based on the model
        if (model === "gpt-5") {
          params.max_completion_tokens = 150;
        } else {
          params.max_tokens = 150;
        }
        
        const completion = await openai.chat.completions.create(params);
        
        const response = completion.choices[0]?.message?.content;
        
        if (response) {
          console.log(`Success with model ${model}!`);
          console.log("Response:", response);
          success = true;
          break;
        } else {
          console.log(`No response from ${model}`);
        }
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError instanceof Error ? modelError.message : String(modelError));
      }
    }
    
    if (!success) {
      console.error("Failed to get a response from any model");
    }
    
    // Test text-to-speech
    try {
      console.log("\nTesting text-to-speech...");
      
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: "nova",
        input: "Welcome to Home Listing AI. I'm your virtual assistant powered by OpenAI.",
      });
      
      console.log("TTS response received!");
      console.log("TTS response type:", ttsResponse.type);
      
      // Get the audio data
      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      console.log("Audio buffer size:", buffer.length, "bytes");
      
      console.log("Text-to-speech test successful!");
    } catch (ttsError) {
      console.error("Text-to-speech error:", ttsError instanceof Error ? ttsError.message : String(ttsError));
      
      try {
        console.log("Trying fallback TTS model...");
        
        const fallbackTtsResponse = await openai.audio.speech.create({
          model: "tts-1",
          voice: "nova",
          input: "Welcome to Home Listing AI. I'm your virtual assistant powered by OpenAI.",
        });
        
        console.log("Fallback TTS response received!");
        console.log("Fallback TTS response type:", fallbackTtsResponse.type);
        
        // Get the audio data
        const buffer = Buffer.from(await fallbackTtsResponse.arrayBuffer());
        console.log("Fallback audio buffer size:", buffer.length, "bytes");
        
        console.log("Fallback text-to-speech test successful!");
      } catch (fallbackError) {
        console.error("Fallback text-to-speech error:", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testOpenAI().then(() => {
  console.log("Test completed");
}).catch(error => {
  console.error("Test failed with error:", error);
});