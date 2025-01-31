import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient as supabase } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const clearCompany = useCompanyStore((state) => state.clearCompany);

  useEffect(() => {
    // Verificar sessão inicial
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Observar mudanças na sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session);
      setIsAuthenticated(!!session);

      if (!session) {
        clearCompany();
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearCompany, navigate]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      clearCompany();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    signOut
  };
}
