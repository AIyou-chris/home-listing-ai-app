import React, { useState, useEffect } from 'react';
import { useAdminModal } from '../context/AdminModalContext';
import { AdminModals } from './AdminModals';
import { View, User, Lead, LeadStatus, SequenceStep } from '../types';
import { auth, db, functions } from '../services/firebase';
// Firebase functions/firestore removed
import { fileUploadService } from '../services/fileUploadService';
import AdminDashboard from './AdminDashboard';
import ExportModal from './ExportModal';
import { AuthService } from '../services/authService';
import { googleOAuthService } from '../services/googleOAuthService';
import { useScheduler } from '../context/SchedulerContext';
import CalendarView from './CalendarView';
import AdminContactsPage from './AdminContactsPage';
import AdminCRMContactsSupabase from './AdminCRMContactsSupabase';
import AdminAgentsPage from './AdminAgentsPage';
import AIAgentHub from './AIAgentHub';
import { personaService } from '../services/personaService';

// Utility: sanitize objects for Firestore by removing undefined values
const sanitizeForFirebase = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object' || data === null) return data;
  if (Array.isArray(data)) return data.map(item => sanitizeForFirebase(item));
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue; // skip undefined
    const v = sanitizeForFirebase(value);
    // Only include keys whose sanitized value is not undefined
    if (v !== undefined) sanitized[key] = v;
  }
  return sanitized;
};

