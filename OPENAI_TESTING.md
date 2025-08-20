# Testing the OpenAI Integration

This document provides instructions for testing the OpenAI integration in the Home Listing AI application.

## Prerequisites

1. Make sure you have set up your OpenAI API key in the `.env` file in the `functions` directory:
   ```
   OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
   ```

2. Ensure you have deployed the Firebase functions:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:continueConversation,functions:generateSpeech
   ```

## Testing Options

### 1. Using the Test Script

You can run the test script to verify the OpenAI API connection:

```bash
cd functions
npm run test-openai
```

This script will:
- Test the GPT-5 model (with fallbacks to GPT-4 and GPT-3.5-turbo)
- Test the text-to-speech functionality

### 2. Using the Web Interface

We've created a dedicated test page for the OpenAI integration:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Access the test page using one of these methods:
   - Navigate to: http://localhost:5175/#openai-test
   - Or go to: http://localhost:5175/openai-test.html

The test page provides a user interface to:
- Chat with the GPT-5 model
- Generate speech from text using different voices
- Test the fallback mechanisms

## What to Test

### Conversation Testing

1. **Basic Conversation**: Ask simple questions about real estate to test the AI's knowledge.
   - Example: "What are the key factors that affect property values?"

2. **Context Awareness**: Ask follow-up questions to see if the AI maintains context.
   - Example: "What are the best home improvements for increasing property value?" followed by "Which of those has the best ROI?"

3. **Real Estate Expertise**: Test the AI's domain knowledge.
   - Example: "Explain the difference between a fixed-rate and adjustable-rate mortgage."

### Text-to-Speech Testing

1. **Voice Options**: Test different voice options (alloy, echo, fable, onyx, nova, shimmer).

2. **Long Text**: Test with longer paragraphs to see how the TTS handles them.

3. **Special Characters**: Test with text containing special characters, numbers, and abbreviations.

## Troubleshooting

If you encounter issues:

1. **API Key Issues**: Verify your OpenAI API key is correct and has access to GPT-5.

2. **Function Deployment**: Make sure the Firebase functions are properly deployed.

3. **Console Errors**: Check the browser console and Firebase function logs for error messages.

4. **Fallback Testing**: If GPT-5 is unavailable, the system should fall back to GPT-4 and then GPT-3.5-turbo.

## Feedback

After testing, please document:
- Any issues encountered
- Performance observations
- Quality of responses compared to previous implementation
- Voice quality and naturalness