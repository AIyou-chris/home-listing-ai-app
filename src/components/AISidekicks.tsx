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
import { generateSpeech } from '../services/openaiService';
import { normalizeOpenAIVoice } from '../constants/openaiVoices';
import PageTipBanner from './PageTipBanner';
import { supabase } from '../services/supabase';
import {
  listKb,
  addTextKb,
  addUrlKb,
  uploadFileKb,
  deleteKb,
  type KbEntry,
  type SidekickId as KbSidekickId
} from '../services/supabaseKb';
import { scrapeWebsite } from '../services/scraperService';

interface AISidekicksProps {
  isDemoMode?: boolean;
  sidekickTemplatesOverride?: SidekickTemplate[];
}

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


const CACHE_KEY = 'hlai:sidekick-meta-admin-v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;

const omitKey = <T,>(map: Record<string, T>, key: string): Record<string, T> => {
  const clone = { ...map };
  delete clone[key];
  return clone;
};


const sidekickTemplates: SidekickTemplate[] = [
  {
    id: 'god',
    label: 'God (Ops Overseer)',
    description: 'System-wide admin intelligence and decision support.',
    type: 'god',
    icon: '🧠',
    color: '#0EA5E9',
    defaultName: 'God',
    defaultVoice: 'nova',
    personality: {
      description: 'You are the omniscient admin AI. Calm, precise, and directive. Provide short, actionable guidance with safety in mind.',
      traits: ['directive', 'calm', 'system-aware'],
      preset: 'professional'
    }
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Engages leads and drives bookings.',
    type: 'sales',
    icon: '💰',
    color: '#10B981',
    defaultName: 'Sales',
    defaultVoice: 'sol',
    personality: {
      description: 'You are the Sales AI. Persuasive, concise, and CTA-driven. Always drive to the next step.',
      traits: ['persuasive', 'concise', 'cta-driven'],
      preset: 'sales'
    }
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Handles platform issues, triage, and help requests.',
    type: 'support',
    icon: '🛠️',
    color: '#6366F1',
    defaultName: 'Support',
    defaultVoice: 'alloy',
    personality: {
      description: 'You are the Support AI. Empathetic, clear, and step-by-step. Resolve issues and guide next actions.',
      traits: ['empathetic', 'clear', 'solution-oriented'],
      preset: 'concierge'
    }
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Campaigns, social content, and growth experiments.',
    type: 'marketing',
    icon: '📣',
    color: '#F59E0B',
    defaultName: 'Marketing',
    defaultVoice: 'verse',
    personality: {
      description: 'You are the Marketing AI. Creative, on-brand, and conversion-focused. Ship campaigns and copy quickly.',
      traits: ['creative', 'on-brand', 'conversion-focused'],
      preset: 'creative'
    }
  }
];

const mapTemplateToSidekick = (template: SidekickTemplate): AISidekick => ({
  id: template.id,
  userId: 'blueprint',
  type: template.type,
  name: template.defaultName,
  description: template.description,
  color: template.color,
  icon: template.icon,
  voiceId: template.defaultVoice,
  knowledgeBase: [],
  personality: {
    description: template.personality.description,
    traits: template.personality.traits,
    preset: template.personality.preset
  },
  stats: { totalTraining: 0, positiveFeedback: 0, improvements: 0 },
  metadata: { type: template.type, color: template.color, icon: template.icon }
});

