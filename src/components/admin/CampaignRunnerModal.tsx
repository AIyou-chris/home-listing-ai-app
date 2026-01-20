import React, { useState, useEffect, useRef } from 'react';
import { Lead } from '../../types';
import { authService } from '../../services/authService';
import notificationService from '../../services/notificationService';
import { supabase } from '../../services/supabase';


interface CampaignRunnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLeads: Lead[];
    funnelId: string; // The funnel to trigger (e.g., 'agentSales')
    funnelName: string;
}

export const CampaignRunnerModal: React.FC<CampaignRunnerModalProps> = ({
    isOpen,
    onClose,
    selectedLeads,
    funnelId,
    funnelName
}) => {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [throttleSeconds, setThrottleSeconds] = useState(30);
    const [batchSize, setBatchSize] = useState(5);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Load settings from local storage if available
    useEffect(() => {
        const saved = localStorage.getItem('cold_email_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.throttleSeconds) setThrottleSeconds(parsed.throttleSeconds);
            if (parsed.throttleCount) setBatchSize(parsed.throttleCount);
        }
    }, [isOpen]);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    };


    // --- SAFETY CHECK: Filter out leads that should not be emailed ---
    // Safe statuses: 'New', 'Qualified', 'Contacted', 'Showing', 'Lost', etc.
    // Unsafe statuses: 'Bounced', 'Unsubscribed'
    const safeLeads = selectedLeads.filter(l => l.status !== 'Bounced' && l.status !== 'Unsubscribed');
    const skippedCount = selectedLeads.length - safeLeads.length;

    const runCampaign = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setPaused(false);
        setLogs([]);
        setProgress(0);
        setCurrentIndex(0);

        abortControllerRef.current = new AbortController();

        addLog(`Initialize campaign "${funnelName}"...`);
        if (skippedCount > 0) {
            addLog(`⚠️ SAFETY: Automatically skipping ${skippedCount} leads (Bounced/Unsubscribed).`);
        }
        addLog(`Targeting ${safeLeads.length} valid leads.`);
        addLog(`Throttling: ${batchSize} leads every ${throttleSeconds} seconds.`);

        if (safeLeads.length === 0) {
            addLog('No valid leads to process. Campaign finished.');
            setIsRunning(false);
            return;
        }

        let processed = 0;
        let successCount = 0;
        let failureCount = 0;

        // Process loop
        for (let i = 0; i < safeLeads.length; i += batchSize) {
            if (abortControllerRef.current?.signal.aborted) {
                addLog('Campaign aborted by user.');
                break;
            }

            while (paused) {
                await new Promise(r => setTimeout(r, 1000));
                if (abortControllerRef.current?.signal.aborted) break;
            }

            const batch = safeLeads.slice(i, i + batchSize);
            addLog(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} leads)...`);

            // Process batch in parallel
            await Promise.all(batch.map(async (lead) => {
                try {
                    await authService.makeAuthenticatedRequest(`/api/funnels/assign`, {
                        method: 'POST',
                        body: JSON.stringify({
                            leadId: lead.id,
                            funnelType: funnelId
                        })
                    });
                    successCount++;
                } catch (err: unknown) {
                    failureCount++;
                    // Optional: addLog(`Error for ${lead.email}`); 
                }
            }));

            processed += batch.length;
            setProgress(Math.round((processed / safeLeads.length) * 100));
            setCurrentIndex(processed);

            if (processed < safeLeads.length) {
                addLog(`Waiting ${throttleSeconds}s before next batch...`);
                await new Promise(resolve => setTimeout(resolve, throttleSeconds * 1000));
            }
        }

        addLog('Campaign finished!');
        addLog(`Summary: ${successCount} sent, ${failureCount} failed, ${skippedCount} skipped.`);

        // Notify User
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await notificationService.sendNotificationToUser(
                    user.id,
                    'Campaign Completed',
                    `Campaign "${funnelName}" finished. Sent: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount} (Safety).`,
                    'system',
                    'high'
                );
            }
        } catch (error) {
            console.error('Failed to notify user', error);
        }

        setIsRunning(false);
        setPaused(false);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRunning(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Batch Campaign Runner</h2>
                        <p className="text-xs text-slate-500">{funnelName}</p>
                    </div>
                    {!isRunning && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {!isRunning && progress === 0 ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                <span className="material-symbols-outlined text-blue-600">info</span>
                                <div className="text-xs text-blue-800">
                                    <p className="font-bold">Ready to Launch</p>
                                    <p>You are about to enroll <strong>{selectedLeads.length} leads</strong> into this funnel.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Size</label>
                                    <input
                                        type="number"
                                        className="w-full text-sm border-slate-200 rounded-lg"
                                        value={batchSize}
                                        onChange={e => setBatchSize(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Wait (Seconds)</label>
                                    <input
                                        type="number"
                                        className="w-full text-sm border-slate-200 rounded-lg"
                                        value={throttleSeconds}
                                        onChange={e => setThrottleSeconds(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span>Progress</span>
                                <span>{currentIndex} / {selectedLeads.length}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="bg-slate-900 rounded-xl p-4 h-48 overflow-y-auto font-mono text-[10px] text-green-400 space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i}>{log}</div>
                                ))}
                                {logs.length === 0 && <span className="text-slate-600">Waiting to start...</span>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    {!isRunning && progress === 0 ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Cancel</button>
                            <button
                                onClick={runCampaign}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                Start Campaign
                            </button>
                        </>
                    ) : (
                        <>
                            {isRunning && (
                                <button
                                    onClick={() => setPaused(!paused)}
                                    className="px-4 py-2 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 text-sm"
                                >
                                    {paused ? 'Resume' : 'Pause'}
                                </button>
                            )}
                            <button
                                onClick={isRunning ? handleStop : onClose}
                                className={`px-4 py-2 font-bold rounded-lg text-sm ${isRunning ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                            >
                                {isRunning ? 'Stop' : 'Close'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
