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
          senha,
          foto
        `)
        .eq('email', email.toString())
        .single();

      console.log('User data:', user);
      console.log('Query error:', error);

      if (error || !user) {
        console.error('Login error:', error);
        throw new AuthError('Credenciais inválidas');
      }

      // Verifica se o usuário tem senha definida
      if (!user.senha) {
        throw new AuthError('Usuário sem senha definida. Entre em contato com o administrador.');
      }

      // Verifica a senha
      if (user.senha !== password) {
        throw new AuthError('Credenciais inválidas');
      }

      // Verifica o status do usuário
      if (user.status === 'blocked') {
        throw new AuthError('Sua conta está bloqueada. Entre em contato com o administrador.');
      }

      if (user.status === 'pending') {
        throw new AuthError('Sua conta está pendente de aprovação. Entre em contato com o administrador.');
      }

      if (user.status !== 'active') {
        throw new AuthError('Status da conta inválido');
      }

      // Atualiza o último acesso
      await supabaseClient
        .from('gbp_usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('uid', user.uid);

      // Retorna os dados formatados
      return {
        uid: user.uid,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        nivel_acesso: user.nivel_acesso,
        permissoes: user.permissoes || [],
        empresa_uid: user.empresa_uid,
        contato: user.contato,
        status: user.status,
        ultimo_acesso: user.ultimo_acesso,
        created_at: user.created_at,
        foto: user.foto
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      console.error('Error in login:', error);
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