import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { QrCode, Plus, Eye, Download, Trash2, Edit3 } from 'lucide-react';
import {
  listAICardQRCodes,
  createAICardQRCode,
  updateAICardQRCode,
  deleteAICardQRCode,
  type AICardQRCode
} from '../services/aiCardService';

interface QRCodeEditorState {
  label: string;
  destinationUrl: string;
}

const emptyEditorState: QRCodeEditorState = {
  label: '',
  destinationUrl: ''
};

const DEMO_QR_CODES: AICardQRCode[] = [
  {
    id: 'demo-qr-1',
    label: 'Business Card',
    destinationUrl: 'https://homelistingai.com/ai-card/sarah-johnson',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://homelistingai.com/ai-card/sarah-johnson',
    totalScans: 127,
    createdAt: '2025-11-01T10:00:00Z',
    lastScannedAt: '2025-11-24T15:30:00Z'
  },
  {
    id: 'demo-qr-2',
    label: 'Open House Signage',
    destinationUrl: 'https://homelistingai.com/ai-card/sarah-johnson?ref=openhouse',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://homelistingai.com/ai-card/sarah-johnson?ref=openhouse',
    totalScans: 89,
    createdAt: '2025-10-15T14:20:00Z',
    lastScannedAt: '2025-11-23T11:45:00Z'
  },
  {
    id: 'demo-qr-3',
    label: 'Property Flyer',
    destinationUrl: 'https://homelistingai.com/property/sunset-blvd-2847',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://homelistingai.com/property/sunset-blvd-2847',
    totalScans: 234,
    createdAt: '2025-09-20T09:15:00Z',
    lastScannedAt: '2025-11-25T08:20:00Z'
  },
  {
    id: 'demo-qr-4',
    label: 'Email Signature',
    destinationUrl: 'https://homelistingai.com/ai-card/sarah-johnson?ref=email',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://homelistingai.com/ai-card/sarah-johnson?ref=email',
    totalScans: 56,
    createdAt: '2025-08-10T16:30:00Z',
    lastScannedAt: '2025-11-22T14:10:00Z'
  }
];

