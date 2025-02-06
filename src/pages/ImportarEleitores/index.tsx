import { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, Trash2, Clock, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import { useCompanyStore } from '../../store/useCompanyStore';
import { supabaseClient } from '../../lib/supabase';
import { eleitoresService } from '../../services/eleitores';
import { createUploadHistory, refreshUploadHistory, updateUploadHistory } from '../../services/uploadHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as ExcelJS from 'exceljs';
import { useAuth } from '../../providers/AuthProvider';

interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  error: number;
  percent: number;
}

interface DeleteProgress {
  deleted: number;
  isDeleting: boolean;
}

interface CSVRow {
  nome: string;
  cpf: string;
  nascimento: string;
  whatsapp: string;
  telefone: string;
  genero: string;
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
  nome_mae: string;
}

export function ImportarEleitores() {
  const { user } = useAuth();
  const canAccess = user?.nivel_acesso !== 'comum';

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
  }, [canAccess]);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFileBlocked, setIsFileBlocked] = useState(false);

  const itemsPerPage = 5;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para converter data do formato DD/MM/YYYY para YYYY-MM-DD
  const formatarData = (textoData: string | null) => {
    if (!textoData) return null;
    
    // Verifica se já está no formato ISO
    if (textoData.match(/^\d{4}-\d{2}-\d{2}$/)) return textoData;
    
    // Converte do formato DD/MM/YYYY para YYYY-MM-DD
    const partes = textoData.split('/');
    if (partes.length !== 3) return null;
    
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    const ano = partes[2];
    
    // Validar data
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    if (isNaN(data.getTime())) return null;
    
    return `${ano}-${mes}-${dia}`;
  };

  // Função para limpar caracteres especiais mantendo apenas números
  const limparNumeros = (valor: string | null | undefined) => {
    if (!valor) return '';
    return valor.replace(/\D/g, '');
  };

  // Função para formatar CPF
  const formatarCPF = (valor: string | null | undefined) => {
    const limpo = limparNumeros(valor);
    if (!limpo) return '';
    // Garante que tenha 11 dígitos
    return limpo.padEnd(11, '0').slice(0, 11);
  };

  // Função para formatar WhatsApp/Telefone
  const formatarTelefone = (valor: string | null | undefined) => {
    const limpo = limparNumeros(valor);
    if (!limpo) return '';
    // Garante que tenha pelo menos 10 dígitos (DDD + número)
    return limpo.padEnd(11, '0').slice(0, 11);
  };

  const { company } = useCompanyStore();

  const buscarHistoricoUpload = async () => {
    try {
      setIsLoadingHistory(true);
      const { data, error } = await supabaseClient
        .from('gbp_upload_history')
        .select('*')
        .eq('status', 'success')
        .eq('empresa_id', company?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUploadHistory(data || []);
    } catch (erro) {
      console.error('Erro ao buscar histórico:', erro);
      toast.error('Erro ao carregar histórico de uploads');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      buscarHistoricoUpload();
    }
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await refreshUploadHistory(company.id);
        setUploadHistory(history);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        toast('Erro ao carregar histórico de importações', {
          type: 'error',
          duration: 4000
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();

    // Inscrever-se nas mudanças em tempo real
    const subscription = supabaseClient
      .channel('gbp_upload_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_upload_history',
          filter: `empresa_id=eq.${company.id}`
        },
        async (payload) => {
          console.log('Mudança detectada:', payload);
          await loadHistory();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [company?.id]);

  const verificarArquivoExiste = async (nomeArquivo: string, empresaId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_upload_history')
        .select('id, arquivo_nome, status')
        .eq('empresa_id', empresaId)
        .eq('arquivo_nome', nomeArquivo)
        .eq('status', 'success')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (erro) {
      console.error('Erro ao verificar arquivo:', erro);
      return false;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !company?.id) return;

      // Verificar se o arquivo já existe para esta empresa e foi processado com sucesso
      const fileExists = await verificarArquivoExiste(file.name, company.id);
      if (fileExists) {
        toast.error('Este arquivo já foi importado anteriormente. Não é possível importar o mesmo arquivo duas vezes.');
        event.target.value = ''; // Limpar input
        setIsFileBlocked(true); // Bloquear o botão de upload
        return;
      }

      setIsFileBlocked(false); // Liberar o botão se o arquivo for válido
      console.log('Mudança detectada:', file);
      setSelectedFile(file);
      setFileExists(true);

      // Primeiro, contar o total de linhas
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          const totalLinhas = results.data.length;
          setTotalRows(totalLinhas);
          
          console.log('=== INFORMAÇÕES DO ARQUIVO ===');
          console.log('Nome do arquivo:', file.name);
          console.log('Tamanho:', (file.size / 1024).toFixed(2), 'KB');
          console.log('Total de linhas:', totalLinhas);
          console.log('Headers encontrados:', results.meta.fields);
          
          // Mostrar prévia das 3 primeiras linhas
          const previewData = results.data.slice(0, 3);
          setPreviewData(previewData);
          
          console.log(`\n=== PRÉVIA (${Math.min(3, totalLinhas)} de ${totalLinhas} linhas) ===`);
          previewData.forEach((row, index) => {
            console.log(`\nLinha ${index + 1}:`, row);
          });
        },
        error: function(error) {
          console.error('Erro ao ler arquivo:', error);
          toast.error('Erro ao ler arquivo');
        }
      });
    } catch (erro) {
      console.error('Erro ao processar arquivo:', erro);
      toast.error('Erro ao processar arquivo. Tente novamente.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !company?.id) return;

    try {
      setIsUploading(true);
      console.log('=== INICIANDO UPLOAD ===');
      console.log('Arquivo:', selectedFile.name);

      // Verificar novamente se o arquivo já existe (dupla verificação)
      const fileExists = await verificarArquivoExiste(selectedFile.name, company.id);
      if (fileExists) {
        toast.error('Este arquivo já foi importado anteriormente. Não é possível importar o mesmo arquivo duas vezes.');
        resetAllStates();
        return;
      }

      // Primeiro, criar o registro na tabela de histórico
      const { data: uploadHistory, error: historyError } = await supabaseClient
        .from('gbp_upload_history')
        .insert({
          empresa_id: company.id,
          arquivo_nome: selectedFile.name,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (historyError) throw historyError;

      if (!uploadHistory?.id) {
        throw new Error('Falha ao criar registro de upload');
      }

      console.log('Upload history criado:', uploadHistory);

      // Processar o arquivo CSV
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
          try {
            console.log('=== PROCESSANDO CSV ===');
            console.log('Total de linhas:', results.data.length);
            console.log('Headers encontrados:', results.meta.fields);
            console.log('Amostra primeira linha:', results.data[0]);

            setProgress(prev => ({ ...prev, total: results.data.length }));

            const eleitores = results.data.map((row: any, index: number) => {
              // Log detalhado apenas para as primeiras 2 linhas
              const shouldLog = index < 2;
              
              if (shouldLog) {
                console.log(`\n=== Processando linha ${index + 1} ===`);
                console.log('Dados originais:', row);
              }

              // Remover campos que não devem ser inseridos
              const { id, ...rest } = row;

              // Normalizar nomes das colunas (remover espaços, acentos, etc)
              const normalizedRow = Object.entries(rest).reduce((acc: any, [key, value]) => {
                const normalizedKey = key
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')
                  .trim();
                acc[normalizedKey] = value;
                return acc;
              }, {});

              if (shouldLog) {
                console.log('Dados normalizados:', normalizedRow);
              }

              // Mapear apenas os campos permitidos
              const mappedData = {
                nome: normalizedRow.nome || '',
                cpf: formatarCPF(normalizedRow.cpf),
                nascimento: formatarData(normalizedRow.nascimento || normalizedRow.data_nascimento),
                whatsapp: formatarTelefone(normalizedRow.whatsapp || normalizedRow.celular || normalizedRow.telefone_celular),
                telefone: formatarTelefone(normalizedRow.telefone || normalizedRow.fone || normalizedRow.telefone_fixo),
                genero: normalizedRow.genero || normalizedRow.sexo || '',
                titulo: normalizedRow.titulo || normalizedRow.titulo_eleitor || normalizedRow.titulo_eleitoral || '',
                zona: normalizedRow.zona || normalizedRow.zona_eleitoral || '',
                secao: normalizedRow.secao || normalizedRow.secao_eleitoral || '',
                cep: limparNumeros(normalizedRow.cep),
                logradouro: normalizedRow.logradouro || normalizedRow.endereco || normalizedRow.rua || '',
                cidade: normalizedRow.cidade || normalizedRow.municipio || '',
                bairro: normalizedRow.bairro || '',
                numero: normalizedRow.numero || normalizedRow.num || normalizedRow.numero_casa || '',
                complemento: normalizedRow.complemento || '',
                uf: normalizedRow.uf || normalizedRow.estado || '',
                nome_mae: normalizedRow.nome_mae || normalizedRow.mae || normalizedRow.nome_da_mae || '',
                empresa_id: company.id,
                upload_id: uploadHistory.id,
                created_at: new Date().toISOString()
              };

              if (shouldLog) {
                console.log('Dados mapeados:', mappedData);
              }

              return mappedData;
            });

            console.log('\n=== RESUMO DO PROCESSAMENTO ===');
            console.log('Total de registros:', eleitores.length);
            console.log('Exemplo do primeiro registro:', eleitores[0]);

            // Inserir os eleitores em lotes de 100
            const batchSize = 100;
            let processedCount = 0;

            for (let i = 0; i < eleitores.length; i += batchSize) {
              const batch = eleitores.slice(i, i + batchSize);

              const { error: insertError } = await supabaseClient
                .from('gbp_eleitores')
                .insert(batch);

              if (insertError) throw insertError;

              processedCount += batch.length;
              const percent = Math.round((processedCount / eleitores.length) * 100);
              
              setProgress(prev => ({
                ...prev,
                processed: processedCount,
                total: eleitores.length,
                percent
              }));
            }

            // Atualizar status do upload
            const { error: updateError } = await supabaseClient
              .from('gbp_upload_history')
              .update({
                status: 'success',
                registros_total: eleitores.length,
                registros_processados: eleitores.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', uploadHistory.id);

            if (updateError) {
              console.error('Erro ao atualizar status:', updateError);
              // Não vamos lançar o erro aqui, pois os dados já foram inseridos com sucesso
              toast.warning('Os dados foram importados, mas houve um erro ao atualizar o status.');
            } else {
              toast.success('Upload concluído com sucesso!');
            }
            
            // Limpar todos os estados após sucesso
            await resetAllStates();

          } catch (error: any) {
            console.error('Erro ao processar arquivo:', error);
            let errorMessage = 'Erro desconhecido ao processar arquivo';
            
            if (error instanceof Error) {
              errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
              errorMessage = 'Erro ao processar arquivo. Verifique os dados e tente novamente.';
            }
            
            // Atualizar status do upload para erro
            const { error: updateError } = await supabaseClient
              .from('gbp_upload_history')
              .update({
                status: 'error',
                erro_mensagem: errorMessage,
                registros_total: 0,
                registros_processados: 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', uploadHistory.id);

            if (updateError) {
              console.error('Erro ao atualizar status:', updateError);
            }

            toast.error(errorMessage);
            
            // Limpar estados mesmo em caso de erro
            await resetAllStates();
          }
        },
        error: function(error) {
          console.error('Erro ao fazer parse do CSV:', error);
          setIsUploading(false);
          toast(`Erro ao ler arquivo: ${error.message}`, {
            type: 'error',
            duration: 4000
          });
        }
      });
    } catch (error: any) {
      console.error('Erro ao iniciar upload:', error);
      setIsUploading(false);
      toast(`Erro ao iniciar upload: ${error.message}`, {
        type: 'error',
        duration: 4000
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedHistory || !company?.id) return;
    
    try {
      setIsDeleting(true);
      console.log('Iniciando exclusão do upload:', {
        upload_id: selectedHistory.id,
        empresa_id: company.id
      });

      // Buscar os eleitores deste upload
      const { data: eleitores, error: selectError } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('upload_id', selectedHistory.id)
        .eq('empresa_id', company.id);

      if (selectError) throw selectError;

      console.log(`Encontrados ${eleitores?.length || 0} eleitores para mover`);

      if (eleitores && eleitores.length > 0) {
        // Atualizar o progresso inicial
        setProgress({
          total: eleitores.length,
          processed: 0,
          success: 0,
          percent: 0
        });

        // Preparar os registros para a tabela de deletados
        const registrosParaDeletar = eleitores.map(eleitor => {
          // Remover o id e manter apenas os campos necessários
          const { id, ...rest } = eleitor;
          return {
            nome: rest.nome || '',
            cpf: rest.cpf || '',
            nascimento: formatarData(rest.nascimento),
            whatsapp: rest.whatsapp || '',
            telefone: rest.telefone || '',
            genero: rest.genero || '',
            titulo: rest.titulo || '',
            zona: rest.zona || '',
            secao: rest.secao || '',
            cep: rest.cep || '',
            logradouro: rest.logradouro || '',
            cidade: rest.cidade || '',
            bairro: rest.bairro || '',
            numero: rest.numero || '',
            complemento: rest.complemento || '',
            uf: rest.uf || '',
            nome_mae: rest.nome_mae || '',
            empresa_id: rest.empresa_id,
            upload_id: rest.upload_id,
            created_at: new Date().toISOString()
          };
        });

        console.log('Movendo eleitores para tabela de deletados...', {
          quantidade: registrosParaDeletar.length,
          amostra: registrosParaDeletar[0]
        });

        // Atualizar progresso - 33%
        setProgress(prev => ({
          ...prev!,
          processed: Math.floor(eleitores.length * 0.33),
          success: Math.floor(eleitores.length * 0.33),
          percent: 33
        }));

        // Inserir na tabela de deletados
        const { error: insertError } = await supabaseClient
          .from('gbp_deletados')
          .insert(registrosParaDeletar);

        if (insertError) throw insertError;

        // Atualizar progresso - 66%
        setProgress(prev => ({
          ...prev!,
          processed: Math.floor(eleitores.length * 0.66),
          success: Math.floor(eleitores.length * 0.66),
          percent: 66
        }));

        console.log('Removendo eleitores da tabela principal...');

        // Remover da tabela de eleitores
        const { error: deleteError } = await supabaseClient
          .from('gbp_eleitores')
          .delete()
          .eq('upload_id', selectedHistory.id)
          .eq('empresa_id', company.id);

        if (deleteError) throw deleteError;

        // Atualizar progresso - 100%
        setProgress(prev => ({
          ...prev!,
          processed: eleitores.length,
          success: eleitores.length,
          percent: 100
        }));

        // Atualizar o status do upload
        const { error: updateError } = await supabaseClient
          .from('gbp_upload_history')
          .update({
            status: 'error',
            erro_mensagem: 'Upload excluído pelo usuário',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedHistory.id)
          .eq('empresa_id', company.id);

        if (updateError) {
          console.error('Erro ao atualizar status do upload:', updateError);
          throw updateError;
        }

        console.log('Processo concluído com sucesso!');
        toast.success(`${eleitores.length} eleitores foram movidos para a tabela de deletados`);
      } else {
        console.log('Nenhum eleitor encontrado para este upload');
        toast.warning('Nenhum eleitor encontrado para mover');
      }
    } catch (error: any) {
      console.error('Erro ao excluir upload:', error);
      toast.error('Erro ao excluir upload. Por favor, tente novamente.');
      
      // Atualizar o progresso para indicar erro
      setProgress(prev => prev ? {
        ...prev,
        error: prev.total - prev.success,
        percent: Math.round((prev.success / prev.total) * 100)
      } : null);
    } finally {
      // Resetar os estados após concluir (com sucesso ou erro)
      setTimeout(() => {
        setIsDeleting(false);
        setIsDeleteModalOpen(false);
        setSelectedHistory(null);
        setProgress(null);
      }, 1000); // Pequeno delay para mostrar o progresso final
    }
  };

  const handleDelete = async (history: any) => {
    setSelectedHistory(history);
    setIsDeleteModalOpen(true);
    // Resetar o progresso ao abrir o modal
    setProgress({
      total: 0,
      processed: 0,
      success: 0,
      error: 0,
      percent: 0
    });
  };

  const handleDeleteByHistory = async (historyId: number) => {
    if (!company) return;

    const history = uploadHistory.find(h => h.id === historyId);
    if (!history) return;

    const toastId = toast.loading(
      <div className="space-y-4">
        <div className="font-medium text-red-600">Atenção!</div>
        <div>
          Você está prestes a excluir os eleitores importados em{' '}
          {format(
            new Date(history.created_at),
            "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
            { locale: ptBR }
          )}
        </div>
        <div className="text-sm text-gray-600">
          <div>Arquivo: {history.arquivo_nome}</div>
          <div>Quantidade: {history.registros_processados} eleitores</div>
        </div>
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(toastId);
              handleDeleteByHistoryConfirmed(historyId);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sim, excluir
          </button>
          <button
            onClick={() => toast.dismiss(toastId)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>,
      { duration: 10000 }
    );
  };

  const handleDeleteByHistoryConfirmed = async (historyId: number) => {
    try {
      setDeleteProgress(prev => ({ ...prev, isDeleting: true }));

      const history = uploadHistory.find(h => h.id === historyId);
      if (!history) return;

      // Buscar contagem de eleitores
      const { count } = await supabaseClient
        .from('gbp_eleitores')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', company.id)
        .eq('upload_id', historyId);

      if (!count) {
        confirmDeleteHistoryOnly(history);
        setDeleteProgress(prev => ({ ...prev, isDeleting: false }));
        return;
      }

      toast.loading(
        `Iniciando processo de exclusão de ${count} eleitores...`,
        { duration: 2000 }
      );

      // Primeiro, buscar os registros que serão movidos (sem o campo id)
      const { data: registrosParaMover, error: selectError } = await supabaseClient
        .from('gbp_eleitores')
        .select('nome, cpf, nascimento, whatsapp, telefone, genero, titulo, zona, secao, cep, logradouro, cidade, bairro, numero, complemento, empresa_id, indicado, uf, categoria, gbp_atendimentos, responsavel, latitude, longitude, nome_mae, upload_id')
        .eq('empresa_id', company.id)
        .eq('upload_id', historyId);

      if (selectError) throw selectError;
      if (!registrosParaMover) throw new Error('Nenhum registro encontrado');

      // Inserir na tabela de deletados
      const { error: insertError } = await supabaseClient
        .from('gbp_deletados')
        .insert(registrosParaMover);

      if (insertError) throw insertError;

      // Deletar da tabela principal
      const { error: deleteError } = await supabaseClient
        .from('gbp_eleitores')
        .delete()
        .eq('empresa_id', company.id)
        .eq('upload_id', historyId);

      if (deleteError) throw deleteError;

      // Atualizar o status do histórico para deleted
      try {
        await refreshUploadHistory(company.id);
      } catch (error) {
        console.error('Erro ao atualizar status do histórico:', error);
        toast('Os registros foram excluídos, mas houve um erro ao atualizar o status do histórico.', {
          type: 'warning',
          duration: 4000
        });
      }

      // Atualizar lista de histórico
      const updatedHistory = await refreshUploadHistory(company.id);
      setUploadHistory(updatedHistory);

      toast('Operação concluída com sucesso! ' + count + ' registros foram excluídos.', {
        type: 'success',
        duration: 3000
      });

    } catch (error) {
      console.error('Erro ao excluir registros:', error);
      toast('Ocorreu um erro ao excluir os registros. Por favor, tente novamente.', {
        type: 'error',
        duration: 4000
      });
    } finally {
      setDeleteProgress({
        deleted: 0,
        isDeleting: false
      });
    }
  };

  const handleDeleteHistoryOnly = async (history: any) => {
    try {
      console.log('Tentando atualizar histórico:', {
        id: history.id,
        empresa_id: company?.id,
        history: history
      });

      if (!history?.id) {
        throw new Error('ID do histórico não fornecido');
      }

      if (!company?.id) {
        throw new Error('ID da empresa não disponível');
      }

      // Primeiro, buscar os registros que serão movidos
      const { data: registrosParaMover, error: selectError } = await supabaseClient
        .from('gbp_eleitores')
        .select('nome, cpf, nascimento, whatsapp, telefone, genero, titulo, zona, secao, cep, logradouro, cidade, bairro, numero, complemento, empresa_id, indicado, uf, categoria, gbp_atendimentos, responsavel, latitude, longitude, nome_mae, upload_id')
        .eq('empresa_id', company.id)
        .eq('upload_id', history.id);

      if (selectError) {
        console.error('Erro ao buscar registros para mover:', selectError);
        throw selectError;
      }

      if (registrosParaMover && registrosParaMover.length > 0) {
        // Inserir na tabela de deletados
        const { error: insertError } = await supabaseClient
          .from('gbp_deletados')
          .insert(registrosParaMover);

        if (insertError) {
          console.error('Erro ao inserir na tabela de deletados:', insertError);
          throw insertError;
        }

        // Deletar da tabela principal
        const { error: deleteError } = await supabaseClient
          .from('gbp_eleitores')
          .delete()
          .eq('empresa_id', company.id)
          .eq('upload_id', history.id);

        if (deleteError) {
          console.error('Erro ao deletar registros:', deleteError);
          throw deleteError;
        }
      }

      // Atualizar o status do histórico
      const updateData = {
        status: 'error' as const,
        erro_mensagem: 'Registro marcado como excluído pelo usuário',
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseClient
        .from('gbp_upload_history')
        .update(updateData)
        .eq('id', history.id)
        .eq('empresa_id', company.id);

      if (updateError) {
        console.error('Erro ao atualizar histórico:', updateError);
        throw updateError;
      }

      // Atualizar a lista de histórico
      const updatedHistory = await refreshUploadHistory(company.id);
      setUploadHistory(updatedHistory);

      const mensagem = registrosParaMover?.length 
        ? `${registrosParaMover.length} eleitores foram movidos para a tabela de deletados`
        : 'Nenhum eleitor encontrado para mover';

      toast('Operação concluída com sucesso! ' + mensagem, {
        type: 'success',
        duration: 3000
      });
    } catch (error: any) {
      console.error('Erro detalhado ao atualizar histórico:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error: error
      });
      
      toast(`Erro ao processar a exclusão: ${error.message || 'Erro desconhecido'}`, {
        type: 'error',
        duration: 4000
      });
    }
  };

  const confirmDeleteHistoryOnly = (history: any) => {
    if (!history) return;

    const toastId = toast(
      <div className="space-y-4">
        <div className="font-medium text-red-600">Atenção!</div>
        <div>
          Não foram encontrados registros para excluir. Deseja ocultar este histórico?
        </div>
        <div className="text-sm text-gray-600">
          <div>Arquivo: {history.arquivo_nome}</div>
          <div>Data: {format(
            new Date(history.created_at),
            "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
            { locale: ptBR }
          )}</div>
        </div>
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(toastId);
              handleDeleteHistoryOnly(history);
            }}
            className="text-red-600 hover:text-red-900"
          >
            Sim, ocultar histórico
          </button>
          <button
            onClick={() => toast.dismiss(toastId)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>,
      { duration: Infinity }
    );
  };

  const handleRemoveFile = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmRemoveFile = async () => {
    try {
      setIsDeleting(true);
      
      // Simular progresso de exclusão
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 100);
        setProgress(prev => ({
          ...prev,
          processed: progress,
          total: 100,
          percent: progress
        }));
        
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 200);
      
      // Limpar estados
      setSelectedFile(null);
      setPreviewData([]);
      setTotalRows(0);
      
      // Resetar o input file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Limpar intervalo e fechar modal
      clearInterval(progressInterval);
      setIsDeleteModalOpen(false);
      setIsDeleting(false);
      setProgress({ processed: 0, total: 0, percent: 0 });
      
      toast.success('Arquivo removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      toast.error('Erro ao remover arquivo');
      setIsDeleting(false);
      setProgress({ processed: 0, total: 0, percent: 0 });
    }
  };

  const handleDownloadTemplate = () => {
    // Criar workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Modelo');

    // Definir colunas baseadas na estrutura da tabela gbp_eleitores
    worksheet.columns = [
      { header: 'nome', key: 'nome', width: 30 },
      { header: 'cpf', key: 'cpf', width: 15 },
      { header: 'nascimento', key: 'nascimento', width: 15 },
      { header: 'whatsapp', key: 'whatsapp', width: 15 },
      { header: 'telefone', key: 'telefone', width: 15 },
      { header: 'genero', key: 'genero', width: 10 },
      { header: 'titulo', key: 'titulo', width: 15 },
      { header: 'zona', key: 'zona', width: 10 },
      { header: 'secao', key: 'secao', width: 10 },
      { header: 'cep', key: 'cep', width: 10 },
      { header: 'logradouro', key: 'logradouro', width: 30 },
      { header: 'cidade', key: 'cidade', width: 20 },
      { header: 'bairro', key: 'bairro', width: 20 },
      { header: 'numero', key: 'numero', width: 10 },
      { header: 'complemento', key: 'complemento', width: 20 },
      { header: 'uf', key: 'uf', width: 5 },
      { header: 'nome_mae', key: 'nome_mae', width: 30 },
      { header: 'categoria', key: 'categoria', width: 20 },
      { header: 'responsavel', key: 'responsavel', width: 30 },
      { header: 'indicado', key: 'indicado', width: 30 }
    ];

    // Estilizar cabeçalho
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
    });

    // Adicionar linhas de exemplo
    const exampleRows = [
      {
        nome: 'João da Silva',
        cpf: '12345678900',
        nascimento: '01/01/1990',
        whatsapp: '11987654321',
        telefone: '1133333333',
        genero: 'M',
        titulo: '123456789012',
        zona: '123',
        secao: '456',
        cep: '12345678',
        logradouro: 'Rua Exemplo',
        cidade: 'São Paulo',
        bairro: 'Centro',
        numero: '123',
        complemento: 'Apto 45',
        uf: 'SP',
        nome_mae: 'Maria da Silva',
        categoria: 'Apoiador',
        responsavel: 'José Santos',
        indicado: 'Maria Oliveira'
      }
    ];

    // Adicionar linhas de exemplo
    exampleRows.forEach(row => {
      worksheet.addRow(row);
    });

    // Ajustar altura das linhas
    worksheet.getRow(1).height = 30;

    // Gerar arquivo
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modelo_importacao_eleitores.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const handleOpenDeleteModal = (history: any) => {
    setSelectedHistory(history);
    setIsDeleteModalOpen(true);
  };

  const resetAllStates = async () => {
    try {
      // Limpar estados do arquivo
      setSelectedFile(null);
      setPreviewData([]);
      setTotalRows(0);
      setFileExists(false);
      setIsFileBlocked(false);

      // Limpar estados de progresso
      setProgress({ processed: 0, total: 0, percent: 0 });
      setIsUploading(false);

      // Limpar input file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Atualizar lista de histórico
      buscarHistoricoUpload();
    } catch (error) {
      console.error('Erro ao resetar estados:', error);
    }
  };

  const refreshUploadHistory = async (companyId: string) => {
    const { data, error } = await supabaseClient
      .from('gbp_upload_history')
      .select('*')
      .eq('status', 'success')
      .eq('empresa_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const processFile = async (data: any[], uploadId: number) => {
    try {
      setProgress(prev => ({ ...prev, isProcessing: true }));
      
      // Usar o novo método do eleitorService com retry
      await eleitorService.processImportFile(data, empresa_id, uploadId);
      
      toast.success('Arquivo processado com sucesso!');
      setProgress(prev => ({ ...prev, isProcessing: false }));
      
      // Atualizar status do upload
      const { error: updateError } = await supabaseClient
        .from('gbp_upload_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', uploadId);

      if (updateError) {
        console.error('Erro ao atualizar status do upload:', updateError);
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      
      // Atualizar status do upload para erro
      const { error: updateError } = await supabaseClient
        .from('gbp_upload_history')
        .update({
          status: 'error',
          error_message: error.message || 'Erro desconhecido ao processar arquivo',
          completed_at: new Date().toISOString()
        })
        .eq('id', uploadId);

      if (updateError) {
        console.error('Erro ao atualizar status do upload:', updateError);
      }

      toast.error(error.message || 'Erro ao processar arquivo. Tente novamente.');
      setProgress(prev => ({ ...prev, isProcessing: false }));
      return false;
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selecione uma empresa para importar eleitores</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 pt-2 px-4 pb-4 bg-gray-50">
        <div className="space-y-8">
          {/* Cabeçalho */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Importar Eleitores
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Importe seus eleitores através de um arquivo CSV.
            </p>
          </div>

          {/* Área de Upload */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Upload de Arquivo
                  </h3>
                  <p className="text-sm text-gray-500">
                    Selecione um arquivo CSV para importar
                  </p>
                </div>
              </div>

              {/* Instruções do Modelo */}
              <div className="mb-8 bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      Instruções do Modelo
                    </h3>
                    <div className="text-sm text-blue-600">
                      <p><strong>Observações Importantes:</strong></p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>O arquivo deve estar no formato CSV (valores separados por vírgula)</li>
                        <li>A primeira linha deve conter os nomes das colunas</li>
                        <li>Datas devem estar no formato DD/MM/AAAA</li>
                        <li>Telefones devem incluir DDD</li>
                        <li>CPF e CEP devem conter apenas números</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="h-5 w-5 mr-2 text-gray-500" />
                    Baixar Modelo XLSX
                  </button>
                </div>
              </div>

              {/* Área de Drop */}
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Selecione um arquivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">Arquivos CSV até 10MB</p>
                  {isFileBlocked && !isUploading && (
                    <div className="mt-2">
                      <p className="mt-1 text-sm text-red-500">Este arquivo já foi importado anteriormente. Não é possível importar o mesmo arquivo duas vezes.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview dos dados */}
              {selectedFile && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Arquivo selecionado:</h3>
                      <div className="mt-1 flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">{selectedFile.name}</span>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewData([]);
                            setTotalRows(0);
                            setFileExists(false);
                            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                          className="ml-2 text-sm text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{totalRows} registros</p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading || isFileBlocked}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                          ${(!selectedFile || isUploading || isFileBlocked) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                      >
                        {isUploading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processando...
                          </>
                        ) : isFileBlocked ? (
                          'Escolha outro arquivo'
                        ) : (
                          'Iniciar Importação'
                        )}
                      </button>
                    </div>
                  </div>
                  {isUploading && progress && (
                    <div className="mt-4">
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                          <div>
                            <p className="text-sm text-yellow-700 font-medium">
                              Atenção! Não feche ou atualize a página
                            </p>
                            <p className="text-sm text-yellow-600">
                              Aguarde até que o upload seja concluído para evitar perda de dados
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-blue-700">
                          {progress.processed?.toLocaleString() || '0'} de {progress.total?.toLocaleString() || '0'} registros processados
                        </span>
                        <span className="text-sm font-medium text-blue-700">
                          {progress.percent || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      {progress?.error > 0 && (
                        <p className="mt-2 text-sm text-red-600">
                          {progress?.error} {progress?.error === 1 ? 'registro com erro' : 'registros com erro'}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-8">
                    <div className="flex flex-col mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          Visualizando as primeiras 3 linhas de {totalRows} registros
                        </h3>
                      </div>
                      {/* Grid Preview */}
                      {selectedFile && !isUploading && (
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {Object.keys(previewData[0] || {}).map((header) => (
                                  <th
                                    key={header}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {previewData.slice(0, 3).map((row, index) => (
                                <tr key={index}>
                                  {Object.values(row).map((value: any, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                    >
                                      {value}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Histórico de Uploads */}
              {!isUploading && !selectedFile && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Histórico de Uploads
                    </h2>
                    {isLoadingHistory ? (
                      <div className="text-center py-4">
                        <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                        <p className="mt-2 text-sm text-gray-500">
                          Carregando histórico...
                        </p>
                      </div>
                    ) : uploadHistory.length > 0 ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                  Arquivo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                  Data
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                  Registros
                                </th>
                                <th className="relative px-6 py-3">
                                  <span className="sr-only">Ações</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {uploadHistory.map((history) => (
                                <tr key={history.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                      {history.arquivo_nome}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(
                                      new Date(history.created_at),
                                      "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                                      { locale: ptBR }
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                      <span className="text-sm text-green-800">
                                        Concluído
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {history.registros_processados} /{' '}
                                    {history.registros_total}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleOpenDeleteModal(history)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginação */}
                        {Math.ceil(uploadHistory.length / itemsPerPage) > 1 && (
                          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                            <div className="flex flex-1 justify-between sm:hidden">
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Anterior
                              </button>
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === Math.ceil(uploadHistory.length / itemsPerPage)}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Próxima
                              </button>
                            </div>
                            <div className="hidden sm:flex sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm text-gray-700">
                                  Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
                                  <span className="font-medium">
                                    {Math.min(endIndex, uploadHistory.length)}
                                  </span>{' '}
                                  de <span className="font-medium">{uploadHistory.length}</span> resultados
                                </p>
                              </div>
                              <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Paginação">
                                  <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    <span className="sr-only">Anterior</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                  </button>
                                  {Array.from({ length: Math.ceil(uploadHistory.length / itemsPerPage) }).map((_, index) => (
                                    <button
                                      key={index + 1}
                                      onClick={() => handlePageChange(index + 1)}
                                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                        currentPage === index + 1
                                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                      }`}
                                    >
                                      {index + 1}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === Math.ceil(uploadHistory.length / itemsPerPage)}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span className="sr-only">Próxima</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                  </button>
                                </nav>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          Nenhum histórico
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Nenhum upload foi realizado ainda.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal de confirmação de exclusão */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    {isDeleting ? (
                      <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isDeleting ? 'Exclusão em andamento' : 'Confirmar exclusão'}
                    </h3>
                    <div className="mt-2">
                      {isDeleting ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Excluindo registros, por favor aguarde...</span>
                          </div>
                          {progress && (
                            <div className="w-full">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Processando {progress.processed} de {progress.total} registros</span>
                                <span>{progress.percent}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <span className="block mt-2 text-xs text-gray-500 italic">
                                Não feche esta janela até a exclusão ser concluída
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            Tem certeza que deseja excluir este upload? Esta ação não pode ser desfeita.
                          </p>
                          <p className="text-xs text-gray-400 italic">
                            Todos os eleitores associados serão movidos para a tabela de deletados.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  {!isDeleting ? (
                    <>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={() => {
                          if (!isDeleting) {
                            setIsDeleteModalOpen(false);
                            setSelectedHistory(null);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-center w-full text-gray-500">
                      Aguarde a conclusão da exclusão...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
