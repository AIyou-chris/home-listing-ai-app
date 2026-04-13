import React, { Suspense, lazy, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './public.css';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

const App = lazy(() => import('./App'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const NewLandingPage = lazy(() => import('./components/NewLandingPage'));
const ConsultationModal = lazy(() => import('./components/ConsultationModal'));
const Toaster = lazy(() => import('react-hot-toast').then((module) => ({ default: module.Toaster })));
const BlogIndex = lazy(() => import('./pages/Blog/BlogIndex'));
const BlogPost = lazy(() => import('./pages/Blog/BlogPost'));
const StorefrontPage = lazy(() => import('./pages/StorefrontPage').then((module) => ({ default: module.StorefrontPage })));
const PublicListingPage = lazy(() => import('./pages/PublicListingPage'));
const DemoPublicListingPage = lazy(() => import('./pages/DemoPublicListingPage'));

const routeFallback = (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <LoadingSpinner size="lg" type="dots" text="Loading..." />
  </div>
);

const PrivateAppLoader: React.FC = () => (
  <Suspense fallback={routeFallback}>
    <App />
  </Suspense>
);

const LandingPageFallback: React.FC<{
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  onEnterDemoMode: () => void;
}> = ({ onNavigateToSignUp, onNavigateToSignIn, onEnterDemoMode }) => (
  <div className="min-h-screen bg-slate-950 text-white">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20 sm:px-8">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          HomeListingAI
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Turn listings into leads without losing the homepage.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          The full landing experience hit a production rendering error. This fallback keeps the site live,
          keeps sign-up working, and gives visitors a clean path into the app while we finish the deeper fix.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <button
          onClick={onNavigateToSignUp}
          className="rounded-xl bg-cyan-500 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-400"
        >
          Create Free Account
        </button>
        <button
          onClick={onEnterDemoMode}
          className="rounded-xl border border-slate-700 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-900"
        >
          See a Full Listing Demo
        </button>
        <button
          onClick={onNavigateToSignIn}
          className="rounded-xl border border-slate-800 px-6 py-4 text-base font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
        >
          Login
        </button>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          'AI listing pages that answer buyer questions',
          'Market reports and QR lead capture built in',
          'Fast lead routing into your dashboard',
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PublicApp: React.FC = () => {
  const navigate = useNavigate();
  const [consultationRole, setConsultationRole] = useState<'realtor' | 'broker'>('realtor');
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const openConsultationModal = (role: 'realtor' | 'broker') => {
    setConsultationRole(role);
    setIsConsultationModalOpen(true);
  };

  const handleNavigateToSignUp = () => navigate('/signup');
  const handleNavigateToSignIn = () => navigate('/signin');
  const handleEnterDemoMode = () => navigate('/demo-dashboard/today');
  const handleNavigateToAdmin = () => navigate('/admin-login');
  const handleNavigateToShowcase = () => navigate('/demo-dashboard/today');

  return (
    <>
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary
                fallback={
                  <LandingPageFallback
                    onNavigateToSignUp={handleNavigateToSignUp}
                    onNavigateToSignIn={handleNavigateToSignIn}
                    onEnterDemoMode={handleEnterDemoMode}
                  />
                }
              >
                <LandingPage
                  onNavigateToSignUp={handleNavigateToSignUp}
                  onNavigateToSignIn={handleNavigateToSignIn}
                  onEnterDemoMode={handleEnterDemoMode}
                  onOpenConsultationModal={() => openConsultationModal('realtor')}
                  onNavigateToAdmin={handleNavigateToAdmin}
                  onNavigateToShowcase={handleNavigateToShowcase}
                />
              </ErrorBoundary>
            }
          />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/store/:slug" element={<StorefrontPage />} />
          <Route path="/listing/:id" element={<PublicListingPage />} />
          <Route path="/l/:publicSlug" element={<PublicListingPage />} />
          <Route path="/demo-live/:publicSlug" element={<DemoPublicListingPage />} />
          <Route
            path="/new-landing"
            element={
              <NewLandingPage
                onNavigateToSignUp={handleNavigateToSignUp}
                onNavigateToSignIn={handleNavigateToSignIn}
                onEnterDemoMode={handleEnterDemoMode}
              />
            }
          />
          <Route path="*" element={<PrivateAppLoader />} />
        </Routes>
      </Suspense>

      {isConsultationModalOpen ? (
        <Suspense fallback={null}>
          <>
            <ConsultationModal
              leadRole={consultationRole}
              onClose={() => setIsConsultationModalOpen(false)}
              onSuccess={() => undefined}
            />
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#333',
                  color: '#fff'
                }
              }}
            />
          </>
        </Suspense>
      ) : null}
    </>
  );
};

export default PublicApp;
