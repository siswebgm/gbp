import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService, AuthData } from '../services/auth';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabaseClient } from '../lib/supabase';

interface Company {
  uid: string;
  nome: string;
  token?: string | null;
  instancia?: string | null;
  porta?: string | null;
}

export interface User extends AuthData {}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const setCompany = useCompanyStore((state) => state.setCompany);
  const setCompanyUser = useCompanyStore((state) => state.setUser);
  const authStore = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Função para carregar dados da empresa
  const loadCompanyData = async (empresaUid: string) => {
    try {
      const { data: companyData, error: companyError } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', empresaUid)
        .single();

      if (!companyError && companyData) {
        setCompany(companyData);
        return companyData;
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    }
    return null;
  };

  // Função para carregar dados atualizados do usuário
  const loadUserData = async (uid: string) => {
    try {
      const { data: userData, error } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
          id,
          uid,
          nome,
          email,
          cargo,
          nivel_acesso,
          permissoes,
          empresa_uid,
          contato,
          status,
          ultimo_acesso,
          created_at,
          foto,
          notification_token,
          notification_status,
          notification_updated_at
        `)
        .eq('uid', uid)
        .single();

      if (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        return false;
      }

      if (userData) {
        // Atualiza o AuthStore com os dados mais recentes
        authStore.setUser(userData);
        localStorage.setItem('gbp_user', JSON.stringify(userData));

        // Se houver empresa_uid, carrega os dados da empresa
        if (userData.empresa_uid) {
          const companyData = await loadCompanyData(userData.empresa_uid);
          if (companyData) {
            setCompanyUser({
              ...userData,
              foto: userData.foto
            });
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      try {
        const storedUser = localStorage.getItem('gbp_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData?.uid) {
            const success = await loadUserData(userData.uid);
            if (!success) {
              // Se não conseguir carregar os dados do usuário, faz logout
              signOut();
              return;
            }
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        signOut();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Atualização periódica dos dados
    const updateInterval = setInterval(async () => {
      const storedUser = localStorage.getItem('gbp_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData?.uid) {
          await loadUserData(userData.uid);
        }
      }
    }, 30000);

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password);
      if (user) {
        const success = await loadUserData(user.uid);
        if (success) {
          navigate('/app');
        } else {
          throw new Error('Erro ao carregar dados do usuário');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao fazer login');
      }
      throw error;
    }
  };

  const signOut = () => {
    authStore.logout();
    setCompany(null);
    setCompanyUser(null);
    localStorage.removeItem('gbp_user');
    localStorage.removeItem('empresa_uid');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authStore.isAuthenticated,
        isLoading: false,
        user: authStore.user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
