import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSidekicks, 
  updateSidekickPersonality, 
  updateSidekickVoice, 
  addKnowledge, 
  removeKnowledge,
  chatWithSidekick,
  trainSidekick,
  createSidekick,
  deleteSidekick,
  personalityPresets,
  type AISidekick, 
  type Voice,
  type CreateSidekickPayload,
  type ChatHistoryEntry
} from '../services/aiSidekicksService';
import { continueConversation, generateSpeech } from '../services/openaiService';
import { normalizeOpenAIVoice } from '../constants/openaiVoices';
import PageTipBanner from './PageTipBanner';
import { supabase } from '../services/supabase';

interface AISidekicksProps {}

type SidekickTemplate = {
  id: string;
  label: string;
  description: string;
  type: string;
  icon: string;
  color: string;
  defaultName: string;
  defaultVoice: string;
  personality: {
    description: string;
    traits: string[];
    preset: string;
  };
};


const CACHE_KEY = 'hlai:sidekick-meta';
const CACHE_TTL = 24 * 60 * 60 * 1000;

const omitKey = <T,>(map: Record<string, T>, key: string): Record<string, T> => {
  const clone = { ...map };
  delete clone[key];
  return clone;
};


const sidekickTemplates: SidekickTemplate[] = [
  {
    id: 'agent',
    label: 'Agent Assistant',
    description: 'Client communication, scheduling, and deal coordination.',
    type: 'agent',
    icon: '👤',
    color: '#8B5CF6',
    defaultName: 'Agent Sidekick',
    defaultVoice: 'nova',
    personality: {
      description: 'You are the Agent Sidekick. Proactive, organized, and client-focused. Help manage communication, appointments, and deal workflows with clarity and empathy.',
      traits: ['proactive', 'organized', 'helpful'],
      preset: 'professional'
    }
  },
  {
    id: 'marketing',
    label: 'Marketing Strategist',
    description: 'Content creation, campaigns, and social presence.',
    type: 'marketing',
    icon: '📈',
    color: '#F59E0B',
    defaultName: 'Marketing Sidekick',
    defaultVoice: 'shimmer',
    personality: {
      description: 'You are the Marketing Sidekick. Energetic, creative, and conversion-focused. Craft compelling campaigns, catchy copy, and growth-focused marketing strategies.',
      traits: ['creative', 'energetic', 'conversion-focused'],
      preset: 'creative'
    }
  },
  {
    id: 'listing',
    label: 'Listing Expert',
    description: 'Property descriptions, market analysis, and pricing guidance.',
    type: 'listing',
    icon: '🏠',
    color: '#EF4444',
    defaultName: 'Listing Sidekick',
    defaultVoice: 'onyx',
    personality: {
      description: 'You are the Listing Sidekick. Detail-oriented, analytical, and persuasive. Produce accurate pricing insights and compelling property descriptions that resonate with buyers.',
      traits: ['detail-oriented', 'analytical', 'persuasive'],
      preset: 'analytical'
    }
  },
  {
    id: 'sales',
    label: 'Sales Coach',
    description: 'Lead qualification, objection handling, and deal closing.',
    type: 'sales',
    icon: '💼',
    color: '#10B981',
    defaultName: 'Sales Sidekick',
    defaultVoice: 'echo',
    personality: {
      description: 'You are the Sales Sidekick. Persuasive, confident, and results-driven. Support deal progression, handle objections, and deliver persuasive follow-ups.',
      traits: ['persuasive', 'confident', 'results-driven'],
      preset: 'sales'
    }
  }
];

