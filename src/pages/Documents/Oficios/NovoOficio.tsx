import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { ChevronLeft, Settings, FileText, Search, Upload, X, AlertCircle } from 'lucide-react';
import { saveAs } from 'file-saver';
import TemplateConfig from './components/TemplateConfig';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface FormData {
  numeroOficio: string;
  tag: string;
  cpf: string;
  destinatario: string;
  cargo: string;
  secretaria: string;
  assunto: string;
  conteudo: string;
}

interface Anexo {
  file: File;
  previewUrl: string;
}

const TAGS = [
  { value: 'saude', label: 'Saúde', emoji: '🏥' },
  { value: 'educacao', label: 'Educação', emoji: '📚' },
  { value: 'infraestrutura', label: 'Infraestrutura', emoji: '🏗️' },
  { value: 'assistencia_social', label: 'Assistência Social', emoji: '🤝' },
  { value: 'seguranca', label: 'Segurança', emoji: '👮' },
  { value: 'outros', label: 'Outros', emoji: '📋' },
];

export default function NovoOficio() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>();
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);
  const [eleitor, setEleitor] = useState<Eleitor | null>(null);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cpf = watch('cpf');

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função para buscar eleitor por CPF
  const buscarEleitor = async (cpfValue: string) => {
    if (!cpfValue || cpfValue.length !== 14 || !company?.id) return;

    const cpfLimpo = cpfValue.replace(/\D/g, '');
    
    setIsSearchingCpf(true);
    setShowModal(false); // Reset modal state
    
    try {
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('id, nome, cpf')
        .eq('cpf', cpfLimpo)
        .eq('empresa_uid', company.id)
        .single();

      if (error) {
        setEleitor(null);
        if (error.code === 'PGRST116') { // Não encontrou resultados
          setShowModal(true);
        }
      } else if (data) {
        setEleitor(data);
        setValue('destinatario', data.nome);
      }
    } catch (error) {
      console.error('Erro ao buscar eleitor:', error);
      setEleitor(null);
    } finally {
      setIsSearchingCpf(false);
    }
  };

  // Observa mudanças no CPF
  useEffect(() => {
    const handleCpfChange = async () => {
      if (!cpf) return;

      const formattedCpf = formatCPF(cpf);
      if (formattedCpf !== cpf) {
        setValue('cpf', formattedCpf, { shouldValidate: true });
      }
      
      if (formattedCpf.length === 14) {
        await buscarEleitor(formattedCpf);
      } else {
        setEleitor(null);
      }
    };

    handleCpfChange();
  }, [cpf, setValue, company?.id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: FileList | null = null;
    
    if ('dataTransfer' in event) {
      event.preventDefault();
      files = event.dataTransfer.files;
      setIsDragging(false);
    } else {
      files = event.target.files;
    }

    if (!files) return;

    setUploadError('');

    // Verificar se são arquivos de imagem
    const invalidTypeFiles = Array.from(files).filter(file => !file.type.startsWith('image/'));
    if (invalidTypeFiles.length > 0) {
      setUploadError('Apenas arquivos de imagem são permitidos (jpg, jpeg, png)');
      return;
    }

    if (anexos.length + files.length > 2) {
      setUploadError('Máximo de 2 anexos permitidos');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = Array.from(files).filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      setUploadError('Arquivos devem ter no máximo 5MB');
      return;
    }

    const newAnexos = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setAnexos(prev => [...prev, ...newAnexos]);
  };

  const removeAnexo = (index: number) => {
    setAnexos(prev => {
      const newAnexos = [...prev];
      if (newAnexos[index].previewUrl) {
        URL.revokeObjectURL(newAnexos[index].previewUrl!);
      }
      newAnexos.splice(index, 1);
      return newAnexos;
    });
  };

  useEffect(() => {
    // Limpar URLs de prévia quando o componente for desmontado
    return () => {
      anexos.forEach(anexo => {
        if (anexo.previewUrl) {
          URL.revokeObjectURL(anexo.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!company?.uid) return;

      setIsLoadingTemplate(true);
      
      try {
        // Buscar o template configurado
        const { data: empresaData, error: empresaError } = await supabaseClient
          .from('gbp_empresas')
          .select('template_oficio_url')
          .eq('uid', company.uid)
          .single();

        if (empresaError) throw empresaError;

        console.log('Template URL da empresa:', empresaData?.template_oficio_url);

        if (empresaData?.template_oficio_url) {
          setTemplate(empresaData.template_oficio_url);
          setShowTemplateConfig(false);
        } else {
          setTemplate(null);
          setShowTemplateConfig(true);
        }
      } catch (error) {
        console.error('Erro ao buscar template:', error);
        setTemplate(null);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    fetchTemplate();
  }, [company?.uid]);

  const handleTemplateDownload = async () => {
    try {
      if (!template) {
        setUploadError('Template não configurado');
        return;
      }

      console.log('Tentando baixar template:', template);

      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('gbp_oficios')  // Alterado para o mesmo bucket usado no upload
        .download(template);

      if (downloadError) {
        console.error('Erro ao baixar template:', downloadError);
        setUploadError('Erro ao baixar template do documento');
        return;
      }

      if (!fileData) {
        setUploadError('Arquivo de template não encontrado');
        return;
      }

      // Criar um objeto Blob com o arquivo
      const blob = new Blob([fileData], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Salvar o arquivo
      saveAs(blob, `template-oficio.docx`);
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      setUploadError('Erro ao baixar template');
    }
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      if (!company?.uid) {
        throw new Error('Empresa não identificada');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `templates/template-${Date.now()}.${fileExt}`;

      console.log('Tentando fazer upload para:', fileName);

      const { error: uploadError } = await supabaseClient.storage
        .from('gbp_oficios')  // Alterado para o mesmo bucket usado no upload de anexos
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Atualizar a URL do template na empresa
      const { error: updateError } = await supabaseClient
        .from('gbp_empresas')
        .update({ template_oficio_url: fileName })
        .eq('uid', company.uid);

      if (updateError) throw updateError;

      setTemplate(fileName);
      setShowTemplateConfig(false);
    } catch (error) {
      console.error('Erro ao fazer upload do template:', error);
      setUploadError('Erro ao fazer upload do template');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Verificar se o número do ofício já existe usando uma query mais simples
      const { count, error: checkError } = await supabaseClient
        .from('gbp_oficios')
        .select('*', { count: 'exact', head: true })
        .eq('numero_oficio', data.numeroOficio);

      if (checkError) {
        console.error('Erro ao verificar número do ofício:', checkError);
        throw checkError;
      }

      if (count && count > 0) {
        setUploadError('Número de ofício já existe. Atualize a página para gerar um novo número.');
        return;
      }

      // Upload dos anexos primeiro, se houver
      const anexosUrls: string[] = [];
      
      if (anexos.length > 0) {
        for (const anexo of anexos) {
          try {
            const formData = new FormData();
            const blob = new Blob([await anexo.file.arrayBuffer()], { type: anexo.file.type });
            formData.append('file', blob, anexo.file.name);
            formData.append('bucket', 'gbp_oficios');
            formData.append('empresa', company?.nome?.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_') || '');
            formData.append('arquivo_nome', anexo.file.name.toLowerCase().replace(/[^\w\s.]/g, '').replace(/\s+/g, '_'));
            formData.append('extensao', anexo.file.name.split('.').pop()?.toLowerCase() || '');
            formData.append('mimetype', anexo.file.type);

            const response = await fetch('https://whkn8n.guardia.work/webhook/gbp_midia', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              },
              body: formData
            });

            const responseText = await response.text();

            if (!response.ok) {
              let errorMessage = 'Erro ao fazer upload do anexo';
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.errorMessage || responseText;
              } catch (e) {
                errorMessage = responseText;
              }
              throw new Error(errorMessage);
            }

            let result;
            try {
              result = JSON.parse(responseText);
            } catch (e) {
              throw new Error(`Erro ao parsear resposta do servidor: ${responseText}`);
            }

            if (!result.ulrPublica) {
              throw new Error('URL pública não encontrada na resposta');
            }

            anexosUrls.push(result.ulrPublica);
          } catch (uploadError) {
            console.error('Erro no upload do anexo:', uploadError);
            setUploadError(uploadError.message);
            return;
          }
        }
      }

      // Criar o ofício no banco
      const { error: createError } = await supabaseClient
        .from('gbp_oficios')
        .insert({
          numero_oficio: data.numeroOficio,
          descricao: data.conteudo,
          secretaria_destino: data.secretaria,
          status: 'pendente',
          anexos_problema: anexosUrls.length > 0 ? anexosUrls : null,
          empresa_uid: company?.uid,
          eleitor_id: eleitor?.id,
          tag: data.tag,
          created_at: new Date().toISOString(),
        });

      if (createError) {
        console.error('Erro ao criar ofício:', createError);
        setUploadError('Erro ao criar ofício no banco de dados');
        return;
      }

      // Gerar documento usando docx
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Ofício nº ${data.numeroOficio}`,
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun("")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Data: ${new Date().toLocaleDateString()}`,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun("")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `À Secretaria ${data.secretaria}`,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun("")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: data.conteudo,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun("")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Atenciosamente,",
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun("")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: company?.nome || "",
                  bold: true,
                }),
              ],
            }),
          ],
        }],
      });

      // Gerar o arquivo usando Blob
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `oficio-${data.numeroOficio}.docx`);

      // Redirecionar para a lista de ofícios
      navigate('/app/documentos/oficios');
    } catch (error) {
      console.error('Erro ao salvar ofício:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro ao salvar ofício. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchNextNumber = async () => {
      if (!company?.uid) return;

      try {
        setIsLoadingNumber(true);
        
        // Buscar o ano atual
        const currentYear = new Date().getFullYear();
        
        // Buscar todos os ofícios do ano atual para esta empresa
        const { data: oficios, error } = await supabaseClient
          .from('gbp_oficios')
          .select('numero_oficio')
          .eq('empresa_uid', company.uid)
          .ilike('numero_oficio', `OF-%/${currentYear}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        let nextNumber = 1;
        let isUnique = false;
        
        while (!isUnique) {
          // Formatar o número candidato
          const candidateNumber = `OF-${String(nextNumber).padStart(3, '0')}/${currentYear}`;
          
          // Verificar se este número já existe
          const exists = oficios?.some(oficio => oficio.numero_oficio === candidateNumber);
          
          if (!exists) {
            isUnique = true;
          } else {
            nextNumber++;
          }
        }

        // Formatar o número com zeros à esquerda (ex: OF-001/2025)
        const formattedNumber = `OF-${String(nextNumber).padStart(3, '0')}/${currentYear}`;
        setValue('numeroOficio', formattedNumber);
      } catch (error) {
        console.error('Erro ao buscar próximo número:', error);
        setUploadError('Erro ao gerar número do ofício');
      } finally {
        setIsLoadingNumber(false);
      }
    };

    fetchNextNumber();
  }, [company?.uid, setValue]);

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 py-2 md:py-6 px-2 md:px-4">
          <div className="flex flex-col space-y-2 md:space-y-4 max-w-[1600px] mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Modelo de Ofício não Configurado
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Para criar ofícios, primeiro é necessário configurar o modelo do documento.
                </p>
                <button
                  onClick={() => setShowTemplateConfig(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Configurar Modelo
                </button>
              </div>
            </div>
          </div>
        </div>

        {showTemplateConfig && (
          <TemplateConfig
            onClose={() => setShowTemplateConfig(false)}
            onSuccess={() => {
              setShowTemplateConfig(false);
              const fetchTemplate = async () => {
                if (!company?.uid) return;
                const { data } = await supabaseClient
                  .from('gbp_empresas')
                  .select('template_oficio_url')
                  .eq('uid', company.uid)
                  .single();
                setTemplate(data?.template_oficio_url || null);
              };
              fetchTemplate();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="w-full px-2 sm:px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Voltar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Novo Ofício
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Crie um novo ofício
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {template && (
                  <button
                    onClick={handleTemplateDownload}
                    className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Visualizar Modelo"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowTemplateConfig(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Atualizar Modelo"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-2 sm:px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número do Ofício
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('numeroOficio', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: OF-001/2025"
                      disabled={isLoadingNumber}
                    />
                    {isLoadingNumber && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                  {errors.numeroOficio && (
                    <span className="text-sm text-red-500">Campo obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tag
                  </label>
                  <select
                    {...register('tag', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700"
                  >
                    <option value="">Selecione uma tag</option>
                    {TAGS.map(tag => (
                      <option key={tag.value} value={tag.value}>
                        {tag.emoji} {tag.label}
                      </option>
                    ))}
                  </select>
                  {errors.tag && (
                    <span className="text-sm text-red-500">Campo obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF do Eleitor
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('cpf', { 
                        required: true,
                        pattern: {
                          value: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
                          message: "CPF inválido"
                        }
                      })}
                      maxLength={14}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="000.000.000-00"
                    />
                    {isSearchingCpf && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                  {errors.cpf && (
                    <span className="text-sm text-red-500">
                      {errors.cpf.type === 'pattern' ? 'CPF inválido' : 'Campo obrigatório'}
                    </span>
                  )}
                  {eleitor && (
                    <div className="mt-1 text-xs text-gray-500 flex items-center">
                      <Search className="h-3 w-3 mr-1 inline" />
                      <span>Eleitor: {eleitor.nome}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Destinatário
                  </label>
                  <input
                    type="text"
                    {...register('destinatario', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nome do destinatário"
                  />
                  {errors.destinatario && (
                    <span className="text-sm text-red-500">Campo obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    {...register('cargo', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Cargo do destinatário"
                  />
                  {errors.cargo && (
                    <span className="text-sm text-red-500">Campo obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secretaria
                  </label>
                  <input
                    type="text"
                    {...register('secretaria', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nome da secretaria"
                  />
                  {errors.secretaria && (
                    <span className="text-sm text-red-500">Campo obrigatório</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assunto
                </label>
                <input
                  type="text"
                  {...register('assunto', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Assunto do ofício"
                />
                {errors.assunto && (
                  <span className="text-sm text-red-500">Campo obrigatório</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Conteúdo
                </label>
                <textarea
                  {...register('conteudo', { required: true })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Digite o conteúdo do ofício"
                />
                {errors.conteudo && (
                  <span className="text-sm text-red-500">Campo obrigatório</span>
                )}
              </div>

              {/* Campo de Anexos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Anexos (máximo 2 arquivos, 5MB cada)
                </label>
                <div
                  className={`mt-1 flex flex-col space-y-2 ${
                    isDragging ? 'border-primary-500' : 'border-gray-300'
                  } border-2 border-dashed rounded-lg p-4`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileChange}
                >
                  <div className="flex items-center justify-center">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="w-5 h-5 mr-2" />
                      Escolher imagem ou arrastar aqui
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*"
                        multiple={anexos.length < 2}
                      />
                    </label>
                    <span className="ml-3 text-sm text-gray-500">
                      {anexos.length}/2 imagens
                    </span>
                  </div>
                  
                  {uploadError && (
                    <p className="text-sm text-red-500 text-center">{uploadError}</p>
                  )}

                  {/* Grade de anexos */}
                  {anexos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {anexos.map((anexo, index) => (
                        <div
                          key={index}
                          className="relative group bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center space-x-3"
                        >
                          <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-600">
                            <img
                              src={anexo.previewUrl}
                              alt={anexo.file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {anexo.file.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(anexo.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAnexo(index)}
                            className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/app/documentos/oficios')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Salvar e Gerar Documento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de CPF não encontrado */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-center mb-4 text-yellow-500">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-center mb-4 text-gray-900 dark:text-white">
              CPF não encontrado
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              O CPF informado não foi encontrado na base de dados. O que você deseja fazer?
            </p>
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Conferir CPF digitado
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/eleitores/novo')}
                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cadastrar novo eleitor
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateConfig && (
        <TemplateConfig
          onClose={() => setShowTemplateConfig(false)}
          onSuccess={() => {
            setShowTemplateConfig(false);
            const fetchTemplate = async () => {
              if (!company?.uid) return;
              const { data } = await supabaseClient
                .from('gbp_empresas')
                .select('template_oficio_url')
                .eq('uid', company.uid)
                .single();
              setTemplate(data?.template_oficio_url || null);
            };
            fetchTemplate();
          }}
        />
      )}
    </div>
  );
}
