import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabaseClient } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth: boolean;
}

export function AuthGuard({ children, requireAuth }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user?.id) return;

      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('status')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao verificar status do usuário:', error);
        return;
      }

      if (data.status === 'blocked') {
        toast.error('Sua conta está bloqueada. Entre em contato com o administrador.');
        window.location.href = '/login';
      } else if (data.status === 'pending') {
        toast.error('Sua conta está pendente de aprovação. Entre em contato com o administrador.');
        window.location.href = '/login';
      }
    };

    if (isAuthenticated && pathname !== '/login') {
      checkUserStatus();
    }
  }, [isAuthenticated, user?.id, pathname]);

  const shouldRedirect = requireAuth ? !isAuthenticated : isAuthenticated;
  const redirectTo = requireAuth ? '/login' : '/app';

  if (shouldRedirect) {
    return <Navigate to={redirectTo} state={{ from: pathname }} replace />;
  }

  return <>{children}</>;
}
