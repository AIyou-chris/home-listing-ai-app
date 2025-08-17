# Firebase Functions Backend

This directory contains the Firebase Functions backend for the Home Listing AI application.

## Features

### Core Functionality
- **AI Content Generation**: Property descriptions, blog posts, social media content
- **Voice Assistant**: Speech-to-text and text-to-speech capabilities
- **File Management**: Upload, process, and store documents with OCR
- **Email Automation**: Template management and bulk email sending
- **QR Code Management**: Generate and track QR codes for properties
- **Analytics & Reporting**: User interaction tracking and comprehensive reports
- **Security & Compliance**: Audit logging, data encryption, GDPR compliance
- **Payment Processing**: PayPal and Stripe integration for subscriptions
- **Knowledge Base**: AI-powered document processing and search

### Security Features
- User authentication and authorization
- Rate limiting and request validation
- Data encryption and secure storage
- Audit logging and security monitoring
- GDPR compliance tools
- Automated backup and restore

## Setup Instructions

### 1. Prerequisites
- Node.js 20 or higher
- Firebase CLI installed globally
- Google Cloud Project with billing enabled
- Firebase project created

### 2. Install Dependencies
```bash
cd functions
npm install
```

### 3. Environment Configuration
Set up the following environment variables in Firebase Functions:

```bash
# Google AI
GEMINI_API_KEY=your_gemini_api_key

# PayPal (for payments)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# Stripe (alternative payment)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Services
SENDGRID_API_KEY=your_sendgrid_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google Cloud Services
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# External APIs
DATAFINITI_API_KEY=your_datafiniti_api_key
ZILLOW_API_KEY=your_zillow_api_key

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_VOICE_ASSISTANT=true
ENABLE_EMAIL_SYNC=true
ENABLE_PAYMENT_PROCESSING=true
```

### 4. Set Environment Variables
```bash
firebase functions:config:set gemini.api_key="your_gemini_api_key"
firebase functions:config:set paypal.client_id="your_paypal_client_id"
firebase functions:config:set paypal.client_secret="your_paypal_client_secret"
# ... set other variables as needed
```

### 5. Build and Deploy
```bash
# Build TypeScript
npm run build

# Deploy to Firebase
npm run deploy
```

## API Functions

### AI Content Generation
- `generatePropertyDescription` - Generate property descriptions
- `answerPropertyQuestion` - Answer questions about properties
- `generateBlogPost` - Create blog posts
- `generateSocialPostText` - Generate social media content
- `generateVideoScript` - Create video scripts
- `generateText` - General text generation

### Voice Assistant
- `transcribeVoice` - Convert speech to text
- `voiceChatResponse` - Get AI responses for voice chat
- `generateSpeech` - Convert text to speech

### File Management
- `uploadFile` - Upload files to Firebase Storage
- `processDocument` - Extract text from documents
- `storeKnowledgeBase` - Store processed content
- `searchKnowledgeBase` - Search knowledge base
- `deleteFile` - Delete files and associated data

### Email Automation
- `sendEmail` - Send individual emails
- `sendBulkEmail` - Send bulk emails
- `scheduleEmail` - Schedule emails for later
- `getEmailTemplates` - Get email templates
- `trackEmailMetrics` - Track email performance

### QR Code Management
- `generateQRCode` - Create custom QR codes
- `trackQRScan` - Track QR code scans
- `getQRAnalytics` - Get QR code analytics
- `updateQRDestination` - Update QR code destinations

### Analytics & Reporting
- `trackInteraction` - Track user interactions
- `calculateMetrics` - Calculate analytics metrics
- `generateReport` - Generate comprehensive reports
- `exportData` - Export data for external analysis

### Security & Compliance
- `validateUser` - Validate user permissions
- `auditAction` - Log audit actions
- `encryptData` - Encrypt sensitive data
- `decryptData` - Decrypt data
- `backupData` - Create data backups
- `restoreData` - Restore data from backups
- `monitorSecurity` - Monitor security events
- `deleteUserData` - GDPR data deletion
- `exportUserData` - GDPR data export

### Payment Processing
- `createPayPalSubscription` - Create PayPal subscriptions
- `cancelPayPalSubscription` - Cancel subscriptions
- `upgradePayPalSubscription` - Upgrade subscriptions

### AI Personality Management
- `createAIPersonality` - Create custom AI personalities
- `trainAIPersonality` - Train AI personalities
- `generateResponse` - Generate responses using AI personalities
- `saveTemplate` - Save email/message templates
- `applyTemplate` - Apply templates with dynamic data

## Database Collections

### Core Collections
- `users` - User accounts and profiles
- `properties` - Property listings
- `subscriptions` - User subscriptions
- `emails` - Email records
- `templates` - Email and message templates

### AI & Content
- `aiPersonalities` - AI personality profiles
- `generatedContent` - AI-generated content
- `videoScripts` - Video script templates
- `knowledgeBase` - Processed documents and knowledge

### Analytics & Tracking
- `userInteractions` - User interaction events
- `qrCodes` - QR code configurations
- `qrScans` - QR code scan events
- `calculatedMetrics` - Calculated analytics
- `reports` - Generated reports

### Security & Compliance
- `auditLogs` - Security audit logs
- `securityAlerts` - Security alerts
- `encryptedData` - Encrypted data records
- `encryptionKeys` - Encryption key management
- `backups` - Backup records
- `restores` - Restore records

### File Management
- `files` - File metadata and records
- `importedEmails` - Synced email conversations
- `emailSyncs` - Email sync configurations

## Security Considerations

### Authentication
- All functions require Firebase Authentication
- User permissions are validated for each request
- Admin-only functions check for admin role

### Data Protection
- Sensitive data is encrypted before storage
- API keys are stored securely in environment variables
- Rate limiting prevents abuse

### Compliance
- GDPR compliance tools for data deletion and export
- Audit logging for all sensitive operations
- Data retention policies are enforced

## Monitoring & Logging

### Built-in Monitoring
- Firebase Functions logs
- Error tracking and alerting
- Performance monitoring
- Security event logging

### Custom Metrics
- User interaction tracking
- Function execution metrics
- Error rate monitoring
- Response time tracking

## Development

### Local Development
```bash
# Start Firebase emulator
firebase emulators:start --only functions

# Run tests
npm test

# Lint code
npm run lint
```

### Testing
- Unit tests for individual functions
- Integration tests for API endpoints
- Security tests for authentication and authorization

### Deployment
- Automatic deployment on push to main branch
- Staging environment for testing
- Production deployment with manual approval

## Troubleshooting

### Common Issues
1. **Environment Variables**: Ensure all required environment variables are set
2. **Authentication**: Check Firebase Authentication setup
3. **Permissions**: Verify user roles and permissions
4. **Rate Limits**: Check for rate limiting issues
5. **API Keys**: Validate external API keys

### Debugging
- Check Firebase Functions logs
- Use Firebase emulator for local debugging
- Monitor function execution times
- Review error messages and stack traces

## Support

For issues and questions:
1. Check the Firebase Functions documentation
2. Review the function logs in Firebase Console
3. Test functions locally using the emulator
4. Contact the development team

## License

This project is licensed under the MIT License.
