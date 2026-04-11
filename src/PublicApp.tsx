import React, { Suspense, lazy, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './public.css';
import LoadingSpinner from './components/LoadingSpinner';

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
              <LandingPage
                onNavigateToSignUp={handleNavigateToSignUp}
                onNavigateToSignIn={handleNavigateToSignIn}
                onEnterDemoMode={handleEnterDemoMode}
                onOpenConsultationModal={() => openConsultationModal('realtor')}
                onNavigateToAdmin={handleNavigateToAdmin}
                onNavigateToShowcase={handleNavigateToShowcase}
              />
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
