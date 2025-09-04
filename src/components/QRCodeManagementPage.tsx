import React, { useState } from 'react';
import { QrCode, Plus, Eye, Download, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';

interface QRCodeData {
  id: string;
  label: string;
  url: string;
  scans: number;
  createdAt: string;
  lastScanned: string | null;
}

const QRCodeManagementPage: React.FC = () => {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([
    {
      id: '1',
      label: 'Business Card',
      url: 'https://mysite.com/ai-card/123',
      scans: 45,
      createdAt: '2024-01-15',
      lastScanned: '2024-01-20'
    },
    {
      id: '2',
      label: 'For Sale Sign',
      url: 'https://mysite.com/ai-card/123',
      scans: 23,
      createdAt: '2024-01-10',
      lastScanned: '2024-01-18'
    }
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQRLabel, setNewQRLabel] = useState('');
  const [editingQR, setEditingQR] = useState<QRCodeData | null>(null);

  const handleCreateQR = () => {
    if (!newQRLabel.trim()) return;
    
    const newQR: QRCodeData = {
      id: Date.now().toString(),
      label: newQRLabel,
      url: 'https://mysite.com/ai-card/123',
      scans: 0,
      createdAt: new Date().toISOString().split('T')[0],
      lastScanned: null
    };
    
    setQrCodes([newQR, ...qrCodes]);
    setNewQRLabel('');
    setIsCreateModalOpen(false);
  };

  const handleDeleteQR = (id: string) => {
    setQrCodes(qrCodes.filter(qr => qr.id !== id));
  };

  const handleDownloadQR = (qrCode: QRCodeData) => {
    // TODO: Implement QR code generation and download
    console.log('Downloading QR code:', qrCode.label);
  };

  const QRCodeCard: React.FC<{ qrCode: QRCodeData }> = ({ qrCode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{qrCode.label}</h3>
            <p className="text-sm text-gray-500">Created {qrCode.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingQR(qrCode)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteQR(qrCode.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{qrCode.scans}</div>
          <div className="text-sm text-gray-600">Total Scans</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900">
            {qrCode.lastScanned ? qrCode.lastScanned : 'Never'}
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
        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2">
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
              <p className="text-gray-600 mt-1">Create and manage QR codes for your AI business card</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create QR Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">{qrCodes.length}</div>
            <div className="text-gray-600">Active QR Codes</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">
              {qrCodes.reduce((sum, qr) => sum + qr.scans, 0)}
            </div>
            <div className="text-gray-600">Total Scans</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(qrCodes.reduce((sum, qr) => sum + qr.scans, 0) / qrCodes.length) || 0}
            </div>
            <div className="text-gray-600">Avg. Scans per QR</div>
          </div>
        </div>

        {/* QR Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map(qrCode => (
            <QRCodeCard key={qrCode.id} qrCode={qrCode} />
          ))}
        </div>
      </div>

      {/* Create QR Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New QR Code</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Label
              </label>
              <input
                type="text"
                value={newQRLabel}
                onChange={(e) => setNewQRLabel(e.target.value)}
                placeholder="e.g., Business Card, For Sale Sign"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQR}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit QR Modal */}
      {editingQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit QR Code</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Label
              </label>
              <input
                type="text"
                value={editingQR.label}
                onChange={(e) => setEditingQR({...editingQR, label: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setEditingQR(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setQrCodes(qrCodes.map(qr => qr.id === editingQR.id ? editingQR : qr));
                  setEditingQR(null);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeManagementPage;
