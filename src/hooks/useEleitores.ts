import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../store/useCompanyStore';
import { eleitorService } from '../services/eleitorService';
import { Eleitor, EleitorFormData, EleitorFilters } from '../types/eleitor';
import { useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';

export interface UseEleitoresOptions {
  filters?: EleitorFilters;
  page?: number;
  pageSize?: number;
}

export function useEleitores({ 
  filters = {}, 
  page = 1, 
  pageSize = 10 
}: UseEleitoresOptions = {}) {
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);

  // Configuração do realtime
  useEffect(() => {
    if (!company?.uid) return;

    console.log('[DEBUG] Configurando realtime para eleitores da empresa:', company.uid);

    const channel = supabaseClient.channel(`eleitores_${company.uid}`);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_eleitores',
          filter: `empresa_uid=eq.${company.uid}`,
        },
        async (payload) => {
          console.log('[DEBUG] Mudança detectada em gbp_eleitores:', payload);
          
          // Invalida o cache para forçar uma nova busca
          await queryClient.invalidateQueries({
            queryKey: ['eleitores'],
            refetchType: 'all'
          });

          // Refetch imediato dos dados
          await queryClient.refetchQueries({
            queryKey: ['eleitores', company.uid, filters, page, pageSize],
            type: 'active'
          });
        }
      )
      .subscribe((status) => {
        console.log('[DEBUG] Status da subscrição realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[DEBUG] Realtime conectado com sucesso');
        }
      });

    // Cleanup: remove a subscrição quando o componente for desmontado
    return () => {
      console.log('[DEBUG] Removendo subscrição realtime');
      supabaseClient.removeChannel(channel);
    };
  }, [company?.uid, queryClient, filters, page, pageSize]);

  // Busca os dados paginados
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['eleitores', company?.uid, filters, page, pageSize],
    queryFn: async () => {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }
      console.log('[DEBUG] Buscando eleitores para empresa:', company.uid);
      const result = await eleitorService.listAll(company.uid, filters, page, pageSize);
      console.log('[DEBUG] Resultado da busca:', result);
      return result;
    },
    enabled: !!company?.uid,
    staleTime: 0, // Sempre considera os dados stale para permitir refetch
    cacheTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  // Pré-carrega a próxima página
  useEffect(() => {
    if (data?.total && page * pageSize < data.total) {
      queryClient.prefetchQuery({
        queryKey: ['eleitores', company?.uid, filters, page + 1, pageSize],
        queryFn: async () => {
          if (!company?.uid) {
            throw new Error('Empresa não encontrada');
          }
          return eleitorService.listAll(company.uid, filters, page + 1, pageSize);
        },
      });
    }
  }, [data, page, pageSize, company?.uid, filters, queryClient]);

  const { mutateAsync: createEleitor } = useMutation({
    mutationFn: async (data: EleitorFormData) => {
      const result = await eleitorService.create(data, company?.uid || '');
      // Força um refetch após criar
      await refetch();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleitores'] });
    },
  });

  const { mutateAsync: updateEleitor } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EleitorFormData }) => {
      const result = await eleitorService.update(id, data);
      // Força um refetch após atualizar
      await refetch();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleitores'] });
    },
  });

  const { mutateAsync: deleteEleitor } = useMutation({
    mutationFn: async (id: number) => {
      const result = await eleitorService.delete(id);
      // Força um refetch após deletar
      await refetch();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleitores'] });
    },
  });

  const { mutateAsync: exportEleitores } = useMutation({
    mutationFn: ({ formato, campos }: { formato: string; campos: string[] }) => 
      eleitorService.export(company?.uid || '', { ...filters, formato, campos }),
  });

  const { mutateAsync: sendMessage } = useMutation({
    mutationFn: ({ mensagem, filtros }: { mensagem: string; filtros: EleitorFilters }) => 
      eleitorService.sendWhatsAppMessage(mensagem, company?.uid || '', { ...filters, ...filtros }),
  });

  return {
    eleitores: data?.data || [],
    isLoading,
    error,
    total: data?.total || 0,
    pageSize: data?.pageSize || pageSize,
    currentPage: data?.currentPage || page,
    createEleitor,
    updateEleitor,
    deleteEleitor,
    exportEleitores,
    sendMessage
  };
}
