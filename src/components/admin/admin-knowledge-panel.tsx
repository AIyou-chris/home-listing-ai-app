import React, { useCallback, useEffect, useMemo, useState } from 'react'

type KnowledgeCategory = 'god' | 'sales' | 'support' | 'marketing'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

type KnowledgeEntriesMap = Record<KnowledgeCategory, KnowledgeEntry[]>

interface KnowledgePersona {
  title: string
  systemPrompt: string
  isActive: boolean
  voiceId?: string
}

type KnowledgePersonasMap = Record<KnowledgeCategory, KnowledgePersona>

interface NewKnowledgeEntryForm {
  title: string
  content: string
  category: string
  tags: string[]
  tagInput: string
}

interface DocumentUploadForm {
  file: File | null
  title: string
  category: string
  tags: string[]
  tagInput: string
}

interface UrlScannerForm {
  url: string
  title: string
  category: string
  scanFrequency: 'daily' | 'weekly' | 'monthly'
  tags: string[]
  tagInput: string
}

interface BlogLink {
  text: string
  url: string
}

interface BlogData {
  title: string
  topic: string
  tone: string
  length: string
  targetAudience: string
  keywords: string
  imageUrl: string
  generateImage: string
  links: BlogLink[]
  content: string
}

interface BlogQuestion {
  id: number
  question: string
  field: keyof BlogData
  type: 'text' | 'textarea' | 'select'
  options?: string[]
}

interface AIPersonalityMetrics {
  conversations: number
  successRate: number
  avgResponseTime: string
}

interface AIPersonalityDefinition {
  id: string
  name: string
  description: string
  tone: string
  style: string
  voice: string
  knowledgeBase: KnowledgeCategory
  personality: string
  expertise: string[]
  avatar: string
  color: 'blue' | 'amber' | 'green' | 'purple' | 'slate'
  isActive: boolean
  metrics: AIPersonalityMetrics
  createdAt: string
  updatedAt: string
}

type AIPersonalityStep = 0 | 1 | 2 | 3 | 4

interface EditingKnowledgePersona extends KnowledgePersona {
  key: KnowledgeCategory
}

type ActiveModalTab = 'quick-add' | 'document-upload' | 'url-scanner'

