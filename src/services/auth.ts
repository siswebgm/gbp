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

      // Busca o usuário na tabela gbp_usuarios pelo email e senha
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
          foto,
          senha
        `)
        .eq('email', email.toString())
        .eq('senha', password) // Adiciona verificação da senha
        .single();

      console.log('User data:', user);

      if (error || !user) {
        console.error('Erro ao buscar usuário:', error);
        throw new AuthError('Email ou senha inválidos');
      }

      // Verifica se o usuário está ativo
      if (user.status !== 'active') {
        throw new AuthError('Usuário inativo ou bloqueado');
      }

      // Remove o campo senha antes de retornar/salvar os dados
      const { senha, ...userData } = user;

      // Atualiza último acesso
      await this.updateLastAccess(userData.uid);

      // Salva dados no localStorage
      localStorage.setItem('gbp_user', JSON.stringify(userData));
      localStorage.setItem('empresa_uid', userData.empresa_uid || '');
      localStorage.setItem('user_uid', userData.uid);

      // Cria uma sessão personalizada
      const session = {
        user: userData,
        access_token: btoa(JSON.stringify({ uid: userData.uid, email: userData.email })), // Token simples para manter compatibilidade
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expira em 24 horas
      };
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));

      return userData;
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