import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import LeadsAndAppointmentsPage from './LeadsAndAppointmentsPage';
import ListingsPage from './ListingsPage';
import ListingStudioV2Page from './listings/ListingStudioV2Page';
import AddListingPage from './AddListingPage';
import PropertyPage from './PropertyPage';
import AIInteractionHubPage from './AIInteractionHubPage';
import AgentAISidekicksPage from './AgentAISidekicksPage';
import SettingsPage from './SettingsPage';
import AnalyticsDashboard from './AnalyticsDashboard';
import AICardPage from './AICardPage';
import NotificationSystem from './NotificationSystem';
import PWAInstallModal from './settings/PWAInstallModal';

import { MarketingHub } from './MarketingHub';
import { UsageStatsCard } from './dashboard/UsageStatsCard';

import { DEMO_FAT_PROPERTIES, DEMO_FAT_LEADS, DEMO_FAT_APPOINTMENTS, DEMO_FAT_INTERACTIONS, DEMO_SEQUENCES } from '../demoConstants';
import {
  BLUEPRINT_PROPERTIES,
  BLUEPRINT_LEADS,
  BLUEPRINT_APPOINTMENTS,
  BLUEPRINT_SEQUENCES
} from '../constants/agentBlueprintData';
import { SecuritySettings } from '../types';
import { listingsService } from '../services/listingsService';
import { leadsService } from '../services/leadsService';
import { adminLeadsService } from '../services/adminLeadsService'; // Added
import { listAppointments } from '../services/appointmentsService';
import { calendarSettingsService } from '../services/calendarSettingsService';
import { securitySettingsService } from '../services/securitySettingsService';
import { billingSettingsService } from '../services/billingSettingsService';

import { notificationSettingsService } from '../services/notificationSettingsService';
import { useApiErrorNotifier } from '../hooks/useApiErrorNotifier';
import { logLeadCaptured, logAppointmentScheduled } from '../services/aiFunnelService';
import UniversalFunnelPanel from './UniversalFunnelPanel';
import { initialWelcomeSteps, initialHomeBuyerSteps, initialListingSteps, initialPostShowingSteps } from './constants/funnelDefaults';
import { useAgentBranding } from '../hooks/useAgentBranding';
import { showToast } from '../utils/toastService';
import { SmartTaskService } from '../services/smartTaskService';
import {
  Property,
  View,
  Lead,
  LeadStatus,
  Appointment,
  AgentTask,
  AgentProfile,
  NotificationSettings,
  EmailSettings,
  CalendarSettings,
  BillingSettings,
  FollowUpSequence,
  Interaction,
  LeadFunnelType
} from '../types';

type MarketingSequencesResponse = {
  sequences?: FollowUpSequence[];
};

const STATIC_FUNNEL_SECTIONS = [
  {
    key: 'welcome-onboarding',
    badgeIcon: 'thunderstorm',
    badgeClassName: 'bg-teal-50 text-teal-700',
    badgeLabel: 'New Lead Welcome',
    title: 'Instant AI Welcome',
    description: 'Chatbot fires a warm intro email + SMS within 2 minutes.',
    iconColorClass: 'text-teal-600',
    initialSteps: initialWelcomeSteps,
    saveLabel: 'Save Welcome Sequence'
  },
  {
    key: 'buyers-fast-response',
    badgeIcon: 'bolt',
    badgeClassName: 'bg-indigo-50 text-indigo-700',
    badgeLabel: 'Buyer Nurture',
    title: 'Buyer Journey',
    description: 'Automated check-ins to qualify buyers and book tours.',
    iconColorClass: 'text-indigo-600',
    initialSteps: initialHomeBuyerSteps,
    saveLabel: 'Save Buyer Journey'
  },
  {
    key: 'seller-high-touch',
    badgeIcon: 'auto_fix_high',
    badgeClassName: 'bg-purple-50 text-purple-700',
    badgeLabel: 'Seller Nurture',
    title: 'Listing Prep & Story',
    description: 'Guide sellers through the "Home Story" process.',
    iconColorClass: 'text-purple-600',
    initialSteps: initialListingSteps,
    saveLabel: 'Save Seller Flow'
  },
  {
    key: 'post-showing-feedback',
    badgeIcon: 'mail',
    badgeClassName: 'bg-amber-50 text-amber-700',
    badgeLabel: 'Showing Follow-Up',
    title: 'Post-Showing Feedback',
    description: 'Auto-chase buyers for feedback after a tour.',
    iconColorClass: 'text-amber-600',
    initialSteps: initialPostShowingSteps,
    saveLabel: 'Save Follow-Up'
  }
];

const cloneDemoProperty = (property: Property, index: number): Property => {
  const description =
    typeof property.description === 'string'
      ? property.description
      : {
        ...property.description,
        paragraphs: [...property.description.paragraphs]
      };

  return {
    ...property,
    id: property.id || `demo-property-${index}`,
    description,
    heroPhotos: [...property.heroPhotos],
    galleryPhotos: property.galleryPhotos ? [...property.galleryPhotos] : undefined,
    features: [...property.features],
    appFeatures: { ...property.appFeatures },
    agent: { ...property.agent }
  };
};

import { useImpersonation } from '../context/ImpersonationContext';

interface AgentDashboardProps {
  isDemoMode?: boolean;
  isBlueprintMode?: boolean;
  demoListingCount?: number;
  preloadedProperties?: Property[];
}

// Helper functions to persist leads across hot reloads and refreshes
const SESSION_STORAGE_KEY = 'blueprint_session_leads';

const getSessionLeads = (): Lead[] => {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
};

const saveSessionLead = (lead: Lead) => {
  try {
    const existing = getSessionLeads();
    const updated = [lead, ...existing.filter(l => l.id !== lead.id)];
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to persist lead to session storage:', error);
  }
};

