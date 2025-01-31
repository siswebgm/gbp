import { useQuery } from '@tanstack/react-query';
import { eleitorService } from '../services/eleitorService';
import { useCompanyStore } from '../store/useCompanyStore';
import { useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

export function useEleitorOptions() {
  const company = useCompanyStore((state) => state.company);
  const empresa_uid = company?.uid;

  const { data: categoriasData = [], isLoading: isLoadingCategorias, error: categoriasError } = useQuery({
    queryKey: ['eleitor-categorias', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) return [];
      const data = await eleitorService.getCategoriasOptions(empresa_uid);
      return data.map(item => ({
        value: item.uid,
        label: item.nome
      }));
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const { data: indicadoresData = [], isLoading: isLoadingIndicadores, error: indicadoresError } = useQuery({
    queryKey: ['eleitor-indicadores', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) return [];
      const data = await eleitorService.getIndicadoresOptions(empresa_uid);
      return data.map(item => ({
        value: item.uid,
        label: item.nome
      }));
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const { data: responsaveisData = [], isLoading: isLoadingResponsaveis, error: responsaveisError } = useQuery({
    queryKey: ['eleitor-responsaveis', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) return [];
      const data = await eleitorService.getResponsaveisOptions(empresa_uid);
      return data.map(item => ({
        value: item.uid,
        label: item.nome
      }));
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Log dos erros se houver
  useEffect(() => {
    if (categoriasError) console.error('Erro ao carregar categorias:', categoriasError);
    if (indicadoresError) console.error('Erro ao carregar indicadores:', indicadoresError);
    if (responsaveisError) console.error('Erro ao carregar responsáveis:', responsaveisError);
  }, [categoriasError, indicadoresError, responsaveisError]);

  return {
    categorias: categoriasData,
    indicadores: indicadoresData,
    responsaveis: responsaveisData,
    isLoading: isLoadingCategorias || isLoadingIndicadores || isLoadingResponsaveis
  };
}
