import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

interface DocumentCounts {
  oficiosCount: number;
  projetosLeiCount: number;
  requerimentosCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useDocumentCounts() {
  const [counts, setCounts] = useState<DocumentCounts>({
    oficiosCount: 0,
    projetosLeiCount: 0,
    requerimentosCount: 0,
    isLoading: true,
    error: null
  });

  const company = useCompanyStore((state) => state.company);

  useEffect(() => {
    async function fetchCounts() {
      if (!company?.uid) return;

      try {
        // Buscar contagem de ofícios
        const { count: oficiosCount, error: oficiosError } = await supabaseClient
          .from('gbp_oficios')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid);

        if (oficiosError) throw oficiosError;

        // Buscar contagem de projetos de lei
        const { count: projetosLeiCount, error: projetosError } = await supabaseClient
          .from('gbp_projetos_lei')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid);

        if (projetosError) throw projetosError;

        // Buscar contagem de requerimentos
        const { count: requerimentosCount, error: requerimentosError } = await supabaseClient
          .from('gbp_requerimentos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid);

        if (requerimentosError) throw requerimentosError;

        setCounts({
          oficiosCount: oficiosCount || 0,
          projetosLeiCount: projetosLeiCount || 0,
          requerimentosCount: requerimentosCount || 0,
          isLoading: false,
          error: null
        });
      } catch (error) {
        setCounts(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erro ao carregar contagens de documentos'
        }));
      }
    }

    fetchCounts();
  }, [company?.uid]);

  return counts;
}
