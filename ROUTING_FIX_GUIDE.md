# Quick Fix Guide: Routing Issues

**Problem:** App shows wrong pages or old versions when navigating

**Root Cause:** Three different routing systems competing with each other

---

## Current Problematic Architecture

```
┌─────────────────────────────────────────────────┐
│  main.tsx: Hash-based conditional rendering     │
│  (Renders different React trees based on hash)  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  App.tsx: Manual hash/pathname parsing          │
│  (useState view + hashchange listener)           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  HashRouter: React Router's hash routing         │
│  (Trying to manage URLs but being overridden)    │
└─────────────────────────────────────────────────┘

RESULT: Race conditions, wrong pages, stale state
```

## Recommended Fixed Architecture

```
┌─────────────────────────────────────────────────┐
│  main.tsx: Simple App wrapper                   │
│  (Always renders same React tree)               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  BrowserRouter: React Router only               │
│  (Single source of truth for all routing)       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  App.tsx: Routes configuration                  │
│  (Declarative route definitions)                │
└─────────────────────────────────────────────────┘

RESULT: Predictable navigation, no conflicts
```

---

## Step-by-Step Fix

### Step 1: Update main.tsx

**BEFORE:**
```typescript
const rawHash = window.location.hash.replace(/^#/, '')
const hashPath = rawHash.split('?')[0]
const isBlueprintOnlyRoute = hashPath === '/dashboard-blueprint' || hashPath === 'dashboard-blueprint'

const blueprintTree = (
  <StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <SchedulerProvider>
          <AgentBrandingProvider>
            <AgentDashboardBlueprint />
          </AgentBrandingProvider>
        </SchedulerProvider>
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>
)

const appTree = (
  <StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <SchedulerProvider>
          <AgentBrandingProvider>
            <App />
          </AgentBrandingProvider>
        </SchedulerProvider>
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>
)

root.render(isBlueprintOnlyRoute ? blueprintTree : appTree)
```

**AFTER:**
```typescript
import { BrowserRouter } from 'react-router-dom'

root.render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <SchedulerProvider>
          <AgentBrandingProvider>
            <App />
          </AgentBrandingProvider>
        </SchedulerProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
)
```

### Step 2: Update App.tsx - Remove Manual Routing

**REMOVE these lines:**
```typescript
// Line 46-66: parseRouteSegments and getRouteInfo functions
const parseRouteSegments = (raw: string): string[] => { ... }
const getRouteInfo = () => { ... }

// Line 151-154: view state
const [view, setView] = useState<View>('landing');
const handleViewChange = useCallback((nextView: View) => {
    setView(nextView);
}, []);

// Line 237-320: Manual route handling useEffect
useEffect(() => {
    const handleRouteChange = () => {
        const { route, segments } = getRouteInfo();
        // ... 80+ lines of switch statement
    };
    
    handleRouteChange();
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    // ...
}, []);

// Line 1222-1235: Override logic
const currentHash = window.location.hash.substring(1);
if (hashRoute === 'dashboard-blueprint') {
    console.log('🚀 FORCING dashboard-blueprint render from hash');
    return <AgentDashboardBlueprint />;
}
```

**REPLACE with:**
```typescript
import { Routes, Route, Navigate } from 'react-router-dom'

// In App component, replace entire renderViewContent() function with:
return (
  <ErrorBoundary>
    <AISidekickProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/checkout/:slug?" element={<CheckoutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog-post" element={<BlogPostPage />} />
        <Route path="/demo-listing" element={<DemoListingPage />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard-blueprint" element={<AgentDashboardBlueprint />} />
        <Route path="/listings" element={<ProtectedRoute><ListingsPage /></ProtectedRoute>} />
        <Route path="/property/:id" element={<ProtectedRoute><PropertyPage /></ProtectedRoute>} />
        <Route path="/add-listing" element={<ProtectedRoute><AddListingPage /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsAndAppointmentsPage /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><InteractionHubPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
        
        {/* Admin routes */}
        <Route path="/admin/*" element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        } />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {isConsultationModalOpen && (
        <ConsultationModal onClose={() => setIsConsultationModalOpen(false)} />
      )}
      
      {isAdminLoginOpen && (
        <AdminLogin onLogin={handleAdminLogin} onBack={handleAdminLoginClose} />
      )}
    </AISidekickProvider>
  </ErrorBoundary>
);
```

