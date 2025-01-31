import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Users, FileText, MessageSquare, UserCheck, CalendarCheck, Book, FileSpreadsheet, BookOpen, Calendar, TrendingUp, RefreshCw, ChevronRight } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { useLastAccess } from '../../hooks/useLastAccess';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { StatCard } from './components/StatCard';
import { MonthlyEvolution } from './components/MonthlyEvolution';
import { TypeDistribution } from './components/TypeDistribution';
import { TrialBanner } from '../../components/TrialBanner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const formatMes = (mesAno: string) => {
  const [ano, mes] = mesAno.split('-');
  return `${mes}/${ano}`;
};

const formatDate = (dateString: string) => {
  if (!dateString || dateString === 'N/A') return 'Data não disponível';
  
  try {
    const date = new Date(dateString);
    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

const monthlyData = {
  labels: ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'],
  datasets: [
    {
      label: 'Atendimentos',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    },
    {
      label: 'Eleitores',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
  ],
};

const distributionData = {
  labels: ['Eleitores'],
  datasets: [
    {
      data: [0],
      backgroundColor: ['rgb(75, 192, 192)'],
      borderColor: ['rgb(75, 192, 192)'],
      borderWidth: 1,
    },
  ],
};

export function Dashboard() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const clearDashboardData = useDashboardStore((state) => state.clearData);

  // Limpa os dados do dashboard quando o componente é desmontado
  useEffect(() => {
    return () => {
      // Não limpar os dados ao desmontar para manter o cache
      // clearDashboardData();
    };
  }, []);

  // Configurar subscriptions para atualizações em tempo real
  const handleRealtimeUpdate = useCallback(() => {
    // Ao invés de recarregar imediatamente, aguarda um tempo para evitar múltiplas atualizações
    const timeoutId = setTimeout(() => {
      refetch();
    }, 2000); // Aguarda 2 segundos após a última atualização

    return () => clearTimeout(timeoutId);
  }, [refetch]);

  useRealtimeSubscription({
    table: 'gbp_eleitores',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_atendimentos',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_oficios',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_requerimentos',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_projetos_lei',
    onUpdate: handleRealtimeUpdate
  });

  // Atualiza o último acesso do usuário
  useLastAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">Erro ao carregar dados do dashboard</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Nenhuma empresa selecionada</p>
          <p className="text-sm">Por favor, selecione uma empresa para continuar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 pt-0.5 pb-4 md:pb-6 md:pt-1 px-2 md:px-4">
        <div className="flex flex-col space-y-2 md:space-y-4 max-w-[1600px] mx-auto">
          <TrialBanner />
          
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 text-gray-900 rounded-lg border border-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-primary animate-[pulse_2s_ease-in-out_infinite]" />
                <span className="font-medium">Atualizar</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Total de Atendimentos"
                value={Number(dashboardData?.totalAtendimentos || 0)}
                total={100}
                icon={Users}
                color="text-blue-700"
                stats={dashboardData.atendimentosStats}
              />
              <StatCard
                title="Total de Eleitores"
                value={Number(dashboardData?.totalEleitores || 0)}
                total={dashboardData?.totalEleitores || 0}
                icon={Users}
                color="text-green-700"
                stats={dashboardData.eleitoresStats}
                footer={
                  <Link
                    to="/app/eleitores/relatorio"
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    Ver detalhes
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                }
              />
              <StatCard
                title="Total de Ofícios"
                value={Number(dashboardData?.totalOficios || 0)}
                total={50}
                icon={FileText}
                color="text-yellow-700"
                stats={dashboardData.oficiosStats}
              />
              <StatCard
                title="Total de Requerimentos"
                value={Number(dashboardData?.totalRequerimentos || 0)}
                total={50}
                icon={FileSpreadsheet}
                color="text-orange-700"
                stats={dashboardData.requerimentosStats}
              />
              <StatCard
                title="Total de Projetos"
                value={Number(dashboardData?.totalProjetosLei || 0)}
                total={10}
                icon={BookOpen}
                color="text-purple-700"
                stats={dashboardData.projetosLeiStats}
              />
              <StatCard
                title="Total de Agendamentos"
                value={Number(dashboardData?.totalAgendamentos || 0)}
                total={50}
                icon={Calendar}
                color="text-indigo-700"
                stats={dashboardData.agendamentosStats}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <MonthlyEvolution 
                  data={{
                    labels: monthlyData.labels,
                    datasets: [
                      {
                        label: 'Atendimentos',
                        data: monthlyData.datasets[0].data,
                        borderColor: 'rgb(53, 162, 235)',
                        backgroundColor: 'rgba(53, 162, 235, 0.5)',
                      },
                      {
                        label: 'Eleitores',
                        data: Array(6).fill(dashboardData?.totalEleitores || 0),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                      }
                    ]
                  }}
                />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <TypeDistribution 
                  data={{
                    labels: distributionData.labels,
                    datasets: [{
                      data: [dashboardData?.totalEleitores || 0],
                      backgroundColor: distributionData.datasets[0].backgroundColor,
                      borderColor: distributionData.datasets[0].borderColor,
                      borderWidth: distributionData.datasets[0].borderWidth,
                    }]
                  }}
                  total={Number(dashboardData?.totalEleitores || 0)}
                />
              </div>
            </div>

            {/* Growth Rate Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Taxa de Crescimento</h4>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-full">
                  <TrendingUp className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {dashboardData.eleitoresStats.crescimento.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Crescimento em relação ao mês anterior
              </p>
            </div>

            {/* Birthday Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Aniversariantes do Dia
              </h3>
              <div className="flex items-center justify-center p-6">
                <div className="text-center">
                  <span role="img" aria-label="gift" className="text-4xl">🎁</span>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Nenhum aniversariante hoje
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}