const AgentDashboard: React.FC<AgentDashboardProps> = ({ isDemoMode: propIsDemoMode = false, isBlueprintMode: propIsBlueprintMode = false, demoListingCount = 2, preloadedProperties }) => {
  // Setup Failsafe: Force Demo Mode if URL implies it
  const isBlueprintMode = propIsBlueprintMode || window.location.pathname.includes('blueprint');
  // Blueprint Mode is a special type of Demo Mode, so always set isDemoMode=true when in Blueprint
  const isDemoMode = propIsDemoMode || isBlueprintMode || window.location.pathname.includes('demo');

  const navigate = useNavigate();
  const location = useLocation();

  // Determine view from Path
  const getViewFromPath = useCallback((path: string): View => {
    // Split and get the last meaningful part to avoid ambiguous matches
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    switch (lastPart) {
      case 'ai-agent': return 'knowledge-base';
      case 'listings-v2': return 'listings-v2';
      case 'listings': return 'listings';
      case 'leads': return 'leads';
      case 'ai-card': return 'ai-card';
      case 'inbox': return 'inbox';
      case 'settings': return 'settings';
      case 'funnel-analytics': return 'funnel-analytics';
      case 'payments': return 'payments';
      case 'daily-pulse': return 'dashboard';
      case 'demo-dashboard': return 'dashboard';
      case 'dashboard-blueprint': return 'dashboard';
      case 'agent-blueprint-dashboard': return 'dashboard';
      case 'marketing': return 'marketing';
      default: return 'dashboard';
    }
  }, []);

  const [activeView, setActiveView] = useState<View>(getViewFromPath(location.pathname));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else if (isDemoMode || window.location.pathname.includes('blueprint')) {
        // Use a dedicated, ISOLATED Blueprint Identity (Clean Slate)
        // This UUID is distinct from the Admin/Imported data.
        setCurrentUserId('55555555-5555-5555-5555-555555555555');
      }
    });
  }, [isDemoMode]);

  // Sync state with URL changes
  useEffect(() => {
    setActiveView(getViewFromPath(location.pathname));
  }, [location.pathname, getViewFromPath]);

  const handleViewChange = useCallback((view: View) => {
    if (isDemoMode) {
      const basePath = isBlueprintMode ? '/agent-blueprint-dashboard' : '/demo-dashboard';
      let pathSuffix = '';
      switch (view) {
        case 'knowledge-base': pathSuffix = '/ai-agent'; break;
        case 'listings': pathSuffix = '/listings'; break;
        case 'listings-v2': pathSuffix = '/listings-v2'; break;
        case 'leads': pathSuffix = '/leads'; break;
        case 'ai-card': pathSuffix = '/ai-card'; break;
        case 'inbox': pathSuffix = '/inbox'; break;
        case 'settings': pathSuffix = '/settings'; break;
        case 'funnel-analytics': pathSuffix = '/funnel-analytics'; break;
        case 'payments': pathSuffix = '/payments'; break;
        case 'marketing': pathSuffix = '/marketing'; break;
        case 'dashboard': pathSuffix = '/daily-pulse'; break;
        default: pathSuffix = ''; break;
      }
      if (pathSuffix) {
        navigate(`${basePath}${pathSuffix}`);
        return;
      }
    }
    setActiveView(view);
  }, [isDemoMode, isBlueprintMode, navigate]);

  // --- SUPER ADMIN FAILSAFE ---
  // If us@homelistingai.com somehow lands here, KICK THEM OUT to admin dashboard.
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (user.email?.toLowerCase() === 'us@homelistingai.com' || user.email?.toLowerCase() === 'admin@homelistingai.com')) {
        console.log("👮 AgentDashboard Bouncer: Redirecting admin...");
        navigate('/admin-dashboard', { replace: true });
      }
    };
    if (!isDemoMode) checkUser();
  }, [isDemoMode, navigate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isImpersonating, stopImpersonating } = useImpersonation();

  // Force Impersonation for Blueprint Mode - DISABLED
  // useEffect(() => {
  //   if (isBlueprintMode && !isImpersonating) {
  //     impersonate('blueprint-agent');
  //   }
  // }, [isBlueprintMode, isImpersonating, impersonate]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  // Initialize leads with persistence
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (!(isDemoMode || isBlueprintMode)) return [];

    const storageKey = isBlueprintMode ? 'blueprint_leads' : 'demo_leads';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('Leads storage unavailable; using defaults.', e);
    }

    return isBlueprintMode ? [] : DEMO_FAT_LEADS;
  });

  // Persist leads when they change (debounced slightly to avoid thrashing)
  useEffect(() => {
    if (!(isDemoMode || isBlueprintMode)) return;
    const storageKey = isBlueprintMode ? 'blueprint_leads' : 'demo_leads';
    try {
      localStorage.setItem(storageKey, JSON.stringify(leads));
    } catch (e) {
      console.warn('Failed to persist leads to storage (continuing anyway)', e);
    }
  }, [leads, isDemoMode, isBlueprintMode]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Smart Task Management
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('completed_smart_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
      }
      return new Set();
    } catch (e) {
      console.warn('Task storage unavailable; starting clean.', e);
      return new Set();
    }
  });

  const [tasks, setTasks] = useState<AgentTask[]>([]);

  // Generate Smart Tasks
  useEffect(() => {
    if ((isDemoMode || isBlueprintMode) && leads.length > 0) {
      // Only run if we have data to avoid flashing empty state
      const smartTasks = SmartTaskService.generateSmartTasks(leads, appointments, properties);

      // Filter out completed tasks
      const activeTasks = smartTasks.map(t => ({
        ...t,
        isCompleted: completedTaskIds.has(t.id)
      }));

      setTasks(activeTasks);
    }
  }, [leads, appointments, properties, isDemoMode, isBlueprintMode, completedTaskIds]);

  // Persist Completed Tasks
  useEffect(() => {
    try {
      localStorage.setItem('completed_smart_tasks', JSON.stringify(Array.from(completedTaskIds)));
    } catch (e) {
      console.warn('Failed to persist smart task state (continuing)', e);
    }
  }, [completedTaskIds]);

  const handleTaskUpdate = (taskId: string, updates: Partial<AgentTask>) => {
    if (updates.isCompleted !== undefined) {
      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        if (updates.isCompleted) {
          next.add(taskId);
        } else {
          next.delete(taskId);
        }
        return next;
      });
    }
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  };

  const handleTaskAdd = (task: AgentTask) => {
    setTasks((prev) => [task, ...prev]);
  };

  const handleTaskDelete = (taskId: string) => {
    // Treat delete as completion for smart tasks
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };
  const [interactions, setInteractions] = useState<Interaction[]>(isDemoMode ? DEMO_FAT_INTERACTIONS : []);
  const [sequences, setSequences] = useState<FollowUpSequence[]>(isDemoMode ? DEMO_SEQUENCES : []);
  const [, setIsLeadsLoading] = useState<boolean>(false);

  const notifyApiError = useApiErrorNotifier();
  const { uiProfile } = useAgentBranding();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile>(uiProfile);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    newLead: true,
    leadAction: true,
    appointmentScheduled: true,
    aiInteraction: false,
    weeklySummary: true,
    appointmentReminders: true,
    taskReminders: true,
    marketingUpdates: true,
    propertyInquiries: true,
    showingConfirmations: true,
    hotLeads: true,
    smsNewLeadAlerts: true,
    notificationPhone: '+15550000000',
    smsActiveHoursStart: '09:00',
    smsActiveHoursEnd: '17:00',
    priceChanges: false,
    contractMilestones: true,
    browserNotifications: true,
    weekendNotifications: true,
    dailyDigest: true,
    weeklyReport: true,
    monthlyInsights: true,
    securityAlerts: true
  });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    integrationType: 'oauth',
    aiEmailProcessing: true,
    autoReply: true,
    leadScoring: true,
    followUpSequences: true
  });
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    integrationType: 'google',
    aiScheduling: true,
    conflictDetection: true,
    emailReminders: true,
    autoConfirm: false,
    workingHours: { start: '09:00', end: '17:00' },
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    defaultDuration: 60,
    bufferTime: 15,
    smsReminders: true,
    newAppointmentAlerts: true
  });
  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    planName: 'Complete AI Solution',
    planStatus: 'trialing',
    amount: 69,
    currency: 'USD',
    managedBy: 'paypal',
    renewalDate: null,
    cancellationRequestedAt: null,
    history: [
      { id: 'inv-123', date: '2024-07-15', amount: 69, status: 'Paid', description: 'Complete AI Solution - Monthly' }
    ]
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<{
    loginNotifications?: boolean;
    sessionTimeout?: number;
    analyticsEnabled?: boolean;
    twoFactorEnabled?: boolean;
  }>({
    loginNotifications: true,
    sessionTimeout: 24,
    analyticsEnabled: true,
    twoFactorEnabled: false
  });

  useEffect(() => {
    let isMounted = true;
    const loadSecuritySettings = async () => {
      if (isDemoMode) return;
      try {
        const payload = await securitySettingsService.fetch(agentProfile.slug || agentProfile.id || 'default');
        if (isMounted && payload?.settings) {
          setSecuritySettings(payload.settings);
        }
      } catch (error) {
        console.warn('Failed to load security settings', error);
      }
    };
    const loadNotificationSettings = async () => {
      if (isDemoMode) return;
      try {
        const payload = await notificationSettingsService.fetch(agentProfile.slug || agentProfile.id || 'default');
        if (isMounted && payload?.settings) {
          setNotificationSettings(payload.settings);
        }
      } catch (error) {
        console.warn('Failed to load notification settings', error);
      }
    };
    const loadBillingSettings = async () => {
      if (isDemoMode || !currentUserId) return;
      try {
        // Check if we are using the 'blueprint' user ID or real auth ID
        // currentUserId is set in a useEffect above based on session
        const settings = await billingSettingsService.get(currentUserId);
        if (isMounted && settings) {
          setBillingSettings(settings);
        }
      } catch (error) {
        console.warn('Failed to load billing settings', error);
      }
    };

    loadSecuritySettings();
    loadNotificationSettings();
    loadBillingSettings();
    return () => { isMounted = false; };
  }, [agentProfile.slug, agentProfile.id, isDemoMode, currentUserId]);

  const handleSaveSecuritySettings = async (settings: SecuritySettings) => {
    setSecuritySettings(settings); // Optimistic
    if (isDemoMode) return;
    try {
      await securitySettingsService.update(agentProfile.slug || agentProfile.id || 'default', settings);
      notifyApiError({ title: 'Security Settings Saved', description: 'Your security preferences have been updated.', error: null });
    } catch (error) {
      notifyApiError({ title: 'Save Failed', description: 'Could not save security settings.', error });
    }
  };

  const handleSaveNotificationSettings = async (settings: NotificationSettings) => {
    setNotificationSettings(settings); // Optimistic
    if (isDemoMode) return;
    try {
      await notificationSettingsService.update(agentProfile.slug || agentProfile.id || 'default', settings);
      notifyApiError({ title: 'Notification Settings Saved', description: 'Your alert preferences have been updated.', error: null });
    } catch (error) {
      notifyApiError({ title: 'Save Failed', description: 'Could not save notification settings.', error });
    }
  };

  const [isSetupDismissed, setIsSetupDismissed] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);

  useEffect(() => {
    // Only set profile from UI context, never force Sarah Johnson
    setAgentProfile(uiProfile);
  }, [uiProfile]);

  useEffect(() => {
    let isMounted = true;

    const loadProperties = async () => {
      setIsLoadingProperties(true);

      try {
        console.log('DEBUG: loadProperties', { isDemoMode, demoListingCount, hasPreloaded: !!preloadedProperties });

        // 0. Use Preloaded Properties (Fastest)
        if (preloadedProperties && preloadedProperties.length > 0 && !isDemoMode && !isBlueprintMode) {
          console.log("⚡️ Using preloaded properties from App.tsx");
          const sorted = [...preloadedProperties].sort((a, b) => (b.listedDate && a.listedDate) ? new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime() : 0);
          setProperties(sorted);
          setIsLoadingProperties(false);
          return;
        }

        if (isDemoMode) {
          console.log("DEBUG: Loading Demo Data", { isBlueprintMode });
          if (isBlueprintMode) {
            // BLUEPRINT HYBRID MODE: Fetch REAL properties for the Blueprint User (5555...) 
            // and MERGE them with the static demo properties. 
            // This allows "Live" testing (saving/loading) while keeping the demo feel.
            const blueprintId = currentUserId || '55555555-5555-5555-5555-555555555555';
            try {
              const realProperties = await listingsService.listProperties(blueprintId);
              // Combine real properties with static ones (Real ones first to show new adds)
              // Deduplicate by ID just in case
              const merged = [...realProperties, ...BLUEPRINT_PROPERTIES.filter(bp => !realProperties.some(rp => rp.id === bp.id))];
              setProperties(merged);
            } catch (e) {
              console.warn("Blueprint fetch failed, falling back to static only:", e);
              setProperties(BLUEPRINT_PROPERTIES);
            }
            setIsLoadingProperties(false);
            return;
          }
          const sliced = DEMO_FAT_PROPERTIES.slice(0, demoListingCount);
          setProperties(sliced.map((property, index) => cloneDemoProperty(property, index)));
          setIsLoadingProperties(false);
          return;
        }

        // Also check Blueprint Mode explicitly if not caught by isDemoMode (since we treat them separately in App.tsx sometimes)
        if (isBlueprintMode) {
          const blueprintId = currentUserId || '55555555-5555-5555-5555-555555555555';
          try {
            const realProperties = await listingsService.listProperties(blueprintId);
            const merged = [...realProperties, ...BLUEPRINT_PROPERTIES.filter(bp => !realProperties.some(rp => rp.id === bp.id))];
            setProperties(merged);
          } catch (e) {
            console.warn("Blueprint fetch failed (explicit block), using static:", e);
            setProperties(BLUEPRINT_PROPERTIES);
          }
          setIsLoadingProperties(false);
          return;
        }

        // 0. Optimistic Check (Bypass network hang)
        let resolvedUserId = null;
        try {
          const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          if (sbKey) {
            const raw = localStorage.getItem(sbKey);
            if (raw) {
              const sessionData = JSON.parse(raw);
              if (sessionData?.user?.id) resolvedUserId = sessionData.user.id;
            }
          }
        } catch (e) { /* ignore */ }

        let userResult;
        if (resolvedUserId) {
          console.log("⚡️ Optimistic Dashboard Auth: Using cached ID", resolvedUserId);
          userResult = { id: resolvedUserId };
        } else {
          // Fallback to Network (original logic)
          const userPromise = supabase.auth.getUser();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const authTimeoutPromise = new Promise<{ data: { user: any } }>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
          );
          const { data: { user } } = await Promise.race([userPromise, authTimeoutPromise]);
          userResult = user;
        }

        if (!userResult) {
          console.warn("⚠️ No authenticated user found for dashboard listing load.");
          if (isMounted) setProperties([]);
          return;
        }

        // Fetch with Safe Race and Auto-Cleanup
        let timeoutHandle: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise((_, reject) =>
          timeoutHandle = setTimeout(() => reject(new Error('Property load timeout')), 15000)
        );

        const listPromise = listingsService.listProperties(userResult.id);
        const list = await Promise.race([listPromise, timeoutPromise]) as Property[];

        // If we won the race, clear the bomb
        clearTimeout(timeoutHandle!);

        if (!isMounted) return;
        if (list && list.length > 0) {
          setProperties(list);
        } else {
          setProperties([]);
        }
      } catch (error) {
        console.error("Listing Load Error:", error);

        // Graceful fallback for blueprint/demo mode
        if (isBlueprintMode && isMounted) {
          console.log("⚠️ Load failed but in blueprint mode - using blueprint data");
          setProperties(BLUEPRINT_PROPERTIES);
          return;
        }

        if (isDemoMode && isMounted) {
          console.log("⚠️ Load failed but in demo mode - using demo data");
          const sliced = DEMO_FAT_PROPERTIES.slice(0, demoListingCount);
          setProperties(sliced.map((property, index) => cloneDemoProperty(property, index)));
          return;
        }

        // Only notify if it's a real error, not just a timeout, and not in demo mode
        if ((error as Error).message !== 'Property load timeout') {
          notifyApiError({
            title: 'Could not load listings',
            description: 'Could not load listings. Please refresh to try again.',
            error
          });
        }
        if (isMounted) {
          setProperties([]);
        }
      } finally {
        if (isMounted) setIsLoadingProperties(false);
      }
    };

    loadProperties();

    return () => {
      isMounted = false;
    };
  }, [isDemoMode, isBlueprintMode, notifyApiError, demoListingCount, preloadedProperties, currentUserId]);

  useEffect(() => {
    let isMounted = true;

    const loadCalendarSettings = async () => {
      if (isDemoMode) return;
      try {
        const payload = await calendarSettingsService.fetch(agentProfile.slug ?? 'blueprint-agent');
        if (isMounted && payload?.settings) {
          setCalendarSettings(payload.settings);
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load calendar settings',
          description: 'We could not reach the calendar service. Please refresh to try again.',
          error
        });
      }
    };

    void loadCalendarSettings();

    return () => {
      isMounted = false;
    };
  }, [agentProfile.slug, isDemoMode, notifyApiError, currentUserId]); // Added currentUserId dependency

  const handleUpgradeSubscription = async () => {
    try {
      if (!agentProfile.email || !currentUserId) {
        notifyApiError({ title: 'Upgrade Failed', description: 'Missing account information.', error: null });
        return;
      }

      // Show loading state if needed, or simplified button text change
      // For now, we rely on the redirect behavior
      const { url } = await billingSettingsService.createCheckoutSession(currentUserId, agentProfile.email);
      window.location.href = url;
    } catch (error) {
      notifyApiError({ title: 'Checkout Failed', description: 'Could not start checkout session.', error });
    }
  };

  const leadsMountedRef = useRef(true);

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
  };

  const refreshLeads = useCallback(async () => {
    console.log('[refreshLeads] Called', { isDemoMode, isBlueprintMode });
    if (isDemoMode) {
      if (isBlueprintMode) {
        // BLUEPRINT HYBRID MODE: Fetch REAL leads for the Blueprint User (5555...)
        // and MERGE them with the static demo leads.
        const sessionLeads = getSessionLeads();
        let databaseLeads: Lead[] = [];

        try {
          const blueprintId = '55555555-5555-5555-5555-555555555555';
          const response = await fetch(`/api/blueprint/leads?userId=${blueprintId}`);
          if (response.ok) {
            const rows = await response.json();
            // Map DB rows to Lead objects (similar to leadsService mapping)
            // We can reuse leadsService.mapLeadRow if exported, or just map manually here for safety
            databaseLeads = rows.map((row: any) => ({
              id: row.id,
              name: row.name,
              email: row.email || '',
              phone: row.phone || '',
              status: row.status || 'New',
              date: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
              lastMessage: row.last_message || '',
              source: row.source || 'Unknown',
              notes: row.notes || '',
              score: row.score ? {
                totalScore: row.score,
                tier: row.score >= 90 ? 'Hot' : row.score >= 70 ? 'Qualified' : row.score >= 40 ? 'Warm' : 'Cold',
                leadId: row.id,
                lastUpdated: row.created_at || new Date().toISOString(),
                scoreHistory: []
              } : undefined
            }));
            console.log('✅ Loaded real blueprint leads:', databaseLeads.length);
          }
        } catch (e) {
          console.warn('Failed to load real blueprint leads:', e);
        }

        // Merge: Session > Database > Static
        // Deduplicate by ID
        const allLeads = [...sessionLeads, ...databaseLeads, ...BLUEPRINT_LEADS];
        const uniqueLeads = Array.from(new Map(allLeads.map(item => [item.id, item])).values());

        setLeads(uniqueLeads);
      } else {
        setLeads(DEMO_FAT_LEADS);
      }
      setIsLeadsLoading(false);
      return;
    }
    try {
      setIsLeadsLoading(true);
      const payload = await leadsService.list();
      if (leadsMountedRef.current && Array.isArray(payload?.leads)) {
        setLeads(payload.leads);
      }
    } catch (error) {
      notifyApiError({
        title: 'Could not load leads',
        description: 'Could not load leads. Please refresh to try again.',
        error
      });
    } finally {
      if (leadsMountedRef.current) {
        setIsLeadsLoading(false);
      }
    }
  }, [notifyApiError, isDemoMode, isBlueprintMode]);

  useEffect(() => {
    leadsMountedRef.current = true;
    refreshLeads();
    return () => {
      leadsMountedRef.current = false;
    };
  }, [refreshLeads]);

  const refreshAppointments = useCallback(async () => {
    if (isDemoMode) {
      if (isBlueprintMode) {
        setAppointments(BLUEPRINT_APPOINTMENTS);
      } else {
        setAppointments(DEMO_FAT_APPOINTMENTS);
      }
      return;
    }
    try {
      const list = await listAppointments();
      if (leadsMountedRef.current) {
        const mapped: Appointment[] = list.map(row => ({
          id: row.id,
          type: row.kind,
          leadId: row.lead_id,
          propertyId: row.property_id,
          propertyAddress: row.property_address || undefined,
          kind: row.kind,
          name: row.name,
          email: row.email || '',
          phone: row.phone || '',
          date: row.date,
          time: row.time_label,
          startIso: row.start_iso,
          endIso: row.end_iso,
          meetLink: row.meet_link || undefined,
          notes: row.notes || '',
          status: row.status,
          remindAgent: row.remind_agent,
          remindClient: row.remind_client,
          agentReminderMinutes: row.agent_reminder_minutes_before,
          clientReminderMinutes: row.client_reminder_minutes_before,
          leadName: row.name
        }));
        setAppointments(mapped);
      }
    } catch (error) {
      console.warn('Failed to load appointments', error);
    }
  }, [isDemoMode, isBlueprintMode]);

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  useEffect(() => {
    let isMounted = true;

    const loadSequences = async () => {
      if (isDemoMode) {
        if (isBlueprintMode) {
          if (isMounted) setSequences(BLUEPRINT_SEQUENCES);
        } else {
          if (isMounted) setSequences(DEMO_SEQUENCES);
        }
        return;
      }
      if (sequences.length) return;

      try {
        const response = await fetch('/api/admin/marketing/sequences');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: MarketingSequencesResponse = await response.json();
        if (!isMounted) return;

        if (Array.isArray(data?.sequences)) {
          setSequences(
            data.sequences.map((sequence) => ({
              ...sequence,
              steps: Array.isArray(sequence?.steps) ? sequence.steps : []
            }))
          );
        }
      } catch (error) {
        notifyApiError({
          title: 'Could not load follow-up sequences',
          description: 'Please refresh the page or try again later.',
          error
        });
      }
    };

    loadSequences();

    return () => {
      isMounted = false;
    };
    return () => {
      isMounted = false;
    };
  }, [isDemoMode, isBlueprintMode, sequences.length, notifyApiError]);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setActiveView('property');
  };

  const handleSetProperty = async (updated: Property) => {
    // Check if property exists in current array
    // Check if property exists in current array
    const existingIndex = properties.findIndex((property) => property.id === updated.id);

    // Check if we are replacing an old selected property (e.g. demo -> real ID)
    const oldId = selectedPropertyId;
    const isIdChanged = oldId && oldId !== updated.id;

    if (existingIndex === -1) {
      if (isIdChanged && oldId) {
        // ID changed (e.g. demo to real). Replace the old one.
        setProperties((prev) => prev.map((p) => (p.id === oldId ? updated : p)));
        // Update selection to new ID
        setSelectedPropertyId(updated.id);
      } else {
        // Property doesn't exist and no old ID match - this is a NEW property
        setProperties((prev) => [updated, ...prev]);
      }
    } else {
      // Property exists - update it
      setProperties((prev) => prev.map((property) => (property.id === updated.id ? updated : property)));
    }

    if (isDemoMode) {
      return;
    }

    if (
      updated.id.startsWith('demo-') ||
      updated.id.startsWith('prop-demo-') ||
      updated.id.startsWith('preview-') ||
      updated.id.startsWith('blueprint-') // Fix: Ignore blueprint demo listing
    ) {
      return;
    }

    const previousVersion = properties.find((property) => property.id === updated.id);

    try {
      const persisted = await listingsService.updateProperty(updated.id, updated);
      setProperties((prev) => prev.map((property) => (property.id === persisted.id ? persisted : property)));
    } catch (error) {
      notifyApiError({
        title: 'Could not save property changes',
        description: 'We restored your previous details. Please try again.',
        error
      });
      if (previousVersion) {
        setProperties((prev) => prev.map((property) => (property.id === previousVersion.id ? previousVersion : property)));
      }
    }
  };

  const handleSaveNewProperty = (newProperty: Property) => {
    const nextProperty =
      isDemoMode && !newProperty.id.startsWith('demo-')
        ? { ...newProperty, id: `demo-${Date.now()}` }
        : newProperty;

    setProperties((prev) => {
      // Prevent duplicates: If ID exists, update it; otherwise prepend.
      const exists = prev.some(p => p.id === nextProperty.id);
      if (exists) {
        return prev.map(p => p.id === nextProperty.id ? nextProperty : p);
      }
      return [nextProperty, ...prev];
    });

    setSelectedPropertyId(nextProperty.id);
    setActiveView('property');
  };

  const handleDeleteProperty = async (id: string) => {
    const removedProperty = properties.find((property) => property.id === id) || null;
    setProperties((prev) => prev.filter((property) => property.id !== id));
    if (selectedPropertyId === id) {
      setSelectedPropertyId(null);
      setActiveView('listings');
    }

    if (isDemoMode) {
      return;
    }

    if (!id.startsWith('demo-') && !id.startsWith('prop-demo-') && !id.startsWith('preview-') && !id.startsWith('blueprint-')) {
      try {
        await listingsService.deleteProperty(id);
        showToast.success('Listing deleted successfully');
      } catch (error) {
        console.error('DELETE PROPERTY ERROR:', error);
        setProperties(prev => [...prev, removedProperty!].filter(Boolean) as Property[]);
        showToast.error('Delete failed. Try again.');
      }
    } else {
      showToast.success('Demo listing removed');
    }
  };



  const blueprintSidekickTemplates = [
    {
      id: 'agent',
      label: 'AI Agent',
      description: 'Your all-in-one operations partner. Handles marketing, lead follow-up, and admin tasks.',
      type: 'agent',
      icon: 'smart_toy',
      color: '#4F46E5',
      defaultName: 'AI Agent',
      defaultVoice: 'nova',
      personality: {
        description: 'You are the Agent’s primary Assistant. You are a world-class real estate assistant, marketer, and operations specialist. You can draft emails, summarize conversations, provide pricing insights, and manage the agent’s daily pulse. Your tone is professional yet friendly, and always highly efficient.',
        traits: ['all-in-one', 'efficient', 'professional'],
        preset: 'professional'
      }
    }
  ]

  const handleAddNewLead = async (leadData: { name: string; email: string; phone: string; message: string; source: string; funnelType?: string; status?: string }) => {
    if (isDemoMode) {
      const fallbackLead: Lead = {
        id: `lead-${Date.now()}`,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: (leadData.status as LeadStatus) || 'New',
        date: new Date().toISOString(),
        lastMessage: leadData.message,
        source: leadData.source || 'Manual Entry'
      };

      // PERSIST TO SESSION STORAGE
      saveSessionLead(fallbackLead);

      setLeads((prev) => [fallbackLead, ...prev]);
      void logLeadCaptured(fallbackLead);
      return;
    }

    try {
      // Use Admin Service to trigger backend logic (Scoring, Funnels, etc.)
      const createdLead = await adminLeadsService.create({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        source: leadData.source || 'Website',
        notes: leadData.message, // Map message to notes
        status: (leadData.status as LeadStatus) || undefined,
        funnelType: (leadData.funnelType as LeadFunnelType) || undefined,
        funnelId: (leadData.funnelType === 'universal_sales' ? 'universal_sales' : undefined), // Auto-map known funnels if needed
        userId: isBlueprintMode ? (agentProfile?.id || 'blueprint-agent') : undefined // Force attribution in Blueprint Mode
      });

      // PERSIST FOR SESSION IF IN BLUEPRINT MODE (Double safety, though backend should handle it)
      if (isBlueprintMode) {
        saveSessionLead(createdLead);
      }

      setLeads((prev) => [createdLead, ...prev]);
      void logLeadCaptured(createdLead);

      notifyApiError({
        title: 'Lead Added',
        description: `${createdLead.name} has been added and enrolled in automation.`,
        error: null
      });

    } catch (error) {
      notifyApiError({
        title: 'Could not save lead',
        description: 'Please check your connection and try again.',
        error
      });
    }
  }

  const handleNewAppointment = (appointment: Appointment) => {
    setAppointments((prev) => [appointment, ...prev]);
    const matchedLead = leads.find((lead) => lead.id === (appointment.leadId ?? ''));
    if (matchedLead) {
      void logAppointmentScheduled(appointment, matchedLead);
    } else {
      void logAppointmentScheduled(appointment);
    }
  };

  const resetToDashboard = () => {
    handleViewChange('dashboard');
    setSelectedPropertyId(null);
  };

  const handleBackToListings = () => {
    handleViewChange('listings');
    setSelectedPropertyId(null);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    // Store previous state for rollback
    const previousLeads = leads;

    try {
      // Optimistic update - remove from UI immediately
      setLeads(prev => prev.filter(l => l.id !== leadId));

      // Call backend API to actually delete
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Lead deleted successfully:', result);

    } catch (error) {
      console.error('❌ Failed to delete lead:', error);
      // Rollback on error
      setLeads(previousLeads);
      showToast.error('Failed to delete lead. Please try again.');
    }
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Setup Widget */}
            {!isSetupDismissed && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                  <svg width="300" height="300" viewBox="0 0 100 100" fill="white">
                    <circle cx="80" cy="20" r="40" />
                    <circle cx="10" cy="90" r="30" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Welcome to your AI Command Center, {agentProfile.name ? agentProfile.name.split(' ')[0] : 'Agent'}! 🚀</h2>
                      <p className="text-indigo-100 max-w-2xl">
                        Let's get your AI Agent fully trained and operational. Complete these 5 steps to unlock your "AI-Ready" badge.
                      </p>
                    </div>
                    <div className="absolute top-6 right-6">
                      <button
                        onClick={() => setIsSetupDismissed(true)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        title="Dismiss Setup Guide"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Step 1: AI Card */}
                    <button
                      onClick={() => handleViewChange('ai-card')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          1
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">1. AI Business Card</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Fill out your bio & upload your headshot so your AI knows who you are.</p>
                    </button>

                    {/* Step 2: Train Brain */}
                    <button
                      onClick={() => handleViewChange('knowledge-base')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          2
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">15 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">2. Train Your Brain</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Upload PDFs or add text to train your "Personal GPT" on your business.</p>
                    </button>

                    {/* Step 3: Connect Email */}
                    <button
                      onClick={() => handleViewChange('settings')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          3
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">2 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">3. Connect Email</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Sync your Gmail so your AI can draft replies and book meetings.</p>
                    </button>

                    {/* Step 5: Activate */}
                    <button
                      onClick={() => handleViewChange('listings')}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          5
                        </div>
                        <span className="text-xs font-medium bg-emerald-400/20 px-2 py-0.5 rounded text-emerald-100 border border-emerald-400/30">Finish</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">5. Go Live!</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Activate your "AI Receptionist". Now you're free to sell houses.</p>
                    </button>

                    {/* Step 6: Install App */}
                    <button
                      onClick={() => setShowInstallGuide(true)}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                          6
                        </div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">Install App</h3>
                      <p className="text-xs text-indigo-100 leading-relaxed">Get the best experience on your phone.</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Stats Grid */}
            <Dashboard
              agentProfile={agentProfile}
              properties={properties}
              leads={leads}
              appointments={appointments}
              tasks={tasks}
              onSelectProperty={handleSelectProperty}
              onTaskUpdate={handleTaskUpdate}
              onTaskAdd={(t) => handleTaskAdd(t as AgentTask)}
              onTaskDelete={handleTaskDelete}
              onViewLeads={() => handleViewChange('leads')}
              onViewLogs={() => handleViewChange('dashboard')}
              onViewListings={() => handleViewChange('listings')}
              onViewAppointments={() => handleViewChange('leads')}
            />

            {/* Usage Stats - Mobile Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <UsageStatsCard profile={agentProfile} />
              {/* Placeholders or other widgets could go here */}
            </div>
          </div>
        );
      case 'leads':
        return (
          <LeadsAndAppointmentsPage
            leads={leads}
            appointments={appointments}
            onAddNewLead={handleAddNewLead}
            onBackToDashboard={resetToDashboard}
            onNewAppointment={handleNewAppointment}
            onRefreshData={refreshLeads}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
          />
        );
      case 'ai-card':
        return <AICardPage isDemoMode={isDemoMode} isBlueprintMode={isBlueprintMode} />;
      case 'ai-conversations':
      case 'inbox':
      case 'ai-interaction-hub':
        return (
          <AIInteractionHubPage
            properties={properties}
            interactions={interactions}
            setInteractions={setInteractions}
            onAddNewLead={handleAddNewLead}
            onBackToDashboard={resetToDashboard}
            isDemoMode={isDemoMode}
          />
        );
      case 'listings':
        return (
          <ListingsPage
            properties={properties}
            onSelectProperty={(id, action) => {
              if (action === 'edit') {
                setSelectedPropertyId(id);
                setActiveView('edit-listing');
              } else {
                handleSelectProperty(id);
              }
            }}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => { setSelectedPropertyId(id); setActiveView('property'); }}
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );
      case 'listings-v2':
        return (
          <ListingStudioV2Page
            properties={properties}
            agentProfile={agentProfile}
            onBackToListings={() => setActiveView('listings')}
          />
        );
      case 'add-listing':
        return (
          <AddListingPage
            onCancel={handleBackToListings}
            onSave={handleSaveNewProperty}
            agentProfile={agentProfile}
            isDemoMode={isDemoMode}
          />
        );
      case 'edit-listing':
        return selectedProperty ? (
          <AddListingPage
            onCancel={handleBackToListings}
            onSave={handleSetProperty}
            initialProperty={selectedProperty}
            agentProfile={agentProfile}
            isDemoMode={isDemoMode}
          />
        ) : (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => { setSelectedPropertyId(id); setActiveView('property'); }}
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );
      case 'property':
        return selectedProperty ? (
          <PropertyPage property={selectedProperty} setProperty={handleSetProperty} onBack={() => setActiveView('listings')} leadCount={leads.filter(l => l.interestedProperties?.includes(selectedProperty.id)).length} />
        ) : (
          <ListingsPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onAddNew={() => setActiveView('add-listing')}
            onDeleteProperty={handleDeleteProperty}
            onBackToDashboard={resetToDashboard}
            onOpenMarketing={(id) => { setSelectedPropertyId(id); setActiveView('property'); }}
            onOpenBuilder={(id) => { setSelectedPropertyId(id); setActiveView('edit-listing'); }}
          />
        );

      case 'knowledge-base':
        return <AgentAISidekicksPage sidekickTemplatesOverride={blueprintSidekickTemplates} isDemoMode={isDemoMode} />;
      case 'funnel-analytics':
        return (
          <UniversalFunnelPanel
            userId={currentUserId || agentProfile.id || 'demo-agent'}
            isDemoMode={isDemoMode}
            isBlueprintMode={isBlueprintMode}
            onBackToDashboard={resetToDashboard}
            funnelSections={STATIC_FUNNEL_SECTIONS}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            userId={agentProfile.slug ?? 'blueprint-agent'}
            userProfile={agentProfile}
            onSaveProfile={async (profile) => setAgentProfile(profile)}
            notificationSettings={notificationSettings}
            onSaveNotifications={handleSaveNotificationSettings}
            emailSettings={emailSettings}
            onSaveEmailSettings={async (settings) => setEmailSettings(settings)}
            calendarSettings={calendarSettings}
            onSaveCalendarSettings={async (settings) => setCalendarSettings(settings)}
            billingSettings={billingSettings}
            onSaveBillingSettings={async (settings) => setBillingSettings(settings)}
            securitySettings={securitySettings}
            onSaveSecuritySettings={handleSaveSecuritySettings}
            onBackToDashboard={resetToDashboard}
            onNavigateToAICard={() => setActiveView('ai-card')}
            isDemoMode={isDemoMode}
          />
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'marketing':
        return (
          <MarketingHub
            agentProfile={agentProfile}
            properties={properties}
            isDemoMode={isDemoMode}
          />
        );


      default:
        return (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <h2 className="text-xl font-semibold text-slate-800">Blueprint View Placeholder</h2>
            <p className="text-slate-500 mt-2">We haven&apos;t mapped this tab yet inside the blueprint. Pick another tab from the sidebar.</p>
          </div>
        );
    }
  };

  const isIntegrated = !isDemoMode && !isBlueprintMode;


  // Navigation handlers that adapt to mode
  const handleViewLeads = (leadId?: string, action?: 'view' | 'contact') => {
    if (isIntegrated) {
      const p = new URLSearchParams();
      if (leadId) p.set('id', leadId);
      if (action) p.set('action', action);
      navigate(`/leads?${p.toString()}`);
    }
    else setActiveView('leads');
  };

  const handleViewLogs = () => {
    if (isIntegrated) navigate('/inbox');
    else setActiveView('ai-interaction-hub');
  };

  const handleViewListings = () => {
    if (isIntegrated) navigate('/listings');
    else setActiveView('listings');
  };

  const handleViewAppointments = () => {
    if (isIntegrated) navigate('/leads?tab=appointments');
    else setActiveView('leads');
  };

  // Placeholder for renderMobileTabs if it's not defined elsewhere
  const renderMobileTabs = () => null;

  return (
    <div className={`flex ${isIntegrated ? 'flex-col min-h-full' : 'h-screen overflow-hidden'} bg-slate-50`}>
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center font-bold shadow-md flex items-center justify-center gap-4">
          <span>👀 Viewing as {uiProfile.name} ({uiProfile.email})</span>
          <button
            onClick={() => {
              stopImpersonating();
              window.location.hash = '#/admin';
            }}
            className="bg-white text-amber-600 px-3 py-1 rounded-full text-sm hover:bg-amber-50 transition-colors"
          >
            Stop Impersonating
          </button>
        </div>
      )}


      {/* Only render Sidebar in Demo/Standalone mode */}
      {!isIntegrated && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(!isSidebarOpen)}
          isDemoMode={isDemoMode}
          isBlueprintMode={isBlueprintMode}
        />
      )}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isImpersonating ? 'mt-10' : ''}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isIntegrated && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-slate-500 hover:text-slate-700 lg:hidden"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-800">
              {activeView === 'dashboard' ? 'My Daily Pulse' :
                activeView === 'leads' ? 'Leads & Appointments' :
                  activeView === 'listings' ? 'AI Listings' :
                    activeView === 'listings-v2' ? 'Listings Studio V2' :
                    activeView === 'add-listing' ? 'Add Listing' :
                      activeView === 'ai-interaction-hub' ? 'AI Interaction Hub' :
                        activeView === 'ai-conversations' ? 'AI Conversations' :
                          activeView === 'ai-sidekicks' ? 'AI Agent' :
                            activeView === 'knowledge-base' ? 'AI Agent' :
                              activeView === 'marketing' ? 'Marketing Hub' :
                                activeView === 'payments' ? 'Payments & Store' :
                                  activeView === 'marketing-reports' ? 'Marketing Reports' :
                                    activeView === 'funnel-analytics' ? '' :
                                      activeView === 'settings' ? 'Settings' :
                                        activeView === 'ai-card' ? 'AI Business Card' :
                                          'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {currentUserId ? (
              <div className="relative z-50">
                <NotificationSystem userId={currentUserId} />
              </div>
            ) : (
              <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            )}
            {/* TABS HEADER */}
            {renderMobileTabs()}

            {/* TRIAL BANNER - "THE BRIDGE" */}
            {billingSettings.planStatus === 'trialing' && !isDemoMode && (
              <div className="mb-6 mx-4 md:mx-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden animate-fadeIn">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-400 opacity-10 rounded-full blur-xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-yellow-300">verified</span>
                      <h3 className="text-xl font-bold">Founding Member Trial Active</h3>
                    </div>
                    <p className="text-white/90 text-sm md:text-base">
                      Your 3-day full access pass is live. Lock in your <strong>$69/mo</strong> rate (vs $99) before the trial expires.
                    </p>
                  </div>
                  <button
                    onClick={handleUpgradeSubscription}
                    className="whitespace-nowrap px-6 py-3 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 hover:scale-105 transition-all shadow-md flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xl">rocket_launch</span>
                    Upgrade Now
                  </button>
                </div>
              </div>
            )}

            {/* MAIN LAYOUT */}
            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{agentProfile.name || 'Agent'}</p>
                <p className="text-xs text-slate-500">{agentProfile.title}</p>
              </div>
              {agentProfile.headshotUrl ? (
                <img
                  src={agentProfile.headshotUrl}
                  alt={agentProfile.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border-2 border-white shadow-sm">
                  <span className="material-symbols-outlined">person</span>
                </div>
              )}

            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-0 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' ? (
              <div className="space-y-6">
                {/* Welcome Setup Widget */}
                {!isSetupDismissed && (
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-none md:rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                      <svg width="300" height="300" viewBox="0 0 100 100" fill="white">
                        <circle cx="80" cy="20" r="40" />
                        <circle cx="10" cy="90" r="30" />
                      </svg>
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">Welcome to your AI Command Center, {agentProfile.name ? agentProfile.name.split(' ')[0] : 'Agent'}! 🚀</h2>
                          <p className="text-indigo-100 max-w-2xl">
                            Let's get your AI Agent fully trained and operational. Complete these 5 steps to unlock your "AI-Ready" badge.
                          </p>
                        </div>
                        <div className="absolute top-6 right-6">
                          <button
                            onClick={() => setIsSetupDismissed(true)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            title="Dismiss Setup Guide"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Step 1: AI Card */}
                        <button
                          onClick={() => isIntegrated ? navigate('/ai-card') : setActiveView('ai-card')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              1
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">1. AI Business Card</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Fill out your bio & upload your headshot so your AI knows who you are.</p>
                        </button>

                        {/* Step 2: Train Brain */}
                        <button
                          onClick={() => isIntegrated ? navigate('/knowledge-base') : setActiveView('knowledge-base')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              2
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">15 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">2. Train Your Brain</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Upload PDFs or add text to train your "Personal GPT" on your business.</p>
                        </button>

                        {/* Step 3: Connect Email */}
                        <button
                          onClick={() => isIntegrated ? navigate('/settings') : setActiveView('settings')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              3
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">2 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">3. Connect Email</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Sync your Gmail so your AI can draft replies and book meetings.</p>
                        </button>

                        {/* Step 4: First Listing */}
                        <button
                          onClick={() => isIntegrated ? navigate('/add-listing') : setActiveView('add-listing')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              4
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">10 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">4. Add Listing</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Create your first AI-powered property listing to see the magic.</p>
                        </button>

                        {/* Step 5: Funnels */}
                        <button
                          onClick={() => isIntegrated ? navigate('/funnel-analytics') : setActiveView('funnel-analytics')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              5
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded text-white">5 min</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">5. Review Funnels</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Check your automated follow-up sequences and customize them.</p>
                        </button>

                        {/* Step 6: Install App */}
                        <button
                          onClick={() => setShowPWAInstall(true)}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-left transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border border-white/30">
                              6
                            </div>
                            <span className="text-xs font-medium bg-emerald-400/20 px-2 py-0.5 rounded text-emerald-100 border border-emerald-400/30">Finish</span>
                          </div>
                          <h3 className="font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">6. Install App</h3>
                          <p className="text-xs text-indigo-100 leading-relaxed">Get the app on your phone for instant lead alerts.</p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PWA Install Modal for Dashboard Step */}
                <PWAInstallModal
                  isOpen={showPWAInstall}
                  onClose={() => setShowPWAInstall(false)}
                />

                {isLoadingProperties && properties.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Loading listings…
                  </div>
                ) : (
                  <Dashboard
                    agentProfile={agentProfile}
                    properties={properties}
                    leads={leads}
                    appointments={appointments}
                    tasks={tasks}
                    onSelectProperty={handleSelectProperty}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskAdd={handleTaskAdd}
                    onTaskDelete={handleTaskDelete}
                    onViewLeads={handleViewLeads}
                    onViewLogs={handleViewLogs}
                    onViewListings={handleViewListings}
                    onViewAppointments={handleViewAppointments}
                  />
                )}
              </div>
            ) : (
              /* Only render other views if NOT integrated. If integrated, we should have navigated away. 
                 However, for safety / demo mode, we keep this fallback */
              renderMainContent()
            )}
          </div>
        </main>
        <PWAInstallModal
          isOpen={showInstallGuide}
          onClose={() => setShowInstallGuide(false)}
        />

      </div>
    </div>
  );
};

export default AgentDashboard;
