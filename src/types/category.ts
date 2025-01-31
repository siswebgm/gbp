export interface Category {
  uid: string;
  nome: string;
  descricao?: string | null;
  empresa_uid: string;
  created_at: string;
  tipo: {
    uid: string;
    nome: string;
  };
}