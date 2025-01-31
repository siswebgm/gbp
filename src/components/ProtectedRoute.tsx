import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { Loader } from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';
import { supabaseClient } from '../lib/supabase';

export function ProtectedRoute() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const company = useCompanyStore((state) => state.company);

  // Use o hook de proteção
  useAuthGuard();

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        setIsAuthenticated(!!session && !!company?.id);
      } catch (error) {
        console.error('Session check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [company?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}