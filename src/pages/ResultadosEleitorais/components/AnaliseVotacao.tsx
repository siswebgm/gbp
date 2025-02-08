import React from 'react';
import { Card } from '../../../components/ui/card';
import { BarChart2, TrendingUp, Users, MapPin } from 'lucide-react';

interface AnaliseVotacaoProps {
  candidato: {
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
  } | null;
  isLoading: boolean;
}

export function AnaliseVotacao({ candidato, isLoading }: AnaliseVotacaoProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!candidato) {
    return null;
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {candidato.nr_votavel} - {candidato.nm_votavel}
          </h3>
          <p className="text-sm text-gray-500">Análise detalhada da votação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Votos</p>
              <p className="text-xl font-bold text-blue-600">
                {candidato.total_votos.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Percentual Total</p>
              <p className="text-xl font-bold text-green-600">
                {candidato.percentual_total.toFixed(2)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Locais de Votação</p>
              <p className="text-xl font-bold text-purple-600">
                {candidato.total_locais.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-orange-50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Maior Votação</p>
              <p className="text-xl font-bold text-orange-600">
                {candidato.maior_votacao.votos.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500">{candidato.maior_votacao.local}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-4">Distribuição por Zonas Eleitorais</h4>
        <div className="space-y-4">
          {candidato.distribuicao_zonas.map((zona) => (
            <div key={zona.zona} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Zona {zona.zona}</span>
                <span className="font-medium">{zona.votos.toLocaleString('pt-BR')} votos</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: zona.percentual + '%' }}
                />
              </div>
              <p className="text-xs text-right text-gray-500">{zona.percentual.toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </Card>
    </Card>
  );
}
