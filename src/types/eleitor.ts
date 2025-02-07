export interface Eleitor {
  uid: string;
  nome: string | null;
  cpf: string | null;
  nascimento: string | null;
  whatsapp: string | null;
  telefone: string | null;
  genero: string | null;
  titulo: string | null;
  zona: string | null;
  secao: string | null;
  cep: string | null;
  logradouro: string | null;
  cidade: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  empresa_uid: string;
  created_at: string | null;
  indicado: string | null;
  uf: string | null;
  categoria: string | null;
  gbp_atendimentos: string | null;
  responsavel: string | null;
  usuario_uid: string | null;
  latitude: string | null;
  longitude: string | null;
  nome_mae: string | null;
  upload_id: string | null;
  upload_url: string | null;
  indicacao?: string | null;
  categoria_uid?: string;
}

export interface EleitorFormData {
  uid?: string;
  nome: string;
  cpf?: string;
  ignoreCpf?: boolean;
  nascimento?: string;
  genero: string;
  nome_mae?: string;
  whatsapp: string;
  telefone?: string;
  titulo?: string;
  zona?: string;
  secao?: string;
  cep: string;
  logradouro: string;
  cidade: string;
  bairro: string;
  numero: string;
  complemento?: string;
  uf?: string;
  categoria_uid: string;
  usuario_uid: string;
  empresa_uid: string;
  indicacao?: string;
  upload_id?: string;
  upload_url?: string;
  responsavel?: string;
  registrarAtendimento?: boolean;
  descricaoAtendimento?: string;
  categoriaAtendimento?: string | null;
  statusAtendimento?: string;
}

export interface EleitorFilters {
  nome?: string;
  zona?: string;
  secao?: string;
  usuario_uid?: string;
  nivel_acesso?: string;
  categoria_uid?: {
    uid: string;
    nome: string;
  };
  bairro?: string;
  logradouro?: string;
  indicado?: string;
  cep?: string;
  responsavel?: string;
  cidade?: string;
  genero?: string;
  whatsapp?: string;
  cpf?: string;
}
