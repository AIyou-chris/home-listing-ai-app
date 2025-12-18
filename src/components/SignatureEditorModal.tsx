import React, { useState, useEffect } from 'react';
import EmailEditor from './EmailEditor';

interface SignatureEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSignature: string;
    onSave: (signature: string) => void;
}

const SignatureEditorModal: React.FC<SignatureEditorModalProps> = ({ isOpen, onClose, initialSignature, onSave }) => {
    const [signature, setSignature] = useState(initialSignature);

    useEffect(() => {
        setSignature(initialSignature);
    }, [initialSignature, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Edit Email Signature</h2>
                        <p className="text-sm text-slate-500">Design your signature to be appended to every email.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <EmailEditor
                        value={signature}
                        onChange={setSignature}
                        placeholder="Type your signature here (e.g. Name, Title, Phone, Links)..."
                        className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[300px]"
                    />

                    <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-start gap-3">
                        <span className="material-symbols-outlined shrink-0 text-blue-600">info</span>
                        <p>
                            This signature will automatically replace the <code>{'{{agent.signature}}'}</code> token in all your email templates.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onSave(signature);
                            onClose();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Signature
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureEditorModal;
