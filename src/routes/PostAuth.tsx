import React from 'react';
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'agent' | 'user' | null;

interface PostAuthProps {
  authReady: boolean;
  session: Session | null;
  role: AppRole;
  roleReady: boolean;
}

const PostAuth: React.FC<PostAuthProps> = ({ authReady, session, role, roleReady }) => {
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

  const nextPath = role === 'admin' ? '/admin/overview' : '/dashboard/today';
  return <Navigate to={nextPath} replace />;
};

export default PostAuth;
