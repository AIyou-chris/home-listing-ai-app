#!/bin/bash

# Deploy OpenAI functions script
echo "Deploying OpenAI functions for Home Listing AI..."

# Navigate to functions directory
cd functions

# Install dependencies if needed
echo "Checking dependencies..."
npm install

# Build the functions
echo "Building functions..."
npm run build

# Deploy the OpenAI functions
echo "Deploying functions to Firebase..."
firebase deploy --only functions:continueConversation,functions:generateSpeech

echo "Deployment complete!"
echo "Remember to set your OpenAI API key in the Firebase environment variables:"
echo "firebase functions:config:set openai.apikey=\"YOUR_OPENAI_API_KEY\""