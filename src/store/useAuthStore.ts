import { create } from 'zustand';

interface User {
  uid: string;
  nome: string;
  email: string;
  empresa_uid: string;
  role: 'admin' | 'attendant';
  foto?: string | null;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  getStoredUser: () => User | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user: User) => {
    console.log('Atualizando usuário no AuthStore:', user);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    console.log('Limpando estado do usuário no AuthStore');
    set({ user: null, isAuthenticated: false });
  },

  getStoredUser: () => {
    const { user } = get();
    if (user) {
      return user;
    }

    try {
      const storedUser = localStorage.getItem('gbp_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.uid && parsedUser.empresa_uid) {
          return {
            uid: parsedUser.uid,
            nome: parsedUser.nome,
            email: parsedUser.email || '',
            empresa_uid: parsedUser.empresa_uid,
            role: parsedUser.nivel_acesso as 'admin' | 'attendant',
            foto: parsedUser.foto || null
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao recuperar usuário do localStorage:', error);
      return null;
    }
  }
}));