### Step 3: Create Protected Route Components

**Add to App.tsx or separate file:**
```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemoMode, isLocalAdmin } = useAuth(); // Create this hook
  
  if (!user && !isDemoMode && !isLocalAdmin) {
    return <Navigate to="/signin" replace />;
  }
  
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};
```

### Step 4: Update Navigation Calls

**REPLACE everywhere:**
```typescript
// OLD - Don't do this
window.location.hash = 'dashboard';
setView('dashboard');

// NEW - Do this instead
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
```

**Find and replace these patterns:**

| Old Pattern | New Pattern |
|-------------|-------------|
| `window.location.hash = 'signup'` | `navigate('/signup')` |
| `setView('landing')` | `navigate('/')` |
| `window.location.hash = 'admin-dashboard'` | `navigate('/admin/dashboard')` |

### Step 5: Update Vite Config for Cache Busting

**Add to vite.config.ts:**
```typescript
export default defineConfig({
  // ... existing config
  build: {
    // ... existing build config
    rollupOptions: {
      output: {
        // Add hash to filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      }
    }
  }
});
```

---

## Testing Checklist

After making these changes, test:

- [ ] Navigate to `/` - shows landing page
- [ ] Navigate to `/dashboard` - shows dashboard (if logged in) or redirects to signin
- [ ] Navigate to `/admin/dashboard` - shows admin (if admin) or redirects
- [ ] Click browser back button - goes to previous page
- [ ] Click browser forward button - goes to next page
- [ ] Refresh page - stays on same page (no redirect)
- [ ] Share URL to specific page - opens that page
- [ ] Open URL in new tab - shows correct page
- [ ] Navigate between multiple pages quickly - no wrong pages shown

---

## Common Issues & Solutions

### Issue: "Cannot find module 'react-router-dom'"
**Solution:** Import already exists, just use the hooks:
```typescript
import { useNavigate, useParams, useLocation } from 'react-router-dom';
```

### Issue: "BrowserRouter causes 404 on refresh"
**Solution:** If deploying to static host, use HashRouter instead:
```typescript
import { HashRouter } from 'react-router-dom'
// Or configure server to serve index.html for all routes
```

### Issue: "Protected routes not working"
**Solution:** Create auth context/hook to share user state:
```typescript
// Create useAuth hook
export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  // ... auth logic
  return { user, isDemoMode, isAdmin, isLoading };
};
```

### Issue: "Nested admin routes not matching"
**Solution:** In AdminLayout, use relative routes:
```typescript
<Routes>
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="users" element={<AdminUsers />} />
  {/* Note: no leading / for nested routes */}
</Routes>
```

---

## Before/After Comparison

### Before (Current - Broken)
```
User clicks "Dashboard"
  → Sets window.location.hash = '#dashboard'
    → Triggers hashchange event
      → getRouteInfo() parses hash
        → setView('dashboard')
          → Re-render
            → HashRouter sees hash change
              → Updates location
                → Another re-render
                  → Race condition!
                    → Wrong page shows OR old cached view persists
```

### After (Fixed)
```
User clicks "Dashboard"
  → navigate('/dashboard')
    → BrowserRouter updates URL and history
      → Routes component matches route
        → Renders Dashboard component
          → Done! ✅
```

---

## Quick Migration Path

If you want to migrate gradually:

1. ✅ Keep HashRouter but remove manual hash parsing
2. ✅ Remove view state, use Routes
3. ✅ Update navigation to use navigate()
4. ✅ Test thoroughly
5. ✅ Later: Switch to BrowserRouter if needed

This lets you fix the routing issues without changing URLs (if you need hash-based URLs for some reason).

---

## Expected Results

✅ **Navigation is predictable** - Click link, get correct page  
✅ **No race conditions** - Single routing system  
✅ **Browser controls work** - Back/forward work correctly  
✅ **Refresh works** - Page doesn't change on refresh  
✅ **No old versions** - Cache busting prevents stale pages  
✅ **Deep links work** - Can share URLs to specific pages  

---

## Need Help?

If you implement this and still have issues:

1. Check browser console for errors
2. Check React DevTools to see current route
3. Add console.log in route elements to see which renders
4. Test in incognito mode (no cache)
5. Clear browser cache and try again

---

*This is a focused guide for fixing the routing issue. See CODE_ANALYSIS_AND_RECOMMENDATIONS.md for complete analysis.*
