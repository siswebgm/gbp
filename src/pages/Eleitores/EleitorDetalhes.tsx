import React, { useState, useRef, useEffect, Fragment, useCallback, FC } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, MapPin, Vote, Calendar, Mail, Edit, MessageCircle, 
  Pencil, Printer, Users, PlusSquare, Trash2, AlertTriangle, Tag,
  UserCircle, FileText, Calendar as CalendarIcon, Users2, UserRound,
  X, Save, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../../store/useCompanyStore';
import { supabaseClient } from '../../lib/supabase';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { CheckCircle, Clock, Hourglass, XCircle } from 'lucide-react';
import { toast } from "../../components/ui/use-toast";
import { DocumentosAnexados } from './components/DocumentosAnexados';

interface Eleitor {
  uid: string;
  nome: string;
  cpf: string;
  nascimento: string;
  genero: string;
  nome_mae: string;
  whatsapp: string;
  telefone: string;
  titulo: string;
  zona: string;
  secao: string;
  cep: string;
  logradouro: string;
  cidade: string;
  bairro: string;
  numero: string;
  complemento: string;
  uf: string;
  empresa_uid: string;
  created_at: string;
  indicado_uid: string;
  categoria_uid: string;
  usuario_uid: string;
  ax_rg_cnh: string | null;
  ax_cpf: string | null;
  ax_cert_nascimento: string | null;
  ax_titulo: string | null;
  ax_comp_residencia: string | null;
  ax_foto_3x4: string | null;
  gbp_indicado: {
    uid: string;
    nome: string;
  } | null;
  gbp_categorias: {
    uid: string;
    nome: string;
  } | null;
  responsavel: {
    uid: string;
    nome: string;
  } | null;
}

interface Atendimento {
  uid: string;
  eleitor_uid: string;
  empresa_uid: string;
  categoria_uid: string;
  descricao: string;
  data_atendimento: string;
  status: string;
  responsavel_uid: string;
  numero: number;
  created_at: string;
  gbp_categorias: {
    uid: string;
    nome: string;
  } | null;
  responsavel: {
    uid: string;
    nome: string;
  } | null;
  indicado: {
    uid: string;
    nome: string;
  } | null;
  observacoes: Array<{
    uid: string;
    observacao: string;
    created_at: string;
    responsavel: string;
    responsavel_nome?: string;
  }>;
}

type StatusType = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  'Pendente': {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <Clock className="w-4 h-4" />
  },
  'Em Andamento': {
    label: 'Em Andamento',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: <Hourglass className="w-4 h-4" />
  },
  'Concluído': {
    label: 'Concluído',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: <CheckCircle className="w-4 h-4" />
  },
  'Cancelado': {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: <XCircle className="w-4 h-4" />
  }
};

type QueryKey = ['eleitor', string] | ['atendimentos', string] | ['eleitores'];

interface ModalState {
  personalOpen: boolean;
  contactOpen: boolean;
  titleOpen: boolean;
  addressOpen: boolean;
  deleteOpen: boolean;
}

