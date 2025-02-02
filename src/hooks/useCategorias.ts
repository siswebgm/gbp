import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

export interface Categoria {
  uid: string;
  nome: string;
  empresa_uid: string;
  tipo_uid?: string;
  created_at: string;
}

interface CreateCategoriaData {
  nome: string;
  tipo_uid?: string;
}

interface UpdateCategoriaData extends CreateCategoriaData {
  uid: string;
}

export function useCategorias() {
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Categoria[]>({
    queryKey: ['categorias', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        return [];
      }

      const { data: session } = await supabaseClient.auth.getSession();
      if (!session.session) {
        return [];
      }

      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .select('uid, nome, empresa_uid, tipo_uid, created_at')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!company?.uid,
  });

  return {
    categorias: data || [],
    isLoading,
    error,
    create: async (categoria: CreateCategoriaData) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const { data: session } = await supabaseClient.auth.getSession();
      if (!session.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .insert([
          {
            ...categoria,
            empresa_uid: company.uid
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar categoria:', error);
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['categorias', company.uid] });
      return data;
    },
    update: async ({ uid, ...categoria }: UpdateCategoriaData) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const { data: session } = await supabaseClient.auth.getSession();
      if (!session.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .update(categoria)
        .eq('uid', uid)
        .eq('empresa_uid', company.uid)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar categoria:', error);
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['categorias', company.uid] });
      return data;
    },
    delete: async (uid: string) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const { data: session } = await supabaseClient.auth.getSession();
      if (!session.session) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabaseClient
        .from('gbp_categorias')
        .delete()
        .eq('uid', uid)
        .eq('empresa_uid', company.uid);

      if (error) {
        console.error('Erro ao deletar categoria:', error);
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['categorias', company.uid] });
    }
  };
}
