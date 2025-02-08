import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  UserCheck, 
  CalendarCheck, 
  Book, 
  FileSpreadsheet, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  ChevronRight, 
  Gift, 
  Phone,
  CheckCircle,
  XCircle,
  MapPin,
  Info
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { useLastAccess } from '../../hooks/useLastAccess';
import { supabaseClient } from '../../lib/supabase';
import { cn } from '../../lib/utils';

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
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [loadingAniversariantes, setLoadingAniversariantes] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('dia'); // 'dia', 'semana', 'mes'
  const [detalhesAniversariante, setDetalhesAniversariante] = useState<any>(null);

  const estaNoPeridoSelecionado = useCallback((dataAniversario: Date) => {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const mesAtual = hoje.getMonth() + 1;
    const diaAniversario = dataAniversario.getDate();
    const mesAniversario = dataAniversario.getMonth() + 1;

    switch (periodoSelecionado) {
      case 'dia':
        return diaAniversario === diaAtual && mesAniversario === mesAtual;
      
      case 'semana': {
        // Pegar início e fim da semana atual
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(diaAtual - hoje.getDay()); // Domingo
        const fimSemana = new Date(hoje);
        fimSemana.setDate(diaAtual + (6 - hoje.getDay())); // Sábado
        
        return dataAniversario >= inicioSemana && dataAniversario <= fimSemana;
      }
      
      case 'mes':
        return mesAniversario === mesAtual;
      
      default:
        return false;
    }
  }, [periodoSelecionado]);

  // Função para carregar aniversariantes
  const loadAniversariantes = useCallback(async () => {
    if (!company?.uid) {
      console.log('Company UID não disponível');
      return;
    }

    try {
      setLoadingAniversariantes(true);
      
      const { data, error } = await supabaseClient
        .from('gbp_relatorio_niver')
        .select(`
          uid,
          created_at,
          eleitor_nome,
          eleitor_whatsapp,
          eleitor_bairro,
          eleitor_cidade,
          eleitor_uf,
          categoria,
          mensagem_tipo,
          mensagem_entregue,
          date_part
        `)
        .eq('empresa_uid', company.uid)
        .not('date_part', 'is', null)
        .order('date_part', { ascending: true });

      if (error) {
        console.error('Erro ao buscar aniversariantes:', error);
        throw error;
      }

      // Filtrar aniversariantes do período selecionado
      const aniversariantesFiltrados = data?.filter(registro => {
        if (!registro.date_part) return false;
        
        try {
          const dataPart = new Date(registro.date_part);
          return estaNoPeridoSelecionado(dataPart);
        } catch (err) {
          console.error('Erro ao processar data:', registro.date_part, err);
          return false;
        }
      }) || [];

      console.log('Aniversariantes encontrados:', {
        periodo: periodoSelecionado,
        quantidade: aniversariantesFiltrados.length,
        registros: aniversariantesFiltrados.map(a => ({
          nome: a.eleitor_nome,
          data: a.date_part,
          bairro: a.eleitor_bairro,
          cidade: a.eleitor_cidade
        }))
      });

      setAniversariantes(aniversariantesFiltrados);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
    } finally {
      setLoadingAniversariantes(false);
    }
  }, [company?.uid, estaNoPeridoSelecionado]);

  // Efeito para recarregar quando mudar o período
  useEffect(() => {
    loadAniversariantes();
  }, [loadAniversariantes, periodoSelecionado]);

  // Função para carregar os dados
  const loadDashboardData = useCallback(async () => {
    if (!company?.uid) {
      console.log('Company UID não disponível');
      return;
    }

    try {
      setLoadingAniversariantes(true);
      
      // Verificar autenticação
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Erro de autenticação:', sessionError);
        return;
      }

      console.log('Tentando carregar dados do dashboard para empresa:', {
        empresa_uid: company.uid,
        user_id: session.user.id,
        role: session.user.role
      });

      // Tentar buscar a empresa primeiro para confirmar acesso
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('uid, nome')
        .eq('uid', company.uid)
        .single();

      if (empresaError) {
        console.error('Erro ao verificar empresa:', empresaError);
        return;
      }

      console.log('Empresa verificada:', empresaData);

      // Agora buscar os dados do dashboard
      const { data, error } = await supabaseClient
        .from('gbp_dashboard')
        .select(`
          totalAtendimentos,
          totalEleitores,
          totalOficios,
          totalRequerimentos,
          totalProjetosLei,
          totalAgendamentos,
          atendimentosStats,
          eleitoresStats,
          oficiosStats,
          requerimentosStats,
          projetosLeiStats,
          agendamentosStats
        `)
        .eq('empresa_uid', company.uid);

      if (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        throw error;
      }

      console.log('Dados brutos:', {
        total: data?.length || 0,
        campos: data?.[0] ? Object.keys(data[0]) : [],
        amostra: data?.slice(0, 2)
      });

      // Filtrar dados do dashboard
      const dashboardDataFiltrado = data?.[0] || {};

      console.log('Dados do dashboard:', {
        data: dashboardDataFiltrado,
      });

      // Atualizar o estado com os dados do dashboard
      // setDashboardData(dashboardDataFiltrado);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoadingAniversariantes(false);
    }
  }, [company?.uid]);

  // Efeito para carregar os dados
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Subscription para atualizações em tempo real
  useRealtimeSubscription({
    table: 'gbp_relatorio_niver',
    onUpdate: () => {
      console.log('Atualização em tempo real recebida');
      loadAniversariantes();
    }
  });

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
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          )}
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
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm",
                  "bg-white hover:bg-gray-50 text-gray-900 rounded-lg border border-gray-200 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
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
                total={Number(dashboardData?.totalAtendimentos || 0)}
                icon={Users}
                color="text-blue-700"
                stats={dashboardData.atendimentosStats}
              />
              <StatCard
                title="Total de Eleitores"
                value={Number(dashboardData?.totalEleitores || 0)}
                total={Number(dashboardData?.totalEleitores || 0)}
                icon={Users}
                color="text-green-700"
                stats={dashboardData.eleitoresStats}
                footer={
                  <Link
                    to="/app/eleitores/relatorio"
                    className={cn(
                      "text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
                      "flex items-center gap-1"
                    )}
                  >
                    Ver detalhes
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                }
              />
              <StatCard
                title="Total de Ofícios"
                value={Number(dashboardData?.totalOficios || 0)}
                total={Number(dashboardData?.totalOficios || 0)}
                icon={FileText}
                color="text-yellow-700"
                stats={dashboardData.oficiosStats}
              />
              <StatCard
                title="Total de Requerimentos"
                value={Number(dashboardData?.totalRequerimentos || 0)}
                total={Number(dashboardData?.totalRequerimentos || 0)}
                icon={FileSpreadsheet}
                color="text-orange-700"
                stats={dashboardData.requerimentosStats}
              />
              <StatCard
                title="Total de Projetos"
                value={Number(dashboardData?.totalProjetosLei || 0)}
                total={Number(dashboardData?.totalProjetosLei || 0)}
                icon={BookOpen}
                color="text-purple-700"
                stats={dashboardData.projetosLeiStats}
              />
              <StatCard
                title="Total de Agendamentos"
                value={Number(dashboardData?.totalAgendamentos || 0)}
                total={Number(dashboardData?.totalAgendamentos || 0)}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Aniversariantes do {periodoSelecionado === 'dia' ? 'Dia' : 
                              periodoSelecionado === 'semana' ? 'Semana' : 'Mês'}
                  </h3>
                </div>
                {aniversariantes.length > 0 && (
                  <span className={cn(
                    "bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full",
                    "dark:bg-pink-900 dark:text-pink-300"
                  )}>
                    {aniversariantes.length}
                  </span>
                )}
              </div>

              {loadingAniversariantes ? (
                <div className="flex justify-center items-center p-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : aniversariantes.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {aniversariantes.map((aniversariante) => (
                    <div
                      key={aniversariante.uid}
                      className={cn(
                        "p-4 hover:bg-gray-50 transition-colors"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        {/* Informações Principais */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Coluna 1: Nome e Localização */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Gift className="w-5 h-5 text-pink-500" />
                              <span className="font-medium text-lg">{aniversariante.eleitor_nome}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {aniversariante.eleitor_bairro}
                                {aniversariante.eleitor_cidade && `, ${aniversariante.eleitor_cidade}`}
                              </span>
                            </div>
                          </div>

                          {/* Coluna 2: Contato e Status */}
                          <div className="space-y-2">
                            {/* WhatsApp */}
                            {aniversariante.eleitor_whatsapp && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{aniversariante.eleitor_whatsapp}</span>
                              </div>
                            )}
                            
                            {/* Status da Mensagem */}
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded text-sm w-fit",
                              aniversariante.mensagem_entregue === 'Sim' 
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            )}>
                              {aniversariante.mensagem_entregue === 'Sim' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span>Mensagem enviada com sucesso</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <span>Falha no envio da mensagem</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botão Ver Detalhes */}
                        <button
                          onClick={() => setDetalhesAniversariante(aniversariante)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                            "bg-blue-50 text-blue-700 hover:bg-blue-100",
                            "transition-colors duration-200"
                          )}
                        >
                          <Info className="w-4 h-4" />
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                  <Gift className="w-12 h-12 mb-2 text-gray-300" />
                  <p>Nenhum aniversariante {periodoSelecionado === 'dia' ? 'hoje' : 
                                    periodoSelecionado === 'semana' ? 'esta semana' : 'este mês'}</p>
                </div>
              )}
              <select
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
                className={cn(
                  "border rounded px-2 py-1 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "bg-white hover:bg-gray-50"
                )}
              >
                <option value="dia">Hoje</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mês</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {detalhesAniversariante && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden">
            {/* Cabeçalho */}
            <div className="bg-blue-50 p-6 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Gift className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-900">Detalhes do Registro</h3>
                </div>
                <button
                  onClick={() => setDetalhesAniversariante(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informações Pessoais */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Informações Pessoais</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{detalhesAniversariante.eleitor_nome}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">WhatsApp</p>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-600" />
                        {detalhesAniversariante.eleitor_whatsapp}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Localização</p>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        {detalhesAniversariante.eleitor_bairro}
                        {detalhesAniversariante.eleitor_cidade && `, ${detalhesAniversariante.eleitor_cidade}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações da Mensagem */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Informações da Mensagem</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Status</p>
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                        detalhesAniversariante.mensagem_entregue === 'Sim'
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {detalhesAniversariante.mensagem_entregue === 'Sim' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Enviada com sucesso</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Falha no envio</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Tipo</p>
                      <p className="font-medium">{detalhesAniversariante.mensagem_tipo}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Data</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {format(new Date(detalhesAniversariante.date_part), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {detalhesAniversariante.mensagem_comentario && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Comentário</p>
                        <p className="font-medium">{detalhesAniversariante.mensagem_comentario}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setDetalhesAniversariante(null)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}