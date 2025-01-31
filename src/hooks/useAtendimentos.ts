import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useCallback, useMemo } from 'react';

export type AtendimentoStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

interface Atendimento {
  uid: string;
  eleitor_uid: string | null;
  usuario_uid: string | null;
  categoria_uid: string | null;
  descricao: string | null;
  data_atendimento: string;
  empresa_uid: string | null;
  status: string | null;
  responsavel: string | null;
  created_at: string | null;
  gbp_eleitores: {
    uid: string;
    nome: string;
  } | null;
  gbp_usuarios: {
    uid: string;
    nome: string;
  } | null;
  gbp_categorias: {
    uid: string;
    nome: string;
  } | null;
  observacoes_count: number | null;
}

export function useAtendimentos() {
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);
  const companyUid = company?.uid;

  const fetchAtendimentos = useCallback(async () => {
    if (!companyUid) {
      console.log('Company UID is missing');
      throw new Error('Company UID is required');
    }

    console.log('Fetching atendimentos for company:', companyUid);

    // 1. Buscar atendimentos básicos
    const { data: atendimentosData, error: atendimentosError } = await supabaseClient
      .from('gbp_atendimentos')
      .select(`
        uid,
        eleitor_uid,
        usuario_uid,
        categoria_uid,
        descricao,
        data_atendimento,
        empresa_uid,
        status,
        responsavel,
        created_at
      `)
      .eq('empresa_uid', companyUid)
      .order('data_atendimento', { ascending: false });

    if (atendimentosError) {
      console.error('Error fetching atendimentos:', atendimentosError);
      throw atendimentosError;
    }

    if (!atendimentosData || atendimentosData.length === 0) {
      console.log('No atendimentos data found');
      return [];
    }

    // 2. Buscar eleitores relacionados
    const eleitorUids = atendimentosData
      .map(a => a.eleitor_uid)
      .filter((uid): uid is string => uid !== null);

    const { data: eleitoresData } = await supabaseClient
      .from('gbp_eleitores')
      .select('uid, nome')
      .in('uid', eleitorUids);

    // 3. Buscar usuários relacionados
    const usuarioUids = atendimentosData
      .map(a => a.usuario_uid)
      .filter((uid): uid is string => uid !== null);

    const { data: usuariosData } = await supabaseClient
      .from('gbp_usuarios')
      .select('uid, nome')
      .in('uid', usuarioUids);

    // 4. Buscar categorias relacionadas
    const categoriaUids = atendimentosData
      .map(a => a.categoria_uid)
      .filter((uid): uid is string => uid !== null);

    const { data: categoriasData } = await supabaseClient
      .from('gbp_categorias')
      .select('uid, nome')
      .in('uid', categoriaUids);

    // 5. Buscar contagem de observações
    const observacoesCountsPromises = atendimentosData.map(atendimento =>
      supabaseClient
        .from('gbp_observacoes')
        .select('*', { count: 'exact', head: true })
        .eq('atendimento_uid', atendimento.uid)
    );

    const observacoesResults = await Promise.all(observacoesCountsPromises);
    const observacoesCounts = observacoesResults.map(result => result.count || 0);

    // 6. Combinar todos os dados
    const atendimentosCompletos = atendimentosData.map((atendimento, index) => ({
      ...atendimento,
      gbp_eleitores: eleitoresData?.find(e => e.uid === atendimento.eleitor_uid) || null,
      gbp_usuarios: usuariosData?.find(u => u.uid === atendimento.usuario_uid) || null,
      gbp_categorias: categoriasData?.find(c => c.uid === atendimento.categoria_uid) || null,
      observacoes_count: observacoesCounts[index]
    }));

    console.log('Fetched complete atendimentos:', atendimentosCompletos);
    return atendimentosCompletos;
  }, [companyUid]);

  const { data: atendimentos, isLoading, error } = useQuery<Atendimento[]>({
    queryKey: ['atendimentos', companyUid],
    queryFn: fetchAtendimentos,
    enabled: !!companyUid,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const createAtendimento = useMutation({
    mutationFn: async (data: Omit<Atendimento, 'uid'>) => {
      const { data: result, error } = await supabaseClient
        .from('gbp_atendimentos')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendimentos', companyUid] });
    },
  });

  const updateAtendimentoStatus = useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: AtendimentoStatus }) => {
      const { data: result, error } = await supabaseClient
        .from('gbp_atendimentos')
        .update({ status })
        .eq('uid', uid)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendimentos', companyUid] });
    },
  });

  const deleteAtendimento = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabaseClient
        .from('gbp_atendimentos')
        .delete()
        .eq('uid', uid);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendimentos', companyUid] });
    },
  });

  return {
    atendimentos,
    isLoading,
    error,
    createAtendimento,
    updateAtendimentoStatus,
    deleteAtendimento,
  };
}