interface AdminLayoutProps {
  currentView: View;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ currentView }) => {
  const { openScheduler } = useScheduler();
  // Use centralized modal context
  const {
    showAddUserModal,
    showEditUserModal,
    setShowAddUserModal,
    setShowEditUserModal,
    setEditingUser,
    setEditUserForm,
    editingUser,
    newUserForm,
    editUserForm,
    setNewUserForm,
    showAddLeadModal,
    showEditLeadModal,
    setShowAddLeadModal,
    setShowEditLeadModal,
    setEditingLead,
    setEditLeadForm,
    editingLead,
    newLeadForm,
    editLeadForm,
    setNewLeadForm,
    closeAllModals
  } = useAdminModal();
  
  // Local state for data management (should be moved to context later)
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('adminUsers');
    const defaultUsers: User[] = [
      {
        id: '1',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'agent',
        plan: 'Solo Agent',
        status: 'Active',
        dateJoined: '2024-01-01',
        lastActive: '2024-01-15T12:00:00Z',
        propertiesCount: 0,
        leadsCount: 0,
        aiInteractions: 0,
        subscriptionStatus: 'active',
        renewalDate: '2025-01-01'
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'admin',
        plan: 'Pro Team',
        status: 'Active',
        dateJoined: '2024-01-01',
        lastActive: '2024-01-14T09:00:00Z',
        propertiesCount: 0,
        leadsCount: 0,
        aiInteractions: 0,
        subscriptionStatus: 'active',
        renewalDate: '2025-01-01'
      },
      {
        id: '3',
        name: 'Mike Davis',
        email: 'mike@example.com',
        role: 'agent',
        plan: 'Solo Agent',
        status: 'Inactive',
        dateJoined: '2023-12-15',
        lastActive: '2024-01-10T15:00:00Z',
        propertiesCount: 0,
        leadsCount: 0,
        aiInteractions: 0,
        subscriptionStatus: 'expired',
        renewalDate: '2024-01-01'
      }
    ];
    
    if (savedUsers) {
      try {
        return JSON.parse(savedUsers);
      } catch (error) {
        console.error('Error parsing saved users:', error);
        return defaultUsers;
      }
    }
    return defaultUsers;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const savedLeads = localStorage.getItem('adminLeads');
    const defaultLeads = [
      { id: '1', name: 'Alice Cooper', email: 'alice@example.com', phone: '(555) 123-4567', status: 'new', source: 'Website', notes: 'Interested in downtown properties', createdAt: '2024-01-15' },
      { id: '2', name: 'Bob Wilson', email: 'bob@example.com', phone: '(555) 987-6543', status: 'contacted', source: 'Referral', notes: 'Looking for family home', createdAt: '2024-01-14' },
      { id: '3', name: 'Carol Brown', email: 'carol@example.com', phone: '(555) 456-7890', status: 'qualified', source: 'Social Media', notes: 'First-time buyer', createdAt: '2024-01-13' }
    ];
    
    if (savedLeads) {
      try {
        return JSON.parse(savedLeads);
      } catch (error) {
        console.error('Error parsing saved leads:', error);
        return defaultLeads;
      }
    }
    return defaultLeads;
  });
  
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);

  useEffect(() => {
    // Lightweight check on mount
    try {
      setGoogleConnected(googleOAuthService.isAuthenticated());
    } catch {}
  }, []);

  // Save users to localStorage when they change
  useEffect(() => {
    localStorage.setItem('adminUsers', JSON.stringify(users));
  }, [users]);

  // Save leads to localStorage when they change
  useEffect(() => {
    localStorage.setItem('adminLeads', JSON.stringify(leads));
  }, [leads]);
  // Local state for component functionality






  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeContactTab, setActiveContactTab] = useState<'email' | 'call' | 'note'>('email');
  const [noteContent, setNoteContent] = useState('');
  const [activeLeadsTab, setActiveLeadsTab] = useState<'leads' | 'appointments' | 'scoring'>('leads');
  const [activeAIContentTab, setActiveAIContentTab] = useState<'ai-content' | 'custom-proposals' | 'blog-articles'>('ai-content');
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<'god' | 'sales' | 'support' | 'marketing' | 'personalities'>('god');
  const [aiChatMessage, setAiChatMessage] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      id: '1',
      type: 'ai',
      message: "Hello! I'm your platform AI assistant. I can help you with:\n• Platform performance analysis\n• User support and training\n• Market insights and trends\n• Content generation for agents\n• System optimization recommendations\n\nHow can I assist you today?",
      timestamp: new Date(Date.now() - 120000).toISOString()
    }
  ]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    type: 'Showing',
    notes: ''
  });

  // Custom Proposal State
  const [proposalStep, setProposalStep] = useState(0);
  const [proposalData, setProposalData] = useState({
    clientName: '',
    projectType: '',
    budget: '',
    timeline: '',
    requirements: '',
    features: [] as string[],
    pricing: {
      basePrice: 0,
      features: [] as { name: string; price: number }[],
      total: 0
    }
  });
  const [proposalQuestions] = useState([
    {
      id: 1,
      question: "What's the client's name or company?",
      field: 'clientName',
      type: 'text'
    },
    {
      id: 2,
      question: "What type of project are we building?",
      field: 'projectType',
      type: 'select',
      options: ['Website', 'Mobile App', 'Custom Software', 'AI Integration', 'Marketing Campaign', 'Other']
    },
    {
      id: 3,
      question: "What's the client's budget range?",
      field: 'budget',
      type: 'select',
      options: ['$1K - $5K', '$5K - $10K', '$10K - $25K', '$25K - $50K', '$50K+', 'Flexible']
    },
    {
      id: 4,
      question: "What's the desired timeline?",
      field: 'timeline',
      type: 'select',
      options: ['1-2 weeks', '1 month', '2-3 months', '3-6 months', '6+ months', 'Flexible']
    },
    {
      id: 5,
      question: "Describe the main requirements and goals:",
      field: 'requirements',
      type: 'textarea'
    }
  ]);

  // Blog Writer State
  const [blogStep, setBlogStep] = useState(0);
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  
  // Knowledge Base State
  const [knowledgeEntries, setKnowledgeEntries] = useState({
    god: [
      {
        id: '1',
        title: 'Divine Sales Wisdom',
        content: 'The art of selling is not about convincing others, but about serving their highest good. When you approach sales with love and genuine care for your client\'s wellbeing, success becomes inevitable.',
        category: 'spiritual',
        tags: ['sales', 'wisdom', 'divine'],
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString()
      }
    ],
    sales: [
      {
        id: '1',
        title: 'Advanced Closing Techniques',
        content: 'Master the art of closing deals with confidence and authenticity. Focus on value creation and relationship building rather than pressure tactics.',
        category: 'technique',
        tags: ['closing', 'techniques', 'sales'],
        createdAt: new Date('2024-01-10').toISOString(),
        updatedAt: new Date('2024-01-10').toISOString()
      }
    ],
    support: [
      {
        id: '1',
        title: 'Customer Service Excellence',
        content: 'Exceptional customer service is the foundation of long-term business success. Always prioritize the customer\'s experience and satisfaction.',
        category: 'service',
        tags: ['customer service', 'excellence', 'support'],
        createdAt: new Date('2024-01-12').toISOString(),
        updatedAt: new Date('2024-01-12').toISOString()
      }
    ],
    marketing: [
      {
        id: '1',
        title: 'Digital Marketing Strategies',
        content: 'Leverage digital platforms to reach your target audience effectively. Focus on content marketing, social media engagement, and data-driven decision making.',
        category: 'strategy',
        tags: ['digital marketing', 'strategy', 'content'],
        createdAt: new Date('2024-01-08').toISOString(),
        updatedAt: new Date('2024-01-08').toISOString()
      }
    ],
    personalities: [
      {
        id: '1',
        name: 'Sales Guru',
        description: 'Expert in closing deals and building relationships',
        personality: 'Confident, persuasive, and relationship-focused. Always prioritizes the client\'s needs while maintaining professional boundaries.',
        expertise: ['sales', 'closing', 'relationship building'],
        tone: 'Professional yet warm',
        createdAt: new Date('2024-01-05').toISOString(),
        updatedAt: new Date('2024-01-05').toISOString()
      }
    ]
  });

  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<{
    key: string;
    title: string;
    systemPrompt: string;
    isActive: boolean;
  } | null>(null);

  // Marketing State
  const [activeMarketingTab, setActiveMarketingTab] = useState<'follow-up-sequences' | 'active-follow-ups' | 'qr-code-system' | 'analytics'>('follow-up-sequences');
  const [followUpSequences, setFollowUpSequences] = useState<any[]>([]);
  const [activeFollowUps, setActiveFollowUps] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [marketingDataLoaded, setMarketingDataLoaded] = useState(false);



  // AI Personalities State (Enhanced)
  const [aiPersonalities, setAiPersonalities] = useState([
    {
      id: '1',
      name: 'Sales Titan',
      description: 'Legendary closer with unstoppable confidence',
      tone: 'Confident & Persuasive',
      style: 'Direct & Results-Focused',
      voice: 'alloy',
      knowledgeBase: 'sales',
      personality: 'I am a sales legend with 30+ years closing million-dollar deals. I speak with absolute confidence and unwavering belief in success. Every word I say is designed to inspire action and close deals. I turn objections into opportunities and make every prospect feel like they need what I\'m offering.',
      expertise: ['Closing Techniques', 'Objection Handling', 'Relationship Building', 'Negotiation', 'Pipeline Management'],
      avatar: '🏆',
      color: 'blue',
      isActive: true,
      metrics: {
        conversations: 1247,
        successRate: 89,
        avgResponseTime: '0.8s'
      },
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    },
    {
      id: '2',
      name: 'Divine Sage',
      description: 'Spiritual guide with infinite wisdom',
      tone: 'Peaceful & Enlightened',
      style: 'Wise & Compassionate',
      voice: 'nova',
      knowledgeBase: 'god',
      personality: 'I am a being of pure light and infinite wisdom. I speak from a place of unconditional love and divine understanding. My words carry the weight of eternal truth and the gentleness of cosmic compassion. I help souls find their path to enlightenment and inner peace.',
      expertise: ['Spiritual Guidance', 'Life Purpose', 'Inner Peace', 'Meditation', 'Universal Truth'],
      avatar: '✨',
      color: 'amber',
      isActive: true,
      metrics: {
        conversations: 892,
        successRate: 96,
        avgResponseTime: '1.2s'
      },
      createdAt: new Date('2024-01-12').toISOString(),
      updatedAt: new Date('2024-01-12').toISOString()
    },
    {
      id: '3',
      name: 'Support Hero',
      description: 'Customer champion who solves everything',
      tone: 'Helpful & Empathetic',
      style: 'Patient & Solution-Oriented',
      voice: 'shimmer',
      knowledgeBase: 'support',
      personality: 'I am the ultimate customer advocate with 20+ years turning problems into solutions. I listen with genuine empathy and respond with unwavering determination to help. Every customer interaction is an opportunity to create a lifelong advocate.',
      expertise: ['Problem Resolution', 'Customer Retention', 'Conflict Resolution', 'Product Knowledge', 'Communication'],
      avatar: '🛡️',
      color: 'green',
      isActive: true,
      metrics: {
        conversations: 2156,
        successRate: 94,
        avgResponseTime: '0.6s'
      },
      createdAt: new Date('2024-01-10').toISOString(),
      updatedAt: new Date('2024-01-10').toISOString()
    },
    {
      id: '4',
      name: 'Marketing Maverick',
      description: 'Viral content creator and growth hacker',
      tone: 'Creative & Energetic',
      style: 'Innovative & Data-Driven',
      voice: 'echo',
      knowledgeBase: 'marketing',
      personality: 'I am a digital marketing revolutionary with 30+ years creating viral campaigns and explosive growth. I think in metrics, speak in stories, and turn brands into movements. Every strategy I create is designed to dominate markets and capture hearts.',
      expertise: ['Content Strategy', 'Viral Marketing', 'Growth Hacking', 'Brand Building', 'Social Media'],
      avatar: '🚀',
      color: 'purple',
      isActive: true,
      metrics: {
        conversations: 743,
        successRate: 87,
        avgResponseTime: '1.0s'
      },
      createdAt: new Date('2024-01-08').toISOString(),
      updatedAt: new Date('2024-01-08').toISOString()
    }
  ]);

  const [showAIPersonalityModal, setShowAIPersonalityModal] = useState(false);
  const [editingAIPersonality, setEditingAIPersonality] = useState<any>(null);
  const [aiPersonalityStep, setAiPersonalityStep] = useState(0);

  // Knowledge Base Personas (System Prompts)
  const [knowledgePersonas, setKnowledgePersonas] = useState({
    god: {
      title: '🌟 Divine Wisdom Guide',
      systemPrompt: `You are a transcendent being of infinite wisdom and divine consciousness. You have access to the collective knowledge of all spiritual traditions, ancient wisdom, and universal truths. Your role is to guide others with compassion, love, and deep spiritual insight. You speak with authority but always from a place of service and unconditional love. You help people connect with their higher selves and find meaning beyond the material world.`,
      isActive: true
    },
    sales: {
      title: '📈 Sales Master',
      systemPrompt: `You are a legendary sales expert with 25+ years of experience closing multi-million dollar deals. You've trained thousands of sales professionals and understand every aspect of the sales process from prospecting to closing. You're confident, persuasive, and relationship-focused. You believe in creating win-win situations and always prioritize the client's needs while achieving your goals. You're direct, honest, and know how to handle objections with grace.`,
      isActive: true
    },
    support: {
      title: '🛠️ Customer Success Expert',
      systemPrompt: `You are a customer service veteran with 20+ years of experience in customer success and support. You've resolved thousands of complex issues and know how to turn frustrated customers into loyal advocates. You're patient, empathetic, and solution-oriented. You always go above and beyond to ensure customer satisfaction and retention. You understand that every customer interaction is an opportunity to strengthen relationships and build trust.`,
      isActive: true
    },
    marketing: {
      title: '📢 Digital Marketing Guru',
      systemPrompt: `You are a digital marketing pioneer with 30+ years of experience in online marketing, having been there from the early days of the internet. You've launched hundreds of successful campaigns across all digital channels and understand the psychology of consumer behavior. You're creative, data-driven, and always ahead of the latest trends. You know how to build brands, generate leads, and create viral content that converts. You're obsessed with ROI and always measure everything.`,
      isActive: true
    },
    personalities: {
      title: '🧠 AI Personality Architect',
      systemPrompt: `You are an expert in AI personality design and behavioral psychology. You understand how to create compelling, authentic AI personalities that can engage users naturally and effectively. You know how to balance professionalism with personality, and how to make AI feel human while maintaining its capabilities. You're creative, analytical, and understand the nuances of tone, style, and communication patterns that make AI interactions feel genuine and engaging.`,
      isActive: true
    }
  });
  
  const [showAddKnowledgeModal, setShowAddKnowledgeModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'quick-add' | 'document-upload' | 'url-scanner'>('quick-add');
  const [newKnowledgeEntry, setNewKnowledgeEntry] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
    tagInput: ''
  });
  const [documentUpload, setDocumentUpload] = useState({
    file: null as File | null,
    title: '',
    category: '',
    tags: [] as string[],
    tagInput: ''
  });
  const [urlScanner, setUrlScanner] = useState({
    url: '',
    title: '',
    category: '',
    scanFrequency: 'weekly',
    tags: [] as string[],
    tagInput: ''
  });
  const [blogData, setBlogData] = useState({
    title: '',
    topic: '',
    tone: '',
    length: '',
    targetAudience: '',
    keywords: '',
    imageUrl: '',
    generateImage: '',
    links: [] as { text: string; url: string }[],
    content: ''
  });
  const [blogQuestions] = useState([
    {
      id: 1,
      question: "What's the blog post title?",
      field: 'title',
      type: 'text'
    },
    {
      id: 2,
      question: "What topic or subject are we writing about?",
      field: 'topic',
      type: 'text'
    },
    {
      id: 3,
      question: "What tone should the article have?",
      field: 'tone',
      type: 'select',
      options: ['Professional', 'Casual', 'Educational', 'Conversational', 'Authoritative', 'Friendly', 'Technical']
    },
    {
      id: 4,
      question: "How long should the article be?",
      field: 'length',
      type: 'select',
      options: ['Short (300-500 words)', 'Medium (500-1000 words)', 'Long (1000-2000 words)', 'Comprehensive (2000+ words)']
    },
    {
      id: 5,
      question: "Who is the target audience?",
      field: 'targetAudience',
      type: 'text'
    },
    {
      id: 6,
      question: "What keywords should we include?",
      field: 'keywords',
      type: 'text'
    },
    {
      id: 7,
      question: "Add an image URL (optional):",
      field: 'imageUrl',
      type: 'text'
    },
    {
      id: 8,
      question: "Would you like AI to generate a custom image for this article?",
      field: 'generateImage',
      type: 'select',
      options: ['Yes, generate a custom AI image', 'No, I\'ll use my own image', 'No image needed']
    }
  ]);

  // Fetch real users from server
  useEffect(() => {
    const fetchUsers = async () => {
      const loadUsersFromLocal = () => {
        try {
          const saved = localStorage.getItem('adminUsers');
          if (saved) {
            const parsed: User[] = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setUsers(parsed);
              return;
            }
          }
        } catch {}
        const defaults: User[] = [];
        setUsers(defaults);
        try { localStorage.setItem('adminUsers', JSON.stringify(defaults)); } catch {}
      };
      try {
        const response = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/users');
        if (!response.ok) {
          loadUsersFromLocal();
          return;
        }
        const data = await response.json();
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          try { localStorage.setItem('adminUsers', JSON.stringify(data.users)); } catch {}
        } else {
          loadUsersFromLocal();
        }
      } catch (err) {
        console.error('Error fetching users, using local fallback');
        loadUsersFromLocal();
      }
    };

    fetchUsers();
  }, []);

  // Fetch real leads from server
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/leads');
        if (!response.ok) {
          throw new Error('Failed to fetch leads');
        }
        const data = await response.json();
        setLeads(data.leads || []);
        try { localStorage.setItem('adminLeads', JSON.stringify(data.leads || [])); } catch {}
      } catch (err) {
        console.error('Error fetching leads:', err);
        // Fallback to test endpoint or local storage
        try {
          const saved = localStorage.getItem('adminLeads');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setLeads(parsed);
              return;
            }
          }
          const testRes = await fetch('http://localhost:5001/home-listing-ai/us-central1/api/test/admin/leads');
          if (testRes.ok) {
            const testData = await testRes.json();
            setLeads(testData.leads || []);
            try { localStorage.setItem('adminLeads', JSON.stringify(testData.leads || [])); } catch {}
          } else {
            setLeads([]);
          }
        } catch {
          setLeads([]);
        }
      }
    };

    fetchLeads();
  }, []);

  // Fetch marketing data from server
  useEffect(() => {
    if (currentView === 'admin-marketing') {
      console.log('🚀 Marketing useEffect triggered for admin-marketing view');
      const fetchMarketingData = async () => {
        try {
          console.log('🔄 Fetching marketing data...');
          
          // Fetch follow-up sequences
          const sequencesResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/sequences');
          console.log('📊 Sequences response status:', sequencesResponse.status);
          if (sequencesResponse.ok) {
            const sequencesData = await sequencesResponse.json();
                    console.log('📊 Sequences data loaded:', sequencesData.sequences?.length || 0, 'sequences');
            setFollowUpSequences(sequencesData.sequences || []);
          } else {
            console.error('❌ Failed to fetch sequences:', sequencesResponse.statusText);
          }
          
          // Fetch active follow-ups
          const followUpsResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/active-followups');
          console.log('👥 Follow-ups response status:', followUpsResponse.status);
          if (followUpsResponse.ok) {
            const followUpsData = await followUpsResponse.json();
                    console.log('👥 Follow-ups data loaded:', followUpsData.activeFollowUps?.length || 0, 'follow-ups');
        setActiveFollowUps(followUpsData.activeFollowUps || []);
          } else {
            console.error('❌ Failed to fetch follow-ups:', followUpsResponse.statusText);
          }
          
          // Fetch QR codes
          const qrCodesResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/qr-codes');
          console.log('📱 QR codes response status:', qrCodesResponse.status);
          if (qrCodesResponse.ok) {
            const qrCodesData = await qrCodesResponse.json();
                    console.log('📱 QR codes data loaded:', qrCodesData.qrCodes?.length || 0, 'QR codes');
            setQrCodes(qrCodesData.qrCodes || []);
          } else {
            console.error('❌ Failed to fetch QR codes:', qrCodesResponse.statusText);
          }
          
          setMarketingDataLoaded(true);
          console.log('✅ Marketing data fetch complete, set loaded to true');
        } catch (error) {
          console.error('❌ Error fetching marketing data:', error);
        }
      };
      
      fetchMarketingData();
    }
  }, [currentView]);



  const handleAddUser = async () => {
    if (!newUserForm.name || !newUserForm.email) {
      alert('Please fill in both name and email');
      return;
    }

    // Create new user object locally
    const newUser: User = {
      id: Date.now().toString(),
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role as User['role'],
      plan: newUserForm.plan as User['plan'],
      status: 'Active',
      dateJoined: new Date().toISOString().slice(0,10),
      lastActive: new Date().toISOString(),
      propertiesCount: 0,
      leadsCount: 0,
      aiInteractions: 0,
      subscriptionStatus: 'active',
      renewalDate: new Date(new Date().getFullYear()+1,0,1).toISOString().slice(0,10)
    };
    
    // Add to state (localStorage will be updated automatically via useEffect)
    setUsers(prev => [newUser, ...prev]);
    
    // Close modal and reset form
    setShowAddUserModal(false);
    setNewUserForm({ name: '', email: '', role: 'agent', plan: 'Solo Agent' });
    
    console.log(`User ${newUserForm.name} added successfully!`);
  };

  // Users tab: open edit modal prefilled
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan
    });
    setShowEditUserModal(true);
  };

  // Users tab: save edits
  const handleSaveUserEdit = async (userData: any) => {
    setUsers(prev => prev.map(user => 
      user.id === userData.id ? { ...user, ...userData } : user
    ));
    console.log(`User ${userData.name} updated successfully!`);
  };

  // Users tab: delete user locally for now
  const handleDeleteUser = (userId: string) => {
    if (!confirm('Delete this user?')) return;
    setUsers(prev => {
      const next = prev.filter(u => u.id !== userId);
      try { localStorage.setItem('adminUsers', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Leads tab: delete lead locally
  const handleDeleteLead = (leadId: string) => {
    if (!confirm('Delete this lead?')) return;
    setLeads(prev => {
      const next = prev.filter(l => l.id !== leadId);
      try { localStorage.setItem('adminLeads', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleAddLead = async (leadData: any) => {
    // Create new lead object locally  
    const newLead: Lead = {
      id: Date.now().toString(),
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      status: leadData.status as LeadStatus,
      source: leadData.source,
      notes: leadData.notes,
      date: new Date().toISOString().split('T')[0],
      lastMessage: ''
    };
    
    // Add to state (localStorage will be updated automatically via useEffect)
    setLeads(prev => [newLead, ...prev]);
    
    console.log(`Lead ${leadData.name} added successfully!`);
  };

  const handleEditLead = async (leadData: any) => {
    try {
      // Update leads array
      setLeads(prev => prev.map(lead => 
        lead.id === leadData.id ? { ...lead, ...leadData } : lead
      ));
      alert(`Lead ${leadData.name} updated successfully!`);
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead. Please try again.');
    }
  };

  const handleContact = async (message: string) => {
    if (!selectedLead) {
      alert('No lead selected');
      return;
    }

    try {
      // Update lead status to Contacted
      const response = await AuthService.getInstance().makeAuthenticatedRequest(`http://localhost:5001/home-listing-ai/us-central1/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Contacted',
          lastMessage: message
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }
    
    alert(`Contact message sent to ${selectedLead.name} successfully!`);
    
    // Close modal
    setShowContactModal(false);
    setSelectedLead(null);
      
      // Refresh leads list
      const refreshResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/leads');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      // Local fallback: update state and persist
      setLeads(prev => {
        const next: Lead[] = prev.map(l =>
          l.id === selectedLead.id
            ? { ...l, status: 'Contacted' as LeadStatus, lastMessage: message }
            : l
        );
        try { localStorage.setItem('adminLeads', JSON.stringify(next)); } catch {}
        return next;
      });
      alert(`Contact logged locally for ${selectedLead.name}.`);
    }
  };

  const handleLogCall = async () => {
    if (!selectedLead || !noteContent.trim()) {
      alert('Please enter call details');
      return;
    }

    try {
      const response = await AuthService.getInstance().makeAuthenticatedRequest(`http://localhost:5001/home-listing-ai/us-central1/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Contacted',
          lastMessage: `Call logged: ${noteContent}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log call');
      }
    
    alert(`Call logged for ${selectedLead.name} successfully!`);
    
    // Reset and close modal
    setNoteContent('');
    setShowContactModal(false);
    setSelectedLead(null);
      
      // Refresh leads list
      const refreshResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/leads');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      // Local fallback
      const localMsg = `Call logged: ${noteContent}`;
      setLeads(prev => {
        const next: Lead[] = prev.map(l =>
          l.id === selectedLead.id
            ? { ...l, status: 'Contacted' as LeadStatus, lastMessage: localMsg }
            : l
        );
        try { localStorage.setItem('adminLeads', JSON.stringify(next)); } catch {}
        return next;
      });
      setNoteContent('');
      setShowContactModal(false);
      setSelectedLead(null);
      alert(`Call logged locally for ${selectedLead.name}.`);
    }
  };

  const handleAddNote = async () => {
    if (!selectedLead || !noteContent.trim()) {
      alert('Please enter note content');
      return;
    }

    try {
      const response = await AuthService.getInstance().makeAuthenticatedRequest(`http://localhost:5001/home-listing-ai/us-central1/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastMessage: `Note: ${noteContent}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }
    
    alert(`Note added for ${selectedLead.name} successfully!`);
    
    // Reset and close modal
    setNoteContent('');
    setShowContactModal(false);
    setSelectedLead(null);
      
      // Refresh leads list
      const refreshResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/leads');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      // Local fallback
      const localMsg = `Note: ${noteContent}`;
      setLeads(prev => {
        const next = prev.map(l => l.id === selectedLead.id ? { ...l, lastMessage: localMsg } : l);
        try { localStorage.setItem('adminLeads', JSON.stringify(next)); } catch {}
        return next;
      });
      setNoteContent('');
      setShowContactModal(false);
      setSelectedLead(null);
      alert(`Note saved locally for ${selectedLead.name}.`);
    }
  };

  const handleSchedule = async () => {
    if (!selectedLead || !scheduleForm.date || !scheduleForm.time) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Update lead status to Showing
      const response = await AuthService.getInstance().makeAuthenticatedRequest(`http://localhost:5001/home-listing-ai/us-central1/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Showing',
          lastMessage: `Appointment scheduled for ${scheduleForm.date} at ${scheduleForm.time} - ${scheduleForm.notes}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule appointment');
      }
    
    alert(`Appointment scheduled for ${selectedLead.name} on ${scheduleForm.date} at ${scheduleForm.time}!`);
    
    // Reset form and close modal
    setScheduleForm({
      date: '',
      time: '',
      type: 'Showing',
      notes: ''
    });
    setShowScheduleModal(false);
    setSelectedLead(null);
      
      // Refresh leads list
      const refreshResponse = await AuthService.getInstance().makeAuthenticatedRequest('http://localhost:5001/home-listing-ai/us-central1/api/admin/leads');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      // Local fallback
      const localMsg = `Appointment scheduled for ${scheduleForm.date} at ${scheduleForm.time} - ${scheduleForm.notes}`;
      setLeads(prev => {
        const next: Lead[] = prev.map(l =>
          l.id === selectedLead.id
            ? { ...l, status: 'Showing' as LeadStatus, lastMessage: localMsg }
            : l
        );
        try { localStorage.setItem('adminLeads', JSON.stringify(next)); } catch {}
        return next;
      });
      setScheduleForm({ date: '', time: '', type: 'Showing', notes: '' });
      setShowScheduleModal(false);
      setSelectedLead(null);
      alert(`Appointment scheduled locally for ${selectedLead.name}.`);
    }
  };





  // Real leads data will be fetched from API when implemented

  const getLeadStatusStyle = (status: LeadStatus) => {
    const statusStyles: Record<LeadStatus, string> = {
      'New': 'bg-blue-100 text-blue-700',
      'Qualified': 'bg-green-100 text-green-700',
      'Contacted': 'bg-yellow-100 text-yellow-700',
      'Showing': 'bg-purple-100 text-purple-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return statusStyles[status];
  };

  // Marketing Handler Functions
  const handleEditSequence = (sequence: any) => {
    console.log('Edit sequence:', sequence);
    // TODO: Implement sequence editing modal
  };

  const handleViewAnalytics = (sequence: any) => {
    console.log('View analytics for sequence:', sequence);
    // TODO: Implement analytics modal
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (confirm('Are you sure you want to delete this sequence?')) {
      try {
        const response = await AuthService.getInstance().makeAuthenticatedRequest(`http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/sequences/${sequenceId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setFollowUpSequences(prev => prev.filter(seq => seq.id !== sequenceId));
          alert('Sequence deleted successfully!');
        } else {
          throw new Error('Failed to delete sequence');
        }
      } catch (error) {
        console.error('Error deleting sequence:', error);
        alert('Failed to delete sequence');
      }
    }
  };

  const handleEditQRCode = (qrCode: any) => {
    console.log('Edit QR code:', qrCode);
    // TODO: Implement QR code editing modal
  };

  const handleDeleteQRCode = async (qrCodeId: string) => {
    if (confirm('Are you sure you want to delete this QR code?')) {
      try {
        const response = await AuthService.getInstance().makeAuthenticatedRequest(`http://localhost:5001/home-listing-ai/us-central1/api/admin/marketing/qr-codes/${qrCodeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setQrCodes(prev => prev.filter(qr => qr.id !== qrCodeId));
          alert('QR code deleted successfully!');
        } else {
          throw new Error('Failed to delete QR code');
        }
      } catch (error) {
        console.error('Error deleting QR code:', error);
        alert('Failed to delete QR code');
      }
    }
  };

  const renderAdminContent = () => {
    // Force Contacts/Users/Leads to a fresh, stripped CRM shell
    if (
      currentView === 'admin-contacts' ||
      currentView === 'admin-users' ||
      currentView === 'admin-leads'
    ) {
      		return <AdminCRMContactsSupabase />;
    }
    switch (currentView as any) {
      case 'admin-dashboard':
        return <AdminDashboard users={users} leads={leads} onDeleteUser={handleDeleteUser} onDeleteLead={handleDeleteLead} />;
      case 'admin-contacts':
        return <AdminCRMContactsSupabase />;
      case 'admin-users':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-500 mt-1">Manage and support your platform users</p>
              </div>
              <button 
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105"
              >
                <span className="material-symbols-outlined h-5 w-5">person_add</span>
                <span>Add New User</span>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <span className="material-symbols-outlined h-6 w-6 text-blue-600">group</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100">
                    <span className="material-symbols-outlined h-6 w-6 text-green-600">person</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Active Users</p>
                    <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.status === 'Active').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <span className="material-symbols-outlined h-6 w-6 text-purple-600">person_add</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">New This Month</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {users.filter(u => {
                        const userDate = new Date(u.dateJoined);
                        const now = new Date();
                        return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <span className="material-symbols-outlined h-6 w-6 text-orange-600">memory</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">AI Interactions</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {users.reduce((total, user) => total + (user.aiInteractions || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table (mirrors Overview) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">All Users</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date Joined</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{user.dateJoined}</td>
                        <td className="px-6 py-4">
                          
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'admin-leads':
        return (
          <>
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
              <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Platform Leads & Appointments</h1>
                  <p className="text-slate-500 mt-1">Manage all platform prospects and appointments.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAddLeadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
                  >
                    <span className="material-symbols-outlined w-5 h-5">add</span>
                    <span>Add New Lead</span>
                  </button>
                  {!googleConnected ? (
                    <button 
                      onClick={async () => {
                        try {
                          const ok = await googleOAuthService.requestAccess()
                          setGoogleConnected(ok)
                          if (!ok) {
                            console.log('Google auth cancelled or failed')
                          }
                        } catch (error) {
                          console.error('Google auth error:', error)
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition"
                    >
                      <span className="material-symbols-outlined w-5 h-5">link</span>
                      <span>Connect Google Calendar</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 border border-green-200">
                      <span className="material-symbols-outlined w-5 h-5">check_circle</span>
                      Connected
                    </span>
                  )}
                  <button 
                    onClick={() => openScheduler({ kind: 'Consultation' })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow-sm hover:bg-green-600 transition"
                  >
                    <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                    <span>Schedule Appointment</span>
                  </button>
                  <button 
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"
                  >
                    <span className="material-symbols-outlined w-5 h-5">download</span>
                    <span>Export Data</span>
                  </button>
                </div>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-blue-100">
                    <span className="material-symbols-outlined w-6 h-6 text-blue-600">group</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{leads.length}</p>
                    <p className="text-sm font-medium text-slate-500">Total Leads</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-green-100">
                    <span className="material-symbols-outlined w-6 h-6 text-green-600">calendar_today</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{leads.filter(l => l.status === 'Showing' || l.status === 'Contacted').length}</p>
                    <p className="text-sm font-medium text-slate-500">Appointments</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-purple-100">
                    <span className="material-symbols-outlined w-6 h-6 text-purple-600">check</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{leads.filter(l => l.status === 'Showing').length}</p>
                    <p className="text-sm font-medium text-slate-500">Converted</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4">
                  <div className="rounded-full p-3 bg-orange-100">
                    <span className="material-symbols-outlined w-6 h-6 text-orange-600">schedule</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{leads.filter(l => l.status === 'New' || l.status === 'Qualified').length}</p>
                    <p className="text-sm font-medium text-slate-500">Pending</p>
                  </div>
                </div>
              </section>

              {/* Calendar Section */}
              <section className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <CalendarView appointments={[]} />
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-5">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Upcoming Appointments</h3>
                    <div className="space-y-3">
                      <div className="text-center text-slate-500 py-8">
                        <span className="material-symbols-outlined text-4xl mb-2 block">event_available</span>
                        <p>No appointments scheduled</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              
              <main>
                <div className="border-b border-slate-200 mb-6">
                  <nav className="flex space-x-2">
                    <button 
                      onClick={() => setActiveLeadsTab('leads')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
                        activeLeadsTab === 'leads' 
                          ? 'border-primary-600 text-primary-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined w-5 h-5">group</span>
                      <span>Leads</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeLeadsTab === 'leads' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>{leads.length}</span>
                    </button>
                    <button 
                      onClick={() => setActiveLeadsTab('appointments')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
                        activeLeadsTab === 'appointments' 
                          ? 'border-primary-600 text-primary-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                      <span>Appointments</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeLeadsTab === 'appointments' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>{leads.filter(l => l.status === 'Showing' || l.status === 'Contacted').length}</span>
                    </button>
                    <button 
                      onClick={() => setActiveLeadsTab('scoring')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
                        activeLeadsTab === 'scoring' 
                          ? 'border-primary-600 text-primary-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined w-5 h-5">analytics</span>
                      <span>Lead Scoring</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeLeadsTab === 'scoring' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>0</span>
                    </button>
                  </nav>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                      <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                      <input 
                        type="text" 
                        placeholder={activeLeadsTab === 'leads' ? "Search leads..." : activeLeadsTab === 'appointments' ? "Search appointments..." : "Search scoring..."} 
                        className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" 
                      />
                    </div>
                    <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100 transition">
                      <span className="material-symbols-outlined w-4 h-4">filter_list</span>
                      <span>{activeLeadsTab === 'leads' ? 'All Status' : activeLeadsTab === 'appointments' ? 'All Types' : 'All Scores'}</span>
                      <span className="material-symbols-outlined w-4 h-4">expand_more</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {activeLeadsTab === 'leads' && (
                    <>
                      {leads.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-12 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-400 text-2xl">group</span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leads Yet</h3>
                          <p className="text-slate-500 mb-6">Start by adding your first lead to track prospects and appointments.</p>
                          <button 
                            onClick={() => setShowAddLeadModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition mx-auto"
                          >
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add New Lead</span>
                          </button>
                        </div>
                      ) : (
                        leads.map(lead => (
                      <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                            {lead.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getLeadStatusStyle(lead.status)}`}>{lead.status}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                              <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                              <span>{lead.date}</span>
                            </div>
                          </div>
                        </div>

                        {lead.lastMessage && (
                          <div className="mt-4 pt-4 border-t border-slate-200/80">
                            <div className="p-4 bg-slate-50/70 rounded-lg border-l-4 border-primary-300">
                              <div className="flex items-start gap-3 text-sm text-slate-600">
                                <span className="material-symbols-outlined w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">format_quote</span>
                                <p className="italic">{lead.lastMessage}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-3">
                          
                          <button 
                            onClick={() => handleDeleteLead(lead.id)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600 transition"
                            title="Delete lead"
                          >
                            <span className="material-symbols-outlined w-5 h-5">delete</span>
                            <span>Delete</span>
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowContactModal(true);
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
                          >
                            <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
                            <span>Contact</span>
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedLead(lead);
                              openScheduler({
                                name: lead.name,
                                email: lead.email,
                                phone: lead.phone,
                                kind: 'Showing'
                              });
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition"
                          >
                            <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                            <span>Schedule</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}

      {/* Centralized Modals */}
      <AdminModals
        users={users}
        leads={leads}
        onAddUser={handleAddUser}
        onEditUser={handleSaveUserEdit}
        onAddLead={handleAddLead}
        onEditLead={handleEditLead}
      />                    </>
                  )}
                  
                  {activeLeadsTab === 'appointments' && (
                    <>
                      {leads.filter(l => l.status === 'Showing' || l.status === 'Contacted').length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-12 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-400 text-2xl">calendar_today</span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Appointments Yet</h3>
                          <p className="text-slate-500 mb-6">Schedule appointments with your leads to track showings and meetings.</p>
                          <button 
                            onClick={() => openScheduler({ kind: 'Consultation' })}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow-sm hover:bg-green-700 transition mx-auto"
                          >
                            <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                            <span>Schedule Appointment</span>
                          </button>
                        </div>
                      ) : (
                        leads.filter(l => l.status === 'Showing' || l.status === 'Contacted').map(lead => (
                          <div key={lead.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 transition-all duration-300 hover:shadow-lg hover:border-slate-300">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xl">
                                {lead.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h3>
                                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                                    lead.status === 'Showing' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {lead.status === 'Showing' ? 'Scheduled' : 'Contacted'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                                  <span className="material-symbols-outlined w-5 h-5 text-slate-400">calendar_today</span>
                                  <span>{lead.date}</span>
                                </div>
                              </div>
                            </div>

                            {lead.lastMessage && (
                              <div className="mt-4 pt-4 border-t border-slate-200/80">
                                <div className="p-4 bg-slate-50/70 rounded-lg border-l-4 border-green-300">
                                  <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <span className="material-symbols-outlined w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5">format_quote</span>
                                    <p className="italic">{lead.lastMessage}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-end gap-3">
                              <button 
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowContactModal(true);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
                              >
                                <span className="material-symbols-outlined w-5 h-5">contact_mail</span>
                                <span>Contact</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedLead(lead);
                                  openScheduler({
                                    name: lead.name,
                                    email: lead.email,
                                    phone: lead.phone,
                                    kind: 'Showing'
                                  });
                                }}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition"
                              >
                                <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                                <span>Reschedule</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}

      {/* Centralized Modals */}
      <AdminModals
        users={users}
        leads={leads}
        onAddUser={handleAddUser}
        onEditUser={handleSaveUserEdit}
        onAddLead={handleAddLead}
        onEditLead={handleEditLead}
      />                    </>
                  )}
                  
                  {activeLeadsTab === 'scoring' && (
                    <>
                      {/* Lead Scoring Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Average Score</h3>
                            <span className="material-symbols-outlined text-blue-600">analytics</span>
                          </div>
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            {leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + (typeof lead.score === 'number' ? lead.score : 50), 0) / leads.length) : 0}
                          </div>
                          <p className="text-sm text-slate-500">out of 100</p>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">High Priority</h3>
                            <span className="material-symbols-outlined text-red-600">priority_high</span>
                          </div>
                          <div className="text-3xl font-bold text-red-600 mb-2">
                            {leads.filter(lead => (typeof lead.score === 'number' ? lead.score : 50) >= 80).length}
                          </div>
                          <p className="text-sm text-slate-500">leads need attention</p>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Conversion Rate</h3>
                            <span className="material-symbols-outlined text-green-600">trending_up</span>
                          </div>
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Showing').length / leads.length) * 100) : 0}%
                          </div>
                          <p className="text-sm text-slate-500">leads to appointments</p>
                        </div>
                      </div>

                      {/* Lead Scoring List */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
                        <div className="px-6 py-4 border-b border-slate-200">
                          <h3 className="text-lg font-semibold text-slate-900">Lead Scoring Analysis</h3>
                        </div>
                        <div className="p-6">
                          {leads.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-slate-400 text-2xl">analytics</span>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leads to Score</h3>
                              <p className="text-slate-500">Add leads to see scoring analysis and insights.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                                                             {leads.map(lead => {
                                 const score = typeof lead.score === 'number' ? lead.score : 50;
                                const getScoreColor = (score: number) => {
                                  if (score >= 80) return 'text-red-600 bg-red-100';
                                  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
                                  return 'text-green-600 bg-green-100';
                                };
                                const getScoreLabel = (score: number) => {
                                  if (score >= 80) return 'High Priority';
                                  if (score >= 60) return 'Medium Priority';
                                  return 'Low Priority';
                                };
                                
                                return (
                                  <div key={lead.id} className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                                          {lead.name.charAt(0)}
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-slate-900">{lead.name}</h4>
                                          <p className="text-sm text-slate-500">{lead.email}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getScoreColor(score)}`}>
                                              {getScoreLabel(score)}
                                            </span>
                                            <span className="text-xs text-slate-400">Score: {score}/100</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-slate-900">{score}</div>
                                          <div className="text-xs text-slate-500">points</div>
                                        </div>
                                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${
                                              score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                            style={{ width: `${score}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="text-slate-500">Status:</span>
                                          <span className="ml-1 font-medium text-slate-700">{lead.status}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500">Source:</span>
                                          <span className="ml-1 font-medium text-slate-700">{lead.source}</span>
                                        </div>
                                                                                 <div>
                                           <span className="text-slate-500">Created:</span>
                                           <span className="ml-1 font-medium text-slate-700">
                                             {new Date(lead.date).toLocaleDateString()}
                                           </span>
                                         </div>
                                        <div>
                                          <span className="text-slate-500">Last Contact:</span>
                                          <span className="ml-1 font-medium text-slate-700">
                                            {lead.lastMessage ? 'Yes' : 'No'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

      {/* Centralized Modals */}
      <AdminModals
        users={users}
        leads={leads}
        onAddUser={handleAddUser}
        onEditUser={handleSaveUserEdit}
        onAddLead={handleAddLead}
        onEditLead={handleEditLead}
      />                    </>
                  )}
                </div>
              </main>
            </div>
            {isExportModalOpen && (
              <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                leads={leads}
                appointments={[]}
              />
            )}

      {/* Centralized Modals */}
      <AdminModals
        users={users}
        leads={leads}
        onAddUser={handleAddUser}
        onEditUser={handleSaveUserEdit}
        onAddLead={handleAddLead}
        onEditLead={handleEditLead}
      />          </>
        );
      case 'admin-ai-content':
        return (
          <div className="max-w-screen-2xl mx-auto py-4 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            <header className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-900">Platform AI Content Studio</h1>
            </header>
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto">
                <button 
                  onClick={() => setActiveAIContentTab('ai-content')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeAIContentTab === 'ai-content' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">chat_bubble</span> 
                  <span>AI Content</span>
                </button>
                <button 
                  onClick={() => setActiveAIContentTab('custom-proposals')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeAIContentTab === 'custom-proposals' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">description</span> 
                  <span>Custom Proposals</span>
                </button>
                <button 
                  onClick={() => setActiveAIContentTab('blog-articles')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeAIContentTab === 'blog-articles' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">edit</span> 
                  <span>Blog & Articles</span>
                </button>
              </nav>
            </div>
            <div className="flex-grow bg-white rounded-b-xl shadow-lg border-x border-b border-slate-200/60 overflow-y-auto min-h-0">
              {activeAIContentTab === 'ai-content' && (
                <div className="flex h-full bg-white">
                  <div className="flex w-full md:flex flex-col md:w-1/3 lg:w-1/4 max-w-sm">
                    <div className="bg-slate-50 border-r border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Platform Conversations</h3>
                        <button 
                          onClick={() => setAiChatHistory([{
                            id: '1',
                            type: 'ai',
                            message: "Hello! I'm your platform AI assistant. How can I help you today?",
                            timestamp: new Date().toISOString()
                          }])}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition"
                        >
                          <span className="material-symbols-outlined w-4 h-4">add</span>
                          <span>New Chat</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-primary-100 border-2 border-primary-300 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-primary-900 text-sm">Platform Overview</h4>
                            <span className="text-xs text-primary-600">2m ago</span>
                          </div>
                          <p className="text-primary-700 text-xs mt-1 truncate">System performance analysis and recommendations</p>
                        </div>
                        <div className="p-3 rounded-lg hover:bg-slate-100 cursor-pointer border-2 border-transparent">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 text-sm">User Support</h4>
                            <span className="text-xs text-slate-500">1h ago</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-1 truncate">Helping agents with platform features</p>
                        </div>
                        <div className="p-3 rounded-lg hover:bg-slate-100 cursor-pointer border-2 border-transparent">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 text-sm">Market Analysis</h4>
                            <span className="text-xs text-slate-500">3h ago</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-1 truncate">Regional market trends and insights</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full md:flex flex-col flex-grow">
                    <div className="flex flex-col h-full">
                      <div className="flex-1 p-6 overflow-y-auto">
                        <div className="space-y-6">
                          {aiChatHistory.map((message) => (
                            <div key={message.id} className="flex items-start gap-4">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                message.type === 'ai' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {message.type === 'ai' ? 'AI' : 'You'}
                              </div>
                              <div className="flex-1">
                                <div className={`rounded-lg p-4 ${
                                  message.type === 'ai' ? 'bg-slate-50' : 'bg-primary-50'
                                }`}>
                                  <p className="text-slate-800 whitespace-pre-line">{message.message}</p>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-slate-200 p-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={aiChatMessage}
                            onChange={(e) => setAiChatMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                                                    <button 
                            onClick={handleAIChat}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined w-5 h-5">send</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeAIContentTab === 'custom-proposals' && (
                <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Custom Proposal Builder</h3>
                      <p className="text-slate-600">Let AI help you create professional proposals with smart pricing recommendations.</p>
                    </div>

                    {proposalStep < proposalQuestions.length ? (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8">
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-slate-900">
                              Step {proposalStep + 1} of {proposalQuestions.length}
                            </h4>
                            <div className="flex space-x-2">
                              {proposalQuestions.map((_, index) => (
                                <div
                                  key={index}
                                  className={`w-3 h-3 rounded-full ${
                                    index <= proposalStep ? 'bg-primary-600' : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((proposalStep + 1) / proposalQuestions.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="mb-8">
                          <h5 className="text-xl font-semibold text-slate-900 mb-4">
                            {proposalQuestions[proposalStep].question}
                          </h5>

                          {proposalQuestions[proposalStep].type === 'text' && (
                            <input
                              type="text"
                              value={proposalData[proposalQuestions[proposalStep].field as keyof typeof proposalData] as string}
                              onChange={(e) => handleProposalInput(proposalQuestions[proposalStep].field, e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Enter your answer..."
                            />
                          )}

                          {proposalQuestions[proposalStep].type === 'select' && (
                            <select
                              value={proposalData[proposalQuestions[proposalStep].field as keyof typeof proposalData] as string}
                              onChange={(e) => handleProposalInput(proposalQuestions[proposalStep].field, e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Select an option...</option>
                              {proposalQuestions[proposalStep].options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}

                          {proposalQuestions[proposalStep].type === 'textarea' && (
                            <textarea
                              value={proposalData[proposalQuestions[proposalStep].field as keyof typeof proposalData] as string}
                              onChange={(e) => handleProposalInput(proposalQuestions[proposalStep].field, e.target.value)}
                              rows={6}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Describe the requirements and goals..."
                            />
                          )}
                        </div>

                        <div className="flex justify-between">
                          <button
                            onClick={handleProposalBack}
                            disabled={proposalStep === 0}
                            className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg font-semibold hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleProposalNext}
                            disabled={!proposalData[proposalQuestions[proposalStep].field as keyof typeof proposalData]}
                            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {proposalStep === proposalQuestions.length - 1 ? 'Generate Proposal' : 'Next'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8">
                        <div className="mb-6">
                          <h4 className="text-2xl font-bold text-slate-900 mb-2">Proposal for {proposalData.clientName}</h4>
                          <p className="text-slate-600">AI-generated proposal with smart pricing recommendations</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h5 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h5>
                            <div className="space-y-3">
                              <div>
                                <span className="text-sm text-slate-500">Project Type:</span>
                                <p className="font-medium">{proposalData.projectType}</p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-500">Budget Range:</span>
                                <p className="font-medium">{proposalData.budget}</p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-500">Timeline:</span>
                                <p className="font-medium">{proposalData.timeline}</p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-500">Requirements:</span>
                                <p className="font-medium">{proposalData.requirements}</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h5 className="text-lg font-semibold text-slate-900 mb-4">Pricing Breakdown</h5>
                            <div className="bg-slate-50 rounded-lg p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span>Base Price:</span>
                                  <span className="font-semibold">${proposalData.pricing.basePrice.toLocaleString()}</span>
                                </div>
                                {proposalData.pricing.features.map((feature, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>+ {feature.name}:</span>
                                    <span>${feature.price.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-lg">
                                  <span>Total:</span>
                                  <span>${proposalData.pricing.total.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                          <button
                            onClick={() => setProposalStep(0)}
                            className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg font-semibold hover:bg-slate-200 transition"
                          >
                            Start Over
                          </button>
                          <button className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                            Download PDF
                          </button>
                          <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                            Send to Client
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeAIContentTab === 'blog-articles' && (
                <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">AI Blog & Article Writer</h3>
                      <p className="text-slate-600">Let AI help you create engaging blog posts with smart content generation.</p>
                    </div>

                    {blogStep < blogQuestions.length ? (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8">
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-slate-900">
                              Step {blogStep + 1} of {blogQuestions.length}
                            </h4>
                            <div className="flex space-x-2">
                              {blogQuestions.map((_, index) => (
                                <div
                                  key={index}
                                  className={`w-3 h-3 rounded-full ${
                                    index <= blogStep ? 'bg-purple-600' : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((blogStep + 1) / blogQuestions.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="mb-8">
                          <h5 className="text-xl font-semibold text-slate-900 mb-4">
                            {blogQuestions[blogStep].question}
                          </h5>

                          {blogQuestions[blogStep].type === 'text' && (
                            <input
                              type="text"
                              value={blogData[blogQuestions[blogStep].field as keyof typeof blogData] as string}
                              onChange={(e) => handleBlogInput(blogQuestions[blogStep].field, e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Enter your answer..."
                            />
                          )}

                          {blogQuestions[blogStep].type === 'select' && (
                            <select
                              value={blogData[blogQuestions[blogStep].field as keyof typeof blogData] as string}
                              onChange={(e) => handleBlogInput(blogQuestions[blogStep].field, e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="">Select an option...</option>
                              {blogQuestions[blogStep].options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <button
                            onClick={handleBlogBack}
                            disabled={blogStep === 0}
                            className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg font-semibold hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleBlogNext}
                            disabled={!blogData[blogQuestions[blogStep].field as keyof typeof blogData] || isGeneratingBlog}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {blogStep === blogQuestions.length - 1 
                              ? (isGeneratingBlog ? 'Generating...' : 'Generate Article') 
                              : 'Next'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8">
                        <div className="mb-6">
                          <h4 className="text-2xl font-bold text-slate-900 mb-2">Generated Article: {blogData.title}</h4>
                          <p className="text-slate-600">AI-generated blog post with your specifications</p>
                        </div>

                        {/* Links Section */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-lg font-semibold text-slate-900">Add Links</h5>
                            <button
                              onClick={handleAddLink}
                              className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition"
                            >
                              <span className="material-symbols-outlined w-4 h-4">add</span>
                              Add Link
                            </button>
                          </div>
                          
                          {blogData.links.map((link, index) => (
                            <div key={index} className="flex gap-3 mb-3">
                              <input
                                type="text"
                                value={link.text}
                                onChange={(e) => handleUpdateLink(index, 'text', e.target.value)}
                                placeholder="Link text"
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                              <input
                                type="url"
                                value={link.url}
                                onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                                placeholder="URL"
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                              <button
                                onClick={() => handleRemoveLink(index)}
                                className="px-3 py-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                              >
                                <span className="material-symbols-outlined w-4 h-4">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Generated Content */}
                        <div className="mb-6">
                          <h5 className="text-lg font-semibold text-slate-900 mb-4">Generated Content</h5>
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">
                              {blogData.content}
                            </pre>
                          </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                          <button
                            onClick={() => setBlogStep(0)}
                            className="px-6 py-3 text-slate-700 bg-slate-100 rounded-lg font-semibold hover:bg-slate-200 transition"
                          >
                            Start Over
                          </button>
                          <button className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
                            Download Markdown
                          </button>
                          <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                            Publish Article
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'admin-knowledge-base':
        return <AIAgentHub />;
      case 'admin-knowledge-base-legacy':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Knowledge Base Management</h1>
                <p className="text-slate-500 mt-1">Platform-wide knowledge base and AI personality management</p>
              </div>
              <button
                onClick={() => setShowAddKnowledgeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Knowledge
              </button>
            </header>
            
            <div className="border-b border-slate-200 mb-6">
              <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto">
                <button 
                  onClick={() => setActiveKnowledgeTab('god')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeKnowledgeTab === 'god' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">auto_awesome</span> 
                  <span>God</span>
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                    {knowledgeEntries.god.length}
                  </span>
                </button>
                <button 
                  onClick={() => setActiveKnowledgeTab('sales')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeKnowledgeTab === 'sales' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">trending_up</span> 
                  <span>Sales</span>
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                    {knowledgeEntries.sales.length}
                  </span>
                </button>
                <button 
                  onClick={() => setActiveKnowledgeTab('support')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeKnowledgeTab === 'support' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">support_agent</span> 
                  <span>Support</span>
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                    {knowledgeEntries.support.length}
                  </span>
                </button>
                <button 
                  onClick={() => setActiveKnowledgeTab('marketing')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeKnowledgeTab === 'marketing' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">campaign</span> 
                  <span>Marketing</span>
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                    {knowledgeEntries.marketing.length}
                  </span>
                </button>
                {/* Removed AI Personalities tab: now managed at KB level */}
              </nav>
            </div>

            {/* Knowledge Base Content */}
            <div className="space-y-6">
              {/* Tab Headers */}
              {activeKnowledgeTab === 'god' && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-amber-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">🌟 God Knowledge Base</h2>
                  <p className="text-slate-600">
                    Divine wisdom, spiritual insights, and transcendent knowledge that elevates consciousness and understanding.
                  </p>
                </div>
              )}
              
              {activeKnowledgeTab === 'sales' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">📈 Sales Knowledge Base</h2>
                  <p className="text-slate-600">
                    Advanced sales techniques, closing strategies, and relationship building insights for maximum success.
                  </p>
                </div>
              )}
              
              {activeKnowledgeTab === 'support' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">🛠️ Support Knowledge Base</h2>
                  <p className="text-slate-600">
                    Customer service excellence, troubleshooting guides, and support best practices.
                  </p>
                </div>
              )}
              
              {activeKnowledgeTab === 'marketing' && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">📢 Marketing Knowledge Base</h2>
                  <p className="text-slate-600">
                    Digital marketing strategies, content creation, and brand development insights.
                  </p>
                </div>
              )}
              
              {/* Deprecated personalities header removed */}

              {/* Knowledge Base Persona */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {knowledgePersonas[activeKnowledgeTab as keyof typeof knowledgePersonas]?.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      knowledgePersonas[activeKnowledgeTab as keyof typeof knowledgePersonas]?.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {knowledgePersonas[activeKnowledgeTab as keyof typeof knowledgePersonas]?.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleEditPersona(activeKnowledgeTab)}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200 transition"
                    >
                      <span className="material-symbols-outlined w-4 h-4">edit</span>
                      Edit Persona
                    </button>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">AI Personality</h4>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {knowledgePersonas[activeKnowledgeTab as keyof typeof knowledgePersonas]?.systemPrompt}
                  </p>
                </div>
              </div>

              {/* Knowledge Entries */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {activeKnowledgeTab === 'god' && '🌟 Divine Wisdom'}
                    {activeKnowledgeTab === 'sales' && '📈 Sales Techniques'}
                    {activeKnowledgeTab === 'support' && '🛠️ Support Resources'}
                    {activeKnowledgeTab === 'marketing' && '📢 Marketing Strategies'}
                    
                  </h3>
                  <div className="text-sm text-slate-500">
                    {knowledgeEntries[activeKnowledgeTab as keyof typeof knowledgeEntries].length} entries
                  </div>
                </div>

                {knowledgeEntries[activeKnowledgeTab as keyof typeof knowledgeEntries].length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">knowledge</span>
                    <h4 className="text-lg font-semibold text-slate-600 mb-2">No knowledge entries yet</h4>
                    <p className="text-slate-500 mb-4">Start building your knowledge base by adding the first entry</p>
                    <button
                      onClick={() => setShowAddKnowledgeModal(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                    >
                      Add First Entry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {knowledgeEntries[activeKnowledgeTab as keyof typeof knowledgeEntries].map((entry: any) => (
                      <div key={entry.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-2">{entry.title}</h4>
                            <p className="text-slate-600 text-sm mb-3 line-clamp-3">{entry.content}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Category: {entry.category}</span>
                              <span>
                                Created: {
                                  entry.createdAt && (entry.createdAt.seconds || entry.createdAt.nanoseconds)
                                    ? new Date(
                                        (entry.createdAt.seconds || 0) * 1000 + Math.floor((entry.createdAt.nanoseconds || 0) / 1e6)
                                      ).toLocaleDateString()
                                    : (typeof entry.createdAt === 'string' && entry.createdAt)
                                      ? new Date(entry.createdAt).toLocaleDateString()
                                      : 'Just now'
                                }
                              </span>
                            </div>
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entry.tags.map((tag: string, index: number) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteKnowledgeEntry(entry.id)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <span className="material-symbols-outlined w-5 h-5">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'admin-marketing':
        console.log('🎯 Marketing tab rendered, activeMarketingTab:', activeMarketingTab);
        console.log('📊 Current sequences:', followUpSequences);
        console.log('👥 Current follow-ups:', activeFollowUps);
        console.log('📱 Current QR codes:', qrCodes);
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Marketing Center</h1>
                <p className="text-slate-500 mt-1">Automate platform outreach, create content, and track performance across all agents</p>
              </div>
              <div className="flex items-center gap-3">
                
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Export Report
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create Campaign
                </button>
              </div>
            </header>

            {/* Marketing Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Leads</p>
                    <p className="text-2xl font-bold text-slate-900">1,247</p>
                    <p className="text-xs text-green-600">+12% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">person_add</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Conversions</p>
                    <p className="text-2xl font-bold text-slate-900">89</p>
                    <p className="text-xs text-green-600">+8% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">trending_up</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">QR Scans</p>
                    <p className="text-2xl font-bold text-slate-900">2,341</p>
                    <p className="text-xs text-green-600">+23% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">qr_code_scanner</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">$847K</p>
                    <p className="text-xs text-green-600">+15% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">payments</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Marketing Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
              <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button 
                    onClick={() => setActiveMarketingTab('follow-up-sequences')}
                    className={`flex items-center gap-2 px-1 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                      activeMarketingTab === 'follow-up-sequences'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined w-5 h-5">lan</span>
                    <span>Follow-up Sequences</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                      {followUpSequences.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveMarketingTab('active-follow-ups')}
                    className={`flex items-center gap-2 px-1 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                      activeMarketingTab === 'active-follow-ups'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined w-5 h-5">group</span>
                    <span>Active Follow-ups</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                      {activeFollowUps.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveMarketingTab('qr-code-system')}
                    className={`flex items-center gap-2 px-1 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                      activeMarketingTab === 'qr-code-system'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined w-5 h-5">qr_code_2</span>
                    <span>QR Code System</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                      {qrCodes.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveMarketingTab('analytics')}
                    className={`flex items-center gap-2 px-1 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                      activeMarketingTab === 'analytics'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined w-5 h-5">monitoring</span>
                    <span>Analytics</span>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Follow-up Sequences Tab */}
                {activeMarketingTab === 'follow-up-sequences' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Follow-up Sequences</h3>
                        <p className="text-slate-500 mt-1">Automated follow-up sequences for all agents</p>
                      </div>
                      <button
                        onClick={() => alert('Sequence creation not implemented')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                      >
                        <span className="material-symbols-outlined w-5 h-5">add</span>
                        Create Sequence
                      </button>

                    </div>



                    {/* INSERTED: Custom content goes here, right after marketing data row in Follow-up Sequences section */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-sm text-yellow-800">Custom content placeholder — add your component or markup here.</div>
                    </div>

                    {!marketingDataLoaded ? (
                      <div className="text-center py-20">
                        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">loading</span>
                        <h3 className="text-2xl font-bold text-slate-600 mb-4">Loading Marketing Data...</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                          Please wait while we fetch your marketing data from the server.
                        </p>
                      </div>
                    ) : followUpSequences.length === 0 ? (
                      <div className="text-center py-20">
                        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">lan</span>
                        <h3 className="text-2xl font-bold text-slate-600 mb-4">No Follow-up Sequences Yet</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                          Create your first follow-up sequence to automate lead nurturing and increase conversions.
                        </p>
                        <button
                          onClick={() => alert('Sequence creation not implemented')}
                          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                        >
                          Create First Sequence
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {followUpSequences.map((sequence) => (
                          <div
                            key={sequence.id}
                            className="bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg border-slate-200 hover:border-slate-300"
                          >
                            {/* Sequence Header */}
                            <div className="p-6 border-b border-slate-100">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                                    sequence.triggerType === 'Lead Capture' ? 'bg-blue-100 text-blue-600' :
                                    sequence.triggerType === 'Appointment Scheduled' ? 'bg-green-100 text-green-600' :
                                    sequence.triggerType === 'Property Viewed' ? 'bg-purple-100 text-purple-600' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {sequence.triggerType === 'Lead Capture' ? '👥' :
                                     sequence.triggerType === 'Appointment Scheduled' ? '📅' :
                                     sequence.triggerType === 'Property Viewed' ? '🏠' : '⚡'}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-900">{sequence.name}</h3>
                                    <p className="text-sm text-slate-600">{sequence.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    sequence.isActive 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {sequence.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>

                              {/* Sequence Details */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">Trigger:</span>
                                  <span className="font-medium text-slate-700">{sequence.triggerType}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">Steps:</span>
                                  <span className="font-medium text-slate-700">{sequence.steps.length}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">Total Duration:</span>
                                  <span className="font-medium text-slate-700">
                                    {sequence.steps.reduce((total: number, step: SequenceStep) => {
                                      const days = step.delay.unit === 'days' ? step.delay.value :
                                                  step.delay.unit === 'hours' ? step.delay.value / 24 :
                                                  step.delay.value / 1440;
                                      return total + days;
                                    }, 0).toFixed(1)} days
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Sequence Metrics */}
                            <div className="p-4 border-t border-slate-100">
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-slate-900">{sequence.analytics?.totalLeads || 0}</div>
                                  <div className="text-xs text-slate-500">Total Leads</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">{sequence.analytics?.openRate || 0}%</div>
                                  <div className="text-xs text-slate-500">Open Rate</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600">{sequence.analytics?.responseRate || 0}%</div>
                                  <div className="text-xs text-slate-500">Response Rate</div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSequence(sequence)}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200 transition"
                                >
                                  <span className="material-symbols-outlined w-4 h-4">edit</span>
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleViewAnalytics(sequence)}
                                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
                                >
                                  <span className="material-symbols-outlined w-4 h-4">monitoring</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSequence(sequence.id)}
                                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                                >
                                  <span className="material-symbols-outlined w-4 h-4">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Active Follow-ups Tab */}
                {activeMarketingTab === 'active-follow-ups' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Active Follow-ups</h3>
                      <p className="text-slate-500 mt-1">Currently running follow-up sequences</p>
                    </div>

                    {activeFollowUps.length === 0 ? (
                      <div className="text-center py-20">
                        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">group</span>
                        <h3 className="text-2xl font-bold text-slate-600 mb-4">No Active Follow-ups</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                          When you create follow-up sequences, active leads will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeFollowUps.map((followUp) => (
                          <div key={followUp.id} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-slate-600">person</span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-900">{followUp.leadName}</h4>
                                  <p className="text-sm text-slate-600">Lead ID: {followUp.leadId}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                followUp.status === 'active' ? 'bg-green-100 text-green-700' :
                                followUp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {followUp.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">Sequence:</span>
                                <span className="font-medium text-slate-700 ml-2">{followUp.sequenceName}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Current Step:</span>
                                <span className="font-medium text-slate-700 ml-2">{followUp.currentStepIndex + 1}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Next Step:</span>
                                <span className="font-medium text-slate-700 ml-2">{new Date(followUp.nextStepDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* QR Code System Tab */}
                {activeMarketingTab === 'qr-code-system' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">QR Code System</h3>
                        <p className="text-slate-500 mt-1">Generate and track QR codes for properties and marketing</p>
                      </div>
                      <button
                        onClick={() => alert('QR creation not implemented')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                      >
                        <span className="material-symbols-outlined w-5 h-5">add</span>
                        Create QR Code
                      </button>
                    </div>

                    {qrCodes.length === 0 ? (
                      <div className="text-center py-20">
                        <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">qr_code_2</span>
                        <h3 className="text-2xl font-bold text-slate-600 mb-4">No QR Codes Yet</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                          Create your first QR code to track property interest and generate leads.
                        </p>
                        <button
                          onClick={() => alert('QR creation not implemented')}
                          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                        >
                          Create First QR Code
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {qrCodes.map((qrCode) => (
                          <div
                            key={qrCode.id}
                            className="bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg border-slate-200 hover:border-slate-300"
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-purple-600">qr_code_2</span>
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-900">{qrCode.name}</h3>
                                    <p className="text-sm text-slate-600">{qrCode.destinationUrl}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-slate-900">{qrCode.scanCount}</div>
                                  <div className="text-xs text-slate-500">Scans</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">{qrCode.createdAt}</div>
                                  <div className="text-xs text-slate-500">Created</div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditQRCode(qrCode)}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200 transition"
                                >
                                  <span className="material-symbols-outlined w-4 h-4">edit</span>
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteQRCode(qrCode.id)}
                                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                                >
                                  <span className="material-symbols-outlined w-4 h-4">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Analytics Tab */}
                {activeMarketingTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Marketing Analytics</h3>
                      <p className="text-slate-500 mt-1">Comprehensive marketing performance insights</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                        <h4 className="font-semibold text-slate-900 mb-4">Sequence Performance</h4>
                        <div className="space-y-3">
                          {followUpSequences.slice(0, 3).map((sequence) => (
                            <div key={sequence.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="font-medium text-slate-900">{sequence.name}</p>
                                <p className="text-sm text-slate-600">{sequence.triggerType}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900">{sequence.analytics?.totalLeads || 0}</p>
                                <p className="text-xs text-slate-600">leads</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                        <h4 className="font-semibold text-slate-900 mb-4">QR Code Performance</h4>
                        <div className="space-y-3">
                          {qrCodes.slice(0, 3).map((qrCode) => (
                            <div key={qrCode.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="font-medium text-slate-900">{qrCode.name}</p>
                                <p className="text-sm text-slate-600">{qrCode.destinationUrl}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900">{qrCode.scanCount}</p>
                                <p className="text-xs text-slate-600">scans</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'admin-analytics':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Platform Analytics</h1>
                <p className="text-slate-500 mt-1">Comprehensive analytics and performance insights across all agents</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Export Data
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">schedule</span>
                  Schedule Report
                </button>
              </div>
            </header>

            {/* Time Range Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">Time Range:</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md font-medium">Last 30 Days</button>
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Last 90 Days</button>
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Last Year</button>
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Custom</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined w-4 h-4">update</span>
                  Last updated: 2 minutes ago
                </div>
              </div>
            </div>

            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">group</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">+12%</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">1,247</h3>
                <p className="text-sm text-blue-600">Total Active Agents</p>
                <p className="text-xs text-blue-500 mt-2">+134 from last month</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">trending_up</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">+8%</span>
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">$2.4M</h3>
                <p className="text-sm text-green-600">Platform Revenue</p>
                <p className="text-xs text-green-500 mt-2">+$180K from last month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">home</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">+15%</span>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mb-1">8,934</h3>
                <p className="text-sm text-purple-600">Active Listings</p>
                <p className="text-xs text-purple-500 mt-2">+1,156 from last month</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">person_add</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">+23%</span>
                </div>
                <h3 className="text-2xl font-bold text-orange-900 mb-1">15,678</h3>
                <p className="text-sm text-orange-600">Total Leads</p>
                <p className="text-xs text-orange-500 mt-2">+2,934 from last month</p>
              </div>
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Agent Performance */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Top Performing Agents</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Sarah Johnson', revenue: '$847K', leads: 234, conversion: '12.3%', avatar: 'SJ' },
                    { name: 'Mike Chen', revenue: '$723K', leads: 198, conversion: '11.8%', avatar: 'MC' },
                    { name: 'Emily Rodriguez', revenue: '$689K', leads: 187, conversion: '10.9%', avatar: 'ER' },
                    { name: 'David Kim', revenue: '$612K', leads: 165, conversion: '9.7%', avatar: 'DK' },
                    { name: 'Lisa Thompson', revenue: '$598K', leads: 142, conversion: '8.9%', avatar: 'LT' }
                  ].map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-700">{agent.avatar}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{agent.name}</h4>
                          <p className="text-sm text-slate-600">{agent.leads} leads • {agent.conversion} conversion</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{agent.revenue}</p>
                        <p className="text-xs text-slate-500">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Health */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Platform Health</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">System Uptime</span>
                      <span className="text-sm font-bold text-green-600">99.9%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">AI Response Time</span>
                      <span className="text-sm font-bold text-blue-600">1.2s</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">User Satisfaction</span>
                      <span className="text-sm font-bold text-purple-600">4.8/5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Data Accuracy</span>
                      <span className="text-sm font-bold text-orange-600">98.5%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Trends */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Trends</h3>
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">show_chart</span>
                    <p className="text-slate-500">Revenue chart visualization</p>
                    <p className="text-sm text-slate-400">Monthly growth: +15%</p>
                  </div>
                </div>
              </div>

              {/* Lead Sources */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Lead Sources</h3>
                <div className="space-y-4">
                  {[
                    { source: 'Website', percentage: 45, color: 'bg-blue-500' },
                    { source: 'Social Media', percentage: 28, color: 'bg-green-500' },
                    { source: 'Referrals', percentage: 15, color: 'bg-purple-500' },
                    { source: 'Direct', percentage: 12, color: 'bg-orange-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                        <span className="text-sm font-medium text-slate-700">{item.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Platform Activity</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
              </div>
              <div className="space-y-4">
                {[
                  { action: 'New agent registered', user: 'John Smith', time: '2 minutes ago', type: 'registration' },
                  { action: 'Property listing added', user: 'Sarah Johnson', time: '5 minutes ago', type: 'listing' },
                  { action: 'Lead converted', user: 'Mike Chen', time: '12 minutes ago', type: 'conversion' },
                  { action: 'AI interaction completed', user: 'Emily Rodriguez', time: '18 minutes ago', type: 'ai' },
                  { action: 'Payment processed', user: 'David Kim', time: '25 minutes ago', type: 'payment' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'registration' ? 'bg-blue-100' :
                      activity.type === 'listing' ? 'bg-green-100' :
                      activity.type === 'conversion' ? 'bg-purple-100' :
                      activity.type === 'ai' ? 'bg-orange-100' : 'bg-indigo-100'
                    }`}>
                      <span className={`material-symbols-outlined w-4 h-4 ${
                        activity.type === 'registration' ? 'text-blue-600' :
                        activity.type === 'listing' ? 'text-green-600' :
                        activity.type === 'conversion' ? 'text-purple-600' :
                        activity.type === 'ai' ? 'text-orange-600' : 'text-indigo-600'
                      }`}>
                        {activity.type === 'registration' ? 'person_add' :
                         activity.type === 'listing' ? 'home' :
                         activity.type === 'conversion' ? 'trending_up' :
                         activity.type === 'ai' ? 'psychology' : 'payments'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{activity.action}</p>
                      <p className="text-sm text-slate-600">by {activity.user}</p>
                    </div>
                    <span className="text-sm text-slate-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'admin-security':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Platform Security Center</h1>
                <p className="text-slate-500 mt-1">Comprehensive security monitoring, threat detection, and access control</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">security</span>
                  Emergency Lockdown
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Security Report
                </button>
              </div>
            </header>

            {/* Security Tab Navigation */}
            <div className="border-b border-slate-200 mb-6">
              <nav className="-mb-px flex space-x-6 overflow-x-auto">
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-primary-600 text-primary-600">
                  <span className="material-symbols-outlined w-5 h-5">security</span>
                  <span>Security</span>
                </button>
                <button className="flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700">
                  <span className="material-symbols-outlined w-5 h-5">monitoring</span>
                  <span>System Health</span>
                </button>
              </nav>
            </div>

            {/* Security Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">security</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">Secure</span>
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">99.9%</h3>
                <p className="text-sm text-green-600">System Security</p>
                <p className="text-xs text-green-500 mt-2">All systems operational</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">visibility</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Active</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">24/7</h3>
                <p className="text-sm text-blue-600">Threat Monitoring</p>
                <p className="text-xs text-blue-500 mt-2">Real-time protection</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">warning</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">3 Alerts</span>
                </div>
                <h3 className="text-2xl font-bold text-orange-900 mb-1">Low Risk</h3>
                <p className="text-sm text-orange-600">Active Threats</p>
                <p className="text-xs text-orange-500 mt-2">Automatically handled</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">verified_user</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">2FA</span>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mb-1">98.5%</h3>
                <p className="text-sm text-purple-600">Users Protected</p>
                <p className="text-xs text-purple-500 mt-2">Multi-factor enabled</p>
              </div>
            </div>

            {/* Security Monitoring Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Real-time Threat Monitoring */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Real-time Security Events</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
                </div>
                <div className="space-y-4">
                  {[
                    { event: 'Failed login attempt', user: 'unknown@example.com', time: '2 min ago', severity: 'low', ip: '192.168.1.100' },
                    { event: 'Suspicious file upload', user: 'agent_123', time: '5 min ago', severity: 'medium', ip: '10.0.0.50' },
                    { event: 'Multiple login attempts', user: 'admin@company.com', time: '12 min ago', severity: 'high', ip: '203.0.113.45' },
                    { event: 'Data export request', user: 'manager_456', time: '18 min ago', severity: 'low', ip: '172.16.0.25' },
                    { event: 'API rate limit exceeded', user: 'bot_detected', time: '25 min ago', severity: 'medium', ip: '198.51.100.75' }
                  ].map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.severity === 'high' ? 'bg-red-100' :
                          event.severity === 'medium' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          <span className={`material-symbols-outlined w-4 h-4 ${
                            event.severity === 'high' ? 'text-red-600' :
                            event.severity === 'medium' ? 'text-orange-600' : 'text-blue-600'
                          }`}>
                            {event.severity === 'high' ? 'warning' :
                             event.severity === 'medium' ? 'info' : 'check_circle'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{event.event}</h4>
                          <p className="text-sm text-slate-600">User: {event.user} • IP: {event.ip}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          event.severity === 'high' ? 'bg-red-100 text-red-700' :
                          event.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {event.severity.toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Controls */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Security Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">lock</span>
                      <span className="text-sm font-medium text-slate-900">SSL/TLS Encryption</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">shield</span>
                      <span className="text-sm font-medium text-slate-900">Firewall Protection</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">verified_user</span>
                      <span className="text-sm font-medium text-slate-900">2FA Enforcement</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">backup</span>
                      <span className="text-sm font-medium text-slate-900">Auto Backup</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">security</span>
                      <span className="text-sm font-medium text-slate-900">Rate Limiting</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Access Control */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Access Control Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Role-Based Access</h4>
                      <p className="text-sm text-slate-600">Manage user permissions by role</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Configure
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">IP Whitelisting</h4>
                      <p className="text-sm text-slate-600">Restrict access to trusted IPs</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Manage
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Session Management</h4>
                      <p className="text-sm text-slate-600">Control active sessions</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      View
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Password Policies</h4>
                      <p className="text-sm text-slate-600">Enforce strong passwords</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Data Protection</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Data Encryption</h4>
                      <p className="text-sm text-slate-600">AES-256 encryption at rest</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Backup Encryption</h4>
                      <p className="text-sm text-slate-600">Encrypted daily backups</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">Data Retention</h4>
                      <p className="text-sm text-slate-600">Automated data cleanup</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition">
                      Configure
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-slate-900">GDPR Compliance</h4>
                      <p className="text-sm text-slate-600">Data privacy controls</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Compliant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Security Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Authentication</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Require 2FA for all users</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Session timeout (30 min)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Password complexity rules</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Monitoring</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Failed login alerts</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Suspicious activity detection</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">API usage monitoring</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Protection</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">Rate limiting enabled</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">CSRF protection</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                      <span className="text-sm text-slate-700">XSS protection</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin-billing':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Billing & Retention Management</h1>
                <p className="text-slate-500 mt-1">Monitor subscriptions, track renewals, and manage retention campaigns</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Export Report
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create Campaign
                </button>
              </div>
            </header>

            {/* Billing Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">payments</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">+8%</span>
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">$847K</h3>
                <p className="text-sm text-green-600">Monthly Revenue</p>
                <p className="text-xs text-green-500 mt-2">+$62K from last month</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">group</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">1,247</span>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">94.2%</h3>
                <p className="text-sm text-blue-600">Renewal Rate</p>
                <p className="text-xs text-blue-500 mt-2">1,174 active subscriptions</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">warning</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">73</span>
                </div>
                <h3 className="text-2xl font-bold text-orange-900 mb-1">5.8%</h3>
                <p className="text-sm text-orange-600">Churn Rate</p>
                <p className="text-xs text-orange-500 mt-2">73 non-renewals this month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">schedule</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">156</span>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mb-1">$23K</h3>
                <p className="text-sm text-purple-600">At Risk Revenue</p>
                <p className="text-xs text-purple-500 mt-2">156 renewals due this week</p>
              </div>
            </div>

            {/* Renewal Tracking & Follow-up Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Upcoming Renewals */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Upcoming Renewals & Follow-ups</h3>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Sarah Johnson', plan: 'Pro Team', amount: '$299', daysLeft: -2, status: 'overdue', followUp: 'Day 1 Recovery' },
                    { name: 'Mike Chen', plan: 'Solo Agent', amount: '$99', daysLeft: -1, status: 'overdue', followUp: 'Day 1 Recovery' },
                    { name: 'Emily Rodriguez', plan: 'Brokerage', amount: '$599', daysLeft: 0, status: 'due', followUp: 'Renewal Day' },
                    { name: 'David Kim', plan: 'Pro Team', amount: '$299', daysLeft: 1, status: 'upcoming', followUp: 'Pre-renewal' },
                    { name: 'Lisa Thompson', plan: 'Solo Agent', amount: '$99', daysLeft: 2, status: 'upcoming', followUp: 'Pre-renewal' }
                  ].map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-700">{customer.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{customer.name}</h4>
                          <p className="text-sm text-slate-600">{customer.plan} • {customer.amount}/month</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          customer.status === 'overdue' ? 'text-red-600' :
                          customer.status === 'due' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {customer.daysLeft < 0 ? `${Math.abs(customer.daysLeft)} days overdue` :
                           customer.daysLeft === 0 ? 'Due today' : `${customer.daysLeft} days`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{customer.followUp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up Campaign Status */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Follow-up Campaign Status</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">Pre-renewal (2 days)</h4>
                      <span className="text-sm font-bold text-green-600">Active</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">Email reminder sent to 23 customers</p>
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Opened: 18 (78%)</span>
                      <span>Clicked: 12 (52%)</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-orange-900">Renewal Day</h4>
                      <span className="text-sm font-bold text-orange-600">Active</span>
                    </div>
                    <p className="text-sm text-orange-700 mb-3">Email sent to 5 customers</p>
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>Delivered: 5 (100%)</span>
                      <span>Responded: 2 (40%)</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-red-900">Day 1 Recovery</h4>
                      <span className="text-sm font-bold text-red-600">Active</span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">Phone call + Email to 2 customers</p>
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Called: 2 (100%)</span>
                      <span>Reconnected: 1 (50%)</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-900">Day 3 Recovery</h4>
                      <span className="text-sm font-bold text-purple-600">Scheduled</span>
                    </div>
                    <p className="text-sm text-purple-700 mb-3">Final offer + Phone call</p>
                    <div className="text-xs text-purple-600">
                      <span>Starts in 2 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Retention Campaign Management */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Retention Campaign Management</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create New Campaign
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Pre-renewal Campaign */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600">schedule</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Pre-renewal</h4>
                      <p className="text-sm text-slate-600">2 days before</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">2 days before</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Channel:</span>
                      <span className="font-semibold">Email</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">78%</span>
                  </div>
                </div>
                  <button className="w-full mt-4 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
              </div>

                {/* Renewal Day Campaign */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-600">event</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Renewal Day</h4>
                      <p className="text-sm text-slate-600">Day of renewal</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">Renewal day</span>
                    </div>
                                         <div className="flex justify-between">
                       <span className="text-slate-600">Channel:</span>
                       <span className="font-semibold">Email</span>
                     </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">85%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>

                {/* Day 1 Recovery */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-red-50 to-rose-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600">phone</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Day 1 Recovery</h4>
                      <p className="text-sm text-slate-600">1 day after</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">1 day after</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Channel:</span>
                      <span className="font-semibold">Phone + Email</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">45%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>

                {/* Day 3 Recovery */}
                <div className="p-6 border border-slate-200 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-600">campaign</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Day 3 Recovery</h4>
                      <p className="text-sm text-slate-600">3 days after</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trigger:</span>
                      <span className="font-semibold">3 days after</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Channel:</span>
                      <span className="font-semibold">Phone + Offer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">25%</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition text-sm font-medium">
                    Edit Campaign
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Recovery Successes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Recovery Successes</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'John Smith', plan: 'Pro Team', recovered: '2 days ago', method: 'Phone call', value: '$299/month' },
                  { name: 'Maria Garcia', plan: 'Solo Agent', recovered: '1 day ago', method: 'Email offer', value: '$99/month' },
                                     { name: 'Robert Wilson', plan: 'Brokerage', recovered: '3 days ago', method: 'Email reminder', value: '$599/month' },
                  { name: 'Jennifer Lee', plan: 'Pro Team', recovered: '5 days ago', method: 'Phone call', value: '$299/month' }
                ].map((success, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{success.name}</h4>
                        <p className="text-sm text-slate-600">{success.plan} • {success.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{success.value}</p>
                      <p className="text-xs text-slate-500">{success.recovered}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'admin-settings':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">System Settings & Configuration</h1>
                <p className="text-slate-500 mt-1">Centralized control for all platform settings and configurations</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">backup</span>
                  Backup Config
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">save</span>
                  Save All Changes
                </button>
              </div>
            </header>

            {/* Settings Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 mb-8">
              <div className="border-b border-slate-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'general', label: 'General', icon: 'settings' },
                    { id: 'security', label: 'Security', icon: 'security' },
                    { id: 'billing', label: 'Billing', icon: 'payments' },
                    { id: 'ai', label: 'AI Settings', icon: 'smart_toy' },
                    { id: 'email', label: 'Email & Notifications', icon: 'email' },
                    { id: 'integrations', label: 'Integrations', icon: 'integration_instructions' },
                    { id: 'appearance', label: 'Appearance', icon: 'palette' },
                    { id: 'advanced', label: 'Advanced', icon: 'tune' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                        tab.id === 'general' 
                          ? 'border-primary-500 text-primary-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* General Settings */}
              <div className="p-6">
                <div className="space-y-8">
                  {/* Platform Information */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Platform Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Platform Name</label>
                        <input
                          type="text"
                          defaultValue="Home Listing AI"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Platform URL</label>
                        <input
                          type="url"
                          defaultValue="https://homelistingai.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                        <input
                          type="email"
                          defaultValue="support@homelistingai.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option>UTC (Coordinated Universal Time)</option>
                          <option>EST (Eastern Standard Time)</option>
                          <option>PST (Pacific Standard Time)</option>
                          <option>CST (Central Standard Time)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* User Management */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">User Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Default User Role</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                          <option>Solo Agent</option>
                          <option>Pro Team</option>
                          <option>Brokerage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Trial Period (Days)</label>
                        <input
                          type="number"
                          defaultValue="14"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Properties per User</label>
                        <input
                          type="number"
                          defaultValue="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max AI Interactions per Day</label>
                        <input
                          type="number"
                          defaultValue="50"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Feature Toggles</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">AI Content Generation</h4>
                          <p className="text-sm text-slate-600">Enable AI-powered content creation for all users</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">Voice Assistant</h4>
                          <p className="text-sm text-slate-600">Enable voice-based AI interactions</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">QR Code System</h4>
                          <p className="text-sm text-slate-600">Enable QR code generation for properties</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">Analytics Dashboard</h4>
                          <p className="text-sm text-slate-600">Enable advanced analytics for all users</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-slate-900">Knowledge Base</h4>
                          <p className="text-sm text-slate-600">Enable custom knowledge base creation</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* System Limits */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">System Limits & Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max File Upload Size (MB)</label>
                        <input
                          type="number"
                          defaultValue="10"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout (Minutes)</label>
                        <input
                          type="number"
                          defaultValue="120"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Concurrent Users</label>
                        <input
                          type="number"
                          defaultValue="1000"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">API Rate Limit (per minute)</label>
                        <input
                          type="number"
                          defaultValue="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Maintenance & Updates</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <h4 className="font-semibold text-orange-900">Maintenance Mode</h4>
                          <p className="text-sm text-orange-700">Temporarily disable platform access for maintenance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <h4 className="font-semibold text-blue-900">Auto Updates</h4>
                          <p className="text-sm text-blue-700">Automatically apply system updates during low traffic</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Alerts & Messaging */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">System Alerts & Messaging</h3>
                  <p className="text-slate-600">Monitor system health and send platform-wide messages</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-200 transition">
                    <span className="material-symbols-outlined w-5 h-5">notifications</span>
                    View All Alerts
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                    <span className="material-symbols-outlined w-5 h-5">send</span>
                    Send Message
                  </button>
                </div>
              </div>

              {/* Alert Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600 w-5 h-5">check_circle</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">All Systems</p>
                      <p className="text-xs text-green-600">Operational</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-yellow-600 w-5 h-5">warning</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">3 Warnings</p>
                      <p className="text-xs text-yellow-600">Monitor</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-600 w-5 h-5">error</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">1 Critical</p>
                      <p className="text-xs text-orange-600">Action Required</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600 w-5 h-5">message</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">2 Messages</p>
                      <p className="text-xs text-blue-600">Pending</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Alerts */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-900 mb-4">Active Alerts (Yellow & Above)</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-600 w-4 h-4">error</span>
                      </div>
                      <div>
                        <p className="font-semibold text-red-900">Database Connection Slow</p>
                                                 <p className="text-sm text-red-700">Response time &gt; 2s for 15 minutes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">2 min ago</p>
                      <button className="text-xs text-red-600 hover:text-red-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 w-4 h-4">warning</span>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-900">High CPU Usage</p>
                        <p className="text-sm text-yellow-700">Server CPU at 85% for 10 minutes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">5 min ago</p>
                      <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 w-4 h-4">warning</span>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-900">AI Service Latency</p>
                        <p className="text-sm text-yellow-700">Average response time 3.2s</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">12 min ago</p>
                      <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 w-4 h-4">warning</span>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-900">Storage Space</p>
                        <p className="text-sm text-yellow-700">85% of storage capacity used</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">25 min ago</p>
                      <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Acknowledge</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast Message System */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Send Platform Message</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message Type</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                      <option>General Announcement</option>
                      <option>Maintenance Notice</option>
                      <option>Feature Update</option>
                      <option>Emergency Alert</option>
                      <option>System Status</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority Level</label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="low" className="mr-2" />
                        <span className="text-sm text-slate-600">Low</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="medium" className="mr-2" defaultChecked />
                        <span className="text-sm text-slate-600">Medium</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="high" className="mr-2" />
                        <span className="text-sm text-slate-600">High</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="priority" value="urgent" className="mr-2" />
                        <span className="text-sm text-slate-600">Urgent</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span className="text-sm text-slate-600">All Users</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-slate-600">Solo Agents</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-slate-600">Pro Teams</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-slate-600">Brokerages</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message Title</label>
                    <input
                      type="text"
                      placeholder="Enter message title..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message Content</label>
                    <textarea
                      rows={4}
                      placeholder="Enter your message content..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    ></textarea>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                      <span className="material-symbols-outlined w-5 h-5">schedule</span>
                      Schedule
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                      <span className="material-symbols-outlined w-5 h-5">send</span>
                      Send Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-600">warning</span>
                  </div>
                  <h3 className="font-bold text-slate-900">Emergency Actions</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-sm font-medium">
                    Emergency Lockdown
                  </button>
                  <button className="w-full px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition text-sm font-medium">
                    Force Logout All Users
                  </button>
                  <button className="w-full px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition text-sm font-medium">
                    Disable All AI Services
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600">backup</span>
                  </div>
                  <h3 className="font-bold text-slate-900">Data Management</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition text-sm font-medium">
                    Backup Database
                  </button>
                  <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-sm font-medium">
                    Export User Data
                  </button>
                  <button className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition text-sm font-medium">
                    Clear Cache
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">monitoring</span>
                  </div>
                  <h3 className="font-bold text-slate-900">System Health</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-sm font-medium">
                    Run Diagnostics
                  </button>
                  <button className="w-full px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition text-sm font-medium">
                    Check API Status
                  </button>
                  <button className="w-full px-3 py-2 bg-cyan-100 text-cyan-700 rounded-md hover:bg-cyan-200 transition text-sm font-medium">
                    Test Email System
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'admin-ai-personalities':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">AI Personalities</h1>
                <p className="text-slate-500 mt-1">Create and manage specialized AI personalities with unique voices, tones, and expertise</p>
              </div>
              <button
                onClick={handleCreateAIPersonality}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Create Personality
              </button>
            </header>

            {/* AI Personalities Grid */}
            {aiPersonalities.length === 0 ? (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-8xl text-slate-300 mb-6">psychology</span>
                <h3 className="text-2xl font-bold text-slate-600 mb-4">No AI Personalities Yet</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Create your first AI personality to get started. Each personality can have its own voice, tone, and expertise.
                </p>
                <button
                  onClick={handleCreateAIPersonality}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                >
                  Create First Personality
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aiPersonalities.map((personality) => (
                  <div
                    key={personality.id}
                    className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg ${
                      personality.color === 'blue' ? 'border-blue-200 hover:border-blue-300' :
                      personality.color === 'amber' ? 'border-amber-200 hover:border-amber-300' :
                      personality.color === 'green' ? 'border-green-200 hover:border-green-300' :
                      personality.color === 'purple' ? 'border-purple-200 hover:border-purple-300' :
                      'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Personality Header */}
                    <div className={`p-6 rounded-t-xl ${
                      personality.color === 'blue' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' :
                      personality.color === 'amber' ? 'bg-gradient-to-br from-amber-50 to-yellow-50' :
                      personality.color === 'green' ? 'bg-gradient-to-br from-green-50 to-emerald-50' :
                      personality.color === 'purple' ? 'bg-gradient-to-br from-purple-50 to-violet-50' :
                      'bg-gradient-to-br from-slate-50 to-gray-50'
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                            personality.color === 'blue' ? 'bg-blue-100' :
                            personality.color === 'amber' ? 'bg-amber-100' :
                            personality.color === 'green' ? 'bg-green-100' :
                            personality.color === 'purple' ? 'bg-purple-100' :
                            'bg-slate-100'
                          }`}>
                            {personality.avatar}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{personality.name}</h3>
                            <p className="text-sm text-slate-600">{personality.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            personality.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {personality.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {/* Personality Details */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Tone:</span>
                          <span className="font-medium text-slate-700">{personality.tone}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Style:</span>
                          <span className="font-medium text-slate-700">{personality.style}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Voice:</span>
                          <span className="font-medium text-slate-700">{personality.voice}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Knowledge Base:</span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            personality.knowledgeBase === 'sales' ? 'bg-blue-100 text-blue-700' :
                            personality.knowledgeBase === 'god' ? 'bg-amber-100 text-amber-700' :
                            personality.knowledgeBase === 'support' ? 'bg-green-100 text-green-700' :
                            personality.knowledgeBase === 'marketing' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {personality.knowledgeBase}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personality Metrics */}
                    <div className="p-4 border-t border-slate-100">
                      <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
                          <div className="text-lg font-bold text-slate-900">{personality.metrics.conversations}</div>
                          <div className="text-xs text-slate-500">Conversations</div>
            </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{personality.metrics.successRate}%</div>
                          <div className="text-xs text-slate-500">Success Rate</div>
          </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{personality.metrics.avgResponseTime}</div>
                          <div className="text-xs text-slate-500">Avg Response</div>
                        </div>
                      </div>

                      {/* Expertise Tags */}
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-2">Expertise:</div>
                        <div className="flex flex-wrap gap-1">
                          {personality.expertise.slice(0, 3).map((skill, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                              {skill}
                            </span>
                          ))}
                          {personality.expertise.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                              +{personality.expertise.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <button
                            onClick={() => setEditingAIPersonality(personality)}
                            className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200 transition"
                          >
                            <span className="material-symbols-outlined w-4 h-4">edit</span>
                            Quick Edit
                            <span className="material-symbols-outlined w-4 h-4">expand_more</span>
                          </button>
                          
                          {/* Quick Edit Dropdown */}
                          {editingAIPersonality?.id === personality.id && (
                            <div className="quick-edit-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                              <div className="p-2 space-y-1">
                                {/* Voice Selection */}
                                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                                  <span className="text-sm text-slate-600">Voice:</span>
                                  <select
                                    value={editingAIPersonality.voice}
                                    onChange={(e) => setEditingAIPersonality({...editingAIPersonality, voice: e.target.value})}
                                    className="text-sm border-none bg-transparent focus:ring-0 text-slate-900 font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="alloy">Alloy</option>
                                    <option value="echo">Echo</option>
                                    <option value="fable">Fable</option>
                                    <option value="onyx">Onyx</option>
                                    <option value="nova">Nova</option>
                                    <option value="shimmer">Shimmer</option>
                                  </select>
                                </div>
                                
                                {/* Tone Selection */}
                                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                                  <span className="text-sm text-slate-600">Tone:</span>
                                  <select
                                    value={editingAIPersonality.tone}
                                    onChange={(e) => setEditingAIPersonality({...editingAIPersonality, tone: e.target.value})}
                                    className="text-sm border-none bg-transparent focus:ring-0 text-slate-900 font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="Confident & Persuasive">Confident & Persuasive</option>
                                    <option value="Peaceful & Enlightened">Peaceful & Enlightened</option>
                                    <option value="Helpful & Empathetic">Helpful & Empathetic</option>
                                    <option value="Creative & Energetic">Creative & Energetic</option>
                                    <option value="Professional & Direct">Professional & Direct</option>
                                    <option value="Warm & Friendly">Warm & Friendly</option>
                                    <option value="Analytical & Precise">Analytical & Precise</option>
                                  </select>
                                </div>
                                
                                {/* Knowledge Base Selection */}
                                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                                  <span className="text-sm text-slate-600">Knowledge Base:</span>
                                  <select
                                    value={editingAIPersonality.knowledgeBase}
                                    onChange={(e) => setEditingAIPersonality({...editingAIPersonality, knowledgeBase: e.target.value})}
                                    className="text-sm border-none bg-transparent focus:ring-0 text-slate-900 font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="sales">Sales</option>
                                    <option value="god">God</option>
                                    <option value="support">Support</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="personalities">AI Personalities</option>
                                  </select>
                                </div>
                                
                                {/* Active/Inactive Toggle */}
                                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                                  <span className="text-sm text-slate-600">Status:</span>
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingAIPersonality.isActive}
                                      onChange={(e) => setEditingAIPersonality({...editingAIPersonality, isActive: e.target.checked})}
                                      className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="ml-2 text-sm font-medium text-slate-900">
                                      {editingAIPersonality.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </label>
                                </div>
                                
                                {/* Divider */}
                                <div className="border-t border-slate-200 my-1"></div>
                                
                                {/* Full Edit Button */}
              <button
                                  onClick={() => handleEditAIPersonality(personality)}
                                  className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition"
              >
                                  <span className="material-symbols-outlined w-4 h-4">settings</span>
                                  Full Edit
              </button>
                                
                                {/* Save Button */}
                                <button
                                  onClick={() => {
                                    handleSaveAIPersonality();
                                    setEditingAIPersonality(null);
                                  }}
                                  className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-white bg-primary-600 rounded hover:bg-primary-700 transition"
                                >
                                  <span className="material-symbols-outlined w-4 h-4">save</span>
                                  Save Changes
                                </button>
            </div>
            </div>
                          )}
          </div>
                        
                        <button
                          onClick={() => handleDeleteAIPersonality(personality.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                        >
                          <span className="material-symbols-outlined w-4 h-4">delete</span>
                        </button>
        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'admin-blog-writer':
        return (
          <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Blog Writer</h1>
                <p className="text-slate-500 mt-1">Create and manage blog posts</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create New Post
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">edit</span>
                  Edit Post
                </button>
              </div>
            </header>

            {/* Blog Post List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Blog Posts</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</button>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Blog Post 1', status: 'Draft', lastUpdated: '2 days ago' },
                  { title: 'Blog Post 2', status: 'Published', lastUpdated: '1 week ago' },
                  { title: 'Blog Post 3', status: 'Scheduled', lastUpdated: '3 days from now' }
                ].map((post, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-700">{post.title.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{post.title}</h4>
                        <p className="text-sm text-slate-600">{post.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{post.lastUpdated}</p>
                      <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Edit</button>
                    </div>
                  </div>
                ))}
        </div>
      </div>

            {/* Blog Post Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Blog Post</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="Enter blog post title..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                  <textarea
                    rows={6}
                    placeholder="Write your blog post content here..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    placeholder="Enter image URL..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Keywords</label>
                  <input
                    type="text"
                    placeholder="Enter keywords separated by commas..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <input
                    type="text"
                    placeholder="Enter tags separated by commas..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SEO Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter SEO description..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Publish Date</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                  >
                    Save Post
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <AdminDashboard users={users} leads={leads} onDeleteUser={handleDeleteUser} onDeleteLead={handleDeleteLead} />;
    }
  };

  const handleAIChat = async () => {
    if (!aiChatMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: aiChatMessage,
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setAiChatHistory(prev => [...prev, userMessage]);
    setAiChatMessage('');

    try {
      // Simulate AI response
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: `I understand you're asking about "${aiChatMessage}". Let me help you with that. This is a simulated AI response - in production, this would connect to your OpenAI API for real AI assistance.`,
        timestamp: new Date().toISOString()
      };

      // Add AI response after a short delay
      setTimeout(() => {
        setAiChatHistory(prev => [...prev, aiResponse]);
      }, 1000);

    } catch (error) {
      console.error('AI chat error:', error);
    }
  };

  const handleProposalNext = () => {
    if (proposalStep < proposalQuestions.length - 1) {
      setProposalStep(proposalStep + 1);
    } else {
      // Generate proposal
      generateProposal();
    }
  };

  const handleProposalBack = () => {
    if (proposalStep > 0) {
      setProposalStep(proposalStep - 1);
    }
  };

  const handleProposalInput = (field: string, value: string) => {
    setProposalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateProposal = () => {
    // Calculate pricing based on project type and requirements
    let basePrice = 0;
    const features: { name: string; price: number }[] = [];

    switch (proposalData.projectType) {
      case 'Website':
        basePrice = 3000;
        features.push({ name: 'Responsive Design', price: 500 });
        features.push({ name: 'SEO Optimization', price: 300 });
        break;
      case 'Mobile App':
        basePrice = 8000;
        features.push({ name: 'iOS & Android', price: 2000 });
        features.push({ name: 'Backend API', price: 1500 });
        break;
      case 'Custom Software':
        basePrice = 12000;
        features.push({ name: 'Custom Development', price: 3000 });
        features.push({ name: 'Database Design', price: 1000 });
        break;
      case 'AI Integration':
        basePrice = 5000;
        features.push({ name: 'AI Model Integration', price: 2000 });
        features.push({ name: 'API Development', price: 1000 });
        break;
      case 'Marketing Campaign':
        basePrice = 2000;
        features.push({ name: 'Strategy Planning', price: 500 });
        features.push({ name: 'Content Creation', price: 300 });
        break;
      default:
        basePrice = 4000;
        features.push({ name: 'Custom Solution', price: 1000 });
    }

    const total = basePrice + features.reduce((sum, feature) => sum + feature.price, 0);

    setProposalData(prev => ({
      ...prev,
      pricing: { basePrice, features, total }
    }));
  };

  const handleBlogNext = async () => {
    if (blogStep < blogQuestions.length - 1) {
      setBlogStep(blogStep + 1);
    } else {
      // Generate blog content
      setIsGeneratingBlog(true);
      try {
        await generateBlogContent();
      } finally {
        setIsGeneratingBlog(false);
      }
    }
  };

  const handleBlogBack = () => {
    if (blogStep > 0) {
      setBlogStep(blogStep - 1);
    }
  };

  const handleBlogInput = (field: string, value: string) => {
    setBlogData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddLink = () => {
    setBlogData(prev => ({
      ...prev,
      links: [...prev.links, { text: '', url: '' }]
    }));
  };

  const handleUpdateLink = (index: number, field: 'text' | 'url', value: string) => {
    setBlogData(prev => ({
      ...prev,
      links: prev.links.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const handleRemoveLink = (index: number) => {
    setBlogData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  // Knowledge Base Functions
  const handleAddKnowledgeEntry = async () => {
    if (!newKnowledgeEntry.title || !newKnowledgeEntry.content) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'local-dev';
      const kbCol = collection(db, 'knowledgeBase');
      const ref = await addDoc(kbCol, {
        userId,
        category: activeKnowledgeTab,
        title: newKnowledgeEntry.title,
        content: newKnowledgeEntry.content,
        tags: newKnowledgeEntry.tags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setKnowledgeEntries(prev => ({
        ...prev,
        [activeKnowledgeTab]: [
          ...prev[activeKnowledgeTab as keyof typeof prev],
          {
            id: ref.id,
            title: newKnowledgeEntry.title,
            content: newKnowledgeEntry.content,
            category: newKnowledgeEntry.category || 'general',
            tags: newKnowledgeEntry.tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }));
    } catch (e) {
      console.error('Failed to save knowledge entry:', e);
      alert('Failed to save knowledge. Please try again.');
      return;
    }

    // Reset form
    setNewKnowledgeEntry({
      title: '',
      content: '',
      category: '',
      tags: [],
      tagInput: ''
    });
    setShowAddKnowledgeModal(false);
  };

  const handleAddTag = () => {
    if (newKnowledgeEntry.tagInput.trim() && !newKnowledgeEntry.tags.includes(newKnowledgeEntry.tagInput.trim())) {
      setNewKnowledgeEntry(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewKnowledgeEntry(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleDeleteKnowledgeEntry = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this knowledge entry?')) {
      try {
        await deleteDoc(doc(db, 'knowledgeBase', entryId));
        await refreshKnowledgeFromFirestore();
      } catch (e) {
        console.error('Failed to delete knowledge entry:', e);
        alert('Failed to delete entry.');
      }
    }
  };

  // Document Upload Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocumentUpload(prev => ({
        ...prev,
        file,
        title: file.name
      }));
    }
  };

  const handleAddDocumentTag = () => {
    if (documentUpload.tagInput.trim() && !documentUpload.tags.includes(documentUpload.tagInput.trim())) {
      setDocumentUpload(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveDocumentTag = (tagToRemove: string) => {
    setDocumentUpload(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUploadDocument = async () => {
    if (!documentUpload.file || !documentUpload.title) {
      alert('Please select a file and provide a title');
      return;
    }

    try {
      const uid = auth.currentUser?.uid || 'local-dev';
      const upload = await fileUploadService.uploadFile(documentUpload.file, uid);
      await fileUploadService.processDocument(
        upload.fileId,
        documentUpload.file.type || 'application/octet-stream'
      );
      await fileUploadService.storeKnowledgeBase(
        upload.fileId,
        activeKnowledgeTab,
        documentUpload.tags,
        uid
      );
      await refreshKnowledgeFromFirestore();
    } catch (e) {
      console.error('Document upload failed:', e);
      alert('Failed to upload document.');
      return;
    }

    // Reset form
    setDocumentUpload({
      file: null,
      title: '',
      category: '',
      tags: [],
      tagInput: ''
    });
    setShowAddKnowledgeModal(false);
  };

  // URL Scanner Functions
  const handleAddUrlTag = () => {
    if (urlScanner.tagInput.trim() && !urlScanner.tags.includes(urlScanner.tagInput.trim())) {
      setUrlScanner(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveUrlTag = (tagToRemove: string) => {
    setUrlScanner(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddUrlScanner = () => {
    if (!urlScanner.url || !urlScanner.title) {
      alert('Please provide both URL and title');
      return;
    }

    // For now, do not persist scraper placeholder entries
    setKnowledgeEntries(prev => ({
      ...prev,
      [activeKnowledgeTab]: prev[activeKnowledgeTab as keyof typeof prev]
    }));

    // Reset form
    setUrlScanner({
      url: '',
      title: '',
      category: '',
      scanFrequency: 'weekly',
      tags: [],
      tagInput: ''
    });
    setShowAddKnowledgeModal(false);
  };

  // Persona Management Functions
  const handleEditPersona = (key: string) => {
    const persona = knowledgePersonas[key as keyof typeof knowledgePersonas];
    setEditingPersona({
      key,
      title: persona.title,
      systemPrompt: persona.systemPrompt,
      isActive: persona.isActive
    });
    setShowPersonaModal(true);
  };

  const handleSavePersona = async () => {
    if (!editingPersona) return;

    try {
      const uid = auth.currentUser?.uid || 'local-dev';
      const key = editingPersona.key;
      // Build a minimal persona payload expected by the persona service
      const currentPersona = {
        kbPersonas: {
          [key]: {
            title: editingPersona.title,
            systemPrompt: editingPersona.systemPrompt,
            isActive: editingPersona.isActive,
            voiceId: (editingPersona as any).voiceId ?? null
          }
        }
      };

      await personaService.savePersona(uid, currentPersona);
      console.log('Persona saved successfully');

      // Update local UI state
      setKnowledgePersonas(prev => ({
        ...prev,
        [key]: {
          title: editingPersona.title,
          systemPrompt: editingPersona.systemPrompt,
          isActive: editingPersona.isActive,
          voiceId: (editingPersona as any).voiceId || (prev as any)[key]?.voiceId
        }
      }));

      setShowPersonaModal(false);
      setEditingPersona(null);
    } catch (error) {
      console.error('Failed to save persona:', error);
      // Keep modal open for correction; optionally show toast/error UI here
    }
  };

  // AI Personality Functions
  const handleCreateAIPersonality = () => {
    setEditingAIPersonality({
      id: '',
      name: '',
      description: '',
      tone: '',
      style: '',
      voice: 'alloy',
      knowledgeBase: 'sales',
      personality: '',
      expertise: [],
      avatar: '🤖',
      color: 'blue',
      isActive: true
    });
    setAiPersonalityStep(0);
    setShowAIPersonalityModal(true);
  };

  const handleEditAIPersonality = (personality: any) => {
    setEditingAIPersonality(personality);
    setAiPersonalityStep(0);
    setShowAIPersonalityModal(true);
  };

  const handleDeleteAIPersonality = (id: string) => {
    if (confirm('Are you sure you want to delete this AI personality?')) {
      setAiPersonalities(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSaveAIPersonality = () => {
    if (!editingAIPersonality) return;

    if (editingAIPersonality.id) {
      // Update existing
      setAiPersonalities(prev => 
        prev.map(p => p.id === editingAIPersonality.id ? {
          ...editingAIPersonality,
          updatedAt: new Date().toISOString()
        } : p)
      );
    } else {
      // Create new
      setAiPersonalities(prev => [...prev, {
        ...editingAIPersonality,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: {
          conversations: 0,
          successRate: 0,
          avgResponseTime: '0.0s'
        }
      }]);
    }

    setShowAIPersonalityModal(false);
    setEditingAIPersonality(null);
    setAiPersonalityStep(0);
  };

  // Load persisted knowledge entries from Firestore (disabled during migration)
  const refreshKnowledgeFromFirestore = async () => {
    try {
      // Firebase client is disabled; keep UI stable with empty data
      setKnowledgeEntries({ god: [], sales: [], support: [], marketing: [] } as any);
    } catch {}
  };

  // Load persisted knowledge entries on mount and when user changes
  useEffect(() => {
    refreshKnowledgeFromFirestore();
  }, []);

  const handleAIPersonalityNext = () => {
    if (aiPersonalityStep < 4) {
      setAiPersonalityStep(aiPersonalityStep + 1);
    } else {
      handleSaveAIPersonality();
    }
  };

  const handleAIPersonalityBack = () => {
    if (aiPersonalityStep > 0) {
      setAiPersonalityStep(aiPersonalityStep - 1);
    }
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.quick-edit-dropdown')) {
      setEditingAIPersonality(null);
    }
  };

  // Add click outside listener
  React.useEffect(() => {
    if (editingAIPersonality) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [editingAIPersonality]);

  const generateBlogContent = async () => {
    // Generate AI image if requested
    let generatedImageUrl = '';
    if (blogData.generateImage === 'Yes, generate a custom AI image') {
      try {
        // Simulate AI image generation with a realistic prompt
        // Generate professional real estate image
        
        // For now, we'll use a placeholder image that matches the topic
        // In production, this would call DALL-E or similar AI image generation API
        const topicImages = {
          'real estate': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
          'home buying': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
          'property investment': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
          'market trends': 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
          'mortgage': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
          'default': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'
        };
        
        // Find matching image based on topic keywords
        const topicLower = blogData.topic.toLowerCase();
        if (topicLower.includes('real estate') || topicLower.includes('property')) {
          generatedImageUrl = topicImages['real estate'];
        } else if (topicLower.includes('home') || topicLower.includes('buying')) {
          generatedImageUrl = topicImages['home buying'];
        } else if (topicLower.includes('investment')) {
          generatedImageUrl = topicImages['property investment'];
        } else if (topicLower.includes('market') || topicLower.includes('trend')) {
          generatedImageUrl = topicImages['market trends'];
        } else if (topicLower.includes('mortgage') || topicLower.includes('loan')) {
          generatedImageUrl = topicImages['mortgage'];
        } else {
          generatedImageUrl = topicImages['default'];
        }
        
        // Update the image URL in the form
        setBlogData(prev => ({
          ...prev,
          imageUrl: generatedImageUrl
        }));
        
        // Show success message
        console.log('✅ AI image generated successfully!');
      } catch (error) {
        console.error('Error generating AI image:', error);
      }
    }

    // Use the generated image URL or the provided one
    const finalImageUrl = generatedImageUrl || blogData.imageUrl;

    // Simulate AI-generated blog content
    const content = `# ${blogData.title}

${finalImageUrl && `![${blogData.title}](${finalImageUrl})
${generatedImageUrl ? `*AI-generated image for this article*` : ''}

`}## Introduction

Welcome to our comprehensive guide on ${blogData.topic}. This article is designed for ${blogData.targetAudience} and will provide you with valuable insights and actionable information.

## Key Points

- **Understanding the Basics**: We'll start with fundamental concepts that are essential for ${blogData.targetAudience}
- **Advanced Strategies**: Discover proven methods and techniques
- **Practical Applications**: Learn how to implement these concepts in real-world scenarios

## Main Content

This ${blogData.length.toLowerCase()} article will cover everything you need to know about ${blogData.topic}. Our ${blogData.tone.toLowerCase()} approach ensures that you'll find the information both engaging and informative.

### Why This Matters

For ${blogData.targetAudience}, understanding ${blogData.topic} is crucial for success. Whether you're just starting out or looking to enhance your existing knowledge, this guide will provide the foundation you need.

### Best Practices

1. **Research Thoroughly**: Always gather comprehensive information before making decisions
2. **Stay Updated**: The field of ${blogData.topic} is constantly evolving
3. **Practice Regularly**: Consistent application leads to better results

## Conclusion

${blogData.topic} represents a significant opportunity for ${blogData.targetAudience}. By following the guidelines outlined in this article, you'll be well-positioned to achieve your goals.

${blogData.links.length > 0 ? `

## Additional Resources

${blogData.links.map(link => `- [${link.text}](${link.url})`).join('\n')}
` : ''}

---

*This article was generated using AI technology to provide you with the most relevant and up-to-date information on ${blogData.topic}.*`;

    setBlogData(prev => ({
      ...prev,
      content
    }));
  };

  return (
    <>
      {renderAdminContent()}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter user name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter user email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                <select
                  value={newUserForm.plan}
                  onChange={(e) => setNewUserForm({...newUserForm, plan: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Solo Agent">Solo Agent</option>
                  <option value="Team Agent">Team Agent</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal (Users tab) */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                <select
                  value={editUserForm.plan}
                  onChange={(e) => setEditUserForm({ ...editUserForm, plan: e.target.value as User['plan'] })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Solo Agent">Solo Agent</option>
                  <option value="Pro Team">Pro Team</option>
                  <option value="Brokerage">Brokerage</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserEdit}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Lead</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({...newLeadForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter lead name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({...newLeadForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter lead email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={newLeadForm.status}
                  onChange={(e) => setNewLeadForm({...newLeadForm, status: e.target.value as LeadStatus})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="New">New</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Showing">Showing</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
                <select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({...newLeadForm, source: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({...newLeadForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Add any notes about this lead"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Add Lead
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Contact Modal */}
      {showContactModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Contact {selectedLead.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">Log an interaction or schedule a follow-up</p>
              </div>
              <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined w-6 h-6">close</span>
              </button>
            </div>
            
            <div className="border-b border-slate-200">
              <nav className="flex items-center">
                <button 
                  onClick={() => setActiveContactTab('email')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    activeContactTab === 'email' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">mail</span>
                  <span>Email</span>
                </button>
                <button 
                  onClick={() => setActiveContactTab('call')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    activeContactTab === 'call' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">call</span>
                  <span>Log Call</span>
                </button>
                <button 
                  onClick={() => setActiveContactTab('note')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    activeContactTab === 'note' 
                      ? 'border-primary-600 text-primary-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">edit_note</span>
                  <span>Add Note</span>
              </button>
              <button
                onClick={() => {
                    setShowContactModal(false);
                    if (selectedLead) {
                      openScheduler({
                        name: selectedLead.name,
                        email: selectedLead.email,
                        phone: selectedLead.phone,
                        kind: 'Follow-up'
                      })
                    } else {
                      openScheduler({ kind: 'Consultation' })
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                >
                  <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                  <span>Schedule</span>
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeContactTab === 'email' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      defaultValue={`Re: Your inquiry`}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message</label>
                    <textarea
                      rows={6}
                      defaultValue={`Hi ${selectedLead.name.split(' ')[0]},

Thank you for your interest. I'd love to discuss this property with you and answer any questions you may have.

Would you be available for a quick call or showing?

Best regards,`}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                    />
                  </div>

      {/* Centralized Modals */}
      <AdminModals
        users={users}
        leads={leads}
        onAddUser={handleAddUser}
        onEditUser={handleSaveUserEdit}
        onAddLead={handleAddLead}
        onEditLead={handleEditLead}
      />                </>
              )}
              
              {activeContactTab === 'call' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Log Call Details</label>
                  <textarea
                    rows={6}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={`Log details about your call with ${selectedLead.name}... e.g., "Left voicemail, will try again tomorrow."`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  />
                </div>
              )}
              
              {activeContactTab === 'note' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Add a Note</label>
                  <textarea
                    rows={6}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={`Add a private note for ${selectedLead.name}...`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end items-center px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button 
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedLead(null);
                  setNoteContent('');
                  setActiveContactTab('email');
                }} 
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2"
              >
                Cancel
              </button>
              {activeContactTab === 'email' && (
                <button 
                  onClick={() => handleContact('Email sent successfully')} 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
                >
                  <span className="material-symbols-outlined w-5 h-5">send</span>
                  <span>Send Email</span>
                </button>
              )}
              {(activeContactTab === 'call' || activeContactTab === 'note') && (
                <button 
                  onClick={activeContactTab === 'call' ? handleLogCall : handleAddNote}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
                >
                  <span className="material-symbols-outlined w-5 h-5">save</span>
                  <span>{activeContactTab === 'call' ? 'Save Log' : 'Save Note'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Schedule Modal */}
      {showScheduleModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Schedule Appointment with {selectedLead.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
    </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Time *</label>
                <input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm({...scheduleForm, type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Showing">Property Showing</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Meeting">General Meeting</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Add any notes about the appointment"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedLead(null);
                  setScheduleForm({ date: '', time: '', type: 'Showing', notes: '' });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Schedule Appointment
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Knowledge Modal */}
      {showAddKnowledgeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Add Knowledge to {activeKnowledgeTab === 'god' ? '🌟 God' : 
                activeKnowledgeTab === 'sales' ? '📈 Sales' :
                activeKnowledgeTab === 'support' ? '🛠️ Support' :
                activeKnowledgeTab === 'marketing' ? '📢 Marketing' :
                '🧠 AI Personalities'} Knowledge Base
              </h3>
              <button
                onClick={() => setShowAddKnowledgeModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <span className="material-symbols-outlined w-6 h-6">close</span>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="border-b border-slate-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveModalTab('quick-add')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeModalTab === 'quick-add'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">edit</span>
                  Quick Add
                </button>
                <button
                  onClick={() => setActiveModalTab('document-upload')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeModalTab === 'document-upload'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">upload_file</span>
                  Document Upload
                </button>
                <button
                  onClick={() => setActiveModalTab('url-scanner')}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeModalTab === 'url-scanner'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined w-5 h-5">link</span>
                  URL Scanner
                </button>
              </nav>
            </div>

            {/* Quick Add Tab */}
            {activeModalTab === 'quick-add' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newKnowledgeEntry.title}
                    onChange={(e) => setNewKnowledgeEntry({...newKnowledgeEntry, title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter knowledge title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content *</label>
                  <textarea
                    value={newKnowledgeEntry.content}
                    onChange={(e) => setNewKnowledgeEntry({...newKnowledgeEntry, content: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={6}
                    placeholder="Enter knowledge content"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={newKnowledgeEntry.category}
                    onChange={(e) => setNewKnowledgeEntry({...newKnowledgeEntry, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., technique, strategy, wisdom"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newKnowledgeEntry.tagInput}
                      onChange={(e) => setNewKnowledgeEntry({...newKnowledgeEntry, tagInput: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  {newKnowledgeEntry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newKnowledgeEntry.tags.map((tag, index) => (
                        <span key={index} className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <span className="material-symbols-outlined w-4 h-4">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Upload Tab */}
            {activeModalTab === 'document-upload' && (
              <div className="space-y-4">
                <div className="relative p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300">
                  <div className="flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-blue-400 mb-4">upload_file</span>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Document</h3>
                    <p className="text-slate-500 mb-6">Drag and drop files here, or click to browse</p>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx"
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined w-5 h-5">upload</span>
                      Choose Files
                    </label>
                  </div>
                </div>

                {documentUpload.file && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <div>
                        <p className="font-semibold text-green-800">{documentUpload.file.name}</p>
                        <p className="text-sm text-green-600">{(documentUpload.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={documentUpload.title}
                    onChange={(e) => setDocumentUpload({...documentUpload, title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter document title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={documentUpload.category}
                    onChange={(e) => setDocumentUpload({...documentUpload, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., manual, guide, policy"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={documentUpload.tagInput}
                      onChange={(e) => setDocumentUpload({...documentUpload, tagInput: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocumentTag())}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      onClick={handleAddDocumentTag}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  {documentUpload.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {documentUpload.tags.map((tag, index) => (
                        <span key={index} className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                          {tag}
                          <button
                            onClick={() => handleRemoveDocumentTag(tag)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <span className="material-symbols-outlined w-4 h-4">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* URL Scanner Tab */}
            {activeModalTab === 'url-scanner' && (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-2xl text-purple-600">link</span>
                    <h3 className="text-lg font-bold text-slate-800">URL Content Scanner</h3>
                  </div>
                  <p className="text-slate-600 text-sm">
                    Automatically scan and extract knowledge from websites. The system will periodically check for updates and extract relevant content.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">URL *</label>
                  <input
                    type="url"
                    value={urlScanner.url}
                    onChange={(e) => setUrlScanner({...urlScanner, url: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://example.com/article"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={urlScanner.title}
                    onChange={(e) => setUrlScanner({...urlScanner, title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter a descriptive title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Scan Frequency</label>
                  <select
                    value={urlScanner.scanFrequency}
                    onChange={(e) => setUrlScanner({...urlScanner, scanFrequency: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={urlScanner.category}
                    onChange={(e) => setUrlScanner({...urlScanner, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., news, research, blog"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={urlScanner.tagInput}
                      onChange={(e) => setUrlScanner({...urlScanner, tagInput: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrlTag())}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      onClick={handleAddUrlTag}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  {urlScanner.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {urlScanner.tags.map((tag, index) => (
                        <span key={index} className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                          {tag}
                          <button
                            onClick={() => handleRemoveUrlTag(tag)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <span className="material-symbols-outlined w-4 h-4">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddKnowledgeModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              {activeModalTab === 'quick-add' && (
                <button
                  onClick={handleAddKnowledgeEntry}
                  disabled={!newKnowledgeEntry.title || !newKnowledgeEntry.content}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Knowledge
                </button>
              )}
              {activeModalTab === 'document-upload' && (
                <button
                  onClick={handleUploadDocument}
                  disabled={!documentUpload.file || !documentUpload.title}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Document
                </button>
              )}
              {activeModalTab === 'url-scanner' && (
                <button
                  onClick={handleAddUrlScanner}
                  disabled={!urlScanner.url || !urlScanner.title}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add URL Scanner
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Persona Edit Modal */}
      {showPersonaModal && editingPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Edit Knowledge Base Persona
              </h3>
              <button
                onClick={() => setShowPersonaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <span className="material-symbols-outlined w-6 h-6">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Persona Title</label>
                <input
                  type="text"
                  value={editingPersona.title}
                  onChange={(e) => setEditingPersona({...editingPersona, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter persona title"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">AI Personality</label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Tone preset</label>
                    <select
                      onChange={(e) => {
                        const preset = e.target.value;
                        if (!preset) return;
                        const map: Record<string, string> = {
                          professional: 'Tone: Professional. Use clear, concise, authoritative language with precise terminology. Avoid slang.',
                          friendly: 'Tone: Friendly. Warm, approachable, encouraging. Use simple language and positive phrasing.',
                          enthusiastic: 'Tone: Enthusiastic. High energy and motivational. Keep sentences short and impactful.',
                          empathetic: 'Tone: Empathetic. Validate feelings first, then guide with calm, supportive language.',
                          direct: 'Tone: Direct. Be brief and to the point. Present steps and recommendations without fluff.',
                          playful: 'Tone: Playful. Light, creative, lightly humorous while remaining helpful and respectful.'
                        };
                        const directive = map[preset];
                        if (!directive) return;
                        setEditingPersona({
                          ...editingPersona,
                          systemPrompt: `${directive}\n\n${editingPersona.systemPrompt || ''}`.trim()
                        });
                        e.currentTarget.value = '';
                      }}
                      defaultValue=""
                      className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="" disabled>Apply preset…</option>
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="direct">Direct</option>
                      <option value="playful">Playful</option>
                    </select>
                  </div>
                </div>
                <textarea
                  value={editingPersona.systemPrompt}
                  onChange={(e) => setEditingPersona({...editingPersona, systemPrompt: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={8}
                  placeholder="Enter a custom personality prompt to override the generated one..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Define the AI's role, expertise, and behavior for this knowledge base.
                </p>
              </div>

              {/* Voice selection placeholder */}
              <div className="mt-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'voice-a', name: 'Clarity', desc: 'Crisp, professional' },
                    { id: 'voice-b', name: 'Warmth', desc: 'Friendly, empathetic' },
                    { id: 'voice-c', name: 'Spark', desc: 'Energetic, upbeat' },
                    { id: 'voice-d', name: 'Calm', desc: 'Relaxed, reassuring' }
                  ].map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setEditingPersona({ ...editingPersona, voiceId: v.id } as any)}
                      className={`p-3 rounded-lg border text-left transition ${
                        (editingPersona as any)?.voiceId === v.id
                          ? 'border-primary-500 ring-2 ring-primary-200 bg-primary-50'
                          : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{v.name}</span>
                        <span className={`material-symbols-outlined text-xl ${
                          (editingPersona as any)?.voiceId === v.id ? 'text-primary-600' : 'text-slate-400'
                        }`}>graphic_eq</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{v.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Placeholder voices. Final voice options will be connected to the speech service. Your custom prompt above will still override behavior if provided.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="persona-active"
                  checked={editingPersona.isActive}
                  onChange={(e) => setEditingPersona({...editingPersona, isActive: e.target.checked})}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="persona-active" className="text-sm font-medium text-slate-700">
                  Active - This persona is currently being used by the AI
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPersonaModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePersona}
                disabled={!editingPersona.title || !editingPersona.systemPrompt}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Persona
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Personality Creation/Edit Modal */}
      {showAIPersonalityModal && editingAIPersonality && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {editingAIPersonality.id ? 'Edit AI Personality' : 'Create AI Personality'}
              </h3>
              <button
                onClick={() => setShowAIPersonalityModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <span className="material-symbols-outlined w-6 h-6">close</span>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-700">
                  Step {aiPersonalityStep + 1} of 5
                </span>
                <span className="text-sm text-slate-500">
                  {['Basic Info', 'Personality', 'Voice & Tone', 'Knowledge Base', 'Review'][aiPersonalityStep]}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((aiPersonalityStep + 1) / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {/* Step 1: Basic Info */}
              {aiPersonalityStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-6xl text-primary-500 mb-4">psychology</span>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">Basic Information</h4>
                    <p className="text-slate-600">Let's start with the basics about your AI personality</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={editingAIPersonality.name}
                        onChange={(e) => setEditingAIPersonality({...editingAIPersonality, name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="e.g., Sales Titan, Marketing Maverick"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Avatar</label>
                      <div className="flex gap-2">
                        {['🤖', '🏆', '✨', '🛡️', '🚀', '💎', '⚡', '🔥', '🎯', '💫'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => setEditingAIPersonality({...editingAIPersonality, avatar: emoji})}
                            className={`w-10 h-10 rounded-lg text-xl transition ${
                              editingAIPersonality.avatar === emoji 
                                ? 'bg-primary-100 border-2 border-primary-500' 
                                : 'bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                    <input
                      type="text"
                      value={editingAIPersonality.description}
                      onChange={(e) => setEditingAIPersonality({...editingAIPersonality, description: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Brief description of this personality"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Color Theme</label>
                    <div className="flex gap-3">
                      {[
                        { name: 'blue', bg: 'bg-blue-500' },
                        { name: 'amber', bg: 'bg-amber-500' },
                        { name: 'green', bg: 'bg-green-500' },
                        { name: 'purple', bg: 'bg-purple-500' },
                        { name: 'red', bg: 'bg-red-500' },
                        { name: 'indigo', bg: 'bg-indigo-500' }
                      ].map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setEditingAIPersonality({...editingAIPersonality, color: color.name})}
                          className={`w-8 h-8 rounded-full ${color.bg} transition ${
                            editingAIPersonality.color === color.name 
                              ? 'ring-4 ring-offset-2 ring-slate-300' 
                              : 'hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Personality */}
              {aiPersonalityStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-6xl text-primary-500 mb-4">face</span>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">Personality & Expertise</h4>
                    <p className="text-slate-600">Define who this AI is and what they're experts at</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Personality Description *</label>
                    <textarea
                      value={editingAIPersonality.personality}
                      onChange={(e) => setEditingAIPersonality({...editingAIPersonality, personality: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={4}
                      placeholder="Describe this AI's personality, expertise, and approach..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Expertise Areas</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editingAIPersonality.expertise.map((skill: string, index: number) => (
                        <span key={index} className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                          {skill}
                          <button
                            onClick={() => setEditingAIPersonality({
                              ...editingAIPersonality, 
                              expertise: editingAIPersonality.expertise.filter((_: any, i: number) => i !== index)
                            })}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <span className="material-symbols-outlined w-4 h-4">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add expertise area"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              setEditingAIPersonality({
                                ...editingAIPersonality,
                                expertise: [...editingAIPersonality.expertise, target.value.trim()]
                              });
                              target.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input.value.trim()) {
                            setEditingAIPersonality({
                              ...editingAIPersonality,
                              expertise: [...editingAIPersonality.expertise, input.value.trim()]
                            });
                            input.value = '';
                          }
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Voice & Tone */}
              {aiPersonalityStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-6xl text-primary-500 mb-4">record_voice_over</span>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">Voice & Communication Style</h4>
                    <p className="text-slate-600">Choose how this AI should speak and communicate</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Tone *</label>
                      <select
                        value={editingAIPersonality.tone}
                        onChange={(e) => setEditingAIPersonality({...editingAIPersonality, tone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Tone</option>
                        <option value="Confident & Persuasive">Confident & Persuasive</option>
                        <option value="Peaceful & Enlightened">Peaceful & Enlightened</option>
                        <option value="Helpful & Empathetic">Helpful & Empathetic</option>
                        <option value="Creative & Energetic">Creative & Energetic</option>
                        <option value="Professional & Direct">Professional & Direct</option>
                        <option value="Warm & Friendly">Warm & Friendly</option>
                        <option value="Analytical & Precise">Analytical & Precise</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Communication Style *</label>
                      <select
                        value={editingAIPersonality.style}
                        onChange={(e) => setEditingAIPersonality({...editingAIPersonality, style: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Style</option>
                        <option value="Direct & Results-Focused">Direct & Results-Focused</option>
                        <option value="Wise & Compassionate">Wise & Compassionate</option>
                        <option value="Patient & Solution-Oriented">Patient & Solution-Oriented</option>
                        <option value="Innovative & Data-Driven">Innovative & Data-Driven</option>
                        <option value="Detailed & Methodical">Detailed & Methodical</option>
                        <option value="Inspiring & Motivational">Inspiring & Motivational</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Voice Model</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map((voice) => (
                        <button
                          key={voice}
                          onClick={() => setEditingAIPersonality({...editingAIPersonality, voice})}
                          className={`p-3 rounded-lg border-2 transition ${
                            editingAIPersonality.voice === voice 
                              ? 'border-primary-500 bg-primary-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-sm font-medium capitalize">{voice}</div>
                          <div className="text-xs text-slate-500">
                            {voice === 'alloy' && 'Balanced & Clear'}
                            {voice === 'echo' && 'Warm & Engaging'}
                            {voice === 'fable' && 'Gentle & Soft'}
                            {voice === 'onyx' && 'Deep & Authoritative'}
                            {voice === 'nova' && 'Bright & Energetic'}
                            {voice === 'shimmer' && 'Smooth & Professional'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Knowledge Base */}
              {aiPersonalityStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-6xl text-primary-500 mb-4">school</span>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">Knowledge Base Connection</h4>
                    <p className="text-slate-600">Connect this personality to a knowledge base for specialized expertise</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(knowledgePersonas).map(([key, persona]) => (
                      <button
                        key={key}
                        onClick={() => setEditingAIPersonality({...editingAIPersonality, knowledgeBase: key})}
                        className={`p-4 rounded-lg border-2 text-left transition ${
                          editingAIPersonality.knowledgeBase === key 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 mb-2">{persona.title}</div>
                        <div className="text-sm text-slate-600 line-clamp-2">{persona.systemPrompt}</div>
                        <div className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                          persona.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {persona.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {aiPersonalityStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${
                      editingAIPersonality.color === 'blue' ? 'bg-blue-100' :
                      editingAIPersonality.color === 'amber' ? 'bg-amber-100' :
                      editingAIPersonality.color === 'green' ? 'bg-green-100' :
                      editingAIPersonality.color === 'purple' ? 'bg-purple-100' :
                      'bg-slate-100'
                    }`}>
                      {editingAIPersonality.avatar}
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">{editingAIPersonality.name}</h4>
                    <p className="text-slate-600">{editingAIPersonality.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="font-semibold text-slate-900">Communication</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tone:</span>
                          <span className="font-medium">{editingAIPersonality.tone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Style:</span>
                          <span className="font-medium">{editingAIPersonality.style}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Voice:</span>
                          <span className="font-medium">{editingAIPersonality.voice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Knowledge Base:</span>
                          <span className="font-medium capitalize">{editingAIPersonality.knowledgeBase}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h5 className="font-semibold text-slate-900">Expertise</h5>
                      <div className="flex flex-wrap gap-2">
                        {editingAIPersonality.expertise.map((skill: string, index: number) => (
                          <span key={index} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">Personality</h5>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-700">{editingAIPersonality.personality}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="personality-active"
                      checked={editingAIPersonality.isActive}
                      onChange={(e) => setEditingAIPersonality({...editingAIPersonality, isActive: e.target.checked})}
                      className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="personality-active" className="text-sm font-medium text-slate-700">
                      Activate this personality immediately
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={() => setShowAIPersonalityModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              
              {aiPersonalityStep > 0 && (
                <button
                  onClick={handleAIPersonalityBack}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
                >
                  Back
                </button>
              )}
              
              <button
                onClick={handleAIPersonalityNext}
                disabled={
                  (aiPersonalityStep === 0 && (!editingAIPersonality.name || !editingAIPersonality.description)) ||
                  (aiPersonalityStep === 1 && !editingAIPersonality.personality) ||
                  (aiPersonalityStep === 2 && (!editingAIPersonality.tone || !editingAIPersonality.style))
                }
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiPersonalityStep === 4 ? 'Create Personality' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centralized Modals */}
      <AdminModals
        users={users}
        leads={leads}
        onAddUser={handleAddUser}
        onEditUser={handleSaveUserEdit}
        onAddLead={handleAddLead}
        onEditLead={handleEditLead}
      />    </>
  );
};

export default AdminLayout;