import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface VoiceRecordingPanelProps {
    agentId: string;
}

export default function VoiceRecordingPanel({ agentId }: VoiceRecordingPanelProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioURL, setAudioURL] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<{ status: string; rejectionReason?: string } | null>(null);
    const [error, setError] = useState<string>('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Load existing recording status
    useEffect(() => {
        fetchRecordingStatus();
    }, [agentId]);

    const fetchRecordingStatus = async () => {
        try {
            const response = await fetch(`/api/voice-clone/my-recording?agentId=${agentId}`);
            const data = await response.json();
            if (data.status !== 'none') {
                setRecordingStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch recording status:', err);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioURL(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setError('');
        } catch (err) {
            setError('Microphone access denied. Please allow microphone access.');
            console.error('Recording error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const submitRecording = async () => {
        if (!audioBlob) return;

        setIsUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('audioFile', audioBlob, 'voice-sample.webm');
            formData.append('agentId', agentId);

            const response = await fetch('/api/voice-clone/submit-recording', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            setRecordingStatus({ status: 'pending' });
            setAudioBlob(null);
            setAudioURL('');
            alert('Recording submitted for review!');
        } catch (err) {
            setError('Failed to upload recording. Please try again.');
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    // If already has a recording status
    if (recordingStatus) {
        return (
            <div className="voice-recording-panel">
                <div className="status-card">
                    {recordingStatus.status === 'pending' && (
                        <>
                            <Clock size={48} className="status-icon pending" />
                            <h3>Recording Submitted</h3>
                            <p>Your voice recording is awaiting admin approval.</p>
                        </>
                    )}
                    {recordingStatus.status === 'approved' && (
                        <>
                            <CheckCircle size={48} className="status-icon approved" />
                            <h3>Voice Clone Approved</h3>
                            <p>Your AI voice is ready! Calls will now use your cloned voice.</p>
                        </>
                    )}
                    {recordingStatus.status === 'rejected' && (
                        <>
                            <AlertCircle size={48} className="status-icon rejected" />
                            <h3>Recording Rejected</h3>
                            <p>{recordingStatus.rejectionReason || 'Please submit a new recording.'}</p>
                            <button
                                className="btn-primary"
                                onClick={() => setRecordingStatus(null)}
                            >
                                Submit New Recording
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="voice-recording-panel">
            <div className="recording-card">
                <h2>Record Your Voice</h2>
                <p className="instruction">
                    Record a 15-30 second sample reading the script below. Speak naturally and clearly.
                </p>

                <div className="script-box">
                    <p className="script-text">
                        "Hi, I'm calling to share some exciting real estate opportunities in your area.
                        I'd love to help you find your dream home or get top dollar for your property.
                        Let's connect and discuss how I can assist you with your real estate needs."
                    </p>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="recording-controls">
                    {!isRecording && !audioBlob && (
                        <button className="btn-record" onClick={startRecording}>
                            <Mic size={24} />
                            Start Recording
                        </button>
                    )}

                    {isRecording && (
                        <button className="btn-stop" onClick={stopRecording}>
                            <StopCircle size={24} />
                            Stop Recording
                        </button>
                    )}

                    {audioBlob && (
                        <div className="audio-preview">
                            <audio controls src={audioURL} />
                            <div className="preview-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        setAudioBlob(null);
                                        setAudioURL('');
                                    }}
                                >
                                    Re-record
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={submitRecording}
                                    disabled={isUploading}
                                >
                                    <Upload size={20} />
                                    {isUploading ? 'Uploading...' : 'Submit Recording'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .voice-recording-panel {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .recording-card, .status-card {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .status-card {
          text-align: center;
        }

        .status-icon {
          margin: 0 auto 16px;
        }

        .status-icon.pending {
          color: #f59e0b;
        }

        .status-icon.approved {
          color: #10b981;
        }

        .status-icon.rejected {
          color: #ef4444;
        }

        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #111827;
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #111827;
        }

        .instruction {
          color: #6b7280;
          margin-bottom: 24px;
        }

        .script-box {
          background: #f9fafb;
          border-left: 4px solid #3b82f6;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .script-text {
          margin: 0;
          color: #374151;
          line-height: 1.6;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          margin-bottom: 16px;
        }

        .recording-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .btn-record, .btn-stop, .btn-primary, .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-record {
          background: #3b82f6;
          color: white;
        }

        .btn-record:hover {
          background: #2563eb;
        }

        .btn-stop {
          background: #ef4444;
          color: white;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .btn-primary {
          background: #10b981;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #059669;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .audio-preview {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .preview-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        audio {
          width: 100%;
          border-radius: 8px;
        }
      `}</style>
        </div>
    );
}
