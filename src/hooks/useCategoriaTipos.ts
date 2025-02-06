import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

export interface CategoriaTipo {
  uid: string;
  nome: string;
  empresa_uid: string;
}

export function useCategoriaTipos() {
  const company = useCompanyStore((state) => state.company);

  const { data, isLoading, error } = useQuery<CategoriaTipo[]>({
    queryKey: ['categoria-tipos', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        return [];
      }

      const { data: session } = await supabaseClient.auth.getSession();
      if (!session.session) {
        return [];
      }

      const { data, error } = await supabaseClient
        .from('gbp_categoria_tipos')
        .select('uid, nome, empresa_uid')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar tipos de categorias:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!company?.uid,
  });

  return {
    tipos: data || [],
    isLoading,
    error,
  };
}