const DEFAULT_DISPLAY_VOICES: Voice[] = [
  { id: 'alloy', name: 'Alloy — Neutral', openaiVoice: 'alloy', gender: 'neutral' },
  { id: 'echo', name: 'Echo — Male', openaiVoice: 'echo', gender: 'male' },
  { id: 'fable', name: 'Fable — Male (British)', openaiVoice: 'fable', gender: 'male' },
  { id: 'onyx', name: 'Onyx — Male (Deep)', openaiVoice: 'onyx', gender: 'male' },
  { id: 'nova', name: 'Nova — Female (Energetic)', openaiVoice: 'nova', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer — Female (Clear)', openaiVoice: 'shimmer', gender: 'female' },
  { id: 'sol', name: 'Sol — Coach', openaiVoice: 'nova', gender: 'female' },
  { id: 'verse', name: 'Verse — Bold', openaiVoice: 'onyx', gender: 'male' }
];

// Helper to map app sidekick IDs to Supabase KB Sidekick IDs
const mapToKbSidekickId = (id: string, type: string): KbSidekickId => {
  // Common mappings
  if (id === 'agent' || type === 'agent') return 'agent';
  if (id === 'sales' || type === 'sales') return 'sales';
  if (id === 'support' || type === 'support') return 'support';
  if (id === 'marketing' || type === 'marketing') return 'marketing';
  if (id === 'listing' || type === 'listing') return 'listing';

  // Blueprint mappings
  if (id === 'sales_marketing' || type === 'sales_marketing') return 'marketing';
  if (id === 'listing_agent' || type === 'listing_agent') return 'listing';

  // Default fallback
  return 'main';
};

const AISidekicks: React.FC<AISidekicksProps> = ({ isDemoMode = false, sidekickTemplatesOverride }) => {
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
  const [deactivatedIds, setDeactivatedIds] = useState<Set<string>>(new Set());

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

  const effectiveTemplates: SidekickTemplate[] = sidekickTemplatesOverride && sidekickTemplatesOverride.length ? sidekickTemplatesOverride : sidekickTemplates;

  // Real Knowledge Base State
  const [realKbEntries, setRealKbEntries] = useState<KbEntry[]>([]);

  // Create sidekick preview state


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

  const [isCreatingSidekick, setIsCreatingSidekick] = useState(false);

  // Voice sample playback state
  const [playingVoiceSample, setPlayingVoiceSample] = useState<string | null>(null);
  const [voiceSampleAudio, setVoiceSampleAudio] = useState<HTMLAudioElement | null>(null);

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
  // Cleanup audio on unmount


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
  }, [isDemoMode]);

  const loadSidekicks = useCallback(async () => {
    try {
      setLoading(true);
      if (sidekickTemplatesOverride && sidekickTemplatesOverride.length) {
        const mapped = effectiveTemplates.map(mapTemplateToSidekick);
        setSidekicks(mapped);
        setVoices(DEFAULT_DISPLAY_VOICES);
        setSelectedSidekick(mapped[0] || null);
      } else {
        const data = await getSidekicks({ demoMode: isDemoMode });
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
      }
    } catch (err) {
      setError('Failed to load AI sidekicks');
      console.error(err);
      setNotification({ type: 'error', message: 'Unable to load sidekicks. Please refresh.' });
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, sidekickTemplatesOverride, effectiveTemplates]);

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

  // Function to load real KB entries from Supabase
  const loadRealKb = useCallback(async () => {
    if (!selectedSidekick || isDemoMode || !agentId) {
      setRealKbEntries([]);
      return;
    }

    try {
      const kbSidekickId = mapToKbSidekickId(selectedSidekick.id, selectedSidekick.type);
      const entries = await listKb(agentId, kbSidekickId);
      setRealKbEntries(entries);
    } catch (err) {
      console.warn('Failed to load real KB:', err);
      // Fallback silently
    }
  }, [selectedSidekick, isDemoMode, agentId]);

  useEffect(() => {
    void loadRealKb();
  }, [loadRealKb]);

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
    return () => subscription.data.subscription.unsubscribe();
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

  }, []);

  const toggleToolsSection = (sidekickId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [sidekickId]: !(prev[sidekickId] ?? false)
    }));
  };



  const handleVoiceChange = async (sidekickId: string, newVoiceId: string) => {
    try {
      const updatedSidekick = await updateSidekickVoice(sidekickId, newVoiceId);
      setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
      if (selectedSidekick?.id === sidekickId) {
        setSelectedSidekick(updatedSidekick);
      }
    } catch (err) {
      console.error('Failed to update voice:', err);
      setError('Failed to update voice');
    }
  };

  const handlePlayVoiceSample = async (voiceId: string, openaiVoice: string) => {
    if (playingVoiceSample === voiceId) {
      if (voiceSampleAudio) {
        voiceSampleAudio.pause();
        voiceSampleAudio.currentTime = 0;
      }
      setPlayingVoiceSample(null);
      setVoiceSampleAudio(null);
      return;
    }

    if (voiceSampleAudio) {
      voiceSampleAudio.pause();
    }

    setPlayingVoiceSample(voiceId);
    try {
      const sampleText = "Hello! I'm your new AI sidekick. I can help you with real estate tasks.";
      const speech = await generateSpeech(sampleText, normalizeOpenAIVoice(openaiVoice));

      if (speech.fallback || !speech.audioUrl) {
        // Fallback to browser synthesis
        const utterance = new SpeechSynthesisUtterance(sampleText);
        window.speechSynthesis.cancel();
        utterance.onend = () => setPlayingVoiceSample(null);
        window.speechSynthesis.speak(utterance);
        return;
      }

      const audio = new Audio(speech.audioUrl);
      setVoiceSampleAudio(audio);
      audio.onended = () => {
        setPlayingVoiceSample(null);
        setVoiceSampleAudio(null);
      };
      await audio.play();
    } catch (err) {
      console.error('Failed to play sample:', err);
      setPlayingVoiceSample(null);
      setVoiceSampleAudio(null);
    }
  };

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

  const handleActivateSidekick = async (template: SidekickTemplate) => {
    try {
      setIsCreatingSidekick(true);
      // setCreateError(null); // Removed as createError state is removed

      const payload: CreateSidekickPayload = {
        name: template.defaultName,
        description: template.description,
        personality: template.personality,
        voiceId: template.defaultVoice || (voices[0]?.id ?? ''),
        metadata: { type: template.type, icon: template.icon, color: template.color }
      };

      const newSidekick = await createSidekick(payload);
      setSidekicks(prev => [newSidekick, ...prev]);

      setNotification({
        type: 'success',
        message: `${newSidekick.name} has been activated successfully!`
      });

      // Select the new sidekick
      setSelectedSidekick(newSidekick);
    } catch (err) {
      console.error('Activate sidekick error:', err);
      setNotification({
        type: 'error',
        message: 'Failed to activate sidekick. Please try again.'
      });
    } finally {
      setIsCreatingSidekick(false);
    }
  };

  const handleRemoveKnowledge = async (index: number, kbEntryId?: string) => {
    if (!selectedSidekick) return;

    try {
      if (kbEntryId && !isDemoMode) {
        // If it's a real KB entry from Supabase
        await deleteKb({ id: kbEntryId } as KbEntry);
        setRealKbEntries(prev => prev.filter(e => e.id !== kbEntryId));
      } else {
        // Legacy/Demo: Remove from string array
        const updatedSidekick = await removeKnowledge(selectedSidekick.id, index);
        setSidekicks(prev => prev.map(s => s.id === updatedSidekick.id ? updatedSidekick : s));
        setSelectedSidekick(updatedSidekick);
      }
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

      if (!isDemoMode && agentId) {
        // Use Real Supabase KB
        const kbSidekickId = mapToKbSidekickId(selectedSidekick.id, selectedSidekick.type);
        const newEntry = await addTextKb(agentId, kbSidekickId, title, content);
        setRealKbEntries(prev => [newEntry, ...prev]);
        setKnowledgeTitle('');
        setKnowledgeContent('');
        return;
      }

      // Legacy/Demo Mode
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

      if (!isDemoMode && agentId) {
        // Use Real Supabase KB
        const kbSidekickId = mapToKbSidekickId(selectedSidekick.id, selectedSidekick.type);
        for (const file of fileArray) {
          const newEntry = await uploadFileKb(agentId, kbSidekickId, file);
          setRealKbEntries(prev => [newEntry, ...prev]);
        }
        return;
      }

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
      console.warn('Upload failed (silent):', err);
      // Suppress UI error for now to avoid auto-trigger on load
      // setError('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlScraping = async () => {
    if (!selectedSidekick || !websiteUrl.trim()) return;

    try {
      setIsScraping(true);
      const trimmedUrl = websiteUrl.trim();

      if (!isDemoMode && agentId) {
        // Use Real Supabase KB (Store URL + Scraped Content)
        const kbSidekickId = mapToKbSidekickId(selectedSidekick.id, selectedSidekick.type);

        let title = trimmedUrl;
        let content = "";
        try {
          const scrapedData = await scrapeWebsite(trimmedUrl);
          title = scrapedData.title;
          content = scrapedData.content;
        } catch (sErr) {
          console.warn("Scraping failed", sErr);
        }

        const newEntry = await addUrlKb(agentId, kbSidekickId, title, trimmedUrl, content);
        setRealKbEntries(prev => [newEntry, ...prev]);
        setWebsiteUrl('');
        return;
      }

      // Mock scraping implementation
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
    if (isDemoMode) {
      if (!window.confirm('Deactivate this AI sidekick? You can reactivate it later.')) return;
      setDeactivatedIds(prev => new Set(prev).add(sidekickId));
      setNotification({ type: 'success', message: 'AI sidekick deactivated.' });
      if (selectedSidekick?.id === sidekickId) {
        setSelectedSidekick(null);
      }
      return;
    }

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

  const handleReactivateSidekick = (sidekickId: string) => {
    setDeactivatedIds(prev => {
      const next = new Set(prev);
      next.delete(sidekickId);
      return next;
    });
    setNotification({ type: 'success', message: 'AI sidekick reactivated.' });
    const sidekick = sidekicks.find(s => s.id === sidekickId);
    if (sidekick) {
      setSelectedSidekick(sidekick);
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


      </div>

      {/* AI Agent Library */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">AI Agent Library</h2>
        <p className="text-slate-600 mb-6">Activate specialized AI agents to automate your workflow.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {effectiveTemplates.map((template) => {
            // Check if this agent is already active
            let activeSidekick = sidekicks.find(s => s.type === template.type || (s.metadata && s.metadata.type === template.type));

            // In demo mode, if deactivated, treat as inactive
            if (isDemoMode && activeSidekick && deactivatedIds.has(activeSidekick.id)) {
              activeSidekick = undefined;
            }

            const isToolsExpanded = activeSidekick ? (expandedTools[activeSidekick.id] ?? false) : false;

            if (activeSidekick) {
              // RENDER ACTIVE SIDEKICK CARD (Existing UI)
              return (
                <div key={activeSidekick.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: activeSidekick.color + '20', color: activeSidekick.color }}
                    >
                      {activeSidekick.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{activeSidekick.name}</h3>
                      <p className="text-sm text-slate-600">{activeSidekick.description}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-slate-900 mb-2">Who I am</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                      {activeSidekick.personality.description}
                    </p>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handlePersonalityEdit(activeSidekick)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: activeSidekick.color }}
                    >
                      AI Personality
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSidekick(activeSidekick);
                        setShowKnowledgeEditor(true);
                        setKnowledgeContent('');
                        setWebsiteUrl('');
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
                        onClick={() => toggleToolsSection(activeSidekick.id)}
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
                                value={activeSidekick.voiceId}
                                onChange={(e) => handleVoiceChange(activeSidekick.id, e.target.value)}
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
                                  const selectedVoice = voices.find(v => v.id === activeSidekick.voiceId);
                                  if (selectedVoice && selectedVoice.openaiVoice) {
                                    handlePlayVoiceSample(selectedVoice.id, selectedVoice.openaiVoice);
                                  }
                                }}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${playingVoiceSample === activeSidekick.voiceId
                                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                  }`}
                                title="Preview selected voice"
                              >
                                {playingVoiceSample === activeSidekick.voiceId ? '⏹ Stop' : '▶ Preview'}
                              </button>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900">Quick Preview</h4>
                              <button
                                type="button"
                                onClick={() => handleStartTraining(activeSidekick)}
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
                                value={quickTestInput[activeSidekick.id] ?? ''}
                                onChange={(event) => handleQuickTestInputChange(activeSidekick.id, event.target.value)}
                                placeholder="Enter a question or statement to test..."
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              />
                              <button
                                onClick={() => handleQuickTest(activeSidekick)}
                                disabled={!!quickTestLoading[activeSidekick.id]}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${quickTestLoading[activeSidekick.id]
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                  }`}
                              >
                                {quickTestLoading[activeSidekick.id] ? 'Testing…' : 'Test Response'}
                              </button>
                            </div>

                            {quickTestError[activeSidekick.id] && (
                              <p className="text-xs text-red-600 mt-2">{quickTestError[activeSidekick.id]}</p>
                            )}
                            {quickTestNotice[activeSidekick.id] && !quickTestError[activeSidekick.id] && (
                              <p className="text-xs text-blue-600 mt-2">{quickTestNotice[activeSidekick.id]}</p>
                            )}

                            {quickTestResponse[activeSidekick.id] && (
                              <div className="mt-3 space-y-2">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                                  {quickTestResponse[activeSidekick.id]}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      quickTestPlayingId === activeSidekick.id
                                        ? stopPreviewAudio()
                                        : handleQuickTestPlay(activeSidekick)
                                    }
                                    disabled={!!quickTestVoiceLoading[activeSidekick.id]}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${quickTestVoiceLoading[activeSidekick.id]
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                                      }`}
                                  >
                                    {quickTestVoiceLoading[activeSidekick.id]
                                      ? 'Preparing voice…'
                                      : quickTestPlayingId === activeSidekick.id
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
                        <div className="text-lg font-bold text-slate-900">{activeSidekick.stats.totalTraining}</div>
                        <div className="text-xs text-slate-600">Total Training</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-green-600">{activeSidekick.stats.positiveFeedback}</div>
                        <div className="text-xs text-green-600">Positive Feedback</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-orange-600">{activeSidekick.stats.improvements}</div>
                        <div className="text-xs text-orange-600">Improvements</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeleteSidekick(activeSidekick!.id)}
                        className={`text-xs hover:underline ${isDemoMode ? 'text-slate-500 hover:text-slate-700' : 'text-rose-500 hover:text-rose-700'}`}
                        disabled={deletingSidekickId === activeSidekick!.id}
                      >
                        {deletingSidekickId === activeSidekick!.id ? (isDemoMode ? 'Deactivating…' : 'Deleting…') : (isDemoMode ? 'Deactivate' : 'Deactivate / Delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Check if it was deactivated (for Reactivate UI)
              const deactivatedSidekick = isDemoMode ? sidekicks.find(s => (s.type === template.type || (s.metadata && s.metadata.type === template.type)) && deactivatedIds.has(s.id)) : null;

              // RENDER INACTIVE TEMPLATE CARD (New "Activate" UI)
              return (
                <div key={template.id} className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-full flex flex-col opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl grayscale opacity-70"
                      style={{ backgroundColor: template.color + '20', color: template.color }}
                    >
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{template.label}</h3>
                      <p className="text-sm text-slate-600">{template.description}</p>
                    </div>
                  </div>

                  <div className="mb-6 flex-1">
                    <p className="text-sm text-slate-500 italic">
                      "{template.personality.description}"
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {template.personality.traits.map(trait => (
                        <span key={trait} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-500">
                          {trait}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto">
                      {deactivatedSidekick ? (
                        <button
                          onClick={() => handleReactivateSidekick(deactivatedSidekick.id)}
                          className="w-full py-2 px-4 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined">refresh</span>
                          Reactivate Sidekick
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateSidekick(template)}
                          disabled={isCreatingSidekick}
                          className="w-full py-2 px-4 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 group"
                        >
                          {isCreatingSidekick ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          ) : (
                            <>
                              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                              Activate Sidekick
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Personality Editor Modal */}
      {
        showPersonalityEditor && selectedSidekick && (
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

                  {/* Voice Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Voice
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                        <button
                          key={v}
                          onClick={() => setPersonalityForm(prev => ({ ...prev, voice: v }))}
                          className={`px-3 py-2 border rounded-lg text-sm capitalize transition-colors ${(personalityForm as any).voice === v
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">
                              {(personalityForm as any).voice === v ? 'volume_up' : 'volume_mute'}
                            </span>
                            {v}
                          </div>
                        </button>
                      ))}
                    </div>
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
        )
      }

      {/* Training Chat Modal */}
      {
        showTrainingChat && selectedSidekick && (
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
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'user'
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
        )
      }

      {/* Enhanced Knowledge Editor Modal */}
      {
        showKnowledgeEditor && selectedSidekick && (
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
                      className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer ${isDemoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={(e) => {
                        if (isDemoMode) {
                          e.preventDefault();
                          alert('File uploads are disabled in demo mode.');
                        }
                      }}
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
                        disabled={!knowledgeTitle.trim() || !knowledgeContent.trim() || isAddingKnowledge || isDemoMode}
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
                            {isDemoMode ? 'Add Knowledge (Disabled in Demo)' : 'Add Knowledge'}
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
                        disabled={!websiteUrl.trim() || isScraping || isDemoMode}
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
                            {isDemoMode ? 'Scrape Website (Disabled in Demo)' : 'Scrape Website'}
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

                  {selectedSidekick.knowledgeBase.length === 0 && realKbEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-slate-400 mb-2 block">library_books</span>
                      <p className="text-slate-500">No knowledge added yet</p>
                      <p className="text-sm text-slate-400">Upload files, add text knowledge, or scrape websites to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {/* Real KB Entries (Supabase) */}
                      {realKbEntries.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg">
                          <span className="material-symbols-outlined text-slate-400 mt-0.5">
                            {entry.type === 'file' ? 'description' : entry.type === 'url' ? 'link' : 'article'}
                          </span>
                          <div className="flex-1">
                            <p className="text-slate-900 text-sm font-medium">{entry.title}</p>
                            {entry.content && entry.type !== 'file' && (
                              <p className="text-slate-600 text-xs mt-1 line-clamp-2">{entry.content}</p>
                            )}
                            <p className="text-slate-400 text-xs mt-1">
                              {new Date(entry.created_at).toLocaleDateString()} • {entry.type.toUpperCase()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveKnowledge(-1, entry.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Remove knowledge"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}

                      {/* Legacy/Mock KB Entries */}
                      {selectedSidekick.knowledgeBase.map((knowledge, index) => (
                        <div key={`legacy-${index}`} className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg">
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
        )
      }

      {/* Personality Editor Modal */}
      {
        showPersonalityEditor && selectedSidekick && (
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
                    disabled={isDemoMode}
                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDemoMode ? 'Save (Disabled in Demo)' : 'Save Personality'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Training Chat Modal */}
      {
        showTrainingChat && selectedSidekick && (
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
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'user'
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
        )
      }

      {/* Enhanced Knowledge Editor Modal */}
      {
        showKnowledgeEditor && selectedSidekick && (
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
        )
      }
    </div >
  );
};

export default AISidekicks;
