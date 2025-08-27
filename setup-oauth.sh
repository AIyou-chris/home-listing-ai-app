#!/bin/bash

echo "🔧 Google OAuth Setup Helper"
echo "============================"

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️ .env.local already exists!"
    echo "Do you want to:"
    echo "1. View current content"
    echo "2. Backup and recreate"
    echo "3. Cancel"
    read -p "Choose (1/2/3): " choice
    
    case $choice in
        1)
            echo "📄 Current .env.local content:"
            cat .env.local
            exit 0
            ;;
        2)
            echo "📦 Backing up current .env.local to .env.local.backup"
            cp .env.local .env.local.backup
            ;;
        3)
            echo "❌ Cancelled"
            exit 0
            ;;
    esac
fi

# Create .env.local file
echo "📝 Creating .env.local file..."

cat > .env.local << 'EOF'
# Google OAuth Configuration
# Replace 'your_google_oauth_client_id_here' with your actual Client ID from Google Cloud Console
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here

# Firebase Configuration (placeholder values for testing)
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Google AI Configuration (placeholder)
VITE_GEMINI_API_KEY=demo-gemini-key
GEMINI_API_KEY=demo-gemini-key

# App Configuration
VITE_APP_NAME=Home Listing AI
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_VOICE_ASSISTANT=false
VITE_ENABLE_NOTIFICATIONS=true
EOF

echo "✅ Created .env.local file!"
echo ""
echo "🔗 Next steps:"
echo "1. Go to: https://console.cloud.google.com/"
echo "2. Create a new project: 'HomeListingAI'"
echo "3. Enable Gmail API and Google Calendar API"
echo "4. Create OAuth 2.0 credentials"
echo "5. Set authorized origins: http://localhost:5173"
echo "6. Copy your Client ID"
echo ""
echo "📝 Then edit .env.local and replace:"
echo "   'your_google_oauth_client_id_here'"
echo "   with your actual Client ID"
echo ""
echo "🚀 Finally restart the server:"
echo "   npm run dev"
echo ""
echo "📖 See GOOGLE_OAUTH_SETUP.md for detailed instructions"
