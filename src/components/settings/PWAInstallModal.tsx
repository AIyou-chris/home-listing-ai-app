import React, { useState } from 'react';
import { Share, MoreVertical, PlusSquare, Smartphone, Check } from 'lucide-react';
import Modal from '../Modal';

interface PWAInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <span>Enable Home Screen Notifications</span>
                </div>
            }
        >
            <div className="p-4 space-y-6">
                <p className="text-slate-600">
                    Install this app to your home screen to receive push notifications just like a native app.
                </p>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ios'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        onClick={() => setActiveTab('ios')}
                    >
                        iPhone / iPad
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'android'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        onClick={() => setActiveTab('android')}
                    >
                        Android
                    </button>
                </div>

                {/* Content */}
                <div className="bg-slate-50 rounded-lg p-6">
                    {activeTab === 'ios' ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                                    <Share className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">1. Tap "Share"</h4>
                                    <p className="text-sm text-slate-600">
                                        Look for the share icon at the bottom of your screen (Safari) or top right (Chrome).
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                                    <div className="w-6 h-6 flex items-center justify-center font-bold text-slate-400">Aa</div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">2. Scroll Down</h4>
                                    <p className="text-sm text-slate-600">
                                        Scroll down the list of actions until you see "Add to Home Screen".
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                                    <PlusSquare className="w-6 h-6 text-slate-800" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">3. Tap "Add to Home Screen"</h4>
                                    <p className="text-sm text-slate-600">
                                        Confirm the name and tap "Add" in the top right corner.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                                    <MoreVertical className="w-6 h-6 text-slate-800" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">1. Tap Menu</h4>
                                    <p className="text-sm text-slate-600">
                                        Tap the three dots icon in the top right corner of your browser.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                                    <Smartphone className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">2. "Install App"</h4>
                                    <p className="text-sm text-slate-600">
                                        Tap "Install App" or "Add to Home Screen" in the menu.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                                    <Check className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">3. Confirm Install</h4>
                                    <p className="text-sm text-slate-600">
                                        Follow the prompts to add the app to your home screen.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 font-medium text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PWAInstallModal;
