import { supabaseClient } from "../lib/supabase";

export interface EleitorStats {
  totalEleitores: number;
  porCidade: {
    cidade: string;
    total: number;
  }[];
  porBairro: {
    cidade: string;
    bairro: string;
    total: number;
  }[];
  porZonaSecao: {
    zona: string;
    secao: string;
    total: number;
  }[];
  porMes: {
    mes: string;
    total: number;
  }[];
  porUsuario: {
    usuario_nome: string;
    total: number;
  }[];
  porIndicado: {
    indicado_nome: string;
    total: number;
  }[];
}

export const eleitorStatsService = {
  async getStats(empresa_uid: string): Promise<EleitorStats> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      console.log('Iniciando busca de estatísticas para empresa:', empresa_uid);

      // Total de eleitores
      const { count: totalEleitores, error: countError } = await supabaseClient
        .from('gbp_eleitores')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', empresa_uid);

      if (countError) {
        console.error('Erro ao buscar total de eleitores:', countError);
        throw countError;
      }

      console.log('Total de eleitores encontrados:', totalEleitores);

      // Buscar todos os eleitores de uma vez
      const { data: eleitoresData, error: eleitoresError } = await supabaseClient
        .from('gbp_eleitores')
        .select(`
          cidade,
          bairro,
          zona,
          secao,
          usuario:usuario_uid (
            uid,
            nome
          ),
          indicado:indicado_uid (
            uid,
            nome
          )
        `)
        .eq('empresa_uid', empresa_uid);

      if (eleitoresError) {
        console.error('Erro ao buscar dados dos eleitores:', eleitoresError);
        throw eleitoresError;
      }

      console.log('Dados dos eleitores recebidos:', eleitoresData?.length || 0, 'registros');

      // Processar cidades
      const cidadesMap = new Map<string, number>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.cidade) {
          cidadesMap.set(eleitor.cidade, (cidadesMap.get(eleitor.cidade) || 0) + 1);
        }
      });

      const porCidade = Array.from(cidadesMap.entries())
        .map(([cidade, total]) => ({ cidade, total }))
        .sort((a, b) => b.total - a.total);

      console.log('Cidades processadas:', porCidade.length);

      // Processar bairros
      const bairrosMap = new Map<string, { cidade: string; bairro: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.cidade && eleitor.bairro) {
          const key = `${eleitor.cidade}|${eleitor.bairro}`;
          const existing = bairrosMap.get(key) || { cidade: eleitor.cidade, bairro: eleitor.bairro, total: 0 };
          existing.total += 1;
          bairrosMap.set(key, existing);
        }
      });

      const porBairro = Array.from(bairrosMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Bairros processados:', porBairro.length);

      // Processar zonas e seções
      const zonasMap = new Map<string, { zona: string; secao: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.zona && eleitor.secao) {
          const key = `${eleitor.zona}|${eleitor.secao}`;
          const existing = zonasMap.get(key) || { zona: eleitor.zona, secao: eleitor.secao, total: 0 };
          existing.total += 1;
          zonasMap.set(key, existing);
        }
      });

      const porZonaSecao = Array.from(zonasMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Zonas e seções processadas:', porZonaSecao.length);

      // Processar usuários
      const usuariosMap = new Map<string, { usuario_nome: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.usuario?.nome) {
          const nome = eleitor.usuario.nome;
          const existing = usuariosMap.get(nome) || { usuario_nome: nome, total: 0 };
          existing.total += 1;
          usuariosMap.set(nome, existing);
        }
      });

      const porUsuario = Array.from(usuariosMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Usuários processados:', porUsuario.length);

      // Processar indicados
      const indicadosMap = new Map<string, { indicado_nome: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.indicado?.nome) {
          const nome = eleitor.indicado.nome;
          const existing = indicadosMap.get(nome) || { indicado_nome: nome, total: 0 };
          existing.total += 1;
          indicadosMap.set(nome, existing);
        }
      });

      const porIndicado = Array.from(indicadosMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Indicados processados:', porIndicado.length);

      const stats = {
        totalEleitores: totalEleitores || 0,
        porCidade,
        porBairro,
        porZonaSecao,
        porMes: [], // Mantido para compatibilidade
        porUsuario,
        porIndicado
      };

      console.log('Estatísticas processadas com sucesso:', stats);
      return stats;

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
};
