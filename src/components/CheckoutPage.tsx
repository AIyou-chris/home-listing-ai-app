import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface CheckoutPageProps {
  slug?: string;
  onBackToSignup?: () => void;
}

// Where Stripe sends people after checkout: /checkout/:slug?status=success|cancelled
const CheckoutPage: React.FC<CheckoutPageProps> = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status');

  const copy = status === 'success'
    ? { eyebrow: 'You are all set', title: 'Your free trial has started', body: 'Nothing is charged today. You can cancel any time in Settings, then Billing.' }
    : status === 'cancelled'
      ? { eyebrow: 'No charge', title: 'Checkout was cancelled', body: 'You were not charged. You can start your plan again any time from Billing.' }
      : { eyebrow: 'Billing', title: 'Billing is managed in your Dashboard', body: 'Open Billing to start or change your plan.' };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">{copy.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{copy.body}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard/lo-today')}
            className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Go to my dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings/billing')}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Billing
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
