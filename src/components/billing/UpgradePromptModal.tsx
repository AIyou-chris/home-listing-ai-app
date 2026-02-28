import React from 'react';
import Modal from '../Modal';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title?: string;
  body?: string;
  reasonLine?: string | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  upgrading?: boolean;
}

const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  title = "You're at your limit.",
  body = 'Upgrade to keep capturing leads and sending reports without interruptions.',
  reasonLine = null,
  primaryLabel = 'Upgrade now',
  secondaryLabel = 'Not now',
  upgrading = false
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
        {reasonLine ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {reasonLine}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={upgrading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            disabled={upgrading}
            className="rounded-lg bg-[#233074] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b275e]"
          >
            {upgrading ? 'Loading…' : primaryLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradePromptModal;