export const EleitorDetalhes: FC = () => {
  // 1. Hooks básicos
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);
  const contentRef = useRef<HTMLDivElement>(null);

  // 2. Estados
  const [atendimentoToDelete, setAtendimentoToDelete] = useState<Atendimento | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    personalOpen: false,
    contactOpen: false,
    titleOpen: false,
    addressOpen: false,
    deleteOpen: false
  });
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    nascimento: '',
    genero: '',
    nome_mae: '',
    whatsapp: '',
    telefone: '',
    titulo: '',
    zona: '',
    secao: '',
    cep: '',
    logradouro: '',
    cidade: '',
    bairro: '',
    numero: '',
    complemento: '',
    uf: ''
  });
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [expandedObservations, setExpandedObservations] = useState<{ [key: string]: boolean }>({});

  // 3. Extrair uid da URL
  const extractedUid = window.location.pathname.match(/\/eleitores\/([^/]+)/)?.[1];
  const effectiveUid = uid || extractedUid;

  // 4. Queries
  const { data: eleitor, isLoading, error } = useQuery({
    queryKey: ['eleitor', effectiveUid || '', company?.uid || ''] as const,
    queryFn: async () => {
      if (!effectiveUid || !company?.uid) {
        throw new Error('Parâmetros inválidos');
      }

      try {
        console.log('Buscando eleitor:', effectiveUid);
        const { data: eleitorData, error: eleitorError } = await supabaseClient
          .from('gbp_eleitores')
          .select(`
            *,
            gbp_indicado!indicado_uid (
              uid,
              nome
            ),
            gbp_categorias!categoria_uid (
              uid,
              nome
            )
          `)
          .eq('uid', effectiveUid)
          .eq('empresa_uid', company.uid)
          .single();

        if (eleitorError) {
          console.error('Erro na query do eleitor:', eleitorError);
          throw eleitorError;
        }
        if (!eleitorData) {
          console.log('Nenhum eleitor encontrado');
          return null;
        }

        // Buscar dados do responsável
        if (eleitorData.usuario_uid) {
          const { data: responsavelData, error: responsavelError } = await supabaseClient
            .from('gbp_usuarios')
            .select('uid, nome')
            .eq('uid', eleitorData.usuario_uid)
            .single();

          if (responsavelError) {
            console.error('Erro ao buscar responsável:', responsavelError);
          } else if (responsavelData) {
            eleitorData.responsavel = responsavelData;
          }
        }
        
        console.log('Eleitor encontrado:', eleitorData);
        return eleitorData as Eleitor;
      } catch (error) {
        console.error('Erro na query:', error);
        throw error;
      }
    },
    enabled: Boolean(effectiveUid && company?.uid)
  });

  // Query para buscar os atendimentos
  const { data: atendimentosData, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['atendimentos', effectiveUid || '', company?.uid || ''] as const,
    queryFn: async () => {
      if (!effectiveUid || !company?.uid) {
        throw new Error('Parâmetros inválidos');
      }

      try {
        console.log('Buscando atendimentos do eleitor:', effectiveUid);
        const { data: atendimentosData, error: atendimentosError } = await supabaseClient
          .from('gbp_atendimentos')
          .select(`
            *,
            gbp_categorias!categoria_uid (
              uid,
              nome
            )
          `)
          .eq('eleitor_uid', effectiveUid)
          .eq('empresa_uid', company.uid)
          .order('created_at', { ascending: false });

        if (atendimentosError) {
          console.error('Erro ao buscar atendimentos:', atendimentosError);
          throw atendimentosError;
        }

        // Buscar dados dos responsáveis, indicados e observações
        const atendimentosCompletos = await Promise.all(atendimentosData.map(async (atendimento) => {
          const atendimentoCompleto = { ...atendimento };

          // Buscar responsável
          if (atendimento.responsavel_uid) {
            const { data: responsavelData, error: responsavelError } = await supabaseClient
              .from('gbp_usuarios')
              .select('uid, nome')
              .eq('uid', atendimento.responsavel_uid)
              .single();

            if (responsavelError) {
              console.error('Erro ao buscar responsável:', responsavelError);
            } else if (responsavelData) {
              atendimentoCompleto.responsavel = responsavelData;
            }
          }

          // Buscar indicado
          if (atendimento.indicado_uid) {
            const { data: indicadoData, error: indicadoError } = await supabaseClient
              .from('gbp_indicado')
              .select('uid, nome')
              .eq('uid', atendimento.indicado_uid)
              .single();

            if (indicadoError) {
              console.error('Erro ao buscar indicado:', indicadoError);
            } else if (indicadoData) {
              atendimentoCompleto.indicado = indicadoData;
            }
          }

          // Buscar observações
          const { data: observacoesData, error: observacoesError } = await supabaseClient
            .from('gbp_observacoes')
            .select(`
              uid,
              observacao,
              created_at,
              responsavel,
              gbp_usuarios!responsavel (
                uid,
                nome
              )
            `)
            .eq('atendimento_uid', atendimento.uid)
            .eq('empresa_uid', company.uid)
            .order('created_at', { ascending: true });

          if (observacoesError) {
            console.error('Erro ao buscar observações:', observacoesError);
            atendimentoCompleto.observacoes = [];
          } else {
            atendimentoCompleto.observacoes = observacoesData.map(obs => ({
              ...obs,
              responsavel_nome: obs.gbp_usuarios?.nome || 'Sistema'
            })) || [];
          }

          return atendimentoCompleto;
        }));

        console.log('Atendimentos encontrados:', atendimentosCompletos);
        return atendimentosCompletos || [];
      } catch (error) {
        console.error('Erro na query de atendimentos:', error);
        throw error;
      }
    },
    enabled: Boolean(effectiveUid && company?.uid)
  });

  // Atualizar o estado local quando os dados chegarem
  useEffect(() => {
    if (atendimentosData) {
      setAtendimentos(atendimentosData);
    }
  }, [atendimentosData]);

  // 5. Effects
  useEffect(() => {
    console.log('Parâmetros da rota:', {
      uid,
      pathname: window.location.pathname,
      paramString: window.location.pathname.split('/').pop(),
      routeMatch: window.location.pathname.match(/\/eleitores\/([^/]+)/)?.[1]
    });
  }, [uid]);

  useEffect(() => {
    if (!eleitor) return;
    setFormData({
      nome: eleitor?.nome || '',
      cpf: eleitor?.cpf || '',
      nascimento: eleitor?.nascimento || '',
      genero: eleitor?.genero || '',
      nome_mae: eleitor?.nome_mae || '',
      whatsapp: eleitor?.whatsapp || '',
      telefone: eleitor?.telefone || '',
      titulo: eleitor?.titulo || '',
      zona: eleitor?.zona || '',
      secao: eleitor?.secao || '',
      cep: eleitor?.cep || '',
      logradouro: eleitor?.logradouro || '',
      cidade: eleitor?.cidade || '',
      bairro: eleitor?.bairro || '',
      numero: eleitor?.numero || '',
      complemento: eleitor?.complemento || '',
      uf: eleitor?.uf || ''
    });
  }, [eleitor]);

  // 6. Handlers
  const handleBack = () => navigate('/app/eleitores');
  const toggleModal = (modalKey: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalKey]: !prev[modalKey] }));
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleStatusChange = useCallback(async (atendimentoUid: string, newStatus: string) => {
    try {
      await supabaseClient
        .from('gbp_atendimentos')
        .update({ status: newStatus })
        .eq('uid', atendimentoUid);
      
      // Atualiza a lista de atendimentos
      const updatedAtendimentos = atendimentos.map(atendimento => 
        atendimento.uid === atendimentoUid 
          ? { ...atendimento, status: newStatus }
          : atendimento
      );
      setAtendimentos(updatedAtendimentos);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }, [atendimentos]);

  const handleSaveChanges = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "destructive",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          ...formData,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('personalOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Alterações salvas ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar"
      });
    }
  }, [eleitor?.uid, formData, company?.uid, toggleModal, effectiveUid]);

  const handleSaveContact = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "destructive",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          whatsapp: formData.whatsapp,
          telefone: formData.telefone,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('contactOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Contato atualizado ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar"
      });
    }
  }, [eleitor?.uid, formData.whatsapp, formData.telefone, company?.uid, toggleModal, effectiveUid]);

  const handleCepBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  }, []);

  const closeDeleteModal = useCallback(() => {
    setModalState(prev => ({ ...prev, deleteOpen: false }));
    setAtendimentoToDelete(null);
  }, []);

  const handleDeleteAtendimento = async () => {
    if (!atendimentoToDelete) return;

    try {
      const { error } = await supabaseClient
        .from('gbp_atendimentos')
        .delete()
        .eq('uid', atendimentoToDelete.uid);

      if (error) throw error;

      // Atualizar lista de atendimentos localmente
      setAtendimentos(prev => prev.filter(a => a.uid !== atendimentoToDelete.uid));
      toggleModal('deleteOpen');
      toast({
        description: "Atendimento excluído",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao excluir atendimento:', error);
      toast({
        variant: "destructive",
        description: "Erro ao excluir"
      });
    }
  };

  const handleDeleteObservation = async (atendimentoUid: string, observationUid: string) => {
    try {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }

      const { error } = await supabaseClient
        .from('gbp_observacoes')
        .delete()
        .match({ 
          uid: observationUid,
          empresa_uid: company.uid 
        });

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      // Atualizar a lista de atendimentos localmente
      setAtendimentos(prev => prev.map(atendimento => {
        if (atendimento.uid === atendimentoUid) {
          return {
            ...atendimento,
            observacoes: atendimento.observacoes.filter(obs => obs.uid !== observationUid)
          };
        }
        return atendimento;
      }));

      toast({
        description: "Observação excluída",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao excluir observação:', error);
      toast({
        variant: "destructive",
        description: "Erro ao excluir"
      });
    }
  };

  const handleSaveAddress = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "destructive",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          cep: formData.cep,
          logradouro: formData.logradouro,
          cidade: formData.cidade,
          bairro: formData.bairro,
          numero: formData.numero,
          complemento: formData.complemento,
          uf: formData.uf,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('addressOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Endereço atualizado ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar"
      });
    }
  }, [eleitor?.uid, formData, company?.uid, toggleModal, effectiveUid]);

  const handleSaveTitle = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "destructive",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          titulo: formData.titulo,
          zona: formData.zona,
          secao: formData.secao,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('titleOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Título atualizado ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar título:', error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar"
      });
    }
  }, [eleitor?.uid, formData.titulo, formData.zona, formData.secao, company?.uid, toggleModal, effectiveUid]);

  // 7. Renderização condicional
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Erro ao carregar dados do eleitor</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Tente novamente mais tarde</p>
          <button
            onClick={() => navigate('/app/eleitores')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  if (!eleitor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Eleitor não encontrado</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">O eleitor solicitado não foi encontrado</p>
          <button
            onClick={() => navigate('/app/eleitores')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  // 8. Renderização principal
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Componente de impressão */}
        <div className="print-content" style={{ display: 'none' }}>
          <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', width: '100%', margin: '0 auto' }}>
            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{eleitor?.nome || 'Eleitor não encontrado'}</h1>
            </div>
          </div>
        </div>

        <div className="print-container w-full">
          <div className="content w-full">
            {/* Header com nome e data de cadastro */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 w-full">
              <div className="w-full mx-auto px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => navigate('/app/eleitores')}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      title="Voltar para lista de eleitores"
                      aria-label="Voltar para lista de eleitores"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        {eleitor?.nome || 'Carregando...'}
                      </h1>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Cadastrado em {eleitor?.created_at ? format(new Date(eleitor.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                        </span>
                        <span className="hidden md:inline text-gray-300 dark:text-gray-600">•</span>
                        <span className="hidden md:inline text-sm text-gray-500 dark:text-gray-400">
                          por {eleitor?.responsavel?.nome || 'Nenhum'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botões de Ação - Visíveis apenas em desktop */}
                  <div className="hidden md:flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    {eleitor && (
                      <button
                        onClick={() => navigate(`/app/atendimentos/novo?eleitor=${effectiveUid}`)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <PlusSquare className="w-5 h-5 mr-2" />
                        Novo Atendimento
                      </button>
                    )}
                    <button
                      onClick={handlePrint}
                      className="hidden md:inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={contentRef} className="w-full mx-auto px-4 mt-6">
              {/* Grid Principal - Ajustado para usar todo o espaço */}
              <div className="grid grid-cols-1 gap-8 w-full">
                {/* Cards de Status - Ajustado para 4 colunas em telas grandes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {/* Card - Categoria */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categoria</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                          {eleitor.gbp_categorias?.nome || 'Sem categoria'}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Card - Atendimentos */}
                  <div 
                    onClick={() => {
                      navigate('/app/atendimentos', { 
                        state: { 
                          searchTerm: eleitor.uid,
                          autoSearch: true 
                        }
                      });
                    }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atendimentos</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white animate-pulse">
                          {atendimentos?.length || 0}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg animate-pulse">
                        <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Card - Indicação */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Indicado por</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                          {eleitor.gbp_indicado?.nome || 'Nenhum'}
                        </p>
                      </div>
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                        <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>

                  {/* Card - Responsável */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Responsável</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                          {eleitor.responsavel?.nome || 'Nenhum'}
                        </p>
                      </div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
                        <User className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção de Informações */}
                <div className="space-y-4 sm:space-y-6 w-full">
                  {/* Dados Pessoais */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Dados Pessoais</h2>
                        </div>
                        <button
                          onClick={() => toggleModal('personalOpen')}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar dados pessoais"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Nome Completo</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.nome}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">CPF</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.cpf || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Nascimento</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">
                              {eleitor.nascimento ? eleitor.nascimento.split('-').reverse().join('-') : '-'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Gênero</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.genero || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Nome da Mãe</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.nome_mae || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-green-50 dark:bg-green-900/50 rounded-lg">
                            <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Contato</h2>
                        </div>
                        <button
                          onClick={() => toggleModal('contactOpen')}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar contato"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">WhatsApp</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.whatsapp || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Telefone</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.telefone || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Título de Eleitor */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Título de Eleitor
                          </h2>
                        </div>
                        <button
                          onClick={() => toggleModal('titleOpen')}
                          className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center"
                          title="Editar título de eleitor"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-x-4 md:gap-y-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Título de Eleitor</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.titulo}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Zona</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.zona}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Seção</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.secao}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
                            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Endereço
                          </h2>
                        </div>
                        <button
                          onClick={() => toggleModal('addressOpen')}
                          className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center"
                          title="Editar endereço"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6">
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <div className="col-span-2 md:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Logradouro</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.logradouro}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Número</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.numero}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Complemento</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.complemento}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Bairro</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.bairro}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">CEP</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.cep}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Cidade</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.cidade}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">UF</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.uf}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DocumentosAnexados
                    ax_rg_cnh={eleitor?.ax_rg_cnh}
                    ax_cpf={eleitor?.ax_cpf}
                    ax_cert_nascimento={eleitor?.ax_cert_nascimento}
                    ax_titulo={eleitor?.ax_titulo}
                    ax_comp_residencia={eleitor?.ax_comp_residencia}
                    ax_foto_3x4={eleitor?.ax_foto_3x4}
                  />

                </div>

                {/* Histórico Completo de Atendimentos */}
                <div className="mb-4 md:mb-0">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
                          <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Atendimentos</h2>
                      </div>
                    </div>

                    {loadingAtendimentos ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                      </div>
                    ) : atendimentos.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900">
                          <MessageCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum atendimento</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Comece registrando o primeiro atendimento para este eleitor.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {atendimentos.map((atendimento) => (
                            <li key={atendimento.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <div className="px-4 md:px-6 py-4">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 hidden md:block">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                      <Tag className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              #{atendimento.numero}
                                            </span>
                                            <Menu as="div" className="relative inline-block text-left">
                                              <Menu.Button 
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfigs[atendimento.status as StatusType]?.color} transition-colors duration-150 ease-in-out hover:opacity-80`}
                                              >
                                                {statusConfigs[atendimento.status as StatusType]?.icon}
                                                <span className="ml-1.5">{atendimento.status}</span>
                                              </Menu.Button>
                                            </Menu>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setAtendimentoToDelete(atendimento);
                                              toggleModal('deleteOpen');
                                            }}
                                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            title="Excluir atendimento"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-x-4 md:gap-y-1 mt-2">
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">
                                              {format(new Date(atendimento.data_atendimento), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                          </div>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Tag className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">Categoria: {atendimento.gbp_categorias?.nome}</span>
                                          </div>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">Indicado: {atendimento.indicado?.nome || 'Nenhum'}</span>
                                          </div>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <User className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">Resp.: {atendimento.responsavel?.nome || 'Nenhum'}</span>
                                          </div>
                                        </div>
                                        {/* Descrição do Atendimento */}
                                        <div className="mt-3">
                                          <div className="flex items-start space-x-2">
                                            <MessageCircle className="flex-shrink-0 w-4 h-4 mt-0.5 text-gray-400" />
                                            <div className="flex-1">
                                              <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Descrição
                                              </span>
                                              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {atendimento.descricao || 'Sem descrição'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Observações do Atendimento */}
                                        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                                          <div className="flex items-start space-x-2">
                                            <FileText className="flex-shrink-0 w-4 h-4 mt-0.5 text-gray-400" />
                                            <div className="flex-1">
                                              <button
                                                onClick={() => setExpandedObservations(prev => ({
                                                  ...prev,
                                                  [atendimento.uid]: !prev[atendimento.uid]
                                                }))}
                                                className="w-full flex items-center justify-between p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group"
                                              >
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                  Observações ({atendimento.observacoes?.length || 0})
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                  <div className={`p-1 rounded-full bg-gray-100 dark:bg-gray-700 transform transition-transform ${
                                                    expandedObservations[atendimento.uid] ? 'rotate-180' : ''
                                                  }`}>
                                                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                                  </div>
                                                </div>
                                              </button>
                                              {expandedObservations[atendimento.uid] && atendimento.observacoes && atendimento.observacoes.length > 0 ? (
                                                <div className="mt-2 space-y-3">
                                                  {atendimento.observacoes.map((obs) => (
                                                    <div key={obs.uid} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                                      <div className="flex items-start space-x-3">
                                                        <div className="flex-shrink-0">
                                                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                                            <UserCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                          </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                          <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                              {obs.responsavel_nome}
                                                            </span>
                                                            <div className="flex items-center space-x-2">
                                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {format(new Date(obs.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                                              </span>
                                                              <button
                                                                onClick={() => handleDeleteObservation(atendimento.uid, obs.uid)}
                                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Excluir observação"
                                                              >
                                                                <Trash2 className="w-4 h-4" />
                                                              </button>
                                                            </div>
                                                          </div>
                                                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {obs.observacao}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : !expandedObservations[atendimento.uid] && atendimento.observacoes?.length > 0 ? (
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                  Clique para ver as observações
                                                </p>
                                              ) : (
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                  Nenhuma observação registrada
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botão flutuante de novo atendimento (apenas mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={() => navigate(`/app/atendimentos/novo?eleitor=${effectiveUid}`)}
          className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
          aria-label="Novo Atendimento"
        >
          <PlusSquare className="h-6 w-6" />
        </button>
      </div>

      {/* Modal de edição de dados pessoais */}
      <Transition appear show={modalState.personalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('personalOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <UserCircle className="w-6 h-6 mr-2.5 text-blue-500 flex-shrink-0" />
                      <span>Editar Dados Pessoais</span>
                    </Dialog.Title>
                    <button
                      onClick={() => toggleModal('personalOpen')}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* Nome Completo */}
                      <div className="flex flex-col">
                        <label htmlFor="nome" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          Nome Completo
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserCircle className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="nome"
                            name="nome"
                            value={formData.nome}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o nome completo"
                          />
                        </div>
                      </div>

                      {/* CPF e Nascimento */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="cpf" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            CPF
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="cpf"
                              name="cpf"
                              value={formData.cpf}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o CPF"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="nascimento" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Nascimento
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <CalendarIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="date"
                              id="nascimento"
                              name="nascimento"
                              value={formData.nascimento}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gênero e Nome da Mãe */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="genero" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Gênero
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Users2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                              id="genero"
                              name="genero"
                              value={formData.genero}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-10 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out appearance-none"
                            >
                              <option value="">Selecione o gênero</option>
                              <option value="M">Masculino</option>
                              <option value="F">Feminino</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="nome_mae" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Nome da Mãe
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <UserRound className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="nome_mae"
                              name="nome_mae"
                              value={formData.nome_mae}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o nome da mãe"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      onClick={() => toggleModal('personalOpen')}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      onClick={handleSaveChanges}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar alterações
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de contato */}
      <Transition appear show={modalState.contactOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('contactOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <Phone className="h-6 w-6 mr-2" />
                      Editar Contato
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => toggleModal('contactOpen')}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* WhatsApp */}
                      <div className="flex flex-col">
                        <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          WhatsApp
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MessageCircle className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="whatsapp"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o WhatsApp"
                          />
                        </div>
                      </div>

                      {/* Telefone */}
                      <div className="flex flex-col">
                        <label htmlFor="telefone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          Telefone
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="telefone"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o telefone"
                          />
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-row-reverse gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={handleSaveContact}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar alterações
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={() => toggleModal('contactOpen')}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de título de eleitor */}
      <Transition appear show={modalState.titleOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('titleOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <Vote className="h-6 w-6 mr-2" />
                      Editar Título de Eleitor
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => toggleModal('titleOpen')}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* Título de Eleitor */}
                      <div className="flex flex-col">
                        <label htmlFor="titulo" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          Título de Eleitor
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Vote className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="titulo"
                            name="titulo"
                            value={formData.titulo}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o título de eleitor"
                          />
                        </div>
                      </div>

                      {/* Zona e Seção */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="zona" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Zona
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="zona"
                              name="zona"
                              value={formData.zona}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite a zona"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="secao" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Seção
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="secao"
                              name="secao"
                              value={formData.secao}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite a seção"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-row-reverse gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={handleSaveTitle}
                      >
                        Salvar alterações
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={() => toggleModal('titleOpen')}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de endereço */}
      <Transition appear show={modalState.addressOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('addressOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <MapPin className="h-6 w-6 mr-2" />
                      Editar Endereço
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => toggleModal('addressOpen')}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* CEP */}
                      <div className="flex flex-col">
                        <label htmlFor="cep" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          CEP
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="cep"
                            name="cep"
                            value={formData.cep}
                            onChange={handleInputChange}
                            onBlur={handleCepBlur}
                            maxLength={9}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o CEP"
                          />
                        </div>
                      </div>

                      {/* Logradouro */}
                      <div className="flex flex-col">
                        <label htmlFor="logradouro" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          Logradouro
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="logradouro"
                            name="logradouro"
                            value={formData.logradouro}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o logradouro"
                          />
                        </div>
                      </div>

                      {/* Número e Complemento */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="numero" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Número
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="numero"
                              name="numero"
                              value={formData.numero}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o número"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="complemento" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Complemento
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="complemento"
                              name="complemento"
                              value={formData.complemento}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o complemento"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bairro */}
                      <div className="flex flex-col">
                        <label htmlFor="bairro" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                          Bairro
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="bairro"
                            name="bairro"
                            value={formData.bairro}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o bairro"
                          />
                        </div>
                      </div>

                      {/* Cidade e UF */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="cidade" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            Cidade
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="cidade"
                              name="cidade"
                              value={formData.cidade}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite a cidade"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="uf" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                            UF
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="uf"
                              name="uf"
                              value={formData.uf}
                              onChange={handleInputChange}
                              maxLength={2}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="UF"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-row-reverse gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={handleSaveAddress}
                      >
                        Salvar alterações
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={() => toggleModal('addressOpen')}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de Confirmação de Exclusão */}
      <Transition appear show={modalState.deleteOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('deleteOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                  <div className="relative">
                    {/* Cabeçalho */}
                    <div className="px-6 pt-6">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      
                      <Dialog.Title className="mt-4 text-lg font-semibold text-gray-900 dark:text-white text-center">
                        Excluir Atendimento
                      </Dialog.Title>
                    </div>

                    {/* Detalhes do Atendimento */}
                    <div className="px-6 mt-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Categoria
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {atendimentoToDelete?.gbp_categorias?.nome}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Data
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {atendimentoToDelete?.data_atendimento && format(new Date(atendimentoToDelete.data_atendimento), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Status
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusConfigs[atendimentoToDelete?.status as StatusType]?.color
                          }`}>
                            {statusConfigs[atendimentoToDelete?.status as StatusType]?.icon}
                            <span className="ml-1">{atendimentoToDelete?.status}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mensagem de Confirmação */}
                    <div className="px-6 py-4 mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Tem certeza que deseja excluir este atendimento?
                        <br />
                        <span className="font-medium">Esta ação não pode ser desfeita.</span>
                      </p>
                    </div>

                    {/* Botões */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        onClick={() => toggleModal('deleteOpen')}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        onClick={handleDeleteAtendimento}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
