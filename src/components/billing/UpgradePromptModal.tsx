import React from 'react';
import Modal from '../Modal';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title?: string;
  body?: string;
}

const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  title = "You're at your limit.",
  body = 'Upgrade to keep capturing leads and sending reports without interruptions.'
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="space-y-5 p-6">
        <p className="text-sm text-slate-600">{body}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            className="rounded-lg bg-[#233074] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b275e]"
          >
            Upgrade now
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradePromptModal;