const QRCodeManagementPage: React.FC<{ isDemoMode?: boolean }> = ({ isDemoMode = false }) => {
  const [qrCodes, setQrCodes] = useState<AICardQRCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createState, setCreateState] = useState<QRCodeEditorState>(emptyEditorState);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<AICardQRCode | null>(null);
  const [editState, setEditState] = useState<QRCodeEditorState>(emptyEditorState);

  const totalScans = useMemo(
    () => qrCodes.reduce((sum, qr) => sum + (qr.totalScans || 0), 0),
    [qrCodes]
  );

  const averageScans = useMemo(() => {
    if (!qrCodes.length) return 0;
    return Math.round(totalScans / qrCodes.length);
  }, [totalScans, qrCodes.length]);

  const loadQRCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (isDemoMode) {
        // Load demo QR codes in demo mode
        setQrCodes(DEMO_QR_CODES);
      } else {
        const data = await listAICardQRCodes();
        setQrCodes(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load QR codes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load QR codes');
      setQrCodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadQRCodes();
  }, [loadQRCodes]);

  const resetCreateModal = () => {
    setCreateState(emptyEditorState);
    setIsCreateModalOpen(false);
  };

  const resetEditModal = () => {
    setEditingQR(null);
    setEditState(emptyEditorState);
    setIsEditModalOpen(false);
  };

  const handleCreateQR = async () => {
    if (isDemoMode) {
      alert('Demo Mode: QR codes cannot be created in demo mode');
      return;
    }
    if (!createState.label.trim()) {
      setError('Label is required.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      await createAICardQRCode(createState.label.trim(), createState.destinationUrl || undefined);
      await loadQRCodes();
      resetCreateModal();
    } catch (err: unknown) {
      console.error('Failed to create QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to create QR code');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQR = async (id: string) => {
    if (isDemoMode) {
      alert('Demo Mode: QR codes cannot be deleted in demo mode');
      return;
    }
    try {
      setIsSaving(true);
      await deleteAICardQRCode(id);
      setQrCodes(prev => prev.filter(qr => qr.id !== id));
    } catch (err: unknown) {
      console.error('Failed to delete QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete QR code');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (qr: AICardQRCode) => {
    setEditingQR(qr);
    setEditState({
      label: qr.label,
      destinationUrl: qr.destinationUrl
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateQR = async () => {
    if (isDemoMode) {
      alert('Demo Mode: QR codes cannot be edited in demo mode');
      return;
    }
    if (!editingQR) return;
    if (!editState.label.trim()) {
      setError('Label is required.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      await updateAICardQRCode(editingQR.id, {
        label: editState.label.trim(),
        destinationUrl: editState.destinationUrl || undefined
      });
      await loadQRCodes();
      resetEditModal();
    } catch (err: unknown) {
      console.error('Failed to update QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to update QR code');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadQR = (qrCode: AICardQRCode) => {
    if (!qrCode.qrSvg) return;
    const link = document.createElement('a');
    link.href = qrCode.qrSvg;
    link.download = `${qrCode.label.replace(/\s+/g, '-').toLowerCase() || 'qr-code'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const QRCodeCard: React.FC<{ qrCode: AICardQRCode }> = ({ qrCode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center overflow-hidden">
            {qrCode.qrSvg ? (
              <img src={qrCode.qrSvg} alt={`${qrCode.label} QR`} className="object-contain h-full w-full" />
            ) : (
              <QrCode className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{qrCode.label}</h3>
            <p className="text-sm text-gray-500">
              Created {qrCode.created_at ? new Date(qrCode.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenEditModal(qrCode)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Edit QR code"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteQR(qrCode.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete QR code"
            disabled={isSaving}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4 break-words">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Destination</p>
        <p className="text-sm text-gray-800 mt-1">{qrCode.destinationUrl}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{qrCode.totalScans || 0}</div>
          <div className="text-sm text-gray-600">Total Scans</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900">
            {qrCode.lastScannedAt
              ? new Date(qrCode.lastScannedAt).toLocaleDateString()
              : 'Never'}
          </div>
          <div className="text-sm text-gray-600">Last Scanned</div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleDownloadQR(qrCode)}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
        {qrCode.qrSvg && (
          <a
            href={qrCode.qrSvg}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
              <p className="text-gray-600 mt-1">
                Create and manage QR codes that link directly to your AI business card or custom destinations.
              </p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setCreateState(emptyEditorState);
                setIsCreateModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              disabled={isSaving}
            >
              <Plus className="w-4 h-4" />
              <span>Create QR Code</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">{qrCodes.length}</div>
            <div className="text-gray-600">Active QR Codes</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">{totalScans}</div>
            <div className="text-gray-600">Total Scans</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">{averageScans}</div>
            <div className="text-gray-600">Avg. Scans per QR</div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center text-gray-500">
            Loading QR codes…
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl shadow-sm p-8 text-center text-gray-500">
            <p className="text-lg font-semibold text-gray-700">No QR codes yet</p>
            <p className="text-sm mt-2">
              Generate your first QR code to share your AI business card on signs, postcards, and more.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map(qrCode => (
              <QRCodeCard key={qrCode.id} qrCode={qrCode} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New QR Code</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                <input
                  type="text"
                  value={createState.label}
                  onChange={(e) => setCreateState(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Business Card, Open House Sign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination URL (optional)
                </label>
                <input
                  type="url"
                  value={createState.destinationUrl}
                  onChange={(e) =>
                    setCreateState(prev => ({ ...prev, destinationUrl: e.target.value }))
                  }
                  placeholder="Override the default AI card link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use your AI business card URL automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={resetCreateModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQR}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isSaving}
              >
                {isSaving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit QR Code</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                <input
                  type="text"
                  value={editState.label}
                  onChange={(e) => setEditState(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={editState.destinationUrl}
                  onChange={(e) =>
                    setEditState(prev => ({ ...prev, destinationUrl: e.target.value }))
                  }
                  placeholder="Override the default AI card link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={resetEditModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQR}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeManagementPage;
