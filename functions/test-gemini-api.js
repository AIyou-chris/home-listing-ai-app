// Simple script to test the Gemini API key
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API key...');
    
    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY is not set in the environment variables');
      return;
    }
    
    console.log(`API Key found (length: ${apiKey.length})`);
    
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Create a model instance
    // Try with the simple model name
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });
    
    // Simple prompt to test the API
    const prompt = 'Write a short greeting for a real estate app user.';
    
    console.log('Sending test request to Gemini API...');
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('\nAPI Response:');
    console.log('=============');
    console.log(text);
    console.log('=============\n');
    
    console.log('✅ Gemini API key is valid and working!');
  } catch (error) {
    console.error('❌ Error testing Gemini API key:');
    console.error(error.message);
    
    if (error.message.includes('API key')) {
      console.error('\nPossible issues:');
      console.error('1. The API key may be invalid or expired');
      console.error('2. The API key may not have access to the Gemini Pro model');
      console.error('3. There might be billing issues with your Google Cloud account');
    } else if (error.message.includes('quota')) {
      console.error('\nYou have exceeded your quota limits. Consider:');
      console.error('1. Checking your usage in the Google Cloud Console');
      console.error('2. Upgrading your plan if needed');
    }
  }
}

// Run the test
testGeminiAPI();