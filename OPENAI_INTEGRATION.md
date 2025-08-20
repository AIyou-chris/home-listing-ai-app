# OpenAI Integration for Home Listing AI

This document provides instructions for setting up and using the OpenAI integration for the Home Listing AI application.

## Overview

The application now uses OpenAI's GPT models for AI conversations and text-to-speech functionality, replacing the previous Google Gemini implementation. This change provides:

- Better quality responses with GPT-5
- More reliable API access
- High-quality text-to-speech with OpenAI's TTS-1-HD model
- Fallback mechanisms for reliability

## Setup Instructions

### 1. OpenAI API Key

You need an OpenAI API key with access to GPT-5 (or GPT-4 as fallback):

1. Sign up for an OpenAI account at https://platform.openai.com/
2. Navigate to API Keys section
3. Create a new API key
4. Update the `.env` file in the `functions` directory with your API key:

```
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

### 2. Deploy Firebase Functions

After setting up your API key, deploy the Firebase functions:

```bash
cd functions
npm run build
firebase deploy --only functions:continueConversation,functions:generateSpeech
```

## Features

### AI Conversation

The application uses a tiered approach to ensure reliability:

1. First attempts to use GPT-5 for the highest quality responses
2. Falls back to GPT-4 if GPT-5 is unavailable
3. Falls back to GPT-3.5-Turbo as a last resort

### Text-to-Speech

The application uses OpenAI's high-quality text-to-speech:

1. First attempts to use TTS-1-HD for the highest quality audio
2. Falls back to standard TTS-1 if HD is unavailable
3. Falls back to browser's built-in speech synthesis as a last resort

## Voice Options

The following voices are available for text-to-speech:

- `alloy`: Neutral, versatile voice
- `echo`: Male-leaning voice
- `fable`: Male-leaning voice with a warm tone
- `onyx`: Male-leaning voice with depth
- `nova`: Female-leaning voice (default)
- `shimmer`: Female-leaning voice with a clear tone

## Troubleshooting

If you encounter issues:

1. Check Firebase function logs for errors
2. Verify your OpenAI API key is valid and has access to the required models
3. Ensure your Firebase project has billing enabled for external API calls
4. Check that the OpenAI API is not experiencing downtime

## Reverting to Gemini (if needed)

If you need to revert to the Google Gemini implementation:

1. Update the `package.json` main field to point back to the original index.js
2. Deploy the original functions

```bash
cd functions
npm run build
firebase deploy --only functions
```