const AISidekicks: React.FC<AISidekicksProps> = () => {
  const [sidekicks, setSidekicks] = useState<AISidekick[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedSidekick, setSelectedSidekick] = useState<AISidekick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [notification, setNotification] = useState<{
    type: 'error' | 'success' | 'info';
    message: string;
    retry?: () => void;
  } | null>(null);
  const trainingQueue = useRef<
    Array<{
      sidekickId: string;
      userMessage: string;
      assistantMessage: string;
      feedback: 'positive' | 'negative';
    }>
  >([]);
  const trainingProcessing = useRef(false);
  const trainingAnalyticsRef = useRef(0);
  const [trainingAnalytics, setTrainingAnalytics] = useState({ saved: 0 });
  const [agentId, setAgentId] = useState<string | null>(null);
  const trainingAnalyticsKey = agentId ? `hlai:training-analytics:${agentId}` : null;
  const [deletingSidekickId, setDeletingSidekickId] = useState<string | null>(null);

  // Modal states
  const [showPersonalityEditor, setShowPersonalityEditor] = useState(false);
  const [showTrainingChat, setShowTrainingChat] = useState(false);
  const [showKnowledgeEditor, setShowKnowledgeEditor] = useState(false);
  
  // Training chat state
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    voiceId?: string;
  }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [messageAudio, setMessageAudio] = useState<HTMLAudioElement | null>(null);
  
  // Quick preview state
  const [quickTestInput, setQuickTestInput] = useState<Record<string, string>>({});
  const [quickTestResponse, setQuickTestResponse] = useState<Record<string, string>>({});
  const [quickTestLoading, setQuickTestLoading] = useState<Record<string, boolean>>({});
  const [quickTestError, setQuickTestError] = useState<Record<string, string>>({});
  const [quickTestNotice, setQuickTestNotice] = useState<Record<string, string>>({});
  const [quickTestVoiceLoading, setQuickTestVoiceLoading] = useState<Record<string, boolean>>({});
  const [quickTestPlayingId, setQuickTestPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const quickTestAudioUrlRef = useRef<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // Create sidekick preview state
  const [createPreviewInput, setCreatePreviewInput] = useState('');
  const [createPreviewResponse, setCreatePreviewResponse] = useState<string | null>(null);
  const [createPreviewLoading, setCreatePreviewLoading] = useState(false);
  const [createPreviewError, setCreatePreviewError] = useState<string | null>(null);
  const [createPreviewVoiceLoading, setCreatePreviewVoiceLoading] = useState(false);
  const [createPreviewPlaying, setCreatePreviewPlaying] = useState(false);

  // Personality editor state
  const [personalityForm, setPersonalityForm] = useState({
    description: '',
    traits: [] as string[],
    preset: 'custom'
  });
  const [newTrait, setNewTrait] = useState('');
  
  // Knowledge editor state
  // Enhanced knowledge editor state
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scrapingFrequency, setScrapingFrequency] = useState('once');
  const [isUploading, setIsUploading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingSidekick, setIsCreatingSidekick] = useState(false);
  
  // Voice sample playback state
  const [playingVoiceSample, setPlayingVoiceSample] = useState<string | null>(null);
  const [voiceSampleAudio, setVoiceSampleAudio] = useState<HTMLAudioElement | null>(null);
  const [createForm, setCreateForm] = useState(() => {
    const template = sidekickTemplates[0];
    return {
      templateId: template?.id ?? '',
      name: template?.defaultName ?? '',
      description: template?.description ?? '',
      voiceId: template?.defaultVoice ?? '',
      personality: template?.personality ?? {
        description: '',
        traits: [],
        preset: 'custom'
      }
    };
  });

  useEffect(() => {
    void loadSidekicks();
  }, [loadSidekicks]);

  useEffect(() => {
    if (!createForm.voiceId && voices.length > 0) {
      setCreateForm(prev => ({ ...prev, voiceId: voices[0].id }));
    }
  }, [voices, createForm.voiceId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (voiceSampleAudio) {
        voiceSampleAudio.pause();
      }
      if (messageAudio) {
        messageAudio.pause();
      }
    };
  }, [voiceSampleAudio, messageAudio]);

  // Legacy cleanup
  useEffect(() => {
    return () => {
      if (voiceSampleAudio) {
        voiceSampleAudio.pause();
        voiceSampleAudio.currentTime = 0;
      }
    };
  }, [voiceSampleAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (quickTestAudioUrlRef.current) {
        URL.revokeObjectURL(quickTestAudioUrlRef.current);
        quickTestAudioUrlRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadSidekicks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSidekicks();
      setSidekicks(data.sidekicks);
      setVoices(data.voices);
      if (data.sidekicks.length > 0) {
        setSelectedSidekick(data.sidekicks[0]);
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              sidekicks: data.sidekicks,
              voices: data.voices,
              expiresAt: Date.now() + CACHE_TTL
            })
          );
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError('Failed to load AI sidekicks');
      console.error(err);
      setNotification({ type: 'error', message: 'Unable to load sidekicks. Please refresh.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hydrateCache = () => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.expiresAt === 'number' && parsed.expiresAt < Date.now()) {
          window.localStorage.removeItem(CACHE_KEY);
        } else {
          if (Array.isArray(parsed.sidekicks)) setSidekicks(parsed.sidekicks);
          if (Array.isArray(parsed.voices)) setVoices(parsed.voices);
          if (parsed.sidekicks?.length > 0) {
            setSelectedSidekick((prev) => prev ?? parsed.sidekicks[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to hydrate sidekick cache', err);
      }
    };

    hydrateCache();
    void loadSidekicks();
  }, [loadSidekicks]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data?.user?.id) {
          setAgentId(data.user.id);
        }
      })
      .catch((err) => console.error('Failed to load user info:', err));
    const subscription = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user?.id) {
        setAgentId(session.user.id);
      }
    });
    return () => subscription?.data?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!agentId || !trainingAnalyticsKey) return;
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(trainingAnalyticsKey);
    if (raw) {
      const stored = Number(raw);
      if (!Number.isNaN(stored)) {
        trainingAnalyticsRef.current = stored;
        setTrainingAnalytics({ saved: stored });
      }
    }
  }, [agentId, trainingAnalyticsKey]);

  useEffect(() => {
    if (!agentId || !trainingAnalyticsKey) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(trainingAnalyticsKey, trainingAnalytics.saved.toString());
  }, [agentId, trainingAnalyticsKey, trainingAnalytics.saved]);

  const stopPreviewAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (quickTestAudioUrlRef.current) {
      URL.revokeObjectURL(quickTestAudioUrlRef.current);
      quickTestAudioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setQuickTestPlayingId(null);
    setCreatePreviewPlaying(false);
  }, []);

  const toggleToolsSection = (sidekickId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [sidekickId]: !(prev[sidekickId] ?? false)
    }));
  };

  useEffect(() => {
    if (!showCreateModal) {
      stopPreviewAudio();
      setCreatePreviewInput('');
      setCreatePreviewResponse(null);
      setCreatePreviewError(null);
      setCreatePreviewLoading(false);
      setCreatePreviewVoiceLoading(false);
      setCreatePreviewPlaying(false);
    }
  }, [showCreateModal, stopPreviewAudio]);

  const handlePersonalityEdit = (sidekick: AISidekick) => {
    setSelectedSidekick(sidekick);
    setPersonalityForm({
      description: sidekick.personality.description,
      traits: [...sidekick.personality.traits],
      preset: sidekick.personality.preset
    });
    setShowPersonalityEditor(true);
  };

  const handleSavePersonality = async () => {
    if (!selectedSidekick) return;
    
    try {
      const updatedSidekick = await updateSidekickPersonality(selectedSidekick.id, personalityForm);
      setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
      setSelectedSidekick(updatedSidekick);
      setShowPersonalityEditor(false);
    } catch (err) {
      setError('Failed to update personality');
      console.error(err);
    }
  };

  const handleQuickTestInputChange = (sidekickId: string, value: string) => {
    setQuickTestInput(prev => ({ ...prev, [sidekickId]: value }));
    setQuickTestError(prev => (prev[sidekickId] ? omitKey(prev, sidekickId) : prev));
    setQuickTestNotice(prev => (prev[sidekickId] ? omitKey(prev, sidekickId) : prev));
  };

  const handleQuickTest = async (sidekick: AISidekick) => {
    const prompt = (quickTestInput[sidekick.id] ?? '').trim();
    if (!prompt) {
      setQuickTestError(prev => ({ ...prev, [sidekick.id]: 'Enter a question to test.' }));
      return;
    }

    stopPreviewAudio();
    setQuickTestLoading(prev => ({ ...prev, [sidekick.id]: true }));
    setQuickTestError(prev => omitKey(prev, sidekick.id));
    setQuickTestNotice(prev => omitKey(prev, sidekick.id));

    try {
      const { response } = await chatWithSidekick(sidekick.id, prompt, [
        { role: 'user', content: prompt }
      ]);
      setQuickTestResponse(prev => ({ ...prev, [sidekick.id]: response }));
      setQuickTestNotice(prev => ({
        ...prev,
        [sidekick.id]: 'Response ready. Press play to hear it with this voice.'
      }));
    } catch (err) {
      console.error('Quick test error:', err);
      setQuickTestResponse(prev => omitKey(prev, sidekick.id));
      setQuickTestError(prev => ({
        ...prev,
        [sidekick.id]: 'Could not get a response. Please try again.'
      }));
    } finally {
      setQuickTestLoading(prev => ({ ...prev, [sidekick.id]: false }));
    }
  };

  const handleQuickTestPlay = async (sidekick: AISidekick) => {
    const responseText = quickTestResponse[sidekick.id];
    if (!responseText) {
      setQuickTestError(prev => ({
        ...prev,
        [sidekick.id]: 'Run a quick test first to get a response.'
      }));
      return;
    }

    if (quickTestPlayingId === sidekick.id) {
      stopPreviewAudio();
      return;
    }

    stopPreviewAudio();
    setQuickTestVoiceLoading(prev => ({ ...prev, [sidekick.id]: true }));
    setQuickTestError(prev => omitKey(prev, sidekick.id));

    try {
      const speech = await generateSpeech(responseText, normalizeOpenAIVoice(sidekick.voiceId));

      if (speech.fallback || !speech.audioUrl) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(responseText);
          window.speechSynthesis.cancel();
          setQuickTestNotice(prev => ({
            ...prev,
            [sidekick.id]: 'Playing preview with browser voice (OpenAI audio unavailable).'
          }));
          utterance.onend = () => {
            setQuickTestPlayingId(prev => (prev === sidekick.id ? null : prev));
          };
          window.speechSynthesis.speak(utterance);
          setQuickTestPlayingId(sidekick.id);
          return;
        }

        throw new Error('Speech synthesis unavailable');
      }

      if (quickTestAudioUrlRef.current) {
        URL.revokeObjectURL(quickTestAudioUrlRef.current);
        quickTestAudioUrlRef.current = null;
      }

      quickTestAudioUrlRef.current = speech.audioUrl;
      const audio = new Audio(speech.audioUrl);
      audioRef.current = audio;
      setQuickTestPlayingId(sidekick.id);
      setQuickTestNotice(prev => omitKey(prev, sidekick.id));

      audio.onended = () => {
        stopPreviewAudio();
      };
      audio.onerror = () => {
        stopPreviewAudio();
        setQuickTestError(prev => ({
          ...prev,
          [sidekick.id]: 'Could not play voice preview. Please try again.'
        }));
      };

      await audio.play();
    } catch (err) {
      console.error('Quick test voice error:', err);
      setQuickTestError(prev => ({
        ...prev,
        [sidekick.id]: 'Could not play voice preview. Please try again.'
      }));
      stopPreviewAudio();
    } finally {
      setQuickTestVoiceLoading(prev => ({ ...prev, [sidekick.id]: false }));
    }
  };

  const handleCreatePreview = async () => {
    const prompt = createPreviewInput.trim();
    if (!prompt) {
      setCreatePreviewError('Enter a question to preview.');
      return;
    }

    stopPreviewAudio();
    setCreatePreviewLoading(true);
    setCreatePreviewError(null);
    setCreatePreviewVoiceLoading(false);
    setCreatePreviewPlaying(false);

    try {
      const messages: Array<{ sender: string; text: string }> = [];
      if (createForm.personality.description) {
        messages.push({ sender: 'system', text: createForm.personality.description });
      } else if (createForm.description) {
        messages.push({ sender: 'system', text: createForm.description });
      }
      messages.push({ sender: 'user', text: prompt });

      const responseText = await continueConversation(messages, createForm.templateId);
      setCreatePreviewResponse(responseText);
    } catch (err) {
      console.error('Create preview error:', err);
      setCreatePreviewResponse(null);
      setCreatePreviewError('Could not generate a preview. Please try again.');
    } finally {
      setCreatePreviewLoading(false);
    }
  };

  const handleCreatePreviewPlay = async () => {
    if (!createPreviewResponse) {
      setCreatePreviewError('Run a preview first to get a response.');
      return;
    }

    if (createPreviewPlaying) {
      stopPreviewAudio();
      return;
    }

    stopPreviewAudio();
    setCreatePreviewVoiceLoading(true);
    setCreatePreviewError(null);

    try {
      const normalizedVoice = normalizeOpenAIVoice(createForm.voiceId);
      const speech = await generateSpeech(createPreviewResponse, normalizedVoice);

      if (speech.fallback || !speech.audioUrl) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(createPreviewResponse);
          window.speechSynthesis.cancel();
          utterance.onend = () => {
            setCreatePreviewPlaying(false);
          };
          window.speechSynthesis.speak(utterance);
          setCreatePreviewPlaying(true);
          return;
        }

        throw new Error('Speech synthesis unavailable');
      }

      if (quickTestAudioUrlRef.current) {
        URL.revokeObjectURL(quickTestAudioUrlRef.current);
        quickTestAudioUrlRef.current = null;
      }

      quickTestAudioUrlRef.current = speech.audioUrl;
      const audio = new Audio(speech.audioUrl);
      audioRef.current = audio;
      setCreatePreviewPlaying(true);

      audio.onended = () => {
        stopPreviewAudio();
      };
      audio.onerror = () => {
        stopPreviewAudio();
        setCreatePreviewError('Could not play the voice preview. Please try again.');
      };

      await audio.play();
    } catch (err) {
      console.error('Create preview voice error:', err);
      setCreatePreviewError('Could not play the voice preview. Please try again.');
      stopPreviewAudio();
    } finally {
      setCreatePreviewVoiceLoading(false);
    }
  };

  const handleVoiceChange = async (sidekickId: string, voiceId: string) => {
    try {
      const updatedSidekick = await updateSidekickVoice(sidekickId, voiceId);
      setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
      if (selectedSidekick?.id === sidekickId) {
        setSelectedSidekick(updatedSidekick);
      }
    } catch (err) {
      setError('Failed to update voice');
      console.error(err);
    }
  };

  const handlePlayVoiceSample = async (voiceId: string, openaiVoice?: string) => {
    try {
      // If already playing this voice, stop it
      if (playingVoiceSample === voiceId) {
        if (voiceSampleAudio) {
          voiceSampleAudio.pause();
          voiceSampleAudio.currentTime = 0;
        }
        setPlayingVoiceSample(null);
        setVoiceSampleAudio(null);
        return;
      }

      // Stop any currently playing audio
      if (voiceSampleAudio) {
        voiceSampleAudio.pause();
        voiceSampleAudio.currentTime = 0;
      }

      // Generate sample text to demonstrate the voice
  const normalizedVoice = normalizeOpenAIVoice(openaiVoice);
  const sampleText = `Hello! I'm the ${normalizedVoice} voice. I'm here to help you with your real estate needs. Let me know how I can assist you today.`;

      // Generate speech using OpenAI TTS - returns { audioUrl, duration }
  console.log(`🎤 Playing voice sample: ${normalizedVoice}`);
      const result = await generateSpeech(sampleText, normalizedVoice);
      
      if (result.fallback) {
        console.error('OpenAI TTS failed, using fallback');
        alert('Voice sample unavailable. Please check your backend connection.');
        setPlayingVoiceSample(null);
        return;
      }
      
      const audio = new Audio(result.audioUrl);
      audio.onended = () => {
        setPlayingVoiceSample(null);
        setVoiceSampleAudio(null);
        URL.revokeObjectURL(result.audioUrl);
      };
      
      audio.onerror = () => {
        console.error('Error playing voice sample');
        setPlayingVoiceSample(null);
        setVoiceSampleAudio(null);
        URL.revokeObjectURL(result.audioUrl);
      };

      setPlayingVoiceSample(voiceId);
      setVoiceSampleAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('Failed to play voice sample:', error);
      setPlayingVoiceSample(null);
      setVoiceSampleAudio(null);
    }
  };

  const handleOpenCreateModal = () => {
    const template = sidekickTemplates.find(t => t.id === createForm.templateId) ?? sidekickTemplates[0];
    const fallbackVoiceId = template && voices.some(v => v.id === template.defaultVoice)
      ? template.defaultVoice
      : voices[0]?.id ?? template?.defaultVoice ?? createForm.voiceId;
    setCreateForm({
      templateId: template?.id ?? createForm.templateId,
      name: template?.defaultName ?? createForm.name,
      description: template?.description ?? createForm.description,
      voiceId: fallbackVoiceId,
      personality: template?.personality ?? createForm.personality
    });
    setCreateError(null);
    stopPreviewAudio();
    setCreatePreviewInput('');
    setCreatePreviewResponse(null);
    setCreatePreviewError(null);
    setCreatePreviewLoading(false);
    setCreatePreviewVoiceLoading(false);
    setCreatePreviewPlaying(false);
    setShowCreateModal(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = sidekickTemplates.find(t => t.id === templateId);
    if (!template) {
      setCreateForm(prev => ({ ...prev, templateId }));
      return;
    }
    const fallbackVoiceId = voices.some(v => v.id === template.defaultVoice)
      ? template.defaultVoice
      : voices[0]?.id ?? template.defaultVoice;
    setCreateForm({
      templateId,
      name: template.defaultName,
      description: template.description,
      voiceId: fallbackVoiceId,
      personality: template.personality
    });
    stopPreviewAudio();
    setCreatePreviewInput('');
    setCreatePreviewResponse(null);
    setCreatePreviewError(null);
    setCreatePreviewLoading(false);
    setCreatePreviewVoiceLoading(false);
    setCreatePreviewPlaying(false);
  };

  const handleCreateFieldChange = (field: 'name' | 'description') => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setCreateForm(prev => ({ ...prev, voiceId: value }));
    stopPreviewAudio();
    setCreatePreviewVoiceLoading(false);
    setCreatePreviewPlaying(false);
  };

  const handleCreatePersonalityChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setCreateForm(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        description: value
      }
    }));
  };

  const handleCreateSidekick = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Sidekick name is required');
      return;
    }

    if (!createForm.voiceId) {
      setCreateError('Please select a voice for your sidekick');
      return;
    }

    const template = sidekickTemplates.find(t => t.id === createForm.templateId);
    const payload: CreateSidekickPayload = {
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      voiceId: createForm.voiceId,
      personality: {
        description: createForm.personality.description,
        traits: createForm.personality.traits,
        preset: createForm.personality.preset
      },
      metadata: template
        ? { type: template.type, icon: template.icon, color: template.color }
        : undefined
    };

    try {
      setIsCreatingSidekick(true);
      setCreateError(null);
      const newSidekick = await createSidekick(payload);
      setSidekicks(prev => [newSidekick, ...prev.filter(s => s.id !== newSidekick.id)]);
      setSelectedSidekick(newSidekick);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Create sidekick error:', err);
      setCreateError('Failed to create sidekick. Please try again.');
    } finally {
      setIsCreatingSidekick(false);
    }
  };

  const handleRemoveKnowledge = async (index: number) => {
    if (!selectedSidekick) return;
    
    try {
      const updatedSidekick = await removeKnowledge(selectedSidekick.id, index);
      setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
      setSelectedSidekick(updatedSidekick);
    } catch (err) {
      setError('Failed to remove knowledge');
      console.error(err);
    }
  };

  // Enhanced knowledge handlers
  const handleAddTextKnowledge = async () => {
    if (!selectedSidekick || !knowledgeTitle.trim() || !knowledgeContent.trim()) return;
    
    try {
      setIsAddingKnowledge(true);
      const title = knowledgeTitle.trim();
      const content = knowledgeContent.trim();
      const updatedSidekick = await addKnowledge(selectedSidekick.id, {
        content,
        title,
        type: 'text'
      });
      setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
      setSelectedSidekick(updatedSidekick);
      setKnowledgeTitle('');
      setKnowledgeContent('');
    } catch (err) {
      setError('Failed to add text knowledge');
      console.error(err);
    } finally {
      setIsAddingKnowledge(false);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!selectedSidekick) return;
    
    try {
      setIsUploading(true);
      const fileArray = Array.from(files);
      
      // Process each file (mock implementation)
      for (const file of fileArray) {
        const knowledgeEntry = `Uploaded file: ${file.name} (${file.type || 'unknown type'}, ${(file.size / 1024).toFixed(1)}KB)`;
        const updatedSidekick = await addKnowledge(selectedSidekick.id, {
          content: knowledgeEntry,
          title: file.name,
          type: 'file'
        });
        setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
        setSelectedSidekick(updatedSidekick);
      }
      
    } catch (err) {
      setError('Failed to upload files');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlScraping = async () => {
    if (!selectedSidekick || !websiteUrl.trim()) return;
    
    try {
      setIsScraping(true);
      // Mock scraping implementation
      const trimmedUrl = websiteUrl.trim();
      const knowledgeEntry = `Website content from ${trimmedUrl} (scraped ${scrapingFrequency})`;
      const updatedSidekick = await addKnowledge(selectedSidekick.id, {
        content: knowledgeEntry,
        title: trimmedUrl,
        type: 'url'
      });
      setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
      setSelectedSidekick(updatedSidekick);
      setWebsiteUrl('');
    } catch (err) {
      setError('Failed to scrape website');
      console.error(err);
    } finally {
      setIsScraping(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files);
    }
  };

  const resetKnowledgeEditor = () => {
    setShowKnowledgeEditor(false);
    setKnowledgeTitle('');
    setKnowledgeContent('');
    setWebsiteUrl('');
    setScrapingFrequency('once');
  };

  const handleStartTraining = (sidekick: AISidekick) => {
    setSelectedSidekick(sidekick);
    setChatMessages([]);
    setShowTrainingChat(true);
  };

  const handleSendMessage = async () => {
    if (!selectedSidekick || !currentMessage.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);
    
    try {
      const history: ChatHistoryEntry[] = [...chatMessages, userMessage].map(
        (msg): ChatHistoryEntry => ({
          role: msg.type === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      );

      const response = await chatWithSidekick(selectedSidekick.id, userMessage.content, history);
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: response.response,
        timestamp: new Date().toISOString(),
        voiceId: selectedSidekick.voiceId
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const processTrainingQueue = useCallback(async () => {
    if (trainingProcessing.current || trainingQueue.current.length === 0) return;
    trainingProcessing.current = true;
    try {
      while (trainingQueue.current.length) {
        const job = trainingQueue.current.shift()!;
        try {
          await trainSidekick(job.sidekickId, job.userMessage, job.assistantMessage, job.feedback);
          trainingAnalyticsRef.current += 1;
          setTrainingAnalytics({ saved: trainingAnalyticsRef.current });
          setNotification({ type: 'success', message: 'Training feedback saved.' });
        } catch (err) {
          console.error('Training feedback error:', err);
          setNotification({
            type: 'error',
            message: 'Unable to save training feedback. Tap retry.',
            retry: () => {
              void processTrainingQueue();
            }
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } finally {
      trainingProcessing.current = false;
      void loadSidekicks();
    }
  }, [loadSidekicks]);

  const handleTrainingFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    if (!selectedSidekick) return;
    
    const message = chatMessages.find(m => m.id === messageId);
    const previousMessage = chatMessages[chatMessages.findIndex(m => m.id === messageId) - 1];
    
    if (!message || !previousMessage) return;
    
    trainingQueue.current.push({
      sidekickId: selectedSidekick.id,
      userMessage: previousMessage.content,
      assistantMessage: message.content,
      feedback
    });
    void processTrainingQueue();
  };

  const handleDeleteSidekick = async (sidekickId: string) => {
    if (!window.confirm('Delete this AI sidekick? This cannot be undone.')) return;
    setDeletingSidekickId(sidekickId);
    try {
      await deleteSidekick(sidekickId);
      setNotification({ type: 'success', message: 'AI sidekick deleted.' });
      void loadSidekicks();
    } catch (error) {
      console.error('Delete sidekick failed:', error);
      setNotification({ type: 'error', message: 'Unable to delete sidekick. Try again.' });
    } finally {
      setDeletingSidekickId(null);
    }
  };

  const handlePlayAudio = async (messageId: string, text: string, voiceId?: string) => {
    // Stop currently playing audio
    if (messageAudio) {
      messageAudio.pause();
      if (playingMessageId === messageId) {
        setPlayingMessageId(null);
        setMessageAudio(null);
        return;
      }
    }

    try {
      setPlayingMessageId(messageId);
      const normalizedVoice = voiceId ? normalizeOpenAIVoice(voiceId) : 'nova';
      const result = await generateSpeech(text, normalizedVoice);
      
      if (result.fallback) {
        console.warn('OpenAI TTS unavailable, using browser speech synthesis');
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
        utterance.onend = () => setPlayingMessageId(null);
        return;
      }

      const audio = new Audio(result.audioUrl);
      setMessageAudio(audio);
      
      audio.onended = () => {
        setPlayingMessageId(null);
        setMessageAudio(null);
        URL.revokeObjectURL(result.audioUrl);
      };
      
      audio.onerror = () => {
        console.error('Audio playback error');
        setPlayingMessageId(null);
        setMessageAudio(null);
        URL.revokeObjectURL(result.audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
      setPlayingMessageId(null);
      setMessageAudio(null);
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      utterance.onend = () => setPlayingMessageId(null);
    }
  };

  const addTrait = () => {
    if (newTrait.trim() && !personalityForm.traits.includes(newTrait.trim())) {
      setPersonalityForm(prev => ({
        ...prev,
        traits: [...prev.traits, newTrait.trim()]
      }));
      setNewTrait('');
    }
  };

  const removeTrait = (trait: string) => {
    setPersonalityForm(prev => ({
      ...prev,
      traits: prev.traits.filter(t => t !== trait)
    }));
  };

  const handlePresetChange = (preset: string) => {
    const presetData = personalityPresets[preset as keyof typeof personalityPresets];
    if (presetData) {
      setPersonalityForm(prev => ({
        ...prev,
        preset,
        description: preset === 'custom' ? prev.description : presetData.description,
        traits: preset === 'custom' ? prev.traits : [...presetData.traits]
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadSidekicks}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600">smart_toy</span>
              Enhanced AI Sidekicks
            </h1>
            <p className="text-slate-600 mt-2">Advanced AI assistant management with analytics, training, and automation</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 text-sm font-medium">All Systems Active</span>
            </div>
          </div>
        </div>
      </div>
      {notification && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${notification.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
          <div className="flex items-center justify-between gap-3">
            <span>{notification.message}</span>
            {notification.retry && (
              <button
                onClick={notification.retry}
                className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-xs text-slate-500">
          Training feedback saved: {trainingAnalytics.saved}
        </p>
        <p className="text-xs text-slate-500 font-semibold">{trainingAnalytics.saved ? `${trainingAnalytics.saved} saves recorded` : 'Live analytics streaming…'}</p>
      </div>
      {notification && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${notification.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
          <div className="flex items-center justify-between gap-3">
            <span>{notification.message}</span>
            {notification.retry && (
              <button
                onClick={notification.retry}
                className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-xs text-slate-500">
          Training feedback saved: {trainingAnalytics.saved}
        </p>
      </div>

      <PageTipBanner
        pageKey="ai-sidekicks"
        title="🤖 Your AI Agent Library"
        message="Clone yourself with specialized AI assistants—each trained for a specific role in your business."
        expandedContent={
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">🎯 Each Sidekick Specializes In:</h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Agent Assistant (👤):</strong> Client communication, scheduling appointments, and deal coordination</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Marketing Strategist (📈):</strong> Campaign creation, social media content, and lead generation copy</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Listing Expert (🏠):</strong> Property descriptions, market analysis, and pricing guidance</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Sales Coach (💼):</strong> Lead qualification, objection handling, and closing strategies</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <h4 className="font-semibold text-purple-900 mb-2">🧠 The Power Move:</h4>
              <p className="text-purple-800">
                Top agents don't try to do everything themselves. They create specialized AI sidekicks, train each one 
                with role-specific knowledge (your scripts, your market data, your FAQ), then deploy them where they're 
                needed most. One sidekick handles follow-ups, another writes listings, another coaches you on objections. 
                It's like having a team of experts working 24/7.
              </p>
            </div>
          </div>
        }
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-blue-600">psychology</span>
            <h3 className="font-semibold text-blue-900">AI Sidekicks</h3>
          </div>
          <p className="text-blue-700 text-sm mb-3">Manage AI personalities and knowledge bases</p>
          <div className="text-xs text-blue-600">
            {sidekicks.length} sidekicks configured
          </div>
        </div>

        {/* Enhanced Interactive Training Card - FEATURED */}
        <div className="md:col-span-2 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-xl opacity-60 group-hover:opacity-100 blur animate-pulse"></div>
          
          <div className="relative bg-gradient-to-br from-[#f5f3ff] via-[#eef2ff] to-[#fce7ff] rounded-xl p-8 border border-purple-200 shadow-[0_30px_60px_rgba(88,28,135,0.15)]">
            {/* Badge */}
            <div className="absolute top-4 right-4 flex gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                ✨ YOUR AI
              </span>
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                ONLINE
              </span>
            </div>

            {/* Content */}
            <div className="flex items-start gap-4">
              <div className="text-5xl animate-bounce">🤖</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  Your Personal AI Assistant
                </h3>
                <p className="text-slate-700 font-medium mb-1">Your business data. Your writing style. Your AI.</p>
                <p className="text-slate-600 text-sm mb-4">
                  Like ChatGPT, but trained specifically on YOUR real estate business
                </p>

                {/* Use Cases */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span>✍️</span>
                    <span className="font-medium">Write Listings</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span>📧</span>
                    <span className="font-medium">Marketing Copy</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span>📊</span>
                    <span className="font-medium">Market Insights</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span>🎯</span>
                    <span className="font-medium">Strategy Help</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-purple-700 bg-white/70 rounded-full px-4 py-2">
                  <span>🔥 <strong>500+</strong> listings written by agents</span>
                  <span>⚡ <strong>85%</strong> trained on your style</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleOpenCreateModal}
                className="rounded-full bg-blue-600 text-white font-semibold px-6 py-3 min-w-[240px] shadow-lg shadow-blue-200 transition hover:bg-blue-700 flex items-center gap-2 justify-center"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Create an AI Sidekick
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agent Library */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">AI Agent Library</h2>
        <p className="text-slate-600 mb-6">Curated, consistent, Apple-like elegance</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sidekicks.map((sidekick) => {
            const isToolsExpanded = expandedTools[sidekick.id] ?? false;
            return (
              <div key={sidekick.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: sidekick.color + '20', color: sidekick.color }}
                >
                  {sidekick.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{sidekick.name}</h3>
                  <p className="text-sm text-slate-600">{sidekick.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteSidekick(sidekick.id)}
                  className="ml-auto text-xs text-rose-500 px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition"
                  disabled={deletingSidekickId === sidekick.id}
                >
                  {deletingSidekickId === sidekick.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>

                <div className="mb-4">
                  <h4 className="font-medium text-slate-900 mb-2">Who I am</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                    {sidekick.personality.description}
                  </p>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handlePersonalityEdit(sidekick)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg"
                    style={{ backgroundColor: sidekick.color }}
                  >
                    AI Personality
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSidekick(sidekick);
                      setShowKnowledgeEditor(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Add Knowledge
                  </button>
                </div>

                <div className="mt-auto space-y-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleToolsSection(sidekick.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <span>Voice &amp; Preview Tools</span>
                      <span className="material-symbols-outlined text-base">
                        {isToolsExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isToolsExpanded && (
                      <div className="mt-4 space-y-5">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Voice
                            <span className="ml-2 text-xs text-slate-500 font-normal">(select &amp; preview)</span>
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              value={sidekick.voiceId}
                              onChange={(e) => handleVoiceChange(sidekick.id, e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            >
                              {voices.map((voice) => (
                                <option key={voice.id} value={voice.id}>
                                  {voice.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const selectedVoice = voices.find(v => v.id === sidekick.voiceId);
                                if (selectedVoice && selectedVoice.openaiVoice) {
                                  handlePlayVoiceSample(selectedVoice.id, selectedVoice.openaiVoice);
                                }
                              }}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                                playingVoiceSample === sidekick.voiceId
                                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                              }`}
                              title="Preview selected voice"
                            >
                              {playingVoiceSample === sidekick.voiceId ? '⏹ Stop' : '▶ Preview'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-900">Sample All 6 OpenAI Voices</h4>
                            <a
                              href="https://www.openai.fm/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Try on openai.fm
                            </a>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {voices.filter(v => v.openaiVoice).map((voice) => (
                              <div
                                key={voice.id}
                                className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 mb-1">
                                      {voice.name}
                                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                        voice.gender === 'male' ? 'bg-blue-100 text-blue-700' :
                                        voice.gender === 'female' ? 'bg-pink-100 text-pink-700' :
                                        'bg-purple-100 text-purple-700'
                                      }`}>
                                        {voice.gender}
                                      </span>
                                    </p>
                                    {voice.description && (
                                      <p className="text-xs text-slate-600 mb-1">{voice.description}</p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                      OpenAI: <span className="font-mono font-medium">{voice.openaiVoice}</span>
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handlePlayVoiceSample(voice.id, voice.openaiVoice)}
                                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                                      playingVoiceSample === voice.id
                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    }`}
                                  >
                                    {playingVoiceSample === voice.id ? '⏹ Stop' : '▶ Play'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-900">Quick Preview</h4>
                            <button
                              type="button"
                              onClick={() => handleStartTraining(sidekick)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              Open advanced chat
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">
                            Ask a sample question and hear this sidekick reply using the selected voice.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              value={quickTestInput[sidekick.id] ?? ''}
                              onChange={(event) => handleQuickTestInputChange(sidekick.id, event.target.value)}
                              placeholder="Enter a question or statement to test..."
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                            <button
                              onClick={() => handleQuickTest(sidekick)}
                              disabled={!!quickTestLoading[sidekick.id]}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                quickTestLoading[sidekick.id]
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                              }`}
                            >
                              {quickTestLoading[sidekick.id] ? 'Testing…' : 'Test Response'}
                            </button>
                          </div>

                          {quickTestError[sidekick.id] && (
                            <p className="text-xs text-red-600 mt-2">{quickTestError[sidekick.id]}</p>
                          )}
                          {quickTestNotice[sidekick.id] && !quickTestError[sidekick.id] && (
                            <p className="text-xs text-blue-600 mt-2">{quickTestNotice[sidekick.id]}</p>
                          )}

                          {quickTestResponse[sidekick.id] && (
                            <div className="mt-3 space-y-2">
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                                {quickTestResponse[sidekick.id]}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    quickTestPlayingId === sidekick.id
                                      ? stopPreviewAudio()
                                      : handleQuickTestPlay(sidekick)
                                  }
                                  disabled={!!quickTestVoiceLoading[sidekick.id]}
                                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    quickTestVoiceLoading[sidekick.id]
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                                  }`}
                                >
                                  {quickTestVoiceLoading[sidekick.id]
                                    ? 'Preparing voice…'
                                    : quickTestPlayingId === sidekick.id
                                        ? 'Stop Voice Preview'
                                        : 'Play Voice Preview'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-slate-900">{sidekick.stats.totalTraining}</div>
                      <div className="text-xs text-slate-600">Total Training</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-green-600">{sidekick.stats.positiveFeedback}</div>
                      <div className="text-xs text-green-600">Positive Feedback</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-orange-600">{sidekick.stats.improvements}</div>
                      <div className="text-xs text-orange-600">Improvements</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Sidekick Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">add_circle</span>
                  Create New AI Sidekick
                </h3>
                <p className="text-sm text-slate-500 mt-1">Start from a proven template and customize the sidekick to your workflow.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sidekickTemplates.map((template) => {
                    const isActive = createForm.templateId === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`text-left p-4 rounded-lg border transition ${
                          isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                        }`}
                        type="button"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: template.color + '20', color: template.color }}
                          >
                            {template.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{template.label}</p>
                            <p className="text-xs text-slate-500">{template.description}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">Voice: {template.defaultVoice}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sidekick Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={handleCreateFieldChange('name')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g. Agent Concierge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
                  <select
                    value={createForm.voiceId}
                    onChange={handleCreateVoiceChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Select voice</option>
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role & Overview</label>
                <textarea
                  value={createForm.description}
                  onChange={handleCreateFieldChange('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Describe what this sidekick will focus on"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Personality Prompt</label>
                <textarea
                  value={createForm.personality.description}
                  onChange={handleCreatePersonalityChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Describe tone, responsibilities, preferred style, and guardrails"
                />
                <p className="text-xs text-slate-500 mt-1">Traits: {createForm.personality.traits.join(', ') || 'custom'}</p>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h4 className="font-medium text-slate-900 mb-2">Preview This Sidekick</h4>
                <p className="text-xs text-slate-600 mb-3">
                  Try a sample question to hear how this sidekick responds with the current settings.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={createPreviewInput}
                    onChange={(event) => setCreatePreviewInput(event.target.value)}
                    placeholder="Enter a question or statement to test..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCreatePreview}
                    disabled={createPreviewLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      createPreviewLoading
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    {createPreviewLoading ? 'Testing…' : 'Test Response'}
                  </button>
                </div>

                {createPreviewError && (
                  <p className="text-xs text-red-600 mt-2">{createPreviewError}</p>
                )}

                {createPreviewResponse && (
                  <div className="mt-3 space-y-2">
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700 shadow-sm">
                      {createPreviewResponse}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCreatePreviewPlay}
                        disabled={createPreviewVoiceLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          createPreviewVoiceLoading
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : createPreviewPlaying
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {createPreviewVoiceLoading
                          ? 'Preparing voice…'
                          : createPreviewPlaying
                              ? 'Stop Voice Preview'
                              : 'Play Voice Preview'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                  {createError}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSidekick}
                disabled={isCreatingSidekick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingSidekick && (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                )}
                Create Sidekick
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personality Editor Modal */}
      {showPersonalityEditor && selectedSidekick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">psychology</span>
                  AI Personality Editor
                </h3>
                <button
                  onClick={() => setShowPersonalityEditor(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Who You Are */}
              <div className="mb-6">
                <h4 className="font-medium text-slate-900 mb-3">Who You Are</h4>
                
                {/* Preset Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Choose a preset or keep Custom
                  </label>
                  <select
                    value={personalityForm.preset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {Object.entries(personalityPresets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Presets pre-fill the description and traits. You can still edit everything below.
                  </p>
                </div>

                {/* Personality Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Personality Description
                  </label>
                  <textarea
                    value={personalityForm.description}
                    onChange={(e) => setPersonalityForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Describe the AI's personality, role, and approach..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Be specific about role, expertise, and approach. Keep it concise.
                  </p>
                </div>

                {/* Additional Personality Traits */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Personality Traits
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTrait}
                      onChange={(e) => setNewTrait(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTrait()}
                      placeholder="Add a personality trait (e.g., 'patient', 'creative')"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={addTrait}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {personalityForm.traits.map((trait) => (
                      <span
                        key={trait}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                      >
                        {trait}
                        <button
                          onClick={() => removeTrait(trait)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-2">Preview</h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">{personalityForm.description}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPersonalityEditor(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePersonality}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
                >
                  Save Personality
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training Chat Modal */}
      {showTrainingChat && selectedSidekick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600">chat</span>
                  Interactive AI Training - {selectedSidekick.name}
                </h3>
                <button
                  onClick={() => setShowTrainingChat(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 mt-8">
                  <span className="material-symbols-outlined text-4xl mb-4 block">chat</span>
                  <p>Start Training Conversation</p>
                  <p className="text-sm">Ask your {selectedSidekick.name.toLowerCase()} for help with something specific</p>
                  
                  <div className="mt-6">
                    <p className="font-medium mb-2">Try these examples:</p>
                    <div className="space-y-2">
                      {selectedSidekick.type === 'marketing' && (
                        <>
                          <button className="block w-full text-left p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100">
                            Create a social media post for a luxury condo
                          </button>
                          <button className="block w-full text-left p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100">
                            Write an email campaign for first-time buyers
                          </button>
                        </>
                      )}
                      {selectedSidekick.type === 'listing' && (
                        <>
                          <button className="block w-full text-left p-3 bg-red-50 rounded-lg text-red-700 hover:bg-red-100">
                            Write a property description for a family home
                          </button>
                          <button className="block w-full text-left p-3 bg-red-50 rounded-lg text-red-700 hover:bg-red-100">
                            Analyze market trends for downtown condos
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        {message.type === 'assistant' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handlePlayAudio(message.id, message.content, message.voiceId)}
                              className={`${playingMessageId === message.id ? 'text-blue-600' : 'text-slate-600'} hover:text-blue-800`}
                              title={playingMessageId === message.id ? 'Stop audio' : 'Play audio'}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {playingMessageId === message.id ? 'stop_circle' : 'volume_up'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleTrainingFeedback(message.id, 'positive')}
                              className="text-green-600 hover:text-green-800"
                              title="Good response"
                            >
                              <span className="material-symbols-outlined text-sm">thumb_up</span>
                            </button>
                            <button
                              onClick={() => handleTrainingFeedback(message.id, 'negative')}
                              className="text-red-600 hover:text-red-800"
                              title="Needs improvement"
                            >
                              <span className="material-symbols-outlined text-sm">thumb_down</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-slate-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Ask your ${selectedSidekick.name.toLowerCase()} for help...`}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isTyping}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">send</span>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Knowledge Editor Modal */}
      {showKnowledgeEditor && selectedSidekick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">Agent Knowledge Base - {selectedSidekick.name}</h3>
              <button
                onClick={resetKnowledgeEditor}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <p className="text-slate-600">
                Upload documents, scripts, and materials that will help your AI understand your expertise and approach.
              </p>

              {/* File Upload Section */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <div
                  className={`transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <span className="material-symbols-outlined text-4xl text-slate-400 mb-4 block">upload</span>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Upload Agent Files</h4>
                  <p className="text-slate-600 mb-4">Drag and drop files here, or click to browse</p>
                  
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.txt,.md"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    <span className="material-symbols-outlined mr-2">upload</span>
                    Choose Files
                  </label>
                  
                  <p className="text-xs text-slate-500 mt-2">
                    Supported formats: PDF, DOC, DOCX, TXT, MD (Max 10MB each)
                  </p>
                  
                  {isUploading && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-blue-600">Uploading files...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Two Column Layout for Text Knowledge and URL Scraper */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Text Knowledge Section */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-orange-600">edit_note</span>
                    <h4 className="text-lg font-semibold text-orange-900">Add Text Knowledge</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Knowledge Title
                      </label>
                      <input
                        type="text"
                        value={knowledgeTitle}
                        onChange={(e) => setKnowledgeTitle(e.target.value)}
                        placeholder="e.g., Pricing Strategy, Client Communication..."
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Knowledge Content
                      </label>
                      <textarea
                        value={knowledgeContent}
                        onChange={(e) => setKnowledgeContent(e.target.value)}
                        rows={4}
                        placeholder="Enter detailed knowledge, procedures, or information..."
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    
                    <button
                      onClick={handleAddTextKnowledge}
                      disabled={!knowledgeTitle.trim() || !knowledgeContent.trim() || isAddingKnowledge}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isAddingKnowledge ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined mr-2">add</span>
                          Add Knowledge
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* URL Scraper Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-green-600">language</span>
                    <h4 className="text-lg font-semibold text-green-900">URL Scraper</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Scraping Frequency
                      </label>
                      <select
                        value={scrapingFrequency}
                        onChange={(e) => setScrapingFrequency(e.target.value)}
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={handleUrlScraping}
                      disabled={!websiteUrl.trim() || isScraping}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isScraping ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Scraping...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined mr-2">download</span>
                          Scrape Website
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Saved Knowledge Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-600">library_books</span>
                  <h4 className="text-lg font-semibold text-slate-900">Saved Knowledge</h4>
                  <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-sm font-medium">
                    {selectedSidekick.knowledgeBase.length} items
                  </span>
                </div>
                
                {selectedSidekick.knowledgeBase.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2 block">library_books</span>
                    <p className="text-slate-500">No knowledge added yet</p>
                    <p className="text-sm text-slate-400">Upload files, add text knowledge, or scrape websites to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedSidekick.knowledgeBase.map((knowledge, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg">
                        <span className="material-symbols-outlined text-slate-400 mt-0.5">article</span>
                        <p className="flex-1 text-slate-700 text-sm leading-relaxed">{knowledge}</p>
                        <button
                          onClick={() => handleRemoveKnowledge(index)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Remove knowledge"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISidekicks;
