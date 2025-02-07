import { useQuery } from '@tanstack/react-query';
import { eleitorService } from '../services/eleitorService';
import { useCompanyStore } from '../store/useCompanyStore';
import { useCategories } from './useCategories';
import { useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

export function useEleitorOptions() {
  const company = useCompanyStore((state) => state.company);
  const empresa_uid = company?.uid;

  console.log('[DEBUG] useEleitorOptions - Company:', company);
  console.log('[DEBUG] useEleitorOptions - Empresa UID:', empresa_uid);

  const { data: categorias = [] } = useCategories('eleitor');

  const { data: indicadoresData = [], isLoading: isLoadingIndicadores, error: indicadoresError } = useQuery({
    queryKey: ['eleitor-indicadores', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) {
        console.log('[DEBUG] Hook - Empresa UID não encontrado para indicadores');
        return [];
      }
      console.log('[DEBUG] Hook - Buscando indicadores para empresa:', empresa_uid);
      const data = await eleitorService.getIndicadoresOptions(empresa_uid);
      console.log('[DEBUG] Hook - Dados recebidos dos indicadores:', JSON.stringify(data, null, 2));
      const mapped = data.map(item => ({
        value: item.uid,
        label: item.nome
      }));
      console.log('[DEBUG] Hook - Dados mapeados dos indicadores:', JSON.stringify(mapped, null, 2));
      return mapped;
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const { data: responsaveisData = [], isLoading: isLoadingResponsaveis, error: responsaveisError } = useQuery({
    queryKey: ['eleitor-responsaveis', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) {
        console.log('[DEBUG] Hook - Empresa UID não encontrado para responsáveis');
        return [];
      }
      console.log('[DEBUG] Hook - Buscando responsáveis para empresa:', empresa_uid);
      const data = await eleitorService.getResponsaveisOptions(empresa_uid);
      
      if (!data || data.length === 0) {
        console.log('[DEBUG] Hook - Nenhum responsável encontrado');
        return [];
      }

      console.log('[DEBUG] Hook - Dados recebidos dos responsáveis:', JSON.stringify(data, null, 2));
      const mapped = data.map(item => ({
        value: item.uid,
        label: item.nome || 'Sem nome'
      }));
      console.log('[DEBUG] Hook - Dados mapeados dos responsáveis:', JSON.stringify(mapped, null, 2));
      return mapped;
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Log dos erros se houver
  useEffect(() => {
    if (indicadoresError) console.error('[DEBUG] Erro ao carregar indicadores:', indicadoresError);
    if (responsaveisError) console.error('[DEBUG] Erro ao carregar responsáveis:', responsaveisError);
  }, [indicadoresError, responsaveisError]);

  return {
    categorias: categorias.map(cat => ({ value: cat.uid, label: cat.nome })),
    indicadores: indicadoresData,
    responsaveis: responsaveisData,
    isLoading: isLoadingIndicadores || isLoadingResponsaveis,
    errors: {
      indicadores: indicadoresError,
      responsaveis: responsaveisError
    }
  };
}
