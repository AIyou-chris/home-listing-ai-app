# Database Schema Documentation

## Overview

This document describes the new Firestore collections and their schemas for the HomeListing AI application.

## Collections

### 1. Users Collection (`users`)

Extended existing users collection with additional fields for subscription management and analytics.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  role: 'agent' | 'admin' | 'user';
  plan: 'Solo Agent' | 'Pro Team' | 'Brokerage';
  dateJoined: string; // ISO timestamp
  lastActive: string; // ISO timestamp
  propertiesCount: number;
  leadsCount: number;
  aiInteractions: number;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  renewalDate: string; // ISO timestamp
  profileImage?: string;
  phone?: string;
  company?: string;
}
```

**Key Features:**
- Subscription status tracking
- Usage analytics (properties, leads, AI interactions)
- Plan management
- Activity tracking

### 2. Admin Settings Collection (`admin_settings`)

Platform-wide configuration and feature toggles.

```typescript
interface AdminSettings {
  id: string;
  platformName: string;
  platformUrl: string;
  supportEmail: string;
  timezone: string;
  featureToggles: {
    aiContentGeneration: boolean;
    voiceAssistant: boolean;
    qrCodeSystem: boolean;
    analyticsDashboard: boolean;
    knowledgeBase: boolean;
  };
  systemLimits: {
    maxFileUploadSize: number; // bytes
    sessionTimeout: number; // seconds
    maxConcurrentUsers: number;
    apiRateLimit: number;
  };
  maintenanceMode: boolean;
  autoUpdates: boolean;
}
```

**Key Features:**
- Feature flags for A/B testing
- System limits configuration
- Maintenance mode control
- Platform branding

### 3. Broadcast Messages Collection (`broadcast_messages`)

System-wide announcements and notifications.

```typescript
interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  messageType: 'General' | 'Maintenance' | 'Feature' | 'Emergency' | 'System' | 'Welcome';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: string[]; // User IDs
  sentBy: string; // Admin ID
  sentAt: string; // ISO timestamp
  scheduledFor?: string; // ISO timestamp
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  deliveryStats: {
    totalRecipients: number;
    delivered: number;
    read: number;
    failed: number;
  };
}
```

**Key Features:**
- Targeted messaging
- Scheduled broadcasts
- Delivery tracking
- Priority levels

### 4. System Alerts Collection (`system_alerts`)

System monitoring and alerting.

```typescript
interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'critical' | 'info';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string; // 'database' | 'api' | 'ai' | 'email' | 'storage'
  createdAt: string; // ISO timestamp
  acknowledgedBy?: string; // User ID
  acknowledgedAt?: string; // ISO timestamp
  resolvedAt?: string; // ISO timestamp
  status: 'active' | 'acknowledged' | 'resolved';
}
```

**Key Features:**
- Component-specific alerts
- Acknowledgment tracking
- Resolution workflow
- Severity levels

### 5. Retention Campaigns Collection (`retention_campaigns`)

Automated user retention and re-engagement campaigns.

```typescript
interface RetentionCampaign {
  id: string;
  name: string;
  trigger: 'pre-renewal' | 'renewal-day' | 'day-1-recovery' | 'day-3-recovery';
  triggerDays: number;
  channels: string[]; // 'email' | 'phone' | 'sms'
  messageTemplate: string;
  successRate: number; // percentage
  isActive: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

**Key Features:**
- Automated triggers
- Multi-channel campaigns
- Success tracking
- Template management

### 6. User Notifications Collection (`user_notifications`)

Individual user notifications and messages.

```typescript
interface UserNotification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'broadcast' | 'system' | 'billing' | 'feature';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  readAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  expiresAt?: string; // ISO timestamp
}
```

**Key Features:**
- Read/unread tracking
- Expiration dates
- Priority levels
- Type categorization

## Services

### DatabaseService

Core CRUD operations for all collections with proper timestamp handling.

**Key Methods:**
- `createUser()`, `getUser()`, `updateUser()`
- `getAdminSettings()`, `createAdminSettings()`, `updateAdminSettings()`
- `createBroadcastMessage()`, `getBroadcastMessages()`
- `createSystemAlert()`, `getSystemAlerts()`
- `createRetentionCampaign()`, `getRetentionCampaigns()`
- `createUserNotification()`, `getUserNotifications()`

### NotificationService

High-level notification management and business logic.

**Key Methods:**
- `sendNotificationToUser()`, `sendNotificationToMultipleUsers()`
- `sendBroadcastMessage()`, `createBroadcastMessage()`
- `createSystemAlert()`, `getSystemAlerts()`
- `sendWelcomeNotification()`, `sendSubscriptionExpiryNotification()`
- Real-time subscriptions with `subscribeToUserNotifications()`

### AdminService

Comprehensive admin operations and system management.

#### User Management
```typescript
// Get all users
const allUsers = await AdminService.getAllUsers();

// Get specific user
const user = await AdminService.getUserById(userId);

// Update user status
await AdminService.updateUserStatus(userId, 'Active');

// Get comprehensive user statistics
const userStats = await AdminService.getUserStats();
```

#### System Settings
```typescript
// Get system settings
const settings = await AdminService.getSystemSettings();

// Update system settings
await AdminService.updateSystemSettings({ 
  platformName: 'HomeListing AI Pro',
  maintenanceMode: false 
});

// Toggle features
await AdminService.toggleFeature('aiContentGeneration', true);
```

#### Broadcast Messages
```typescript
// Send broadcast message
const messageId = await AdminService.sendBroadcastMessage({
  title: 'System Update',
  content: 'New features are now available!',
  messageType: 'Feature',
  priority: 'medium',
  targetAudience: ['user1', 'user2'],
  sentBy: 'admin',
  status: 'sent'
});

// Get broadcast history
const history = await AdminService.getBroadcastHistory();

// Get delivery statistics
const stats = await AdminService.getMessageDeliveryStats(messageId);
```

#### System Monitoring
```typescript
// Get system health
const health = await AdminService.getSystemHealth();

// Get active alerts
const alerts = await AdminService.getActiveAlerts();

// Acknowledge alert
await AdminService.acknowledgeAlert(alertId);
```

#### Retention Management
```typescript
// Get retention campaigns
const campaigns = await AdminService.getRetentionCampaigns();

// Update retention campaign
await AdminService.updateRetentionCampaign(campaign);

// Get renewal data with risk assessment
const renewalData = await AdminService.getRenewalData();
```

#### Additional Methods
```typescript
// Filter users by plan
const soloAgents = await AdminService.getUsersByPlan('Solo Agent');

// Filter users by subscription status
const trialUsers = await AdminService.getUsersBySubscriptionStatus('trial');

// Update user plan
await AdminService.updateUserPlan(userId, 'Pro Team');

// Get user analytics
const analytics = await AdminService.getUserAnalytics(userId);

// Send bulk notifications
const notificationIds = await AdminService.sendBulkNotification(
  userIds,
  'Bulk Message',
  'This is a bulk notification',
  'system',
  'medium'
);

// Update multiple users
await AdminService.updateBulkUserStatus(userIds, 'Active');

// Set maintenance mode
await AdminService.setMaintenanceMode(true);

// Create system alert
const alertId = await AdminService.createSystemAlert(
  'warning',
  'High CPU Usage',
  'Server CPU usage is above 80%',
  'high',
  'api'
);

// Resolve system alert
await AdminService.resolveSystemAlert(alertId);

// Create retention campaign
const campaignId = await AdminService.createRetentionCampaign(
  'Pre-renewal Campaign',
  'pre-renewal',
  7,
  ['email'],
  'Your subscription is about to expire...'
);

// Toggle retention campaign
await AdminService.toggleRetentionCampaign(campaignId);
```

## Additional Types

### UserStats
```typescript
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  expiredUsers: number;
  newUsersThisMonth: number;
  churnedUsersThisMonth: number;
  averagePropertiesPerUser: number;
  averageLeadsPerUser: number;
  averageAiInteractionsPerUser: number;
}
```

### DeliveryStats
```typescript
interface DeliveryStats {
  messageId: string;
  totalRecipients: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failedRate: number;
}
```

### SystemHealth
```typescript
interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  ai: 'healthy' | 'warning' | 'error';
  email: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  overall: 'healthy' | 'warning' | 'error';
  lastChecked: string;
  issues: string[];
}
```

### RenewalData
```typescript
interface RenewalData {
  userId: string;
  userName: string;
  userEmail: string;
  currentPlan: string;
  renewalDate: string;
  daysUntilRenewal: number;
  subscriptionStatus: string;
  lastActive: string;
  propertiesCount: number;
  leadsCount: number;
  aiInteractions: number;
  riskLevel: 'low' | 'medium' | 'high';
}
```

## Security Rules

Firestore security rules ensure proper access control:

- **Users**: Can read/write their own data, admins can access all
- **Admin Settings**: Admin-only access
- **Broadcast Messages**: Admins can write, users can read if in target audience
- **System Alerts**: Admins can read/write, users can read active alerts
- **Retention Campaigns**: Admin-only access
- **User Notifications**: Users can read their own, admins can read all

## Usage Examples

### Creating a New User
```typescript
const userId = await DatabaseService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  status: 'Active',
  role: 'agent',
  plan: 'Solo Agent',
  propertiesCount: 0,
  leadsCount: 0,
  aiInteractions: 0,
  subscriptionStatus: 'trial',
  renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
});
```

### Sending a Notification
```typescript
await NotificationService.sendNotificationToUser(
  userId,
  'Welcome!',
  'Welcome to HomeListing AI!',
  'feature',
  'medium'
);
```

### Creating a System Alert
```typescript
await NotificationService.createSystemAlert(
  'warning',
  'High CPU Usage',
  'Server CPU usage is above 80%',
  'high',
  'api'
);
```

### Getting System Statistics
```typescript
const stats = await AdminService.getSystemStats();
console.log(`Total users: ${stats.totalUsers}`);
console.log(`Active users: ${stats.activeUsers}`);
```

### Comprehensive User Analytics
```typescript
const userStats = await AdminService.getUserStats();
console.log(`Average properties per user: ${userStats.averagePropertiesPerUser}`);
console.log(`New users this month: ${userStats.newUsersThisMonth}`);
```

### Risk Assessment for Renewals
```typescript
const renewalData = await AdminService.getRenewalData();
const highRiskUsers = renewalData.filter(user => user.riskLevel === 'high');
console.log(`High risk users: ${highRiskUsers.length}`);
```

## Testing

Use the test utilities to verify database setup:

```typescript
import { testDatabaseSetup } from './utils/databaseTest';
import { testAdminService } from './utils/adminServiceTest';

// Test basic database setup
const dbResult = await testDatabaseSetup();

// Test AdminService functionality
const adminResult = await testAdminService();

if (dbResult.success && adminResult.success) {
  console.log('All systems verified successfully!');
} else {
  console.error('Setup verification failed');
}
```

## Migration Notes

1. **Existing Users**: Update existing user documents to include new fields
2. **Security Rules**: Deploy new Firestore rules before using new collections
3. **Indexes**: Create composite indexes for queries with multiple filters
4. **Backup**: Backup existing data before schema changes

## Performance Considerations

1. **Indexes**: Create indexes for frequently queried fields
2. **Pagination**: Use `limit()` and `startAfter()` for large collections
3. **Real-time Listeners**: Unsubscribe from listeners to prevent memory leaks
4. **Batch Operations**: Use `writeBatch()` for multiple document updates
5. **Caching**: Consider implementing client-side caching for frequently accessed data
