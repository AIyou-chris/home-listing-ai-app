import React, { useEffect, useMemo, useState } from 'react';
import { CallBot, EditableStep } from '../../types';
import FunnelAnalyticsView from './funnels/FunnelAnalyticsView';
import FunnelTipBanner from './funnels/FunnelTipBanner';
import FunnelTestConfig from './funnels/FunnelTestConfig';
import FunnelMobileNav from './funnels/FunnelMobileNav';
import FunnelHeader from './funnels/FunnelHeader';
import FunnelStepsPanel, { FunnelStepsContext } from './funnels/FunnelStepsPanel';
import QuickEmailModal from '../QuickEmailModal';
import SignatureEditorModal from '../SignatureEditorModal';
import AdminLoOutreachPanel from './AdminLoOutreachPanel';
import AdminLoLeadFinderPanel from './AdminLoLeadFinderPanel';
import AdminColdEmailPanel from './AdminColdEmailPanel';
import AdminMarketingStudio from '../../marketing-engine/screens/AdminMarketingStudio';
import { funnelService } from '../../services/funnelService';
import { supabase } from '../../services/supabase';
import { LeadUploadModal } from '../LeadUploadModal';
import { LeadStatus } from '../../types';
import { leadsService } from '../../services/leadsService';
import { Toast, ToastType } from '../Toast';
import { callBotsService } from '../../services/callBotsService';
import { authedFetch } from '../../services/authedFetch'
import { AuthService } from '../../services/authService';

interface FunnelAnalyticsPanelProps {
    onBackToDashboard?: () => void;
    variant?: 'page' | 'embedded';
    title?: string;
    subtitle?: string;
    hideBackButton?: boolean;
    isDemoMode?: boolean;
}

import {
    isCallStepType, slugifyBotKey, resolveCallBotId, normalizeCallStep, initialHomeBuyerSteps
} from './funnels/funnelDefaults';

