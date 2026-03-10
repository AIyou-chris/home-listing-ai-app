import React from 'react';

export interface AgentBusinessCardProps {
  fullName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  headshotUrl?: string | null;
  themeColor?: string;
  onChat: () => void;
  onContact: () => void;
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
};

const AgentBusinessCard: React.FC<AgentBusinessCardProps> = ({
  fullName,
  company,
  title,
  phone,
  email,
  headshotUrl,
  themeColor = '#2563eb',
  onChat,
  onContact
}) => {
  const initials = getInitials(fullName);
  const safeName = fullName.trim() || 'Your Name';
  const safeCompany = company.trim() || 'Your Brokerage';
  const safeTitle = title.trim() || 'Licensed Realtor(R)';

  return (
    <div className="mx-auto w-full max-w-sm rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex justify-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-slate-100 shadow-sm">
          {headshotUrl ? (
            <img src={headshotUrl} alt={safeName} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: themeColor }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">{safeName}</h3>
        <p className="mt-1 text-sm font-medium text-slate-600">{safeCompany}</p>
        <p className="text-sm text-slate-500">{safeTitle}</p>
      </div>

      <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span className="material-symbols-outlined text-base text-slate-400">call</span>
          <span className="truncate">{phone.trim() || 'Add phone number'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span className="material-symbols-outlined text-base text-slate-400">mail</span>
          <span className="truncate">{email.trim() || 'Add email address'}</span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={onChat}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: themeColor }}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={onContact}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Contact me
        </button>
      </div>
    </div>
  );
};

export default AgentBusinessCard;
