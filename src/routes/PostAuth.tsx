import React, { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'agent' | 'user' | null;

interface PostAuthProps {
  authReady: boolean;
  session: Session | null;
  role: AppRole;
  roleReady: boolean;
}

const PostAuth: React.FC<PostAuthProps> = ({ authReady, session, role, roleReady }) => {
  const navigate = useNavigate();
  const fallbackTimerRef = useRef<number | null>(null);
  const nextPath = role === 'admin' ? '/admin/overview' : '/dashboard/today';

  useEffect(() => {
    if (!authReady || !session) return;

    if (roleReady) {
      navigate(nextPath, { replace: true });
      return;
    }

    fallbackTimerRef.current = window.setTimeout(() => {
      navigate('/dashboard/today', { replace: true });
    }, 1500);

    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [authReady, session, roleReady, navigate, nextPath]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-600">
        Loading your session...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  if (!roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-600">
        Finalizing your access...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-600">
      Redirecting you to your dashboard...
    </div>
  );
};

export default PostAuth;
