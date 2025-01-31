export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
  nivel_acesso: 'admin' | 'attendant';
  empresa_uid: string;
  ultimo_acesso: string | null;
  created_at: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
}