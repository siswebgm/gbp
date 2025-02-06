import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Filter, Download, Clock, CheckCircle, XCircle, Calendar, ChevronDown, ChevronUp, AlertCircle, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AttendanceTable } from './components/AttendanceTable';
import { useAtendimentos, AtendimentoStatus } from '../../hooks/useAtendimentos';
import { useCategories } from '../../hooks/useCategories';
import { useResponsaveis } from '../../hooks/useResponsaveis';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

export function AttendanceList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location as { state?: { searchTerm?: string; autoSearch?: boolean } };

  const { atendimentos, isLoading, error } = useAtendimentos();
  const { data: categorias } = useCategories();
  const { responsaveis } = useResponsaveis();
  const [selectedStatus, setSelectedStatus] = useState<AtendimentoStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(state?.searchTerm || '');
  const [filters, setFilters] = useState({
    categoria: '',
    indicado: '',
    cidade: '',
    bairro: '',
    logradouro: '',
    responsavel: '',
    dataInicio: '',
    dataFim: ''
  });

  const stats = useMemo(() => {
    if (!atendimentos) return {
      total: 0,
      pendentes: 0,
      emAndamento: 0,
      concluidos: 0,
      cancelados: 0
    };

    const total = atendimentos.length;
    const pendentes = atendimentos.filter(a => a.status === 'Pendente').length;
    const emAndamento = atendimentos.filter(a => a.status === 'Em Andamento').length;
    const concluidos = atendimentos.filter(a => a.status === 'Concluído').length;
    const cancelados = atendimentos.filter(a => a.status === 'Cancelado').length;

    // Calcula a porcentagem com base em uma escala mais suave
    // Usa uma base de 100 atendimentos como referência para 100%
    const BASE_SCALE = 100;
    const calculateProgress = (value: number) => Math.min(Math.round((value / BASE_SCALE) * 100), 100);

    return {
      total,
      pendentes,
      emAndamento,
      concluidos,
      cancelados,
      progressPendentes: calculateProgress(pendentes),
      progressEmAndamento: calculateProgress(emAndamento),
      progressConcluidos: calculateProgress(concluidos),
      progressCancelados: calculateProgress(cancelados)
    };
  }, [atendimentos]);

  const filteredAtendimentos = useMemo(() => {
    if (!atendimentos) return [];
    
    let filtered = atendimentos;
    
    // Filtrar por status se selecionado
    if (selectedStatus) {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }
    
    // Filtrar por termo de busca (UID ou nome do eleitor)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.gbp_eleitores?.uid?.toLowerCase().includes(searchLower) ||
        a.gbp_eleitores?.nome?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [atendimentos, selectedStatus, searchTerm]);

  const handleCardClick = (status: AtendimentoStatus | null) => {
    setSelectedStatus(prev => prev === status ? null : status);
    // Limpa o searchbox quando clicar no card Total
    if (status === null) {
      setSearchTerm('');
    }
  };

  const mapAttendanceToTimelineStep = (attendance: any): any => ({
    id: attendance.id.toString(),
    title: attendance.titulo || 'Atendimento',
    description: attendance.descricao,
    date: new Date(attendance.data_atendimento),
    status: getAttendanceStatus(attendance),
    reminder: attendance.lembrete ? new Date(attendance.lembrete) : undefined,
    whatsapp: attendance.eleitor?.whatsapp // Adicionando o número do WhatsApp
  });

  const handleExport = async () => {
    try {
      if (!filteredAtendimentos || filteredAtendimentos.length === 0) {
        toast.error('Não há atendimentos para exportar');
        return;
      }

      // Prepara os dados para exportação
      const dataToExport = filteredAtendimentos.map(atendimento => {
        return {
          'ID': atendimento.uid,
          'Título': atendimento.titulo || '',
          'Status': atendimento.status || '',
          'Categoria': atendimento.gbp_categorias?.nome || '',
          'Responsável': atendimento.gbp_usuarios?.nome || '',
          'Eleitor': atendimento.gbp_eleitores?.nome || '',
          'Descrição': atendimento.descricao || '',
          'Data do Atendimento': atendimento.data_atendimento ? new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR') : '',
          'Data de Criação': atendimento.created_at ? new Date(atendimento.created_at).toLocaleDateString('pt-BR') : '',
          'Cidade': atendimento.gbp_eleitores?.cidade || '',
          'Bairro': atendimento.gbp_eleitores?.bairro || '',
          'Logradouro': atendimento.gbp_eleitores?.logradouro || '',
          'Observações': atendimento.observacoes_count ? `${atendimento.observacoes_count} observação(ões)` : 'Nenhuma observação'
        };
      });

      // Cria uma nova planilha
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos');

      // Ajusta a largura das colunas
      const wscols = [
        { wch: 10 }, // ID
        { wch: 30 }, // Título
        { wch: 15 }, // Status
        { wch: 20 }, // Categoria
        { wch: 25 }, // Responsável
        { wch: 30 }, // Eleitor
        { wch: 50 }, // Descrição
        { wch: 15 }, // Data do Atendimento
        { wch: 15 }, // Data de Criação
        { wch: 25 }, // Cidade
        { wch: 25 }, // Bairro
        { wch: 40 }, // Logradouro
        { wch: 20 }, // Observações
      ];
      ws['!cols'] = wscols;

      // Gera o arquivo
      const fileName = `atendimentos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Atendimentos exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar atendimentos:', error);
      toast.error('Erro ao exportar atendimentos');
    }
  };

  useEffect(() => {
    if (state?.autoSearch && state?.searchTerm) {
      setSearchTerm(state.searchTerm);
      // Limpar o estado para não re-executar a busca em navegações futuras
      navigate('.', { replace: true, state: {} });
    }
  }, [state?.autoSearch, state?.searchTerm, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-20 md:pb-8">
      {/* Removendo max-w-7xl e ajustando padding para mobile */}
      <div className="w-full px-2 sm:px-6 lg:px-8">
        {/* Header com fundo branco */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 sm:mb-8">
          <div className="px-3 py-3 sm:px-6">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold leading-7 text-gray-900 dark:text-white sm:text-2xl sm:truncate">
                  Atendimentos
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  Gerencie todos os atendimentos em um só lugar
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Botão de filtro para desktop */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="hidden sm:inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Filter className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Filtros</span>
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4 ml-2" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-2" aria-hidden="true" />
                  )}
                </button>

                {/* Botão de exportar */}
                <button
                  type="button"
                  onClick={handleExport}
                  className="hidden sm:inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de filtro flutuante para mobile */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="fixed md:hidden bg-primary-500 text-white p-3 rounded-full shadow-lg hover:bg-primary-600 transition-all duration-200 right-4 bottom-8 z-50"
        >
          <Filter className="h-6 w-6" />
        </button>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Card Total */}
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 cursor-pointer transition-all duration-200 ${selectedStatus === null ? 'ring-2 ring-primary-500' : 'hover:border-primary-500 dark:hover:border-primary-500'}`}
            onClick={() => handleCardClick(null)}
          >
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <div className="mt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
                    <span className="text-sm text-primary-600 dark:text-primary-500">100%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2">
                    <div 
                      className="h-full bg-primary-500 rounded-full transition-all duration-300" 
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Pendentes */}
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 cursor-pointer transition-all duration-200 ${selectedStatus === 'Pendente' ? 'ring-2 ring-yellow-500' : 'hover:border-yellow-500 dark:hover:border-yellow-500'}`}
            onClick={() => handleCardClick('Pendente')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendentes</p>
                <div className="mt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pendentes}</p>
                    <span className="text-sm text-yellow-600 dark:text-yellow-500">{stats.progressPendentes}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2">
                    <div 
                      className="h-full bg-yellow-500 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.progressPendentes}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Em Andamento */}
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 cursor-pointer transition-all duration-200 ${selectedStatus === 'Em Andamento' ? 'ring-2 ring-blue-500' : 'hover:border-blue-500 dark:hover:border-blue-500'}`}
            onClick={() => handleCardClick('Em Andamento')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Em Andamento</p>
                <div className="mt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.emAndamento}</p>
                    <span className="text-sm text-blue-600 dark:text-blue-500">{stats.progressEmAndamento}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.progressEmAndamento}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Concluídos */}
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 cursor-pointer transition-all duration-200 ${selectedStatus === 'Concluído' ? 'ring-2 ring-green-500' : 'hover:border-green-500 dark:hover:border-green-500'}`}
            onClick={() => handleCardClick('Concluído')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Concluídos</p>
                <div className="mt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.concluidos}</p>
                    <span className="text-sm text-green-600 dark:text-green-500">{stats.progressConcluidos}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.progressConcluidos}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Cancelados */}
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 cursor-pointer transition-all duration-200 ${selectedStatus === 'Cancelado' ? 'ring-2 ring-red-500' : 'hover:border-red-500 dark:hover:border-red-500'}`}
            onClick={() => handleCardClick('Cancelado')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cancelados</p>
                <div className="mt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.cancelados}</p>
                    <span className="text-sm text-red-600 dark:text-red-500">{stats.progressCancelados}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.progressCancelados}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4">
            <div className="space-y-4">
              {/* Campo de busca */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por UID ou nome do eleitor..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Grid de filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Categoria */}
                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  <select
                    id="categoria"
                    value={filters.categoria}
                    onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                  >
                    <option value="">Todas</option>
                    {categorias?.map((categoria) => (
                      <option key={categoria.uid} value={categoria.uid}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Indicado */}
                <div>
                  <label htmlFor="indicado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Indicado por
                  </label>
                  <select
                    id="indicado"
                    value={filters.indicado}
                    onChange={(e) => setFilters({ ...filters, indicado: e.target.value })}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                  >
                    <option value="">Todos</option>
                    {/* Adicionar opções de indicados */}
                  </select>
                </div>

                {/* Cidade */}
                <div>
                  <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    id="cidade"
                    value={filters.cidade}
                    onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                    className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                    placeholder="Digite a cidade"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    id="bairro"
                    value={filters.bairro}
                    onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
                    className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                    placeholder="Digite o bairro"
                  />
                </div>

                {/* Logradouro */}
                <div>
                  <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    id="logradouro"
                    value={filters.logradouro}
                    onChange={(e) => setFilters({ ...filters, logradouro: e.target.value })}
                    className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                    placeholder="Digite o logradouro"
                  />
                </div>

                {/* Responsável */}
                <div>
                  <label htmlFor="responsavel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Responsável
                  </label>
                  <select
                    id="responsavel"
                    value={filters.responsavel}
                    onChange={(e) => setFilters({ ...filters, responsavel: e.target.value })}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                  >
                    <option value="">Todos os responsáveis</option>
                    {responsaveis?.map((responsavel) => (
                      <option key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Início */}
                <div>
                  <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Início
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="date"
                      id="dataInicio"
                      value={filters.dataInicio}
                      onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                      className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                    />
                  </div>
                </div>

                {/* Data Fim */}
                <div>
                  <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Fim
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="date"
                      id="dataFim"
                      value={filters.dataFim}
                      onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                      className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      categoria: '',
                      indicado: '',
                      cidade: '',
                      bairro: '',
                      logradouro: '',
                      responsavel: '',
                      dataInicio: '',
                      dataFim: ''
                    });
                    setShowFilters(false);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpar Filtros
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
          {isLoading ? (
            <div className="p-4 text-center">Carregando atendimentos...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">Erro ao carregar atendimentos: {error.message}</div>
          ) : filteredAtendimentos.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Calendar className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum atendimento encontrado</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Clique no botão "Novo Atendimento" para começar.
              </p>
            </div>
          ) : (
            <AttendanceTable atendimentos={filteredAtendimentos} />
          )}
        </div>
      </div>
    </div>
  );
}