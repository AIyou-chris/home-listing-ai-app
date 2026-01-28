import React, { useState, useEffect } from 'react';
import { Play, Check, X, Clock, User } from 'lucide-react';

interface VoiceRecording {
    id: string;
    agent_id: string;
    agent_name: string;
    audio_url: string;
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    rejection_reason?: string;
}

export default function VoiceApprovalPanel() {
    const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchPendingRecordings();
    }, []);

    const fetchPendingRecordings = async () => {
        try {
            const response = await fetch('/api/voice-clone/pending-approvals');
            const data = await response.json();
            setRecordings(data.recordings || []);
        } catch (err) {
            console.error('Failed to fetch recordings:', err);
        } finally {
            setLoading(false);
        }
    };

    const approveRecording = async (recordingId: string) => {
        try {
            await fetch('/api/voice-clone/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordingId,
                    adminId: 'admin-user' // TODO: Get from auth context
                }),
            });

            // Remove from list
            setRecordings(prev => prev.filter(r => r.id !== recordingId));
            alert('Voice recording approved!');
        } catch (err) {
            console.error('Approval failed:', err);
            alert('Failed to approve recording');
        }
    };

    const rejectRecording = async (recordingId: string) => {
        const reason = rejectionReason[recordingId];
        if (!reason?.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        try {
            await fetch('/api/voice-clone/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordingId,
                    adminId: 'admin-user', // TODO: Get from auth context
                    reason
                }),
            });

            setRecordings(prev => prev.filter(r => r.id !== recordingId));
            setRejectionReason(prev => {
                const copy = { ...prev };
                delete copy[recordingId];
                return copy;
            });
            alert('Recording rejected');
        } catch (err) {
            console.error('Rejection failed:', err);
            alert('Failed to reject recording');
        }
    };

    if (loading) {
        return <div className="loading">Loading recordings...</div>;
    }

    return (
        <div className="voice-approval-panel">
            <div className="panel-header">
                <h2>Voice Clone Approvals</h2>
                <div className="badge">{recordings.length} Pending</div>
            </div>

            {recordings.length === 0 ? (
                <div className="empty-state">
                    <Clock size={48} />
                    <p>No pending voice recordings</p>
                </div>
            ) : (
                <div className="recordings-list">
                    {recordings.map(recording => (
                        <div key={recording.id} className="recording-card">
                            <div className="recording-header">
                                <div className="agent-info">
                                    <User size={20} />
                                    <span className="agent-name">{recording.agent_name}</span>
                                </div>
                                <span className="timestamp">
                                    {new Date(recording.submitted_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="audio-section">
                                <audio
                                    controls
                                    src={recording.audio_url}
                                    onPlay={() => setCurrentlyPlaying(recording.id)}
                                    onPause={() => setCurrentlyPlaying(null)}
                                />
                            </div>

                            <div className="rejection-input">
                                <textarea
                                    placeholder="Rejection reason (optional unless rejecting)"
                                    value={rejectionReason[recording.id] || ''}
                                    onChange={(e) => setRejectionReason(prev => ({
                                        ...prev,
                                        [recording.id]: e.target.value
                                    }))}
                                    rows={2}
                                />
                            </div>

                            <div className="action-buttons">
                                <button
                                    className="btn-reject"
                                    onClick={() => rejectRecording(recording.id)}
                                >
                                    <X size={18} />
                                    Reject
                                </button>
                                <button
                                    className="btn-approve"
                                    onClick={() => approveRecording(recording.id)}
                                >
                                    <Check size={18} />
                                    Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
        .voice-approval-panel {
          padding: 24px;
          max-width: 900px;
          margin: 0 auto;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        h2 {
          margin: 0;
          font-size: 28px;
          color: #111827;
        }

        .badge {
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .loading {
          text-align: center;
          padding: 48px;
          color: #6b7280;
        }

        .empty-state {
          text-align: center;
          padding: 64px 24px;
          color: #9ca3af;
        }

        .empty-state svg {
          margin-bottom: 16px;
        }

        .recordings-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recording-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
        }

        .recording-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .agent-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #374151;
        }

        .agent-name {
          font-weight: 600;
          font-size: 16px;
        }

        .timestamp {
          color: #9ca3af;
          font-size: 14px;
        }

        .audio-section {
          margin-bottom: 16px;
        }

        audio {
          width: 100%;
          border-radius: 8px;
        }

        .rejection-input {
          margin-bottom: 16px;
        }

        textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-approve, .btn-reject {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-approve {
          background: #10b981;
          color: white;
        }

        .btn-approve:hover {
          background: #059669;
        }

        .btn-reject {
          background: #ef4444;
          color: white;
        }

        .btn-reject:hover {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .voice-approval-panel {
            padding: 16px;
          }

          .panel-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .action-buttons {
            flex-direction: column-reverse;
          }

          .btn-approve, .btn-reject {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
        </div>
    );
}
