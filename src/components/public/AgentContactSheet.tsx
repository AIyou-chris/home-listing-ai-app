import React, { useMemo, useState } from 'react';
import AgentBusinessCard from '../agent/AgentBusinessCard';
import { showToast } from '../../utils/toastService';

export type AgentContactInfo = {
  name: string;
  company: string;
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  headshotUrl?: string;
  brandColor?: string;
};

interface AgentContactSheetProps {
  open: boolean;
  onClose: () => void;
  agent: AgentContactInfo;
  onOpenChat: () => void;
  onOpenFlyer: () => void;
}

const AgentContactSheet: React.FC<AgentContactSheetProps> = ({
  open,
  onClose,
  agent,
  onOpenChat,
  onOpenFlyer
}) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: `Hi ${agent.name || 'there'}, I would like more information about this home.`
  });

  const brandColor = agent.brandColor?.trim() || '#f97316';
  const safeName = agent.name?.trim() || 'HomeListingAI Agent';
  const safeCompany = agent.company?.trim() || 'HomeListingAI';
  const safeTitle = agent.title?.trim() || 'Listing Specialist';

  const introText = useMemo(() => {
    if (agent.email?.trim()) {
      return `This sends a message to ${agent.email.trim()}.`;
    }
    return 'This sends a message to the listing agent.';
  }, [agent.email]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <section
        className="w-full max-w-[760px] rounded-[32px] border border-white/12 bg-slate-950/92 px-4 py-[20px] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] shadow-[0_32px_90px_rgba(2,6,23,0.52)] md:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">HomeListingAI</p>
            <p className="mt-1 text-sm text-slate-300">Contact the listing agent or open the flyer for this home.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
            aria-label="Close contact card"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <AgentBusinessCard
          fullName={safeName}
          company={safeCompany}
          title={safeTitle}
          phone={agent.phone || ''}
          email={agent.email || ''}
          headshotUrl={agent.headshotUrl || null}
          themeColor={brandColor}
          onChat={onOpenChat}
          onContact={() => setShowContactForm(true)}
          onMoreInfo={onOpenFlyer}
          showMoreInfo
        />

        {showContactForm ? (
          <div className="mx-auto mt-3 w-full max-w-[420px] rounded-[20px] border border-white/10 bg-[rgba(7,14,28,0.88)] p-2.5 shadow-[0_18px_42px_rgba(2,6,23,0.24)] backdrop-blur-xl">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-white">Contact {safeName}</h3>
              <p className="mt-1 text-xs text-slate-300">{introText}</p>
            </div>

            <form
              className="space-y-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                if (agent.email?.trim()) {
                  const subject = encodeURIComponent(`Question about this listing for ${safeName}`);
                  const body = encodeURIComponent(
                    `Name: ${contactForm.name}\nEmail: ${contactForm.email}\n\n${contactForm.message}`
                  );
                  showToast.info('Opening your email app...');
                  window.location.href = `mailto:${agent.email.trim()}?subject=${subject}&body=${body}`;
                } else {
                  showToast.error('Agent email is not set yet.');
                }
              }}
            >
              <div className="grid gap-1.5">
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
                />
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Your email"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
                />
              </div>
              <textarea
                value={contactForm.message}
                onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="How can the agent help?"
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/20"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <button
                  type="submit"
                  className="rounded-[14px] px-3 py-1.5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(249,115,22,0.22)] transition hover:brightness-105"
                  style={{ backgroundColor: brandColor }}
                >
                  Send message
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Close form
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AgentContactSheet;
