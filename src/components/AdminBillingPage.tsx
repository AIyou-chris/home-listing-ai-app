import React, { useState, useEffect } from 'react';

const AdminBillingPage = () => {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBillingSummary = async () => {
            try {
                // The API base URL is retrieved from environment variables, with a fallback for local dev
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
                const response = await fetch(`${apiUrl}/api/billing/summary`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch billing summary: ${response.statusText}`);
                }
                const data = await response.json();
                setSummary(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBillingSummary();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-600 bg-red-50 p-4 rounded-lg text-center">Error: {error}</div>;
    }

    if (!summary) {
        return <div className="text-center p-8 text-slate-500">No billing data available.</div>;
    }
    
    return (
        <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Billing & Retention Management</h1>
                <p className="text-slate-500 mt-1">Monitor subscriptions, track renewals, and manage retention campaigns</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition">
                  <span className="material-symbols-outlined w-5 h-5">download</span>
                  Export Report
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                  <span className="material-symbols-outlined w-5 h-5">add</span>
                  Create Campaign
                </button>
              </div>
            </header>

            {/* Billing Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-green-900 mb-1">${summary.mrr || 0}</h3>
                    <p className="text-sm text-green-600">Monthly Revenue</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-blue-900 mb-1">{summary.activeSubscriptions || 0}</h3>
                    <p className="text-sm text-blue-600">Active Subscriptions</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-orange-900 mb-1">{summary.trialUsers || 0}</h3>
                    <p className="text-sm text-orange-600">Trial Users</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-purple-900 mb-1">{summary.growth || '+0%'}</h3>
                    <p className="text-sm text-purple-600">Growth</p>
                </div>
            </div>

            <div className="text-center py-16 border-t border-slate-200">
                <p className="text-slate-500">Full billing details and history will be implemented here.</p>
                <p className="text-sm text-slate-400 mt-2">Currently connected to placeholder data.</p>
            </div>
        </div>
    );
};

export default AdminBillingPage;
