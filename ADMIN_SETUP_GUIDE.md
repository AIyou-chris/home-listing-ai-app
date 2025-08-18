# Admin Authentication Setup Guide

## Overview
I've implemented a secure admin authentication system that requires login before accessing the admin dashboard. Only you can access it with the credentials you provided.

## Your Admin Credentials
- **Email**: `us@homelistingai.com`
- **Password**: `Jake@2024`

## Setup Steps

### 1. Deploy Firebase Functions
First, deploy the updated Firebase Functions that include the admin setup:

```bash
cd functions
npm run deploy
```

### 2. Create Initial Admin User
Navigate to the admin setup page to create your admin user:

```
https://your-domain.com/#admin-setup
```

Or manually set the view to `admin-setup` in your browser console:
```javascript
// In browser console
window.location.hash = '#admin-setup'
```

### 3. Run the Setup
On the admin setup page:
1. Verify the email and password are correct
2. Click "Setup Admin User"
3. Wait for the success message

### 4. Access Admin Dashboard
Once setup is complete:
1. Go to the landing page
2. Click the "Admin" link
3. Login with your credentials:
   - Email: `us@homelistingai.com`
   - Password: `Jake@2024`

## Security Features

### ✅ **Secure Authentication**
- Firebase Authentication with custom claims
- Admin role verification at multiple levels
- Secure token-based authentication

### ✅ **Access Control**
- Only users with admin role can access admin routes
- Automatic redirect for unauthorized users
- Secure Firebase Functions with admin verification

### ✅ **Admin Role Management**
- Custom claims for admin permissions
- Firestore user document updates
- Role-based access control (RBAC)

## Admin Permissions
Your admin account has full permissions:
- `users` - User management
- `billing` - Billing and subscription management
- `analytics` - Analytics and reporting
- `system` - System settings and monitoring
- `support` - Support and customer service

## Troubleshooting

### If setup fails:
1. Check Firebase console for function logs
2. Verify Firebase project configuration
3. Ensure Firebase Auth is enabled
4. Check if admin user already exists

### If login fails:
1. Verify credentials are correct
2. Check if admin role was set properly
3. Try refreshing the page
4. Check browser console for errors

### If admin dashboard doesn't load:
1. Verify you're logged in with admin role
2. Check Firebase custom claims
3. Refresh authentication token
4. Clear browser cache and try again

## Security Notes

⚠️ **Important Security Considerations:**
- Change the default password after first login
- Use a strong, unique password
- Enable 2FA if possible
- Regularly rotate admin credentials
- Monitor admin access logs
- Restrict admin setup function access

## Production Deployment

For production deployment:
1. Remove or secure the admin setup route
2. Use environment variables for admin credentials
3. Implement additional security measures
4. Set up proper logging and monitoring
5. Configure Firebase Security Rules

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Review Firebase Function logs
3. Verify Firebase project configuration
4. Test with different browsers/devices
