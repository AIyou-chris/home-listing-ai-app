# Google OAuth Setup Guide

## Step 1: Create .env.local File

Create a file named `.env.local` in the project root with this content:

```bash
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here

# Other environment variables (optional for testing)
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Step 2: Get Google OAuth Client ID

### 2.1 Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account

### 2.2 Create or Select Project
1. Click the project dropdown at the top
2. Either create a new project or select an existing one
3. Name it something like "HomeListingAI"

### 2.3 Enable Required APIs
1. Go to "APIs & Services" > "Library"
2. Search for and enable:
   - **Gmail API**
   - **Google Calendar API**
   - **Google Identity Services**

### 2.4 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set these authorized origins:
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```
5. Set these authorized redirect URIs:
   ```
   http://localhost:5173
   http://localhost:5173/oauth-callback
   ```

### 2.5 Copy Client ID
1. After creating, copy the Client ID (starts with something like `123456789-xxx.apps.googleusercontent.com`)
2. Replace `your_google_oauth_client_id_here` in your `.env.local` file

## Step 3: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:5173
3. Try booking a consultation
4. The Google OAuth should now work for sending emails!

## Step 4: Verify Email Sending

When you book a consultation:
1. Google OAuth popup should appear
2. After authorizing, emails should be sent via Gmail API
3. Check the browser console for success messages:
   ```
   ✅ Email sent successfully via Gmail
   ```

## Troubleshooting

### Common Issues:

1. **"OAuth client not found"**
   - Double-check the Client ID in `.env.local`
   - Make sure there are no extra spaces

2. **"Unauthorized origins"**
   - Add `http://localhost:5173` to authorized origins
   - Make sure the port matches your dev server

3. **"Access blocked"**
   - Your app needs to be verified by Google for production
   - For testing, add your email to test users

4. **"Gmail API not enabled"**
   - Go back to APIs & Services > Library
   - Enable Gmail API and Google Calendar API

## Security Notes

- ⚠️ Never commit `.env.local` to git
- 🔒 Keep your Client ID secure
- 🎯 For production, set up proper domain verification
- 📧 Consider using a dedicated email service for production

## Production Considerations

For production deployment:
1. Use environment variables on your hosting platform
2. Set up proper domain verification with Google
3. Consider using SendGrid or AWS SES for better deliverability
4. Implement proper error handling and logging
