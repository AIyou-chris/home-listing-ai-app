// Simple script to test the Generative Language API key
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGenerativeAPI() {
  try {
    console.log('Testing Generative Language API key...');
    
    // Use the API key directly
    const apiKey = 'AIzaSyBzmAGlKaxINNiZt01AF-Rcq9TjDqGdtDw';
    
    console.log(`API Key length: ${apiKey.length}`);
    
    // Initialize the Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Create a model instance with the updated model name
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.0-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });
    
    // Simple prompt to test the API
    const prompt = 'Write a short greeting for a real estate app user.';
    
    console.log('Sending test request to Generative Language API...');
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('\nAPI Response:');
    console.log('=============');
    console.log(text);
    console.log('=============\n');
    
    console.log('✅ Generative Language API key is valid and working!');
  } catch (error) {
    console.error('❌ Error testing Generative Language API key:');
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
testGenerativeAPI();