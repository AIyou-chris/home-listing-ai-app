import React from 'react';
import { useNavigate } from 'react-router-dom';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Billing Update</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Billing is managed in your Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          You already have a free account. Upgrade anytime.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings/billing')}
            className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Go to Billing
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/today')}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
