import React, { useMemo } from 'react';

export type AgentContactInfo = {
  name: string;
  company: string;
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  headshotUrl?: string;
};

interface AgentContactSheetProps {
  open: boolean;
  onClose: () => void;
  agent: AgentContactInfo;
  shareUrl: string;
}

const normalizePhone = (value?: string) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+')) return value.trim();
  return digits ? `+${digits}` : null;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const AgentContactSheet: React.FC<AgentContactSheetProps> = ({ open, onClose, agent, shareUrl }) => {
  const normalizedPhone = useMemo(() => normalizePhone(agent.phone), [agent.phone]);
  const smsHref = normalizedPhone ? `sms:${normalizedPhone}` : null;
  const telHref = normalizedPhone ? `tel:${normalizedPhone}` : null;
  const emailHref = agent.email ? `mailto:${agent.email}` : null;
  const initials = useMemo(() => getInitials(agent.name), [agent.name]);

  if (!open) return null;

  const handleShareAgentCard = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${agent.name} — Agent Card`,
          text: `Connect with ${agent.name}`,
          url: shareUrl
        });
        return;
      } catch (_error) {
        // User canceled native share.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert('Link copied to clipboard.');
    } catch (_error) {
      window.alert('Unable to share right now.');
    }
  };

  const handleCopyContactLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert('Contact link copied.');
    } catch (_error) {
      window.alert('Unable to copy link right now.');
    }
  };

  const ActionButton: React.FC<{
    label: string;
    href: string | null;
    icon: string;
  }> = ({ label, href, icon }) => {
    if (!href) {
      return (
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white/45"
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
          {label}
        </button>
      );
    }

    return (
      <a
        href={href}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {label}
      </a>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 md:items-stretch md:justify-end" onClick={onClose}>
      <section
        className="w-full max-h-[82dvh] overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900/95 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] text-white shadow-2xl backdrop-blur-xl md:h-full md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-3xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {agent.headshotUrl ? (
              <img
                src={agent.headshotUrl}
                alt={agent.name}
                className="h-14 w-14 rounded-full border border-white/30 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{agent.name}</p>
              <p className="truncate text-sm text-white/80">{agent.company}</p>
              <p className="truncate text-xs text-white/65">{agent.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
            aria-label="Close contact card"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ActionButton label="Call" href={telHref} icon="call" />
          <ActionButton label="Text" href={smsHref} icon="sms" />
          <ActionButton label="Email" href={emailHref} icon="mail" />
        </div>

        {agent.website ? (
          <a
            href={agent.website}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <span className="material-symbols-outlined text-[18px]">language</span>
            Visit Website
          </a>
        ) : null}

        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => void handleShareAgentCard()}
            className="w-full rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Share Agent Card
          </button>
          <button
            type="button"
            onClick={() => void handleCopyContactLink()}
            className="w-full rounded-xl border border-white/25 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Copy Contact Link
          </button>
        </div>
      </section>
    </div>
  );
};

export default AgentContactSheet;
