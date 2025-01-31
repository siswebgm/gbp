export interface Database {
  public: {
    Tables: {
      gbp_usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          senha: string;
          empresa_id: string;
          ultimo_acesso: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          nome: string;
          email: string;
          senha: string;
          empresa_id: string;
          ultimo_acesso?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          nome?: string;
          email?: string;
          senha?: string;
          empresa_id?: string;
          ultimo_acesso?: string | null;
          created_at?: string;
        };
      };
      gbp_empresas: {
        Row: {
          id: string;
          nome: string;
          cnpj: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          nome: string;
          cnpj: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          nome?: string;
          cnpj?: string;
          created_at?: string;
        };
      };
      gbp_eleitores: {
        Row: {
          id: string;
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
          empresa_id: string;
          categoria_id: string | null;
          created_at: string | null;
          indicado: string | null;
          usuario_id: string | null;
          responsavel: string | null;
        };
        Insert: {
          id?: never;
          nome?: string | null;
          cpf?: string | null;
          nascimento?: string | null;
          whatsapp?: string | null;
          telefone?: string | null;
          genero?: string | null;
          titulo?: string | null;
          zona?: string | null;
          secao?: string | null;
          cep?: string | null;
          logradouro?: string | null;
          cidade?: string | null;
          bairro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          empresa_id: string;
          categoria_id?: string | null;
          created_at?: string | null;
          indicado?: string | null;
          usuario_id?: string | null;
          responsavel?: string | null;
        };
        Update: {
          id?: never;
          nome?: string | null;
          cpf?: string | null;
          nascimento?: string | null;
          whatsapp?: string | null;
          telefone?: string | null;
          genero?: string | null;
          titulo?: string | null;
          zona?: string | null;
          secao?: string | null;
          cep?: string | null;
          logradouro?: string | null;
          cidade?: string | null;
          bairro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          empresa_id?: string;
          categoria_id?: string | null;
          created_at?: string | null;
          indicado?: string | null;
          usuario_id?: string | null;
          responsavel?: string | null;
        };
      };
      gbp_categorias_eleitor: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          empresa_id: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          nome: string;
          descricao?: string | null;
          empresa_id: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          nome?: string;
          descricao?: string | null;
          empresa_id?: string;
          created_at?: string;
        };
      };
      gbp_atendimentos: {
        Row: {
          id: string;
          eleitor_id: string;
          usuario_id: string;
          categoria_id: string | null;
          descricao: string;
          data_atendimento: string;
          empresa_id: string;
        };
        Insert: {
          id?: never;
          eleitor_id: string;
          usuario_id: string;
          categoria_id?: string | null;
          descricao: string;
          data_atendimento: string;
          empresa_id: string;
        };
        Update: {
          id?: never;
          eleitor_id?: string;
          usuario_id?: string;
          categoria_id?: string | null;
          descricao?: string;
          data_atendimento?: string;
          empresa_id?: string;
        };
      };
      gbp_documentos: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          type: string;
          status: string;
          author: string;
          empresa_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          title: string;
          content?: string | null;
          type: string;
          status?: string;
          author: string;
          empresa_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          title?: string;
          content?: string | null;
          type?: string;
          status?: string;
          author?: string;
          empresa_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      gbp_resultados_eleitorais: {
        Row: {
          id: string;
          empresa_id: string;
          aa_eleicao: string;
          nr_zona: string;
          nr_secao: string;
          nr_local_votacao: string;
          nm_local_votacao: string;
          qt_votos: number;
          qt_aptos: number;
          qt_comparecimento: number;
          qt_abstencoes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          empresa_id: string;
          aa_eleicao: string;
          nr_zona: string;
          nr_secao: string;
          nr_local_votacao: string;
          nm_local_votacao: string;
          qt_votos: number;
          qt_aptos: number;
          qt_comparecimento: number;
          qt_abstencoes: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          empresa_id?: string;
          aa_eleicao?: string;
          nr_zona?: string;
          nr_secao?: string;
          nr_local_votacao?: string;
          nm_local_votacao?: string;
          qt_votos?: number;
          qt_aptos?: number;
          qt_comparecimento?: number;
          qt_abstencoes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}