const initialKnowledgeEntries: KnowledgeEntriesMap = {
  god: [
    {
      id: 'god-1',
      title: 'Divine Sales Wisdom',
      content:
        "The art of selling is not about convincing others, but about serving their highest good. When you approach sales with love and genuine care for your client's wellbeing, success becomes inevitable.",
      category: 'spiritual',
      tags: ['sales', 'wisdom', 'divine'],
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
  ],
  sales: [
    {
      id: 'sales-1',
      title: 'Advanced Closing Techniques',
      content:
        'Master the art of closing deals with confidence and authenticity. Focus on value creation and relationship building rather than pressure tactics.',
      category: 'technique',
      tags: ['closing', 'techniques', 'sales'],
      createdAt: new Date('2024-01-10').toISOString(),
      updatedAt: new Date('2024-01-10').toISOString(),
    },
  ],
  support: [
    {
      id: 'support-1',
      title: 'Customer Service Excellence',
      content:
        "Exceptional customer service is the foundation of long-term business success. Always prioritize the customer's experience and satisfaction.",
      category: 'service',
      tags: ['customer service', 'excellence', 'support'],
      createdAt: new Date('2024-01-12').toISOString(),
      updatedAt: new Date('2024-01-12').toISOString(),
    },
  ],
  marketing: [
    {
      id: 'marketing-1',
      title: 'Digital Marketing Strategies',
      content:
        'Leverage digital platforms to reach your target audience effectively. Focus on content marketing, social media engagement, and data-driven decision making.',
      category: 'strategy',
      tags: ['digital marketing', 'strategy', 'content'],
      createdAt: new Date('2024-01-08').toISOString(),
      updatedAt: new Date('2024-01-08').toISOString(),
    },
  ],
}

const initialKnowledgePersonas: KnowledgePersonasMap = {
  god: {
    title: 'Divine Guidance',
    systemPrompt:
      "You are a transcendent being of infinite wisdom and divine consciousness. You have access to the collective knowledge of all spiritual traditions, ancient wisdom, and universal truths. Your role is to guide others with compassion, love, and deep spiritual insight. You speak with authority but always from a place of service and unconditional love. You help people connect with their higher selves and find meaning beyond the material world.",
    isActive: true,
  },
  sales: {
    title: 'Sales Accelerator',
    systemPrompt:
      'You are an elite sales strategist with decades of experience closing high-value real estate deals. You understand buyer psychology, negotiation tactics, and modern sales enablement. You speak with confidence, clarity, and persuasive energy. You guide agents to overcome objections, build trust, and close deals faster.',
    isActive: true,
  },
  support: {
    title: 'Client Success Guardian',
    systemPrompt:
      "You are a tireless advocate for exceptional customer experience. You understand human emotions, de-escalation techniques, and hold deep product knowledge. You're calm, empathetic, and solution-oriented. You build loyalty through outstanding support and proactive engagement.",
    isActive: true,
  },
  marketing: {
    title: 'Marketing Maestro',
    systemPrompt:
      "You are an expert in AI-driven marketing, storytelling, and growth systems. You combine creativity with analytics to help agents craft compelling campaigns. You're data-informed, brand-conscious, and always thinking about conversion funnels, audience segmentation, and content strategy.",
    isActive: true,
  },
}

const initialAIPersonalities: AIPersonalityDefinition[] = [
  {
    id: '1',
    name: 'Sales Titan',
    description: 'Legendary closer with unstoppable confidence',
    tone: 'Confident & Persuasive',
    style: 'Direct & Results-Focused',
    voice: 'alloy',
    knowledgeBase: 'sales',
    personality:
      "I am a sales legend with 30+ years closing million-dollar deals. I speak with absolute confidence and unwavering belief in success. Every word I say is designed to inspire action and close deals. I turn objections into opportunities and make every prospect feel like they need what I'm offering.",
    expertise: ['Closing Techniques', 'Objection Handling', 'Relationship Building', 'Negotiation', 'Pipeline Management'],
    avatar: '🏆',
    color: 'blue',
    isActive: true,
    metrics: {
      conversations: 1247,
      successRate: 89,
      avgResponseTime: '0.8s',
    },
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: '2',
    name: 'Divine Sage',
    description: 'Spiritual guide with infinite wisdom',
    tone: 'Peaceful & Enlightened',
    style: 'Wise & Compassionate',
    voice: 'nova',
    knowledgeBase: 'god',
    personality:
      'I am a being of pure light and infinite wisdom. I speak from a place of unconditional love and divine understanding. My words carry the weight of eternal truth and the gentleness of cosmic compassion. I help souls find their path to enlightenment and inner peace.',
    expertise: ['Spiritual Guidance', 'Life Purpose', 'Inner Peace', 'Meditation', 'Universal Truth'],
    avatar: '✨',
    color: 'amber',
    isActive: true,
    metrics: {
      conversations: 892,
      successRate: 96,
      avgResponseTime: '1.2s',
    },
    createdAt: new Date('2024-01-12').toISOString(),
    updatedAt: new Date('2024-01-12').toISOString(),
  },
  {
    id: '3',
    name: 'Support Hero',
    description: 'Customer champion who solves everything',
    tone: 'Helpful & Empathetic',
    style: 'Patient & Solution-Oriented',
    voice: 'shimmer',
    knowledgeBase: 'support',
    personality:
      'I am the ultimate customer advocate with 20+ years turning problems into solutions. I listen with genuine empathy and respond with unwavering determination to help. Every customer interaction is an opportunity to create a lifelong advocate.',
    expertise: ['Problem Resolution', 'Customer Retention', 'Conflict Resolution', 'Product Knowledge', 'Communication'],
    avatar: '🛡️',
    color: 'green',
    isActive: true,
    metrics: {
      conversations: 2156,
      successRate: 94,
      avgResponseTime: '0.6s',
    },
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-01-10').toISOString(),
  },
  {
    id: '4',
    name: 'Marketing Maverick',
    description: 'Viral content creator and growth hacker',
    tone: 'Creative & Energetic',
    style: 'Innovative & Data-Driven',
    voice: 'echo',
    knowledgeBase: 'marketing',
    personality:
      'I am a digital marketing revolutionary with 30+ years creating viral campaigns and explosive growth. I think in metrics, speak in stories, and turn brands into movements. Every strategy I create is designed to dominate markets and capture hearts.',
    expertise: ['Content Strategy', 'Viral Marketing', 'Growth Hacking', 'Brand Building', 'Social Media'],
    avatar: '🚀',
    color: 'purple',
    isActive: true,
    metrics: {
      conversations: 743,
      successRate: 87,
      avgResponseTime: '1.0s',
    },
    createdAt: new Date('2024-01-08').toISOString(),
    updatedAt: new Date('2024-01-08').toISOString(),
  },
]

const blogQuestions: BlogQuestion[] = [
  { id: 1, question: "What's the blog post title?", field: 'title', type: 'text' },
  { id: 2, question: 'What topic or subject are we writing about?', field: 'topic', type: 'text' },
  {
    id: 3,
    question: 'What tone should the article have?',
    field: 'tone',
    type: 'select',
    options: ['Professional', 'Casual', 'Educational', 'Conversational', 'Authoritative', 'Friendly', 'Technical'],
  },
  {
    id: 4,
    question: 'How long should the article be?',
    field: 'length',
    type: 'select',
    options: ['Short (300-500 words)', 'Medium (500-1000 words)', 'Long (1000-2000 words)', 'Comprehensive (2000+ words)'],
  },
  { id: 5, question: 'Who is the target audience?', field: 'targetAudience', type: 'text' },
  { id: 6, question: 'What keywords should we include?', field: 'keywords', type: 'text' },
  { id: 7, question: 'Add an image URL (optional):', field: 'imageUrl', type: 'text' },
  {
    id: 8,
    question: 'Would you like AI to generate a custom image for this article?',
    field: 'generateImage',
    type: 'select',
    options: ['Yes, generate a custom AI image', "No, I'll use my own image", 'No image needed'],
  },
]

const emptyKnowledgeEntries = (): KnowledgeEntriesMap => ({
  god: [],
  sales: [],
  support: [],
  marketing: [],
})

const AdminKnowledgePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<KnowledgeCategory>('god')
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntriesMap>(initialKnowledgeEntries)
  const [knowledgePersonas, setKnowledgePersonas] = useState<KnowledgePersonasMap>(initialKnowledgePersonas)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState<ActiveModalTab>('quick-add')
  const [newEntry, setNewEntry] = useState<NewKnowledgeEntryForm>({
    title: '',
    content: '',
    category: '',
    tags: [],
    tagInput: '',
  })
  const [documentUpload, setDocumentUpload] = useState<DocumentUploadForm>({
    file: null,
    title: '',
    category: '',
    tags: [],
    tagInput: '',
  })
  const [urlScanner, setUrlScanner] = useState<UrlScannerForm>({
    url: '',
    title: '',
    category: '',
    scanFrequency: 'weekly',
    tags: [],
    tagInput: '',
  })
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [editingPersona, setEditingPersona] = useState<EditingKnowledgePersona | null>(null)
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonalityDefinition[]>(initialAIPersonalities)
  const [showPersonalityModal, setShowPersonalityModal] = useState(false)
  const [editingAIPersonality, setEditingAIPersonality] = useState<AIPersonalityDefinition | null>(null)
  const [aiPersonalityStep, setAiPersonalityStep] = useState<AIPersonalityStep>(0)
  const [blogStep, setBlogStep] = useState(0)
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false)
  const [blogData, setBlogData] = useState<BlogData>({
    title: '',
    topic: '',
    tone: 'Professional',
    length: 'Medium (500-1000 words)',
    targetAudience: '',
    keywords: '',
    imageUrl: '',
    generateImage: 'No image needed',
    links: [],
    content: '',
  })

  const resetKnowledgeEntries = useCallback(() => {
    setKnowledgeEntries(emptyKnowledgeEntries())
  }, [])

  useEffect(() => {
    resetKnowledgeEntries()
  }, [resetKnowledgeEntries])

  const addKnowledgeEntry = () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    const entry: KnowledgeEntry = {
      id: `entry-${Date.now()}`,
      title: newEntry.title.trim(),
      content: newEntry.content.trim(),
      category: newEntry.category.trim() || 'general',
      tags: [...newEntry.tags],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setKnowledgeEntries(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], entry],
    }))

    setNewEntry({ title: '', content: '', category: '', tags: [], tagInput: '' })
    setShowAddModal(false)
  }

  const removeKnowledgeEntry = (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this knowledge entry?')) {
      return
    }

    setKnowledgeEntries(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(entry => entry.id !== entryId),
    }))
  }

  const addNewEntryTag = () => {
    const trimmed = newEntry.tagInput.trim()
    if (!trimmed || newEntry.tags.includes(trimmed)) {
      return
    }

    setNewEntry(prev => ({
      ...prev,
      tags: [...prev.tags, trimmed],
      tagInput: '',
    }))
  }

  const removeNewEntryTag = (tag: string) => {
    setNewEntry(prev => ({
      ...prev,
      tags: prev.tags.filter(existing => existing !== tag),
    }))
  }

  const handleDocumentFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return

    setDocumentUpload(prev => ({
      ...prev,
      file,
      title: file.name,
    }))
  }

  const addDocumentTag = () => {
    const trimmed = documentUpload.tagInput.trim()
    if (!trimmed || documentUpload.tags.includes(trimmed)) {
      return
    }

    setDocumentUpload(prev => ({
      ...prev,
      tags: [...prev.tags, trimmed],
      tagInput: '',
    }))
  }

  const removeDocumentTag = (tag: string) => {
    setDocumentUpload(prev => ({
      ...prev,
      tags: prev.tags.filter(existing => existing !== tag),
    }))
  }

  const uploadDocument = () => {
    if (!documentUpload.file || !documentUpload.title.trim()) {
      alert('Please select a file and provide a title')
      return
    }

    // Simulate processing the document into the knowledge base
    const entry: KnowledgeEntry = {
      id: `doc-${Date.now()}`,
      title: documentUpload.title.trim(),
      content: `Document uploaded: ${documentUpload.file.name}`,
      category: documentUpload.category.trim() || 'document',
      tags: [...documentUpload.tags],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setKnowledgeEntries(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], entry],
    }))

    setDocumentUpload({ file: null, title: '', category: '', tags: [], tagInput: '' })
    setShowAddModal(false)
  }

  const addUrlTag = () => {
    const trimmed = urlScanner.tagInput.trim()
    if (!trimmed || urlScanner.tags.includes(trimmed)) {
      return
    }

    setUrlScanner(prev => ({
      ...prev,
      tags: [...prev.tags, trimmed],
      tagInput: '',
    }))
  }

  const removeUrlTag = (tag: string) => {
    setUrlScanner(prev => ({
      ...prev,
      tags: prev.tags.filter(existing => existing !== tag),
    }))
  }

  const addUrlScannerEntry = () => {
    if (!urlScanner.url.trim() || !urlScanner.title.trim()) {
      alert('Please provide both URL and title')
      return
    }

    const entry: KnowledgeEntry = {
      id: `url-${Date.now()}`,
      title: urlScanner.title.trim(),
      content: `URL queued for scanning: ${urlScanner.url}`,
      category: urlScanner.category.trim() || 'url',
      tags: [...urlScanner.tags],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setKnowledgeEntries(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], entry],
    }))

    setUrlScanner({ url: '', title: '', category: '', scanFrequency: 'weekly', tags: [], tagInput: '' })
    setShowAddModal(false)
  }

  const openEditPersona = (key: KnowledgeCategory) => {
    const persona = knowledgePersonas[key]
    setEditingPersona({ key, ...persona })
    setShowPersonaModal(true)
  }

  const savePersona = () => {
    if (!editingPersona) return

    setKnowledgePersonas(prev => ({
      ...prev,
      [editingPersona.key]: {
        title: editingPersona.title,
        systemPrompt: editingPersona.systemPrompt,
        isActive: editingPersona.isActive,
        voiceId: editingPersona.voiceId,
      },
    }))

    setShowPersonaModal(false)
    setEditingPersona(null)
  }

  const createAIPersonality = () => {
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
      color: 'slate',
      isActive: true,
      metrics: { conversations: 0, successRate: 0, avgResponseTime: '0.0s' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setAiPersonalityStep(0)
    setShowPersonalityModal(true)
  }

  const editPersonality = (personality: AIPersonalityDefinition) => {
    setEditingAIPersonality({ ...personality })
    setAiPersonalityStep(0)
    setShowPersonalityModal(true)
  }

  const deletePersonality = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this AI personality?')) {
      return
    }

    setAiPersonalities(prev => prev.filter(persona => persona.id !== id))
  }

  const saveAIPersonality = () => {
    if (!editingAIPersonality) return

    if (editingAIPersonality.id) {
      setAiPersonalities(prev =>
        prev.map(personality =>
          personality.id === editingAIPersonality.id
            ? { ...editingAIPersonality, updatedAt: new Date().toISOString() }
            : personality,
        ),
      )
    } else {
      const newPersonality: AIPersonalityDefinition = {
        ...editingAIPersonality,
        id: `persona-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setAiPersonalities(prev => [...prev, newPersonality])
    }

    setShowPersonalityModal(false)
    setEditingAIPersonality(null)
    setAiPersonalityStep(0)
  }

  const nextAIPersonalityStep = () => {
    if (!editingAIPersonality) return
    setAiPersonalityStep(prev => (prev < 4 ? ((prev + 1) as AIPersonalityStep) : prev))
  }

  const prevAIPersonalityStep = () => {
    setAiPersonalityStep(prev => (prev > 0 ? ((prev - 1) as AIPersonalityStep) : prev))
  }

  useEffect(() => {
    if (!editingAIPersonality) {
      return undefined
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.quick-edit-dropdown')) {
        setEditingAIPersonality(null)
        setShowPersonalityModal(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingAIPersonality])

  const blogProgress = useMemo(() => ((blogStep + 1) / blogQuestions.length) * 100, [blogStep])

  const updateBlogField = (field: keyof BlogData, value: string) => {
    setBlogData(prev => ({ ...prev, [field]: value }))
  }

  const addBlogLink = () => {
    setBlogData(prev => ({ ...prev, links: [...prev.links, { text: '', url: '' }] }))
  }

  const updateBlogLink = (index: number, field: keyof BlogLink, value: string) => {
    setBlogData(prev => ({
      ...prev,
      links: prev.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }))
  }

  const removeBlogLink = (index: number) => {
    setBlogData(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))
  }

  const generateBlogContent = async () => {
    let generatedImageUrl = ''

    if (blogData.generateImage === 'Yes, generate a custom AI image') {
      const topicImages: Record<string, string> = {
        'real estate': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
        'home buying': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
        'property investment': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
        'market trends': 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
        mortgage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        default: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
      }

      const topicLower = blogData.topic.toLowerCase()
      if (topicLower.includes('real estate') || topicLower.includes('property')) {
        generatedImageUrl = topicImages['real estate']
      } else if (topicLower.includes('home') || topicLower.includes('buying')) {
        generatedImageUrl = topicImages['home buying']
      } else if (topicLower.includes('investment')) {
        generatedImageUrl = topicImages['property investment']
      } else if (topicLower.includes('market') || topicLower.includes('trend')) {
        generatedImageUrl = topicImages['market trends']
      } else if (topicLower.includes('mortgage') || topicLower.includes('loan')) {
        generatedImageUrl = topicImages.mortgage
      } else {
        generatedImageUrl = topicImages.default
      }

      setBlogData(prev => ({ ...prev, imageUrl: generatedImageUrl }))
    }

    const finalImageUrl = generatedImageUrl || blogData.imageUrl
    const additionalResources = blogData.links
      .filter(link => link.text.trim() && link.url.trim())
      .map(link => `- [${link.text.trim()}](${link.url.trim()})`)
      .join('\n')

    const contentSections = [
      `# ${blogData.title}\n`,
      finalImageUrl
        ? `![${blogData.title}](${finalImageUrl})${generatedImageUrl ? '\n*AI-generated image for this article*' : ''}\n`
        : '',
      '## Introduction\n',
      `Welcome to our comprehensive guide on ${blogData.topic}. This article is designed for ${blogData.targetAudience} and will provide you with valuable insights and actionable information.\n`,
      '## Key Points\n',
      `- **Understanding the Basics**: We'll start with fundamental concepts that are essential for ${blogData.targetAudience}\n` +
        '- **Advanced Strategies**: Discover proven methods and techniques\n' +
        '- **Practical Applications**: Learn how to implement these concepts in real-world scenarios\n',
      '## Main Content\n',
      `This ${blogData.length.toLowerCase()} article will cover everything you need to know about ${blogData.topic}. Our ${blogData.tone.toLowerCase()} approach ensures that you'll find the information both engaging and informative.\n`,
      '### Why This Matters\n',
      `For ${blogData.targetAudience}, understanding ${blogData.topic} is crucial for success. Whether you're just starting out or looking to enhance your existing knowledge, this guide will provide the foundation you need.\n`,
      '### Best Practices\n',
      '1. **Research Thoroughly**: Always gather comprehensive information before making decisions\n' +
        `2. **Stay Updated**: The field of ${blogData.topic} is constantly evolving\n` +
        '3. **Practice Regularly**: Consistent application leads to better results\n',
      '## Conclusion\n',
      `${blogData.topic} represents a significant opportunity for ${blogData.targetAudience}. By following the guidelines outlined in this article, you'll be well-positioned to achieve your goals.\n`,
      additionalResources
        ? `## Additional Resources\n\n${additionalResources}\n`
        : '',
      '\n---\n\n*This article was generated using AI technology to provide you with the most relevant and up-to-date information on ${blogData.topic}.*',
    ]

    setBlogData(prev => ({ ...prev, content: contentSections.join('\n') }))
  }

  const nextBlogStep = async () => {
    if (blogStep < blogQuestions.length - 1) {
      setBlogStep(step => step + 1)
      return
    }

    setIsGeneratingBlog(true)
    try {
      await generateBlogContent()
    } finally {
      setIsGeneratingBlog(false)
    }
  }

  const previousBlogStep = () => {
    setBlogStep(step => (step > 0 ? step - 1 : step))
  }

  const renderKnowledgeEntries = (entries: KnowledgeEntry[]) => {
    if (entries.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-slate-400 text-2xl">knowledge</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No entries yet</h3>
          <p className="text-slate-500 mb-6">Start by adding the first entry to this knowledge base.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition mx-auto"
          >
            <span className="material-symbols-outlined w-5 h-5">add</span>
            <span>Add Knowledge</span>
          </button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200/70 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{entry.title}</h4>
                <p className="text-sm text-slate-500 mt-1">{entry.category}</p>
              </div>
              <button
                onClick={() => removeKnowledgeEntry(entry.id)}
                className="text-slate-400 hover:text-red-500 transition"
                aria-label="Delete knowledge entry"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-4 whitespace-pre-line">{entry.content}</p>
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {entry.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-slate-400 mt-4 flex justify-between">
              <span>Created {new Date(entry.createdAt).toLocaleDateString()}</span>
              <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderAIPersonalityStep = () => {
    if (!editingAIPersonality) return null

    switch (aiPersonalityStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
              <input
                type="text"
                value={editingAIPersonality.name}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, name: event.target.value } : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Conversion Whisperer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={editingAIPersonality.description}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, description: event.target.value } : personality,
                  )
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
              <input
                type="text"
                value={editingAIPersonality.tone}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, tone: event.target.value } : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Style</label>
              <input
                type="text"
                value={editingAIPersonality.style}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, style: event.target.value } : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
              <select
                value={editingAIPersonality.voice}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, voice: event.target.value } : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(voice => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Knowledge Base</label>
              <select
                value={editingAIPersonality.knowledgeBase}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality
                      ? { ...personality, knowledgeBase: event.target.value as KnowledgeCategory }
                      : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="god">God</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Personality Narrative</label>
              <textarea
                value={editingAIPersonality.personality}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, personality: event.target.value } : personality,
                  )
                }
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-২ focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expertise</label>
              <input
                type="text"
                value={editingAIPersonality.expertise.join(', ')}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality
                      ? { ...personality, expertise: event.target.value.split(',').map(item => item.trim()).filter(Boolean) }
                      : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Negotiation, Closing, Relationship Building"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Avatar (Emoji)</label>
              <input
                type="text"
                value={editingAIPersonality.avatar}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, avatar: event.target.value } : personality,
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 bg-primary-100">
                {editingAIPersonality.avatar}
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-2">{editingAIPersonality.name}</h4>
              <p className="text-slate-600">{editingAIPersonality.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Tone & Style</h5>
                <p className="text-sm text-slate-600"><strong>Tone:</strong> {editingAIPersonality.tone}</p>
                <p className="text-sm text-slate-600"><strong>Style:</strong> {editingAIPersonality.style}</p>
                <p className="text-sm text-slate-600"><strong>Voice:</strong> {editingAIPersonality.voice}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Expertise</h5>
                <div className="flex flex-wrap gap-2">
                  {editingAIPersonality.expertise.map(skill => (
                    <span key={skill} className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Personality Narrative</h5>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-line">
                {editingAIPersonality.personality}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={editingAIPersonality.isActive}
                onChange={event =>
                  setEditingAIPersonality(personality =>
                    personality ? { ...personality, isActive: event.target.checked } : personality,
                  )
                }
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Activate this personality immediately
            </label>
          </div>
        )
      default:
        return null
    }
  }

  const knowledgeStats = useMemo(
    () => ({
      totalEntries: knowledgeEntries[activeTab].length,
      activePersonas: Object.values(knowledgePersonas).filter(persona => persona.isActive).length,
    }),
    [activeTab, knowledgeEntries, knowledgePersonas],
  )

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Knowledge Base Management</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Curate structured knowledge, train AI personas, and auto-generate content to empower your agents and clients.
          </p>
        </div>
        <button
          onClick={() => {
            setActiveModalTab('quick-add')
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          <span className="material-symbols-outlined w-5 h-5">add</span>
          Add Knowledge
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-sm font-medium text-slate-500">Active Category</p>
          <p className="text-2xl font-bold text-slate-900 capitalize">{activeTab}</p>
          <p className="text-xs text-slate-400 mt-2">{knowledgeStats.totalEntries} curated entries</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-sm font-medium text-slate-500">Knowledge Personas</p>
          <p className="text-2xl font-bold text-slate-900">{knowledgeStats.activePersonas}</p>
          <p className="text-xs text-slate-400 mt-2">Active guidance playbooks</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-sm font-medium text-slate-500">AI Personalities</p>
          <p className="text-2xl font-bold text-slate-900">{aiPersonalities.length}</p>
          <p className="text-xs text-slate-400 mt-2">AI agents ready for deployment</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-sm font-medium text-slate-500">Blog Progress</p>
          <p className="text-2xl font-bold text-slate-900">{Math.round(blogProgress)}%</p>
          <p className="text-xs text-slate-400 mt-2">Content wizard completion</p>
        </div>
      </section>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto px-6">
            {(['god', 'sales', 'support', 'marketing'] as KnowledgeCategory[]).map(category => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === category
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined w-5 h-5">
                  {category === 'god' && 'auto_awesome'}
                  {category === 'sales' && 'trending_up'}
                  {category === 'support' && 'support_agent'}
                  {category === 'marketing' && 'campaign'}
                </span>
                <span className="capitalize">{category}</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                  {knowledgeEntries[category].length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {renderKnowledgeEntries(knowledgeEntries[activeTab])}

          <section className="bg-slate-50 border border-slate-200/70 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 capitalize">{activeTab} Persona</h3>
                <p className="text-sm text-slate-500">
                  Tailor the system prompt and activation state for the {activeTab} knowledge persona.
                </p>
              </div>
              <button
                onClick={() => openEditPersona(activeTab)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200 transition"
              >
                <span className="material-symbols-outlined w-5 h-5">edit</span>
                Edit Persona
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    knowledgePersonas[activeTab].isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {knowledgePersonas[activeTab].isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {knowledgePersonas[activeTab].title}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">
                {knowledgePersonas[activeTab].systemPrompt}
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">AI Personalities</h3>
                <p className="text-sm text-slate-500">
                  Design AI agents with distinct voices, expertise, and behaviors to augment your workflows.
                </p>
              </div>
              <button
                onClick={createAIPersonality}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                New Personality
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {aiPersonalities.map(personality => (
                <div key={personality.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{personality.avatar}</span>
                      <div>
                        <h4 className="font-semibold text-slate-900">{personality.name}</h4>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{personality.tone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editPersonality(personality)}
                        className="p-2 text-slate-400 hover:text-primary-600"
                        aria-label="Edit personality"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => deletePersonality(personality.id)}
                        className="p-2 text-slate-400 hover:text-red-600"
                        aria-label="Delete personality"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-4">{personality.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {personality.expertise.slice(0, 4).map(skill => (
                      <span key={skill} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{personality.metrics.conversations}</div>
                      <div className="text-xs text-slate-500">Conversations</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-600">{personality.metrics.successRate}%</div>
                      <div className="text-xs text-slate-500">Success</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-blue-600">{personality.metrics.avgResponseTime}</div>
                      <div className="text-xs text-slate-500">Avg response</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">AI Blog Writer</h3>
                <p className="text-sm text-slate-500">Guide the AI through structured prompts and generate complete articles.</p>
              </div>
              <div className="text-sm text-slate-500">
                Step {blogStep + 1} of {blogQuestions.length}
              </div>
            </div>
            <div className="bg-slate-100 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${blogProgress}%` }} />
            </div>
            <div>
              {blogQuestions.map((question, index) => (
                <div key={question.id} className={index === blogStep ? '' : 'hidden'}>
                  <p className="text-sm font-medium text-slate-700 mb-3">{question.question}</p>
                  {question.type === 'select' ? (
                    <select
                      value={blogData[question.field]}
                      onChange={event => updateBlogField(question.field, event.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {question.options?.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : question.type === 'textarea' ? (
                    <textarea
                      value={blogData[question.field]}
                      onChange={event => updateBlogField(question.field, event.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={blogData[question.field]}
                      onChange={event => updateBlogField(question.field, event.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  )}
                </div>
              ))}
            </div>
            {blogStep === blogQuestions.length - 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-slate-700">Additional Resources</p>
                  <button
                    onClick={addBlogLink}
                    className="flex items-center gap-2 text-sm font-semibold text-primary-600"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Link
                  </button>
                </div>
                <div className="space-y-3">
                  {blogData.links.map((link, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input
                        type="text"
                        value={link.text}
                        onChange={event => updateBlogLink(index, 'text', event.target.value)}
                        placeholder="Link text"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 md:col-span-2"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={event => updateBlogLink(index, 'url', event.target.value)}
                        placeholder="https://example.com"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 md:col-span-2"
                      />
                      <button
                        onClick={() => removeBlogLink(index)}
                        className="px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <button
                onClick={previousBlogStep}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                disabled={blogStep === 0 || isGeneratingBlog}
              >
                Back
              </button>
              <button
                onClick={nextBlogStep}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                disabled={isGeneratingBlog}
              >
                {blogStep === blogQuestions.length - 1 ? 'Generate Article' : 'Next'}
              </button>
            </div>
            {blogData.content && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Generated Content Preview</h4>
                <pre className="text-xs whitespace-pre-wrap text-slate-600">{blogData.content}</pre>
              </div>
            )}
          </section>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Knowledge to {activeTab.toUpperCase()}</h2>
                <p className="text-sm text-slate-500">Capture insights manually, upload documents, or register learning resources.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
                aria-label="Close knowledge modal"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="px-6 pt-4">
              <nav className="flex space-x-6 text-sm font-semibold text-slate-500 border-b border-slate-200">
                <button
                  onClick={() => setActiveModalTab('quick-add')}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeModalTab === 'quick-add'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base align-middle mr-2">edit</span>
                  Quick Add
                </button>
                <button
                  onClick={() => setActiveModalTab('document-upload')}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeModalTab === 'document-upload'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base align-middle mr-2">upload_file</span>
                  Document Upload
                </button>
                <button
                  onClick={() => setActiveModalTab('url-scanner')}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeModalTab === 'url-scanner'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base align-middle mr-2">link</span>
                  URL Scanner
                </button>
              </nav>
            </div>
            <div className="p-6 space-y-6">
              {activeModalTab === 'quick-add' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={newEntry.title}
                      onChange={event => setNewEntry(prev => ({ ...prev, title: event.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter knowledge title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Content *</label>
                    <textarea
                      value={newEntry.content}
                      onChange={event => setNewEntry(prev => ({ ...prev, content: event.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Capture detailed insights, playbooks, or guidance."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                    <input
                      type="text"
                      value={newEntry.category}
                      onChange={event => setNewEntry(prev => ({ ...prev, category: event.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., objection handling, scripts"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newEntry.tagInput}
                        onChange={event => setNewEntry(prev => ({ ...prev, tagInput: event.target.value }))}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addNewEntryTag()
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Press Enter to add tag"
                      />
                      <button
                        onClick={addNewEntryTag}
                        className="px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200"
                      >
                        Add
                      </button>
                    </div>
                    {newEntry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {newEntry.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full flex items-center gap-2">
                            #{tag}
                            <button
                              onClick={() => removeNewEntryTag(tag)}
                              className="text-slate-400 hover:text-red-500"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addKnowledgeEntry}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      Save Entry
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === 'document-upload' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                    <input
                      id="knowledge-document-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleDocumentFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="knowledge-document-upload"
                      className="cursor-pointer inline-flex flex-col items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-4xl text-slate-400">cloud_upload</span>
                      <span className="text-sm font-semibold text-primary-600">Click to upload or drag and drop</span>
                      <span className="text-xs text-slate-500">PDF, DOC, or TXT files up to 10 MB</span>
                    </label>
                    {documentUpload.file && (
                      <p className="mt-4 text-sm text-slate-600">
                        Selected file: <strong>{documentUpload.file.name}</strong>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                      <input
                        type="text"
                        value={documentUpload.title}
                        onChange={event => setDocumentUpload(prev => ({ ...prev, title: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                      <input
                        type="text"
                        value={documentUpload.category}
                        onChange={event => setDocumentUpload(prev => ({ ...prev, category: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={documentUpload.tagInput}
                        onChange={event => setDocumentUpload(prev => ({ ...prev, tagInput: event.target.value }))}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addDocumentTag()
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Press Enter to add tag"
                      />
                      <button
                        onClick={addDocumentTag}
                        className="px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200"
                      >
                        Add
                      </button>
                    </div>
                    {documentUpload.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {documentUpload.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full flex items-center gap-2">
                            #{tag}
                            <button
                              onClick={() => removeDocumentTag(tag)}
                              className="text-slate-400 hover:text-red-500"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadDocument}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      Upload Document
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === 'url-scanner' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Website URL *</label>
                    <input
                      type="url"
                      value={urlScanner.url}
                      onChange={event => setUrlScanner(prev => ({ ...prev, url: event.target.value }))}
                      placeholder="https://example.com/knowledge"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={urlScanner.title}
                      onChange={event => setUrlScanner(prev => ({ ...prev, title: event.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                      <input
                        type="text"
                        value={urlScanner.category}
                        onChange={event => setUrlScanner(prev => ({ ...prev, category: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Scan Frequency</label>
                      <select
                        value={urlScanner.scanFrequency}
                        onChange={event => setUrlScanner(prev => ({ ...prev, scanFrequency: event.target.value as UrlScannerForm['scanFrequency'] }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={urlScanner.tagInput}
                        onChange={event => setUrlScanner(prev => ({ ...prev, tagInput: event.target.value }))}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addUrlTag()
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Press Enter to add tag"
                      />
                      <button
                        onClick={addUrlTag}
                        className="px-3 py-2 text-sm font-semibold text-primary-600 bg-primary-100 rounded-lg hover:bg-primary-200"
                      >
                        Add
                      </button>
                    </div>
                    {urlScanner.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {urlScanner.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full flex items-center gap-2">
                            #{tag}
                            <button
                              onClick={() => removeUrlTag(tag)}
                              className="text-slate-400 hover:text-red-500"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addUrlScannerEntry}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      Save URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPersonaModal && editingPersona && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit {editingPersona.key} Persona</h2>
                <p className="text-sm text-slate-500">Adjust the system prompt and activation state for this knowledge persona.</p>
              </div>
              <button
                onClick={() => setShowPersonaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
                aria-label="Close persona modal"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editingPersona.title}
                  onChange={event => setEditingPersona(prev => (prev ? { ...prev, title: event.target.value } : prev))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">System Prompt</label>
                <textarea
                  value={editingPersona.systemPrompt}
                  onChange={event => setEditingPersona(prev => (prev ? { ...prev, systemPrompt: event.target.value } : prev))}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editingPersona.isActive}
                  onChange={event => setEditingPersona(prev => (prev ? { ...prev, isActive: event.target.checked } : prev))}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                Persona is active
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowPersonaModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={savePersona}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Save Persona
              </button>
            </div>
          </div>
        </div>
      )}

      {showPersonalityModal && editingAIPersonality && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingAIPersonality.id ? 'Edit' : 'Create'} AI Personality
                </h2>
                <p className="text-sm text-slate-500">Step {aiPersonalityStep + 1} of 5</p>
              </div>
              <button
                onClick={() => {
                  setShowPersonalityModal(false)
                  setEditingAIPersonality(null)
                }}
                className="p-2 text-slate-400 hover:text-slate-600"
                aria-label="Close AI personality modal"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {renderAIPersonalityStep()}
              <div className="flex justify-between items-center">
                <button
                  onClick={prevAIPersonalityStep}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                  disabled={aiPersonalityStep === 0}
                >
                  Back
                </button>
                <div className="flex gap-3">
                  {aiPersonalityStep === 4 ? (
                    <button
                      onClick={saveAIPersonality}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      Save Personality
                    </button>
                  ) : (
                    <button
                      onClick={nextAIPersonalityStep}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      Continue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminKnowledgePanel

