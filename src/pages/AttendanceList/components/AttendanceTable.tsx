import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Pencil, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Clock as ClockIcon,
  Filter,
  Plus,
  FileText,
  Download,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAtendimentos, AtendimentoStatus } from '../../../hooks/useAtendimentos';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useToast } from '../../../hooks/useToast';
import { deleteAttendance } from '../../../services/attendance';
import { Dialog } from '../../../components/Dialog';
import { AttendanceTimeline } from './AttendanceTimeline';
import { AttendanceDrawer } from './AttendanceDrawer';
import ShareAtendimentoModal from '../../../components/ShareAtendimentoModal';
import { useAuthStore } from '../../../store/useAuthStore';

const statusConfig = {
  'Pendente': {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
  },
  'Em Andamento': {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: AlertCircle,
  },
  'Concluído': {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },
  'Cancelado': {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: XCircle,
  },
} as const;

interface AttendanceTableProps {
  atendimentos: any[];
}

export function AttendanceTable({ atendimentos }: AttendanceTableProps) {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { updateAtendimentoStatus, deleteAtendimento } = useAtendimentos();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<any>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [selectedTimelineAtendimento, setSelectedTimelineAtendimento] = useState<any>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(atendimentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = atendimentos.slice(startIndex, endIndex);
  const [atendimentoToDelete, setAtendimentoToDelete] = useState<any | null>(null);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [selectedAtendimentoToShare, setSelectedAtendimentoToShare] = useState<any | null>(null);
  const { user } = useAuthStore();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (atendimento: any) => {
    setSelectedAtendimento(atendimento);
    setDrawerOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, atendimento: any) => {
    e.stopPropagation();
    setAtendimentoToDelete(atendimento);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = async (uid: string, newStatus: AtendimentoStatus) => {
    try {
      await updateAtendimentoStatus.mutateAsync({ uid, status: newStatus });
      setOpenStatusMenu(null);
      toast.showToast({
        title: 'Status atualizado',
        description: 'O status do atendimento foi atualizado com sucesso',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.showToast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do atendimento',
        type: 'error',
      });
    }
  };

  const handleTimelineClick = (atendimento: any) => {
    setSelectedTimelineAtendimento(atendimento);
    setTimelineOpen(true);
  };

  const handleSetReminder = async (stepId: string, date: Date) => {
    try {
      // Aqui você implementaria a lógica para salvar o lembrete no backend
      toast.showToast({
        title: "Lembrete definido",
        description: "Você será notificado na data especificada",
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toast.showToast({
        title: "Erro ao definir lembrete",
        description: "Não foi possível definir o lembrete. Tente novamente.",
        type: "error",
        duration: 3000,
      });
    }
  };

  const getTimelineSteps = (atendimento: any) => {
    const parseDate = (dateStr: string | null | undefined): Date => {
      if (!dateStr) return new Date();
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date() : date;
    };

    const steps = [
      {
        id: '1',
        title: 'Atendimento Registrado',
        description: 'Novo atendimento registrado no sistema',
        date: parseDate(atendimento.created_at),
        status: 'completed' as const,
      },
      {
        id: '2',
        title: 'Em Análise',
        description: 'Atendimento está sendo analisado',
        date: parseDate(atendimento.updated_at),
        status: atendimento.status === 'Pendente' ? 'current' as const : 'completed' as const,
      },
      {
        id: '3',
        title: 'Em Andamento',
        description: 'Atendimento está sendo processado',
        date: parseDate(atendimento.prazo || atendimento.updated_at),
        status: atendimento.status === 'Em Andamento' ? 'current' as const : 
               atendimento.status === 'Pendente' ? 'upcoming' as const : 'completed' as const,
      },
      {
        id: '4',
        title: 'Conclusão',
        description: 'Atendimento finalizado',
        date: parseDate(atendimento.prazo || atendimento.updated_at),
        status: atendimento.status === 'Concluído' ? 'completed' as const : 
               isPast(parseDate(atendimento.prazo)) ? 'overdue' as const : 'upcoming' as const,
      },
    ];

    return steps;
  };

  const confirmDelete = async () => {
    if (!atendimentoToDelete) return;

    try {
      await deleteAtendimento.mutateAsync(atendimentoToDelete.uid);
      toast.showToast({
        title: 'Atendimento excluído',
        description: 'O atendimento foi excluído com sucesso',
        type: 'success',
      });
    } catch (error) {
      toast.showToast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o atendimento',
        type: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAtendimentoToDelete(null);
    }
  };

  const handleShare = (e: React.MouseEvent, atendimento: any) => {
    if (!atendimento?.uid) {
      console.error('Atendimento inválido:', atendimento);
      toast.showToast({
        title: 'Erro ao compartilhar',
        description: 'Não foi possível compartilhar este atendimento. Tente novamente.',
        type: 'error'
      });
      return;
    }

    e.stopPropagation();
    setSelectedAtendimentoToShare(atendimento);
    setOpenShareModal(true);
  };

  // Fecha o menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => setOpenStatusMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!atendimentos || atendimentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Clock className="h-12 w-12" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Nenhum atendimento encontrado</p>
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          Clique no botão "Novo Atendimento" para começar
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* View para Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Eleitor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Responsável
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Observações
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {currentItems.map((atendimento) => {
                const StatusIcon = statusConfig[atendimento.status as AtendimentoStatus]?.icon || AlertCircle;
                return (
                  <tr
                    key={atendimento.uid}
                    onClick={() => handleRowClick(atendimento)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (atendimento.eleitor_uid) {
                            navigate(`/app/eleitores/${atendimento.eleitor_uid}`);
                          }
                        }}
                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors duration-150"
                      >
                        {atendimento.gbp_eleitores?.nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {atendimento.gbp_usuarios?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {atendimento.gbp_categorias?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        {atendimento.observacoes_count || '0'} observações
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStatusMenu(openStatusMenu === atendimento.uid ? null : atendimento.uid);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[atendimento.status as AtendimentoStatus]?.color} hover:bg-opacity-80 transition-colors duration-150`}
                        >
                          <StatusIcon className="w-4 h-4 mr-1.5" />
                          {atendimento.status}
                          <ChevronDown className="w-4 h-4 ml-1.5" />
                        </button>
                        
                        {openStatusMenu === atendimento.uid && (
                          <div className="absolute z-10 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="py-1">
                              {Object.keys(statusConfig).map((status) => {
                                const Icon = statusConfig[status as AtendimentoStatus].icon;
                                return (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(atendimento.uid, status as AtendimentoStatus);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                                      status === atendimento.status
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${statusConfig[status as AtendimentoStatus].color.replace('bg-', 'text-')}`} />
                                    <span>{status}</span>
                                    {status === atendimento.status && (
                                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={(e) => handleShare(e, atendimento)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, atendimento)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* View para Mobile */}
        <div className="md:hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentItems.map((atendimento) => {
              const StatusIcon = statusConfig[atendimento.status as AtendimentoStatus]?.icon || AlertCircle;
              return (
                <div 
                  key={atendimento.uid} 
                  className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => handleRowClick(atendimento)}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {atendimento.gbp_eleitores?.nome || 'N/A'}
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[atendimento.status as AtendimentoStatus]?.color}`}>
                      <StatusIcon className="w-3.5 h-3.5 mr-1" />
                      {atendimento.status}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p><span className="font-medium">Responsável:</span> {atendimento.gbp_usuarios?.nome || 'N/A'}</p>
                    <p><span className="font-medium">Categoria:</span> {atendimento.gbp_categorias?.nome || 'N/A'}</p>
                    <p>
                      <span className="font-medium">Observações:</span>
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        {atendimento.observacoes_count || '0'}
                      </span>
                    </p>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={(e) => handleShare(e, atendimento)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, atendimento)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paginação */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          {/* Versão Mobile */}
          <div className="sm:hidden">
            <div className="flex flex-col space-y-3">
              <div className="text-sm text-gray-700 dark:text-gray-300 text-center">
                <span className="font-medium">{startIndex + 1}</span>-
                <span className="font-medium">{Math.min(endIndex, atendimentos.length)}</span> de{' '}
                <span className="font-medium">{atendimentos.length}</span>
              </div>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Próxima
                  <ChevronRight className="h-5 w-5 ml-1" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Versão Desktop */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
                <span className="font-medium">{Math.min(endIndex, atendimentos.length)}</span> de{' '}
                <span className="font-medium">{atendimentos.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Primeira</span>
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Próxima</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Última</span>
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Drawer de Detalhes */}
        <AttendanceDrawer
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedAtendimento(null);
          }}
          atendimento={selectedAtendimento}
        />

        {/* Diálogo de confirmação de exclusão */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setAtendimentoToDelete(null);
          }}
        >
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                Excluir atendimento
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={confirmDelete}
            >
              Excluir
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={() => {
                setDeleteDialogOpen(false);
                setAtendimentoToDelete(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </Dialog>

        {/* Modal de Compartilhamento */}
        {selectedAtendimentoToShare && (
          <ShareAtendimentoModal
            open={openShareModal}
            onClose={() => {
              setOpenShareModal(false);
              setSelectedAtendimentoToShare(null);
            }}
            atendimentoUid={selectedAtendimentoToShare.uid}
            empresaUid={company?.uid || ''}
            onPermissionChange={() => {
              // Atualizar a lista de atendimentos se necessário
            }}
          />
        )}
      </div>
    </>
  );
}