const AdminMarketingFunnelsPanel: React.FC<FunnelAnalyticsPanelProps> = ({
    onBackToDashboard,
    variant = 'page',
    title = 'Agent Outreach Funnel',
    subtitle = 'Automated sequence for your uploaded leads',
    hideBackButton = false,
    isDemoMode = false,

    isBlueprintMode = false
}: FunnelAnalyticsPanelProps & { isBlueprintMode?: boolean }) => {
    const isEmbedded = variant === 'embedded';
    const auth = useMemo(() => AuthService.getInstance(), []);
    // Single Main Funnel State (formerly Buyer)
    const [funnelSteps, setFunnelSteps] = useState<EditableStep[]>([]);
    const [availableFunnels, setAvailableFunnels] = useState<Record<string, EditableStep[]>>({});
    const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
    const [savedFunnelKeys, setSavedFunnelKeys] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI States
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);
    const [expandedStepIds, setExpandedStepIds] = useState<string[]>([]);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [panelExpanded, setPanelExpanded] = useState(true);
    const [userId, setUserId] = useState<string>('');
    const [callBots, setCallBots] = useState<CallBot[]>([]);
    const [isSavingBot, setIsSavingBot] = useState(false);

    // Removed individual toggleSection logic in favor of simplified view
    const [activeSection, setActiveSection] = useState<'funnels' | 'scoring' | 'feedback'>('funnels');

    const [sendingTestId, setSendingTestId] = useState<string | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customSignature, setCustomSignature] = useState<string>('');

    const [testPhone, setTestPhone] = useState<string>('');
    const [testEmail, setTestEmail] = useState<string>('');
    const [isTestPhoneValid, setIsTestPhoneValid] = useState(true);
    const isLikelyDialableE164 = (value: string): boolean => {
        const phone = (value || '').trim();
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) return false;
        // For NANP (+1), require exactly country code + 10 digits.
        if (phone.startsWith('+1') && phone.length !== 12) return false;
        return true;
    };

    // Validate phone on change
    useEffect(() => {
        setIsTestPhoneValid(testPhone === '' || isLikelyDialableE164(testPhone));
    }, [testPhone]);

    const activeCallBots = useMemo(
        () => callBots.filter((bot) => bot.isActive),
        [callBots]
    );

    const getBotOptions = () => (activeCallBots.length ? activeCallBots : callBots);

    const resolveCallBotIdForStep = (value?: string) => resolveCallBotId(value, getBotOptions());

    const refreshCallBots = async (currentUserId: string) => {
        const bots = await callBotsService.fetchCallBots(currentUserId, true);
        setCallBots(bots);
        return bots;
    };

    const handleCreateCallBot = async () => {
        if (!userId || isSavingBot) return;

        const name = window.prompt('Call bot name (example: Broker Follow-Up Bot):');
        if (!name) return;

        const configId = window.prompt('Call Bot Agent ID for this bot:');
        if (!configId) return;

        const suggestedKey = slugifyBotKey(name) || `call_bot_${Date.now()}`;
        const key = window.prompt('Bot key (letters/numbers/underscores):', suggestedKey) || suggestedKey;
        const description = window.prompt('Short description (optional):', '') || '';

        try {
            setIsSavingBot(true);
            const created = await callBotsService.createCallBot(userId, {
                name: name.trim(),
                key,
                description,
                configId: configId.trim(),
                isActive: true,
                isDefault: callBots.length === 0
            });
            await refreshCallBots(userId);
            setToast({ message: `Call bot "${created.name}" created.`, type: 'success' });
        } catch (error) {
            setToast({ message: (error as Error).message || 'Failed to create call bot.', type: 'error' });
        } finally {
            setIsSavingBot(false);
        }
    };

    const handleEditCallBot = async (bot: CallBot) => {
        if (!userId || isSavingBot) return;
        const nextName = window.prompt('Call bot name:', bot.name);
        if (!nextName) return;
        const nextConfigId = window.prompt('Call Bot Agent ID:', bot.configId);
        if (!nextConfigId) return;
        const nextDescription = window.prompt('Description:', bot.description || '') || '';

        try {
            setIsSavingBot(true);
            await callBotsService.updateCallBot(userId, bot.id, {
                name: nextName.trim(),
                configId: nextConfigId.trim(),
                description: nextDescription
            });
            await refreshCallBots(userId);
            setToast({ message: `Updated "${nextName}".`, type: 'success' });
        } catch (error) {
            setToast({ message: (error as Error).message || 'Failed to update call bot.', type: 'error' });
        } finally {
            setIsSavingBot(false);
        }
    };

    const handleDeleteCallBot = async (bot: CallBot) => {
        if (!userId || isSavingBot || bot.isSystem) return;
        const ok = window.confirm(`Delete call bot "${bot.name}"?`);
        if (!ok) return;

        try {
            setIsSavingBot(true);
            await callBotsService.deleteCallBot(userId, bot.id);
            const bots = await refreshCallBots(userId);
            const fallbackKey = resolveCallBotId('', bots.filter((b) => b.isActive));
            setFunnelSteps((prev) => prev.map((step) => (
                isCallStepType(step.type) && step.content === bot.key
                    ? { ...step, content: fallbackKey }
                    : step
            )));
            setToast({ message: `Deleted "${bot.name}".`, type: 'success' });
        } catch (error) {
            setToast({ message: (error as Error).message || 'Failed to delete call bot.', type: 'error' });
        } finally {
            setIsSavingBot(false);
        }
    };

    const handleSendTest = async (step: EditableStep) => {
        if (sendingTestId) return;
        setSendingTestId(step.id);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || (!user.email && !isDemoMode)) {
                alert('Could not find your email address to send the test to.');
                return;
            }

            // Handle Voice/Call Steps
            if (step.type === 'Call' || step.type === 'AI Call' || step.type === 'Voice') {
                if (!testPhone) {
                    alert('Please enter a test phone number first.');
                    return;
                }
                if (!isLikelyDialableE164(testPhone)) {
                    alert('Invalid phone format. Use E.164 (example: +12125551212). For US/Canada numbers, use +1 plus exactly 10 digits.');
                    return;
                }
                const callBotId = resolveCallBotIdForStep(step.content);
                const callBot = getBotOptions().find((bot) => bot.key === callBotId);
                const voiceApiUrl =
                    import.meta.env.VITE_VOICE_API_BASE_URL ||
                    import.meta.env.VITE_API_BASE_URL ||
                    'http://localhost:3002';

                // Call outbound voice endpoint
                const response = await authedFetch(`${voiceApiUrl}/api/voice/outbound-call`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: testPhone.trim(),
                        botType: callBotId,
                        assistantKey: callBotId,
                        configId: callBot?.configId,
                        userId
                    })
                });

                if (response.ok) {
                    alert(`Test call initiated to ${testPhone}.`);
                } else {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to initiate call');
                }
                return;
            }

            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
            const normalizedStepType = (step.type || '').toLowerCase();

            if (normalizedStepType === 'text' || normalizedStepType === 'sms') {
                if (!testPhone) {
                    alert('Please enter a test phone number first.');
                    return;
                }
                if (!isLikelyDialableE164(testPhone)) {
                    alert('Invalid phone format. Use E.164 (example: +12125551212). For US/Canada numbers, use +1 plus exactly 10 digits.');
                    return;
                }

                const mergedMessage = mergeTokens(step.content || '');
                const complianceLine = step.includeUnsubscribe !== false ? '\n\nReply STOP to unsubscribe.' : '';
                const response = await auth.makeAuthenticatedRequest(`${apiUrl}/api/admin/sms/quick-send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: testPhone.trim(),
                        message: `${mergedMessage}${complianceLine}`.trim(),
                        mediaUrls: step.mediaUrl ? [step.mediaUrl] : []
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to send test SMS');
                }

                setSendSuccessIds(prev => [...prev, step.id]);
                setTimeout(() => {
                    setSendSuccessIds(prev => prev.filter(id => id !== step.id));
                }, 3000);
                return;
            }

            // Handle Email Steps
            const subject = mergeTokens(step.subject);
            // Replace newlines with <br/> for HTML email body
            let body = mergeTokens(step.content).replace(/\n/g, '<br/>');

            // Inject Unsubscribe Preview if enabled
            if (step.includeUnsubscribe !== false) {
                body += `<br/><br/><div style="font-size:11px;color:#888;margin-top:20px;border-top:1px solid #eee;padding-top:10px;">To stop receiving these emails, <a href="#" style="color:#888;">unsubscribe here</a> (Link active in live emails).</div>`;
            }

            const response = await auth.makeAuthenticatedRequest(`${apiUrl}/api/admin/email/quick-send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: testEmail || user?.email || 'test@example.com',
                    subject: `[TEST] ${subject}`,
                    html: body,
                    text: mergeTokens(step.content)
                })
            });

            if (response.ok) {
                // UPDATE: Show inline "Sent!" badge instead of alert
                setSendSuccessIds(prev => [...prev, step.id]);
                setTimeout(() => {
                    setSendSuccessIds(prev => prev.filter(id => id !== step.id));
                }, 3000);
            } else {
                throw new Error('Failed to send test email');
            }
        } catch (error) {
            console.error(error);
            const message = (error as Error).message || 'Unknown error';
            if (message.includes('D11') || message.toLowerCase().includes('destination number is invalid')) {
                alert('The SMS provider rejected the destination number. Use E.164 format. For US/Canada: +1 followed by exactly 10 digits.');
                return;
            }
            alert(`Failed to send test: ${message}`);
        } finally {
            setSendingTestId(null);
        }
    };

    type MergeBuckets = {
        lead: Record<string, string>;
        agent: Record<string, string>;
    };

    useEffect(() => {
        const loadFunnels = async () => {
            try {
                // Get the real user ID from Supabase auth
                const { data: { user } } = await supabase.auth.getUser();
                const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

                if (!currentUserId) {
                    console.warn('No user ID found, using defaults');
                    return;
                }
                setUserId(currentUserId);

                const [{ funnels: funnelData, savedKeys }, botData] = await Promise.all([
                    funnelService.fetchAdminFunnelsWithMeta(currentUserId),
                    callBotsService.fetchCallBots(currentUserId, true)
                ]);
                setCallBots(botData);
                setSavedFunnelKeys(savedKeys);
                const botOptions = botData.filter((bot) => bot.isActive).length
                    ? botData.filter((bot) => bot.isActive)
                    : botData;
                const normalizeWithBots = (step: EditableStep) => normalizeCallStep(step, botOptions);

                // User Request: "Only want a realtor funnel and a broker funnel that's it"
                const allowedFunnels = ['realtor_funnel', 'broker_funnel'];
                const filteredFunnels = Object.fromEntries(
                    Object.entries(funnelData).filter(([key]) => allowedFunnels.includes(key))
                );
                const normalizedFunnels = Object.fromEntries(
                    Object.entries(filteredFunnels).map(([key, steps]) => [
                        key,
                        (steps || []).map(normalizeWithBots)
                    ])
                );

                setAvailableFunnels(normalizedFunnels);

                // Priority: Selected -> Realtor -> Broker -> Universal -> First
                if (normalizedFunnels[selectedFunnelId]) {
                    setFunnelSteps(normalizedFunnels[selectedFunnelId]);
                } else if (normalizedFunnels['realtor_funnel']) {
                    setSelectedFunnelId('realtor_funnel');
                    setFunnelSteps(normalizedFunnels['realtor_funnel']);
                } else if (normalizedFunnels['broker_funnel']) {
                    setSelectedFunnelId('broker_funnel');
                    setFunnelSteps(normalizedFunnels['broker_funnel']);
                } else if (normalizedFunnels.universal_sales) {
                    setSelectedFunnelId('universal_sales');
                    setFunnelSteps(normalizedFunnels.universal_sales);
                } else {
                    const keys = Object.keys(normalizedFunnels);
                    if (keys.length > 0) {
                        setSelectedFunnelId(keys[0]);
                        setFunnelSteps(normalizedFunnels[keys[0]]);
                    }
                }
            } catch (error) {
                console.error('Failed to load funnels:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFunnels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDemoMode]);

    // Update steps when selection changes
    useEffect(() => {
        if (availableFunnels[selectedFunnelId]) {
            setFunnelSteps(availableFunnels[selectedFunnelId]);
        } else if (selectedFunnelId === 'universal_sales' && !availableFunnels['universal_sales']) {
            // Fallback if universal_sales is selected but not yet in availableFunnels (e.g. init)
            setFunnelSteps(initialHomeBuyerSteps);
        }
    }, [selectedFunnelId, availableFunnels]);

    useEffect(() => {
        if (!callBots.length) return;
        const options = activeCallBots.length ? activeCallBots : callBots;
        setFunnelSteps((prev) => prev.map((step) => normalizeCallStep(step, options)));
    }, [callBots, activeCallBots]);

    const togglePanel = () => setPanelExpanded(prev => !prev);

    const sampleMergeData = useMemo<MergeBuckets>(
        () => ({
            lead: {
                name: 'Jamie Carter',
                interestAddress: '123 Palm Ave',
                timeline: '45 days',
                matchOne: 'Palm Oasis · $890k · Pool + ADU',
                matchTwo: 'Vista Row · $815k · Walkable lifestyle',
                matchThree: 'Sierra Modern · $925k · Canyon views',
                questionOne: 'Does the solar system transfer?',
                questionTwo: 'Can we convert the loft into a 4th bedroom?'
            },
            agent: {
                name: 'Jordan Lee',
                phone: '(555) 987-6543',
                website: 'https://homelistingai.app/jordan',
                aiCardUrl: 'https://homelistingai.app/card/jordan'
            }
        }),
        []
    );

    const mergeTokens = (template: string) => {
        return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
            // Special handling for signature override
            if (path === 'agent.signature' && customSignature) {
                return customSignature;
            }

            const [bucket, key] = path.split('.');
            if (!bucket || !key) return '';
            if (!(bucket in sampleMergeData)) return '';
            const bucketData = sampleMergeData[bucket as keyof MergeBuckets];
            if (key in bucketData) {
                return bucketData[key as keyof typeof bucketData] ?? '';
            }
            return '';
        });
    };

    const handleUpdateStep = (id: string, field: keyof EditableStep, value: string) => {
        setFunnelSteps((prev) =>
            prev.map((step) => {
                if (step.id !== id) return step;
                const updated = { ...step, [field]: value };

                // Auto-update icon based on type for better UX
                if (field === 'type') {
                    switch (value) {
                        case 'Condition': updated.icon = 'alt_route'; break;
                        case 'Wait': updated.icon = 'hourglass_empty'; break;
                        case 'Call':
                        case 'AI Call': updated.icon = 'call'; break;
                        case 'SMS':
                        case 'Text': updated.icon = 'sms'; break;
                        case 'Task': updated.icon = 'assignment_turned_in'; break;
                        default: updated.icon = 'forward_to_inbox';
                    }
                    if (isCallStepType(value)) {
                        updated.content = resolveCallBotIdForStep(step.content);
                    }
                }
                return updated;
            })
        );
    };

    const handleAddStep = () => {
        const newStep: EditableStep = {
            id: `step-${Date.now()}`,
            title: 'New Step',
            description: 'Describe what this touchpoint does.',
            icon: 'forward_to_inbox',
            delay: '+1 day',
            type: 'Custom',
            subject: 'Subject line',
            content: 'Write the message here. Use variables like {{lead.name}} and {{agent.name}}.'
        };
        setFunnelSteps((prev) => [...prev, newStep]);
    };

    const handleRemoveStep = (id: string) => {
        setFunnelSteps((prev) => prev.filter((step) => step.id !== id));
        setExpandedStepIds((prev) => prev.filter((stepId) => stepId !== id));
    };

    const toggleStep = (id: string) => {
        setExpandedStepIds((prev) =>
            prev.includes(id) ? prev.filter((stepId) => stepId !== id) : [...prev, id]
        );
    };

    const parseDelay = (delayStr: string): number => {
        if (!delayStr) return 0;
        const normalized = delayStr.toLowerCase().trim();
        if (normalized.includes('min')) return parseInt(normalized) || 0;
        if (normalized.includes('hour')) return (parseInt(normalized) || 0) * 60;
        if (normalized.includes('day')) return (parseInt(normalized) || 0) * 1440;
        return parseInt(normalized) || 0;
    };

    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [sendSuccessIds, setSendSuccessIds] = useState<string[]>([]);

    useEffect(() => {
        if (saveStatus === 'success') {
            const timer = setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const handleSaveSteps = async () => {
        setSaveStatus('saving');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || (isDemoMode ? 'demo-blueprint' : '');

            if (!currentUserId) {
                setToast({ message: 'Please sign in to save funnels.', type: 'error' });
                setSaveStatus('idle');
                return;
            }

            // Prepare steps with delayMinutes
            const stepsWithMinutes = funnelSteps.map(step => ({
                ...step,
                delayMinutes: parseDelay(step.delay)
            }));

            // Saving to selectedFunnelId key
            const result = await funnelService.saveAdminFunnelStep(currentUserId, selectedFunnelId, stepsWithMinutes);
            if (result) {
                setSaveStatus('success');
                setSavedFunnelKeys(prev => (prev.includes(selectedFunnelId) ? prev : [...prev, selectedFunnelId]));
                // Update local availableFunnels state
                setAvailableFunnels(prev => ({
                    ...prev,
                    [selectedFunnelId]: stepsWithMinutes
                }));
            } else {
                console.error('Save failed');
                setToast({ message: 'Failed to save: Unknown error', type: 'error' });
                setSaveStatus('error');
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Failed to save funnel', err);
            setToast({ message: `Unable to save: ${err.message}`, type: 'error' });
            setSaveStatus('error');
        }
    };

    const handleUploadLeads = async (leads: Array<{ name: string; email: string; phone: string; status: LeadStatus }>) => {
        try {
            console.log('🚀 Initiating Real Lead Import:', leads.length);

            setToast({ message: 'Importing leads...', type: 'info' });

            // Emails only start automatically if the admin says these people agreed to get them.
            const consentConfirmed = window.confirm(
                'Did these people agree to get emails from you?\n\nOK = import them AND start the email sequence.\nCancel = import them only, no emails.'
            );

            if (consentConfirmed && !savedFunnelKeys.includes(selectedFunnelId || 'realtor_funnel')) {
                setToast({ message: 'Save the funnel first, then import. No emails can start from an unsaved starter.', type: 'error' });
                return;
            }

            const result = await leadsService.bulkImport(
                leads,
                {
                    assignee: userId || 'unknown',
                    tag: 'Agent Outreach Import',
                    funnel: (selectedFunnelId || 'realtor_funnel'),
                    consentConfirmed
                }
            );

            console.log('✅ Import Result:', result);

            if (result.failed > 0) {
                // Show warning if some or all failed
                if (result.imported === 0) {
                    setToast({ message: `Import Failed. ${result.failed} leads were rejected by the database. Check console for details.`, type: 'error' });
                } else {
                    setToast({ message: `Partial Success: ${result.imported} imported, ${result.failed} failed.`, type: 'info' });
                }
            } else {
                setToast({ message: `Successfully imported ${result.imported} leads!`, type: 'success' });
            }

            setIsUploadModalOpen(false);

            // Note: Since this panel doesn't display the lead list directly, 
            // no immediate UI refresh is needed here.
        } catch (error) {
            console.error('❌ Lead Import Failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setToast({ message: `Import failed: ${errorMessage}`, type: 'error' });
        }
    };




    const stepsContext: FunnelStepsContext = {
        isLoading, panelExpanded, togglePanel, saveStatus, sendSuccessIds, sendingTestId, testPhone, isSavingBot,
        getBotOptions, resolveCallBotIdForStep, handleCreateCallBot, handleEditCallBot, handleDeleteCallBot, mergeTokens, sampleMergeData
    };

    return (
        <div className={isEmbedded ? '' : 'bg-slate-50 min-h-full pb-24 md:pb-0'}>
            <div className={`${isEmbedded ? '' : 'mx-auto max-w-screen-2xl'} ${isEmbedded ? 'py-6' : 'py-10'} px-0 md:px-6 lg:px-8`}>
                {!hideBackButton && onBackToDashboard && (
                    <button
                        type="button"
                        onClick={onBackToDashboard}
                        className="mb-6 flex items-center space-x-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-800 px-4 md:px-0"
                    >
                        <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                        <span>Back to Blueprint Overview</span>
                    </button>
                )}

                <FunnelHeader
                    title={title}
                    subtitle={subtitle}
                    availableFunnels={availableFunnels}
                    selectedFunnelId={selectedFunnelId}
                    onSelectFunnel={setSelectedFunnelId}
                    savedFunnelKeys={savedFunnelKeys}
                    showFunnelActions={activeSection === 'funnels' && !isAnalyticsOpen}
                    isAnalyticsOpen={isAnalyticsOpen}
                    onOpenAnalytics={() => setIsAnalyticsOpen(true)}
                    onCloseAnalytics={() => setIsAnalyticsOpen(false)}
                    onImportLeads={() => setIsUploadModalOpen(true)}
                    onOpenEmailLibrary={() => setIsQuickEmailOpen(true)}
                />

                {!isAnalyticsOpen && (
                    <div className="mb-8 space-y-8">
                        <AdminMarketingStudio key={userId} ownerId={userId} />
                        <AdminLoLeadFinderPanel />
                        <AdminLoOutreachPanel />
                        <AdminColdEmailPanel />
                    </div>
                )}

                {isAnalyticsOpen ? (
                    <FunnelAnalyticsView isDemoMode={isDemoMode} userId={userId} isBlueprintMode={isBlueprintMode} />
                ) : (
                    <>





                        <FunnelTipBanner />



                        <div className="space-y-8">
                            <FunnelTestConfig testPhone={testPhone} setTestPhone={setTestPhone} isTestPhoneValid={isTestPhoneValid} testEmail={testEmail} setTestEmail={setTestEmail} />

                            {/* Highlight Cards - Now Collapsible Sections */}
                            <div className="grid grid-cols-1 gap-6">
                                {/* AI Funnels Section */}
                                <div id="section-funnels" className="space-y-6">

                                    {/* Main Funnel Panels */}
                                    <FunnelStepsPanel
                                        {...stepsContext}
                                        badgeIcon="bolt"
                                        badgeClassName="bg-indigo-50 text-indigo-700"
                                        badgeLabel="Primary Nurture"
                                        title="Marketing Funnel"
                                        description="The main automated journey for all new leads."
                                        steps={funnelSteps}
                                        expandedIds={expandedStepIds}
                                        onToggleStep={toggleStep}
                                        onUpdateStep={handleUpdateStep}
                                        onRemoveStep={handleRemoveStep}
                                        onAddStep={handleAddStep}
                                        onSave={handleSaveSteps}
                                        saveLabel="Save Funnel"
                                        onSendTest={handleSendTest}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {/* Modals */}
                {isQuickEmailOpen && <QuickEmailModal onClose={() => setIsQuickEmailOpen(false)} isDemoMode={isDemoMode} />}
                <LeadUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUpload={handleUploadLeads}
                />

                <SignatureEditorModal
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    initialSignature={customSignature || `Best regards,<br/><strong>${sampleMergeData.agent.name}</strong><br/>${sampleMergeData.agent.phone}`}
                    onSave={setCustomSignature}
                />
                {/* Mobile Fixed Navigation Bar */}
                {!isEmbedded && <FunnelMobileNav activeSection={activeSection} onSelect={setActiveSection} />}
            </div>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AdminMarketingFunnelsPanel;
