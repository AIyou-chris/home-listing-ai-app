## Contents

*18 sections. A long file may only be read in part, so jump to the section you need from this list.*

- [Supabase Chat Tables](#supabase-chat-tables)
- [✨ New Features & Improvements](#new-features--improvements)
- [🚀 Quick Start](#quick-start)
- [🏗️ Project Structure](#project-structure)
- [📊 Analytics Dashboard](#analytics-dashboard)
- [🔔 Notification System](#notification-system)
- [⚖️ Property Comparison](#property-comparison)
- [🚀 Deployment](#deployment)
- [🔧 Configuration](#configuration)
- [📱 Features](#features)
- [🛠️ Development](#development)
- [Phase 3.1 Jobs Worker (Reliability)](#phase-31-jobs-worker-reliability)
- [🔒 Security](#security)
- [📈 Performance](#performance)
- [🤝 Contributing](#contributing)
- [📄 License](#license)
- [🆘 Support](#support)
- [🎯 Roadmap](#roadmap)

---

## Supabase Chat Tables

Run this SQL in Supabase to enable persistent conversations and messages:

```sql
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  scope text not null check (scope in ('agent','listing','marketing')),
  listing_id uuid null,
  lead_id uuid null,
  title text null,
  status text not null default 'active',
  last_message_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid null,
  role text not null check (role in ('user','ai','system')),
  content text not null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations RLS
create policy conv_owner_rw on conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Allow anonymous listing conversations to be created (no user_id)
create policy conv_listing_insert_anon on conversations
  for insert with check (scope = 'listing' and user_id is null);

-- Messages RLS: allowed if parent conversation is accessible
create policy msg_parent_access on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (
          c.user_id = auth.uid() or (c.scope = 'listing' and c.user_id is null)
        )
    )
  ) with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (
          c.user_id = auth.uid() or (c.scope = 'listing' and c.user_id is null)
        )
    )
  );
```

# 🏠 Home Listing AI App

A comprehensive AI-powered platform for real estate agents to generate stunning property listings with interactive features like an AI assistant, analytics dashboard, and advanced lead management.

## ✨ New Features & Improvements

### 🆕 **New Features Added**

1. **📊 Advanced Analytics Dashboard**
   - Real-time performance metrics
   - Lead conversion tracking
   - Property performance insights
   - Time-based analytics (7d, 30d, 90d, 1y)
   - Visual charts and data visualization

2. **🔔 Real-time Notification System**
   - Toast notifications for important events
   - Notification center with read/unread status
   - Actionable notifications with quick actions
   - Multiple notification types (success, error, warning, info)

3. **⚖️ Property Comparison Tool**
   - Side-by-side property comparison (up to 3 properties)
   - Grid and table view modes
   - Detailed property metrics comparison
   - Price per square foot calculations

4. **🛡️ Enhanced Error Handling**
   - Global error boundary for React errors
   - Graceful error recovery
   - Development error details
   - User-friendly error messages

5. **⏳ Improved Loading States**
   - Multiple loading spinner types (spinner, dots, pulse, bars)
   - Contextual loading messages
   - Better user feedback during operations

### 🔧 **Technical Improvements**

1. **🚀 Performance Optimizations**
   - Code splitting with manual chunks
   - Optimized bundle size
   - Lazy loading for better performance
   - Production build optimizations

2. **📱 Enhanced Mobile Experience**
   - Better responsive design
   - Improved touch interactions
   - Mobile-optimized navigation

3. **🎨 UI/UX Enhancements**
   - Modern design system
   - Consistent color scheme
   - Better accessibility
   - Smooth animations and transitions

4. **🔒 Production Deployment**
   - Optimized production hosting configuration
   - Proper caching headers
   - Environment configuration
   - Automated deployment script

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd home-listing-ai-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your project configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── AnalyticsDashboard.tsx    # New analytics dashboard
│   ├── NotificationSystem.tsx    # New notification system
│   ├── PropertyComparison.tsx    # New property comparison tool
│   ├── ErrorBoundary.tsx         # New error handling
│   ├── LoadingSpinner.tsx        # New loading components
│   └── ...                       # Existing components
├── services/            # API and service functions
├── types.ts            # TypeScript type definitions
└── main.tsx           # Application entry point
```

## 📊 Analytics Dashboard

The new analytics dashboard provides comprehensive insights:

- **Key Metrics**: Total properties, active listings, leads, conversion rates
- **Performance Tracking**: Days on market, portfolio value, appointment success rates
- **Lead Analysis**: Status distribution, qualification rates
- **Time-based Insights**: 7-day, 30-day, 90-day, and yearly views

## 🔔 Notification System

Real-time notifications for:
- New lead alerts
- Property status changes
- Appointment reminders
- System updates
- Error notifications

## ⚖️ Property Comparison

Compare up to 3 properties with:
- Side-by-side visual comparison
- Detailed metrics comparison
- Price per square foot analysis
- Grid and table view modes

## 🚀 Deployment

### Automated Deployment

Use the provided deployment script:

```bash
./deploy.sh
```

This script will:
1. Install dependencies
2. Run linting
3. Build for production
4. Run the project-specific deployment steps

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

### Go-Live Readiness

The `docs/go-live-checklist.md` document describes the production prep steps for the backend service role path, `/api/properties` security, the required `x-agent-id` header, and the monitoring commands you should run before releasing.

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

## 📱 Features

### Core Features
- **Property Management**: Create, edit, and manage property listings
- **Lead Management**: Track and manage potential clients
- **AI Assistant**: Intelligent chat interface for property inquiries
- **Appointment Scheduling**: Manage property showings and consultations
- **Marketing Tools**: Automated email campaigns and social media integration

### New Features
- **Analytics Dashboard**: Comprehensive performance insights
- **Property Comparison**: Side-by-side property analysis
- **Real-time Notifications**: Instant updates and alerts
- **Enhanced Error Handling**: Better user experience during errors
- **Improved Loading States**: Better feedback during operations

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and run the project-specific deployment script

## Phase 3.1 Jobs Worker (Reliability)

Phase 3.1 adds a DB-backed queue for outbound email/voice/sms and webhook processing.

### Apply migration

```bash
export DATABASE_URL='postgresql://...'
node scripts/db/apply_phase3_1_jobs_idempotency.cjs
```

### Worker env vars

Set on backend service:

- `JOB_WORKER_ENABLED=true`
- `JOB_WORKER_POLL_MS=3000`
- `JOB_WORKER_BATCH_SIZE=15`
- `JOB_REAPER_MINUTES=10`
- `JOB_REAPER_POLL_MS=60000`

### Admin ops endpoints

- `GET /api/admin/jobs?status=dead&type=email_send`
- `POST /api/admin/jobs/:jobId/replay`
- `GET /api/admin/webhooks?provider=vapi&status=failed`
- `POST /api/admin/webhooks/:id/replay`

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Functional components with hooks
- Tailwind CSS for styling

## 🔒 Security

- Authentication guard
- Secure API endpoints
- Environment variable protection
- Input validation
- Error boundary protection

## 📈 Performance

- Code splitting
- Lazy loading
- Optimized images
- Caching strategies
- Bundle optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

## 🎯 Roadmap

### Upcoming Features
- [ ] Advanced search and filtering
- [ ] Export functionality
- [ ] Integration with external APIs
- [ ] Mobile app version
- [ ] Advanced AI features
- [ ] Multi-language support

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
