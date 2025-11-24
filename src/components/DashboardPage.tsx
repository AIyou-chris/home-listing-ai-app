import React, { useEffect, useState } from 'react';
import { agentOnboardingService, AgentRecord } from '../services/agentOnboardingService';
import LoadingSpinner from './LoadingSpinner';
import { Logo } from './Logo';

interface DashboardPageProps {
  slug: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ slug }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check for auto-login token in URL
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const token = urlParams.get('token');

        if (token) {
          setIsAuthenticating(true);
          try {
            // Verify token and get agent data
            const verifiedAgent = await agentOnboardingService.verifyAutoLoginToken(token);
            setAgent(verifiedAgent);
            setLoginSuccess(true);

            // Remove token from URL for security
            const cleanHash = window.location.hash.split('?')[0];
            window.history.replaceState(null, '', cleanHash);

            // Here you would normally set the session/auth state
            // For now, we'll just show a success message
          } catch (err) {
            console.error('Auto-login failed:', err);
            setError('Your login link has expired. Please request a new one from your welcome email.');
          } finally {
            setIsAuthenticating(false);
          }
        } else {
          // No token - fetch agent data normally
          const agentData = await agentOnboardingService.getAgentBySlug(slug);
          setAgent(agentData);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Unable to load your dashboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [slug]);

  if (isLoading || isAuthenticating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner text={isAuthenticating ? "Logging you in..." : "Loading your dashboard..."} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-10">
            <Logo className="w-12 h-12" />
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-red-500">error</span>
              <h1 className="text-2xl font-bold text-slate-800">Unable to Access Dashboard</h1>
              <p className="text-slate-600">{error}</p>
              <div className="pt-4">
                <button
                  onClick={() => window.location.hash = '#/signin'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition"
                >
                  <span className="material-symbols-outlined text-base">login</span>
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-10">
            <Logo className="w-12 h-12" />
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-amber-500">search_off</span>
              <h1 className="text-2xl font-bold text-slate-800">Agent Not Found</h1>
              <p className="text-slate-600">We couldn't find an agent with the slug "{slug}".</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo className="w-10 h-10" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{agent.email}</span>
            <button
              onClick={() => window.location.hash = '#/landing'}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loginSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              <div>
                <p className="font-semibold text-emerald-800">Welcome back, {agent.first_name}!</p>
                <p className="text-sm text-emerald-700">You've been automatically logged in.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-10 bg-gradient-to-r from-indigo-600 to-sky-500 text-white">
            <p className="uppercase text-xs tracking-[0.2em] opacity-80 mb-2">Your AI Dashboard</p>
            <h1 className="text-3xl font-bold">Welcome, {agent.first_name}!</h1>
            <p className="text-sm text-indigo-100 mt-3 max-w-2xl">
              Your personalized AI agent workspace is ready. Manage your listings, leads, and AI assistants all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-wide">
              <span className="bg-white/20 px-3 py-1 rounded-full">Slug: {slug}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                Status: {agent.status === 'active' ? 'Active' : agent.status === 'admin_test' ? 'Test Mode' : 'Pending'}
              </span>
            </div>
          </div>

          <div className="px-8 py-10 space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-400 transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-3xl text-indigo-600">home</span>
                  <div>
                    <h3 className="font-semibold text-slate-800">Manage Listings</h3>
                    <p className="text-sm text-slate-600 mt-1">Add and showcase your properties</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-400 transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-3xl text-indigo-600">groups</span>
                  <div>
                    <h3 className="font-semibold text-slate-800">Lead Management</h3>
                    <p className="text-sm text-slate-600 mt-1">Track and nurture your leads</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-400 transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-3xl text-indigo-600">smart_toy</span>
                  <div>
                    <h3 className="font-semibold text-slate-800">AI Assistants</h3>
                    <p className="text-sm text-slate-600 mt-1">Configure your AI helpers</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border border-indigo-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Next Steps</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-indigo-600 text-xl mt-0.5">radio_button_checked</span>
                  <div>
                    <p className="font-medium text-slate-700">Complete your profile</p>
                    <p className="text-sm text-slate-600">Add your photo, bio, and contact information</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-indigo-600 text-xl mt-0.5">radio_button_checked</span>
                  <div>
                    <p className="font-medium text-slate-700">Add your first listing</p>
                    <p className="text-sm text-slate-600">Showcase properties to potential buyers</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-indigo-600 text-xl mt-0.5">radio_button_checked</span>
                  <div>
                    <p className="font-medium text-slate-700">Configure AI Card</p>
                    <p className="text-sm text-slate-600">Customize your AI-powered business card</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-indigo-600 text-xl mt-0.5">radio_button_checked</span>
                  <div>
                    <p className="font-medium text-slate-700">Set up follow-up funnels</p>
                    <p className="text-sm text-slate-600">Automate your lead nurturing workflow</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => window.location.hash = '#/dashboard'}
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold shadow-lg hover:bg-indigo-500 transition"
              >
                <span className="material-symbols-outlined text-xl">space_dashboard</span>
                Go to Full Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@aiyouagent.com" className="text-indigo-600 hover:text-indigo-500 font-medium">
              support@aiyouagent.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
