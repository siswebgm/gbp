import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useQuery } from '@tanstack/react-query';
import { Star, Share, ArrowUp, ArrowDown, User } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

interface Candidato {
  nr_candidato: string;
  nm_candidato: string;
  qt_votos: number;
  percentual: number;
  situacao: string;
  partido: string;
  variacao?: number;
}

interface Resultado {
  total_votos: number;
  candidatos: Candidato[];
}

const MOCK_DATA: Resultado = {
  total_votos: 12378,
  candidatos: [
    {
      nr_candidato: "17",
      nm_candidato: "JOSE DOS SANTOS",
      qt_votos: 2514,
      percentual: 20.31,
      situacao: "ELEITO",
      partido: "PSL",
      variacao: 2.5
    },
    {
      nr_candidato: "15",
      nm_candidato: "MARIA SILVA",
      qt_votos: 2123,
      percentual: 17.15,
      situacao: "ELEITO",
      partido: "MDB",
      variacao: -1.2
    },
    {
      nr_candidato: "13",
      nm_candidato: "JOÃO PEREIRA",
      qt_votos: 1845,
      percentual: 14.91,
      situacao: "NÃO ELEITO",
      partido: "PT",
      variacao: 1.8
    }
  ]
};

export default function ResultadosEleitorais() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const [tabValue, setTabValue] = useState(0);
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: resultado, isLoading: dataLoading } = useQuery<Resultado>({
    queryKey: ['resultados', company?.id],
    queryFn: async () => {
      try {
        // Temporariamente usando dados mockados enquanto o backend não está disponível
        return MOCK_DATA;

        // Código real que será usado quando o backend estiver pronto:
        /*
        const response = await fetch('/api/resultados/candidatos', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar dados');
        }

        return response.json();
        */
      } catch (error) {
        showToast('Erro ao carregar dados', 'error');
        console.error('Erro:', error);
        return MOCK_DATA; // Fallback para dados mockados em caso de erro
      }
    },
    enabled: !!company?.id && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutos
    cacheTime: 1000 * 60 * 30, // 30 minutos
  });

  const formatNumero = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  const formatPercentual = (num: number) => {
    return num.toFixed(2) + '%';
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  const candidatosFiltrados = resultado?.candidatos.filter(candidato => {
    if (tabValue === 1) return candidato.situacao === 'ELEITO';
    if (tabValue === 2) return candidato.situacao === 'NÃO ELEITO';
    return true;
  }) || [];

  return (
    <div className="flex-1 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h6 className="text-gray-600 text-sm">Total Apurado</h6>
              <h4 className="text-2xl font-bold text-blue-600">
                {formatNumero(resultado?.total_votos || 0)}
              </h4>
            </div>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => navigate('/MapaEleitoral')}
            >
              Ver Mapa
            </button>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <div className="flex">
              <button
                className={
                  tabValue === 0
                    ? 'flex-1 px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600'
                    : 'flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700'
                }
                onClick={() => setTabValue(0)}
              >
                TODOS
              </button>
              <button
                className={
                  tabValue === 1
                    ? 'flex-1 px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600'
                    : 'flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700'
                }
                onClick={() => setTabValue(1)}
              >
                ELEITOS
              </button>
              <button
                className={
                  tabValue === 2
                    ? 'flex-1 px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600'
                    : 'flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700'
                }
                onClick={() => setTabValue(2)}
              >
                NÃO ELEITOS
              </button>
            </div>
          </div>

          <div className="divide-y">
            {candidatosFiltrados.map((candidato) => (
              <div
                key={candidato.nr_candidato}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{candidato.nr_candidato}</span>
                      <span>{candidato.nm_candidato}</span>
                    </div>
                    <span className="text-sm text-gray-500">{candidato.partido}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-blue-600">
                      {formatNumero(candidato.qt_votos)}
                    </span>
                    <div className="flex items-center gap-1">
                      {candidato.variacao && candidato.variacao > 0 ? (
                        <ArrowUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={
                        candidato.variacao && candidato.variacao > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }>
                        {formatPercentual(candidato.percentual)}
                      </span>
                    </div>
                    <span className={
                      candidato.situacao === 'ELEITO'
                        ? 'px-2 py-1 text-xs rounded bg-green-100 text-green-800'
                        : 'px-2 py-1 text-xs rounded bg-red-100 text-red-800'
                    }>
                      {candidato.situacao}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded-full">
                        <Star className="w-5 h-5 text-yellow-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded-full">
                        <Share className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
