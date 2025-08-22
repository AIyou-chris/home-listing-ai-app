---
description: Repository Information Overview
alwaysApply: true
---

# Home Listing AI App Information

## Summary
A comprehensive AI-powered platform for real estate agents to generate property listings with interactive features including an AI assistant, analytics dashboard, and advanced lead management. The application helps real estate agents manage properties, leads, and marketing campaigns.

## Structure
- **src/**: Frontend React application with components, services, and utilities
- **functions/**: Firebase Cloud Functions backend
- **public/**: Static assets and HTML files
- **.env files**: Environment configuration for various environments
- **firebase.json**: Firebase configuration for hosting, functions, and Firestore

## Language & Runtime
**Language**: TypeScript
**Version**: ES2020 target
**Frontend Framework**: React 18
**Backend Runtime**: Node.js 20
**Build System**: Vite 5.2.0
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- React 18.2.0 - UI framework
- Firebase 10.14.1 - Authentication, database, and hosting
- OpenAI 5.12.2 (frontend) / 4.104.0 (backend) - AI integration
- @google/genai 0.14.0 - Google Generative AI integration
- Express 5.1.0 - Server for API endpoints
- Tailwind CSS 3.4.17 - Styling

**Development Dependencies**:
- TypeScript 5.2.2 - Type checking
- ESLint 8.57.0 - Code linting
- Vite 5.2.0 - Build tool and development server

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## Firebase Configuration
**Hosting**: Configured to serve from `dist` directory with SPA routing
**Functions**: Node.js 20 runtime with TypeScript
**Firestore**: Custom security rules and indexes

## Main Components
**Frontend Entry Point**: src/main.tsx
**Backend Entry Point**: functions/src/index.ts
**Key Services**:
- Authentication: src/services/authService.ts
- Database: src/services/databaseService.ts
- OpenAI: src/services/openaiService.ts, functions/src/openai-conversation.ts
- Analytics: src/services/analyticsService.ts

## Features
- Property management and listings
- Lead tracking and management
- AI-powered chat interface
- Appointment scheduling
- Marketing automation
- Analytics dashboard
- Real-time notifications
- Property comparison tools
- Admin dashboard

## Testing
**Test Files**: Limited test files in src/utils/ directory
**Test Approach**: Manual testing with test components
**Test Components**: OpenAITestPage, AnalyticsTest, FileUploadTest