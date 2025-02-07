import { useNavigate } from 'react-router-dom';
import { useCallback, useState, useEffect } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ExportarModal } from './components/ExportarModal';
import { FiltersModal } from './components/FiltersModal';
import { EleitoresTable } from './components/EleitoresTable';
import { EleitoresFilters } from './components/EleitoresFilters';
import { useEleitores } from '../../hooks/useEleitores';
import { useEleitorOptions } from '../../hooks/useEleitorOptions';
import { EleitorFilters, Eleitor } from '../../types/eleitor';
import { eleitorService } from '../../services/eleitorService';
import { useAuth } from '../../providers/AuthProvider';
import { CargoEnum } from '../../services/auth';
import { 
  Filter, 
  Search, 
  X, 
  Plus,
  FileSpreadsheet,
  Users, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  MoreVertical,
  UserPlus,
  BarChart2
} from 'lucide-react';

interface ActiveFiltersProps {
  filters: EleitorFilters;
  onFilterChange: (newFilters: any) => void;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filters, onFilterChange }) => {
  const labels: { [key: string]: string } = {
    genero: 'Gênero',
    zona: 'Zona',
    secao: 'Seção',
    bairro: 'Bairro',
    categoria: 'Categoria',
    logradouro: 'Logradouro',
    indicado: 'Indicado por',
    cep: 'CEP',
    responsavel: 'Responsável',
    cidade: 'Cidade'
  };
  const values: { [key: string]: { [key: string]: string } } = {
    genero: {
      'M': 'Masculino',
      'F': 'Feminino',
      'O': 'Outro'
    }
  };

  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (!value) return false;
    if (key === 'categoria_uid') {
      return typeof value === 'object' ? value.uid : value;
    }
    return true;
  });

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        <Filter className="h-4 w-4 mr-2" />
        <span>Filtros ativos:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {activeFilters.map(([key, value]) => {
          let displayValue = value;
          
          // Se for categoria, usa o nome ao invés do UID
          if (key === 'categoria_uid') {
            if (typeof value === 'object' && value.nome) {
              displayValue = value.nome;
            } else {
              // Se não tiver o objeto completo, usa o UID
              displayValue = value;
            }
          } else {
            displayValue = values[key]?.[value as string] || value;
          }
          
          return (
            <div
              key={key}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200 transition-all hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-800"
            >
              <span className="text-primary-500 dark:text-primary-400 font-semibold">
                {labels[key]}:
              </span>
              <span>{displayValue}</span>
              <button
                onClick={() => onFilterChange({ [key]: '' })}
                className="ml-1 p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full transition-colors group-hover:bg-primary-200/50 dark:group-hover:bg-primary-800/50"
                title="Remover filtro"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => {
            onFilterChange({
              nome: '',
              genero: '',
              zona: '',
              secao: '',
              bairro: '',
              categoria_id: undefined,
              logradouro: '',
              indicado: '',
              cep: '',
              responsavel: '',
              cidade: ''
            });
          }}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors hover:underline"
        >
          Limpar todos
        </button>
      </div>
    </div>
  );
};

interface Eleitor {
  id: number;
  uid: string;
  nome: string;
  cpf: string;
  whatsapp: string;
  bairro: string;
  cidade: string;
}

interface TableEleitor {
  id: number;
  uid: string;
  nome: string;
  cpf: string;
  whatsapp: string;
  bairro: string;
  cidade: string;
}

export function Eleitores() {
  const navigate = useNavigate();
  const company = useCompanyStore((state: { company: any }) => state.company);
  const { user } = useAuth();
  const isAdmin = user?.cargo === CargoEnum.ADMIN;
  const canExport = isAdmin && user?.nivel_acesso !== 'comum';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filters, setFilters] = useState<EleitorFilters>({
    nome: '',
    genero: '',
    zona: '',
    secao: '',
    bairro: '',
    categoria_id: undefined,
    logradouro: '',
    indicado: '',
    cep: '',
    responsavel: '',
    cidade: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isExportarModalOpen, setIsExportarModalOpen] = useState(false);
  const [selectedEleitores, setSelectedEleitores] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hooks para carregar os dados
  const { isLoading: isLoadingOptions } = useEleitorOptions();
  const loadEleitores = useCallback(async () => {
    if (!company?.uid) return;

    setIsLoading(true);
    try {
      const response = await eleitorService.list(
        company.uid,
        filters,
        currentPage,
        pageSize,
        user?.uid, // Passa o uid do usuário atual
        user?.nivel_acesso // Passa o nível de acesso
      );

      setEleitores(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Erro ao carregar eleitores:', error);
      toast.error('Erro ao carregar eleitores');
    } finally {
      setIsLoading(false);
    }
  }, [company?.uid, filters, currentPage, pageSize, user?.uid, user?.nivel_acesso]);

  const { 
    eleitores, 
    total,
    isLoading: isLoadingEleitores, 
    error: eleitoresError 
  } = useEleitores({ 
    filters, 
    page: currentPage,
    pageSize 
  });

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<EleitorFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Volta para a primeira página ao filtrar
  }, []);

  const handleSelectAllPages = useCallback(() => {
    // Aqui vamos buscar todos os IDs dos eleitores com os filtros atuais
    const fetchAllIds = async () => {
      if (!company?.uid) return;
      
      try {
        const allEleitores = await eleitorService.getAllIds(company.uid, filters);
        setSelectedEleitores(allEleitores.map(id => id?.toString() || '').filter(Boolean));
        setSelectAll(true);
      } catch (error) {
        console.error('Erro ao buscar todos os eleitores:', error);
      }
    };

    fetchAllIds();
  }, [company?.uid, filters]);

  const handleSelectAll = useCallback(() => {
    if (!eleitores) return;

    if (selectedEleitores.length === eleitores.length) {
      setSelectedEleitores([]);
      setSelectAll(false);
    } else {
      setSelectedEleitores(eleitores.map(e => e.id?.toString() || ''));
      setSelectAll(true);
    }
  }, [eleitores, selectedEleitores.length]);

  const handleSelectEleitor = useCallback((id: string) => {
    if (!id) return;
    
    setSelectedEleitores(prev => {
      const isSelected = prev.includes(id);
      if (isSelected) {
          setSelectAll(false);
        return prev.filter(selectedId => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const handleViewDetails = useCallback((eleitor: TableEleitor) => {
    if (!eleitor?.uid) return;
    navigate(`/app/eleitores/${eleitor.uid}`);
  }, [navigate]);

  // Effects
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (eleitoresError) {
      setConnectionError('Erro ao carregar eleitores. Por favor, tente novamente.');
    } else {
      setConnectionError(null);
    }
  }, [eleitoresError]);

  // Render
  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Erro de conexão</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{connectionError}</p>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Tentar novamente
            </button>
          </div>
        </div>
    </div>
    );
  }

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Filtros e Ações */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Título e Descrição */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-primary-600 mr-3" />
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:truncate">
                          Eleitores
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                          {total}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                        Gerencie sua base de eleitores de forma eficiente. Adicione, edite e organize todos os seus contatos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo de Botões */}
                <div className="hidden md:flex items-center gap-3">
                  {/* Botão Filtros */}
                  <button
                    onClick={() => setShowFilters(true)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {Object.values(filters).some(value => value) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        Ativos
                      </span>
                    )}
                  </button>

                  {/* Botão Exportar */}
                  <button
                    onClick={() => setIsExportarModalOpen(true)}
                    disabled={!canExport || selectedEleitores.length === 0}
                    className="inline-flex items-center gap-x-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canExport ? "Apenas administradores com nível de acesso diferente de 'comum' podem exportar" : selectedEleitores.length === 0 ? "Selecione pelo menos um eleitor para exportar" : ""}
                  >
                    <FileSpreadsheet className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                    {canExport ? 'Exportar' : 'Bloqueado'}
                    {selectedEleitores.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-primary-700 px-2 py-0.5 text-xs">
                        {selectedEleitores.length}
                      </span>
                    )}
                  </button>

                  {/* Botão Novo Eleitor */}
                  <button
                    onClick={() => navigate('/app/eleitores/novo')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-transparent text-sm font-medium text-white bg-primary-600 shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Eleitor
                  </button>
                </div>
              </div>

              {/* Filtros Ativos */}
              {Object.values(filters).some(value => value) && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <ActiveFilters filters={filters} onFilterChange={handleFilterChange} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full">
        <div className="mb-6">
          <EleitoresFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
        
        <div className="mb-20 md:mb-0">
          <EleitoresTable
            eleitores={eleitores?.map(e => ({
              id: Number(e.id),
              uid: e.uid,
              nome: e.nome || '',
              cpf: e.cpf || '',
              whatsapp: e.whatsapp || '',
              bairro: e.bairro || '',
              cidade: e.cidade || ''
            })) || []}
            isLoading={isLoadingEleitores}
            selectedEleitores={selectedEleitores}
            selectAll={selectAll}
            onSelectAll={handleSelectAll}
            onSelectAllPages={handleSelectAllPages}
            onSelectEleitor={handleSelectEleitor}
            onRowClick={handleViewDetails}
            totalEleitores={total || 0}
            setSelectedEleitores={setSelectedEleitores}
          />

          {/* Paginação */}
          <div className="mt-4 flex flex-col items-center md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            <div className="px-4 text-sm text-gray-700 dark:text-gray-300 text-center md:text-left">
              Mostrando {startIndex} até {endIndex} de {total} resultados
            </div>
            <div className="px-4 w-full flex justify-center md:w-auto md:justify-end">
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Primeira página</span>
                  <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Página anterior</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  aria-current="page"
                  className="relative z-10 inline-flex items-center bg-primary-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  {currentPage}
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={endIndex >= total}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Próxima página</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handlePageChange(Math.ceil(total / pageSize))}
                  disabled={endIndex >= total}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Última página</span>
                  <ChevronsRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>

        <ExportarModal
          isOpen={isExportarModalOpen}
          onClose={() => setIsExportarModalOpen(false)}
          selectedIds={selectedEleitores}
          filteredData={eleitores || []}
        />

        <FiltersModal
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFilterChange={handleFilterChange}
          isMobile={isMobile}
        />

        {/* Botão flutuante para novo atendimento (apenas mobile) */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <button
            onClick={() => navigate('/app/eleitores/novo')}
            className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Botão flutuante para mobile */}
        <div className="fixed bottom-6 right-6 flex flex-col items-end sm:hidden">
          {isMobileMenuOpen && (
            <div className="flex flex-col gap-3 mb-3 animate-slide-up">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsFilterOpen(true);
                }}
                className="h-10 pl-4 pr-5 bg-indigo-500 text-white rounded-full shadow-lg hover:bg-indigo-600 transition-all duration-200 flex items-center gap-2 group"
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/app/eleitores/novo');
                }}
                className="h-10 pl-4 pr-5 bg-sky-500 text-white rounded-full shadow-lg hover:bg-sky-600 transition-all duration-200 flex items-center gap-2 group"
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-sm font-medium">Novo Eleitor</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-14 w-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-200 flex items-center justify-center"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </button>
        </div>

        <FiltersModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  );
}