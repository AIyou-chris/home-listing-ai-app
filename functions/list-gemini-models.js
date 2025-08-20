// Script to list available Gemini models
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listGeminiModels() {
  try {
    console.log('Listing available Gemini models...');
    
    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY is not set in the environment variables');
      return;
    }
    
    console.log(`API Key found (length: ${apiKey.length})`);
    
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // List available models
    console.log('Fetching available models...');
    const models = await genAI.listModels();
    
    console.log('\nAvailable Models:');
    console.log('=================');
    models.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
      console.log(`  Supported generation methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing Gemini models:');
    console.error(error.message);
    
    if (error.message.includes('API key')) {
      console.error('\nPossible issues:');
      console.error('1. The API key may be invalid or expired');
      console.error('2. There might be billing issues with your Google Cloud account');
    }
  }
}

// Run the function
listGeminiModels();