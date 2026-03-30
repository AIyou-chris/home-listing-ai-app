import React, { useEffect, useState } from 'react';
import Modal from '../Modal';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (promoCode?: string) => void;
  title?: string;
  body?: string;
  reasonLine?: string | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  upgrading?: boolean;
  allowPromoCode?: boolean;
  promoPlaceholder?: string;
  promoLabel?: string;
  promoHelpText?: string;
  initialPromoCode?: string;
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
  upgrading = false,
  allowPromoCode = false,
  promoPlaceholder = 'LIFETIME',
  promoLabel = 'Promo code (optional)',
  promoHelpText = 'If you have a promo code, enter it here before upgrading.',
  initialPromoCode = ''
}) => {
  const [promoCode, setPromoCode] = useState(initialPromoCode);

  useEffect(() => {
    if (isOpen) {
      setPromoCode(initialPromoCode);
    }
  }, [initialPromoCode, isOpen]);

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
        {allowPromoCode ? (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">{promoLabel}</label>
            <input
              type="text"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder={promoPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <p className="text-xs text-slate-500">{promoHelpText}</p>
          </div>
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
            onClick={() => onUpgrade(promoCode.trim() || undefined)}
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
