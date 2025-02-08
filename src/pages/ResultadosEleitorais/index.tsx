import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, 
  Filter, 
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  MapPin,
  X
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../providers/AuthProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { supabaseClient } from '../../lib/supabase';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { AnaliseVotacao } from './components/AnaliseVotacao';

interface ResultadoEleicao {
  uid: string;
  aa_eleicao: string;
  dt_eleicao: string;
  nm_municipio: string;
  nm_local_votacao: string;
  nr_zona: string;
  nr_secao: string;
  ds_cargo: string;
  nr_votavel: string;
  nm_votavel: string;
  qt_votos: number;
  qt_aptos: number;
  qt_comparecimento: number;
  qt_abstencoes: number;
}

interface Filtros {
  anoEleicao?: string;
  dataEleicao?: string;
  municipio?: string;
  localVotacao?: string;
  zona?: string;
}

interface AnaliseCandidate {
  nr_votavel: string;
  nm_votavel: string;
  total_votos: number;
  percentual_total: number;
  total_locais: number;
  maior_votacao: {
    local: string;
    votos: number;
    percentual: number;
  };
  distribuicao_zonas: Array<{
    zona: string;
    votos: number;
    percentual: number;
  }>;
}

const ITEMS_PER_PAGE = 10;

export default function ResultadosEleitorais() {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  // Mover a verificação para o início, antes dos outros hooks
  if (!isAdmin) {
    console.log('[DEBUG] ResultadosEleitorais - Acesso negado: usuário não é admin');
    return null;
  }

  const company = useCompanyStore((state) => state.company);
  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState<Filtros>({});
  const [ordenacao, setOrdenacao] = useState<{campo: keyof ResultadoEleicao; ordem: 'asc' | 'desc'}>({
    campo: 'qt_votos',
    ordem: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [datas, setDatas] = useState<string[]>([]);
  const [showFiltros, setShowFiltros] = useState(false);

  // Buscar dados do Supabase
  const { data: resultados, isLoading, refetch } = useQuery<ResultadoEleicao[]>({
    queryKey: ['resultados-eleitorais', filtros, searchTerm, ordenacao],
    queryFn: async () => {
      try {
        let query = supabaseClient
          .from('eleicoes_vereador')
          .select('*');

        // Aplicar filtros
        if (filtros.anoEleicao) {
          query = query.eq('aa_eleicao', filtros.anoEleicao);
        }
        if (filtros.dataEleicao) {
          query = query.eq('dt_eleicao', filtros.dataEleicao);
        }
        if (filtros.municipio) {
          query = query.eq('nm_municipio', filtros.municipio);
        }
        if (filtros.localVotacao) {
          query = query.eq('nm_local_votacao', filtros.localVotacao);
        }
        if (filtros.zona) {
          query = query.eq('nr_zona', filtros.zona);
        }

        // Aplicar busca
        if (searchTerm) {
          query = query.or(`nm_votavel.ilike.%${searchTerm}%,nr_votavel.ilike.%${searchTerm}%`);
        }

        // Aplicar ordenação
        query = query.order(ordenacao.campo, { ascending: ordenacao.ordem === 'asc' });

        const { data, error } = await query;

        if (error) throw error;
        return data || [];

      } catch (error) {
        console.error('Erro ao buscar resultados:', error);
        showToast('Erro ao carregar dados', 'error');
        return [];
      }
    },
    enabled: Boolean(company?.id && user?.uid),
  });

  // Buscar dados iniciais (municípios e datas)
  const { data: dadosIniciais } = useQuery({
    queryKey: ['dados-iniciais'],
    queryFn: async () => {
      try {
        // Buscar municípios únicos
        const { data: municipios } = await supabaseClient
          .from('eleicoes_vereador')
          .select('nm_municipio')
          .is('deleted_at', null)
          .then(result => {
            const unique = [...new Set(result.data?.map(m => m.nm_municipio))];
            return { data: unique.map(m => ({ nm_municipio: m })) };
          });

        // Buscar datas únicas
        const { data: datas } = await supabaseClient
          .from('eleicoes_vereador')
          .select('dt_eleicao, aa_eleicao')
          .is('deleted_at', null)
          .then(result => {
            const unique = [...new Set(result.data?.map(d => JSON.stringify({ dt_eleicao: d.dt_eleicao, aa_eleicao: d.aa_eleicao })))];
            return { data: unique.map(d => JSON.parse(d)) };
          });

        return {
          municipios: municipios?.map(m => m.nm_municipio).sort() || [],
          datas: datas?.sort((a, b) => b.aa_eleicao.localeCompare(a.aa_eleicao)) || []
        };
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
        return { municipios: [], datas: [] };
      }
    }
  });

  // Atualizar dados iniciais
  useEffect(() => {
    if (dadosIniciais) {
      setMunicipios(dadosIniciais.municipios);
      setDatas(dadosIniciais.datas);
    }
  }, [dadosIniciais]);

  // Análise do candidato selecionado
  const { data: analiseCandidate, isLoading: loadingAnalise } = useQuery<AnaliseCandidate>({
    queryKey: ['analise-candidato', selectedCandidate, filtros],
    queryFn: async () => {
      if (!selectedCandidate) return null;

      try {
        let query = supabaseClient
          .from('eleicoes_vereador')
          .select('*')
          .or(`nr_votavel.eq.${selectedCandidate},nm_votavel.ilike.%${selectedCandidate}%`);

        // Aplicar os mesmos filtros da tabela principal
        if (filtros.dataEleicao) {
          query = query.eq('dt_eleicao', filtros.dataEleicao);
        }
        if (filtros.municipio) {
          query = query.eq('nm_municipio', filtros.municipio);
        }
        if (filtros.zona) {
          query = query.eq('nr_zona', filtros.zona);
        }

        const { data: votos } = await query;

        if (!votos || votos.length === 0) return null;

        // Agrupar votos por zona
        const votosPorZona = votos.reduce((acc, voto) => {
          if (!acc[voto.nr_zona]) {
            acc[voto.nr_zona] = {
              zona: voto.nr_zona,
              votos: 0,
              percentual: 0
            };
          }
          acc[voto.nr_zona].votos += voto.qt_votos;
          return acc;
        }, {} as Record<string, { zona: string; votos: number; percentual: number }>);

        // Calcular total de votos
        const totalVotos = Object.values(votosPorZona).reduce((sum, { votos }) => sum + votos, 0);

        // Calcular percentuais
        Object.values(votosPorZona).forEach(zona => {
          zona.percentual = (zona.votos / totalVotos) * 100;
        });

        // Encontrar local com maior votação
        const maiorVotacao = votos.reduce((max, voto) => {
          return voto.qt_votos > (max?.votos || 0)
            ? {
                local: voto.nm_local_votacao,
                votos: voto.qt_votos,
                percentual: (voto.qt_votos / totalVotos) * 100
              }
            : max;
        }, null as { local: string; votos: number; percentual: number } | null);

        // Retornar análise completa
        return {
          nr_votavel: votos[0].nr_votavel,
          nm_votavel: votos[0].nm_votavel,
          total_votos: totalVotos,
          percentual_total: (totalVotos / votos.reduce((sum, v) => sum + v.qt_aptos, 0)) * 100,
          total_locais: new Set(votos.map(v => v.nm_local_votacao)).size,
          maior_votacao: maiorVotacao || { local: '', votos: 0, percentual: 0 },
          distribuicao_zonas: Object.values(votosPorZona).sort((a, b) => b.votos - a.votos)
        };
      } catch (error) {
        console.error('Erro ao buscar análise do candidato:', error);
        return null;
      }
    },
    enabled: Boolean(selectedCandidate && company?.id && user?.uid),
  });

  // Paginação
  const totalPages = Math.ceil((resultados?.length || 0) / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return resultados?.slice(start, start + ITEMS_PER_PAGE) || [];
  }, [resultados, currentPage]);

  // Função para exportar dados
  const exportarDados = async () => {
    if (!resultados?.length) return;
    
    try {
      const csvContent = [
        ['Ano Eleição', 'Data Eleição', 'Município', 'Local Votação', 'Zona', 'Seção', 'Cargo', 'Número', 'Candidato', 'Votos', 'Aptos', 'Comparecimento', 'Abstenções'].join(','),
        ...resultados.map(r => [
          r.aa_eleicao,
          r.dt_eleicao,
          r.nm_municipio,
          r.nm_local_votacao,
          r.nr_zona,
          r.nr_secao,
          r.ds_cargo,
          r.nr_votavel,
          r.nm_votavel,
          r.qt_votos,
          r.qt_aptos,
          r.qt_comparecimento,
          r.qt_abstencoes
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `resultados_eleitorais_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      showToast('Erro ao exportar dados', 'error');
    }
  };

  const limparFiltros = () => {
    setFiltros({});
    setSearchTerm('');
    setSelectedCandidate(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com fundo branco */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Resultados Eleitorais</h2>
              <p className="text-gray-500">
                Gerencie e analise os resultados das eleições
              </p>
            </div>
            <Button 
              onClick={exportarDados} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Área de Filtros */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 space-y-4">
            {/* Linha de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder="Buscar por número ou nome..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedCandidate(e.target.value);
                  }}
                  className="pl-10 w-full"
                />
              </div>

              {/* Data da Eleição */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <Select
                  value={filtros.dataEleicao || ''}
                  onValueChange={(value) => {
                    setFiltros(prev => ({
                      ...prev,
                      dataEleicao: value,
                      anoEleicao: datas.find(d => d.dt_eleicao === value)?.aa_eleicao
                    }));
                    refetch();
                  }}
                  className="pl-10 w-full h-10"
                >
                  <option value="">Selecione a data</option>
                  {datas.map(data => (
                    <option key={data.dt_eleicao} value={data.dt_eleicao}>
                      {new Date(data.dt_eleicao).toLocaleDateString('pt-BR')}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Município */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <Select
                  value={filtros.municipio || ''}
                  onValueChange={(value) => {
                    setFiltros(prev => ({ ...prev, municipio: value }));
                    refetch();
                  }}
                  className="pl-10 w-full h-10"
                >
                  <option value="">Selecione o município</option>
                  {municipios.map(municipio => (
                    <option key={municipio} value={municipio}>{municipio}</option>
                  ))}
                </Select>
              </div>

              {/* Zona Eleitoral */}
              <div className="flex gap-2">
                <Select
                  value={filtros.zona || ''}
                  onValueChange={(value) => {
                    setFiltros(prev => ({ ...prev, zona: value }));
                    refetch();
                  }}
                  className="flex-1 h-10"
                >
                  <option value="">Zona eleitoral</option>
                  <option value="001">Zona 001</option>
                  <option value="002">Zona 002</option>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    limparFiltros();
                    refetch();
                  }}
                  className="h-10 w-10"
                  title="Limpar filtros"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filtros Ativos */}
            {Object.keys(filtros).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {filtros.dataEleicao && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                    <Calendar className="h-3 w-3" />
                    {new Date(filtros.dataEleicao).toLocaleDateString('pt-BR')}
                    <button
                      onClick={() => {
                        setFiltros(prev => {
                          const { dataEleicao, anoEleicao, ...rest } = prev;
                          return rest;
                        });
                        refetch();
                      }}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filtros.municipio && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full">
                    <MapPin className="h-3 w-3" />
                    {filtros.municipio}
                    <button
                      onClick={() => {
                        setFiltros(prev => {
                          const { municipio, ...rest } = prev;
                          return rest;
                        });
                        refetch();
                      }}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filtros.zona && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full">
                    Zona {filtros.zona}
                    <button
                      onClick={() => {
                        setFiltros(prev => {
                          const { zona, ...rest } = prev;
                          return rest;
                        });
                        refetch();
                      }}
                      className="ml-1 hover:text-purple-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Análise do Candidato */}
        <AnaliseVotacao 
          candidato={analiseCandidate || null} 
          isLoading={loadingAnalise} 
        />

        {/* Tabela */}
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidato
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Local de Votação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <span>Votos</span>
                      <button
                        onClick={() => setOrdenacao({
                          campo: 'qt_votos',
                          ordem: ordenacao.ordem === 'asc' ? 'desc' : 'asc'
                        })}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comparecimento
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abstenções
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                      </div>
                    </td>
                  </tr>
                ) : paginatedResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Nenhum resultado encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((resultado) => (
                    <tr 
                      key={resultado.uid} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCandidate(resultado.nr_votavel)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resultado.nr_votavel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {resultado.nm_votavel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {resultado.nm_local_votacao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {resultado.nr_zona}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {resultado.qt_votos.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {resultado.qt_comparecimento.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {resultado.qt_abstencoes.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, resultados?.length || 0)} de{' '}
                {resultados?.length || 0} resultados
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
