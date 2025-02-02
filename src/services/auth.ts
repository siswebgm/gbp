import { supabaseClient } from '../lib/supabase';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthData {
  uid: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
  nivel_acesso: string | null;
  permissoes: string[];
  empresa_uid: string | null;
  contato: string | null;
  status: string | null;
  ultimo_acesso: string | null;
  created_at: string | null;
  foto: string | null;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthData> {
    try {
      console.log('Login attempt with:', { email });

      // Fazer login no Supabase
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Erro de autenticação:', authError);
        throw new AuthError('Email ou senha inválidos');
      }

      // Busca o usuário na tabela gbp_usuarios
      const { data: user, error } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
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
          foto
        `)
        .eq('email', email.toString())
        .single();

      console.log('User data:', user);

      if (error || !user) {
        console.error('Erro ao buscar usuário:', error);
        throw new AuthError('Usuário não encontrado');
      }

      // Atualiza último acesso
      await this.updateLastAccess(user.uid);

      // Salva dados no localStorage
      localStorage.setItem('gbp_user', JSON.stringify(user));
      localStorage.setItem('empresa_uid', user.empresa_uid || '');
      localStorage.setItem('user_uid', user.uid);

      return user;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Erro ao fazer login');
    }
  },

  async updateLastAccess(userId: string) {
    try {
      const { error } = await supabaseClient
        .from('gbp_usuarios')
        .update({ 
          ultimo_acesso: new Date().toISOString()
        })
        .eq('uid', userId);

      if (error) {
        console.error('Error updating last access:', error);
      }
    } catch (error) {
      console.error('Error in updateLastAccess:', error);
    }
  }
};