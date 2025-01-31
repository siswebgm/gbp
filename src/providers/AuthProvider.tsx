import React, { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService, AuthData } from '../services/auth';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuthStore } from '../store/useAuthStore';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const setCompany = useCompanyStore((state) => state.setCompany);
  const setCompanyUser = useCompanyStore((state) => state.setUser);
  const authStore = useAuthStore();

  const loadStoredUser = () => {
    try {
      console.log('Carregando usuário armazenado...');
      const storedUser = localStorage.getItem('gbp_user');
      const storedEmpresaUid = localStorage.getItem('empresa_uid');
      const storedUserUid = localStorage.getItem('user_uid');

      console.log('Dados encontrados no localStorage:', {
        storedUser,
        storedEmpresaUid,
        storedUserUid
      });

      if (storedUser && storedEmpresaUid && storedUserUid) {
        const userData = JSON.parse(storedUser) as User;
        console.log('Dados do usuário parseados:', userData);

        if (!userData.uid || !userData.empresa_uid) {
          console.error('Dados do usuário inválidos:', userData);
          throw new Error('Dados do usuário inválidos');
        }

        // Atualiza o AuthStore
        authStore.setUser({
          uid: userData.uid,
          nome: userData.nome,
          email: userData.email || '',
          empresa_uid: userData.empresa_uid || '',
          role: userData.nivel_acesso as 'admin' | 'attendant',
          foto: userData.foto
        });

        // Atualiza o CompanyStore
        setCompany({ 
          uid: userData.empresa_uid || '', 
          nome: userData.nome || '',
          token: null,
          instancia: null,
          porta: null
        });
        setCompanyUser({
          ...userData,
          foto: userData.foto
        });

        console.log('Estado atualizado com usuário armazenado:', {
          user: userData,
          isAuthenticated: true,
          company: {
            uid: userData.empresa_uid,
            nome: userData.nome
          }
        });
      } else {
        console.log('Nenhum usuário armazenado encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar usuário armazenado:', error);
      // Limpa os dados em caso de erro
      localStorage.removeItem('empresa_uid');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('gbp_user');
      authStore.logout();
      setCompany(null);
      setCompanyUser(null);
    }
  };

  useEffect(() => {
    loadStoredUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Iniciando login no AuthProvider...');
      const userData = await authService.login(email, password);
      console.log('Dados do usuário recebidos:', userData);

      // Salva os dados no localStorage
      localStorage.setItem('empresa_uid', userData.empresa_uid || '');
      localStorage.setItem('user_uid', userData.uid);
      localStorage.setItem('gbp_user', JSON.stringify(userData));

      console.log('Dados salvos no localStorage');

      // Atualiza o AuthStore
      authStore.setUser({
        uid: userData.uid,
        nome: userData.nome,
        email: userData.email || '',
        empresa_uid: userData.empresa_uid || '',
        role: userData.nivel_acesso as 'admin' | 'attendant',
        foto: userData.foto
      });

      // Atualiza o CompanyStore
      setCompany({ 
        uid: userData.empresa_uid || '', 
        nome: userData.nome || '',
        token: null,
        instancia: null,
        porta: null
      });
      setCompanyUser({
        ...userData,
        foto: userData.foto
      });

      console.log('Estado atualizado:', {
        user: userData,
        isAuthenticated: true,
        company: {
          uid: userData.empresa_uid,
          nome: userData.nome
        }
      });

      navigate('/app');
    } catch (error) {
      console.error('Erro no signIn:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao fazer login');
      }
      throw error;
    }
  };

  const signOut = () => {
    console.log('Realizando logout...');
    // Limpa o localStorage
    localStorage.removeItem('empresa_uid');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('gbp_user');

    // Limpa o estado do AuthStore
    authStore.logout();

    // Limpa o estado do CompanyStore
    setCompany(null);
    setCompanyUser(null);

    console.log('Estado limpo após logout');
    
    navigate('/');
  };

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
