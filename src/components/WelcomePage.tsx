import React, { useState, useEffect } from 'react';
import { agentOnboardingService } from '../services/agentOnboardingService';
import { AuthHeader } from './AuthHeader';

interface WelcomePageProps {
  slug: string;
  onNavigateToLanding?: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  onEnterDemoMode?: () => void;
}

interface ProgressStep {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ 
  slug, 
  onNavigateToLanding, 
  onNavigateToSection,
  onEnterDemoMode 
}) => {
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [progressSteps] = useState<ProgressStep[]>([
    { id: 'signup', title: 'Account Created', icon: 'person_add', completed: true },
    { id: 'payment', title: 'Payment Processed', icon: 'payment', completed: true },
    { id: 'email', title: 'Welcome Email Sent', icon: 'email', completed: true },
    { id: 'dashboard', title: 'Dashboard Accessed', icon: 'dashboard', completed: false },
    { id: 'ai_card', title: 'AI Card Configured', icon: 'badge', completed: false }
  ]);

  useEffect(() => {
    // Fetch agent details
    const fetchAgentDetails = async () => {
      try {
        const agent = await agentOnboardingService.getAgentBySlug(slug);
        setAgentName(`${agent.first_name} ${agent.last_name}`);
        setAgentEmail(agent.email);
      } catch (error) {
        console.error('Failed to fetch agent details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentDetails();
  }, [slug]);

  const handleResendEmail = async () => {
    setResendMessage(null);
    setResendError(null);
    setIsResending(true);

    try {
      await agentOnboardingService.resendWelcomeEmail(slug);
      setResendMessage('✅ Welcome email sent! Check your inbox (and spam folder).');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email. Please try again.';
      if (message.includes('60 seconds')) {
        setResendError('⏱️ Please wait 60 seconds before requesting another email.');
      } else {
        setResendError(message);
      }
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans">
      <AuthHeader 
        onNavigateToSignUp={() => {}} 
        onNavigateToSignIn={() => {}} 
        onNavigateToLanding={onNavigateToLanding} 
        onNavigateToSection={onNavigateToSection}
        onEnterDemoMode={onEnterDemoMode}
      />
      
      <main className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              🎉 Welcome, {agentName}!
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Your payment has been processed and your AI Agent dashboard is being set up
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">timeline</span>
              Your Onboarding Progress
            </h2>
            
            <div className="space-y-4">
              {progressSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    step.completed 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">
                      {step.completed ? 'check_circle' : step.icon}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      step.completed ? 'text-slate-900' : 'text-slate-500'
                    }`}>
                      {step.title}
                    </h3>
                  </div>
                  
                  {step.completed && (
                    <span className="text-sm font-medium text-green-600">Completed ✓</span>
                  )}
                  
                  {!step.completed && index === 3 && (
                    <span className="text-sm font-medium text-amber-600">Next Step</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Email Check Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-indigo-600">mail</span>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email!</h2>
                <p className="text-slate-600 mb-4">
                  We've sent a welcome email to <strong className="text-slate-900">{agentEmail}</strong> with your 
                  personalized dashboard link and auto-login access.
                </p>
                
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>📬 Can't find it?</strong> Check your spam/junk folder. Add us@homelistingai.com to your contacts to ensure future emails reach your inbox.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isResending
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {isResending ? 'hourglass_empty' : 'refresh'}
                  </span>
                  {isResending ? 'Sending...' : 'Resend Welcome Email'}
                </button>

                {resendMessage && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">{resendMessage}</p>
                  </div>
                )}

                {resendError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{resendError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">rocket_launch</span>
              Quick Start Guide
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Click the email link to access your dashboard</h3>
                  <p className="text-sm text-slate-600">
                    The link in your email will automatically log you in and take you straight to your personalized dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-600 text-white rounded-lg flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Set up your AI Card (Recommended First)</h3>
                  <p className="text-sm text-slate-600">
                    Your digital business card with an embedded AI assistant. Add your photo, contact info, and branding.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-600 text-white rounded-lg flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Configure your AI Sidekicks</h3>
                  <p className="text-sm text-slate-600">
                    Customize your Marketing, Sales, and Admin AI assistants to match your business voice and needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-600 text-white rounded-lg flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Import your leads and start automating</h3>
                  <p className="text-sm text-slate-600">
                    Upload your contact list and let AI handle follow-ups, scheduling, and engagement tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="mt-8 text-center">
            <p className="text-slate-600 mb-4">
              Questions? We're here to help!
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <a 
                href="mailto:us@homelistingai.com" 
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <span className="material-symbols-outlined text-lg">email</span>
                us@homelistingai.com
              </a>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">24-hour response time</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WelcomePage;
