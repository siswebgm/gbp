import { useState, useRef, useEffect } from 'react';
import { Send, Filter, Bold, Italic, Strikethrough, Code, Link, Image, Video, Mic, Smile, Users, X, FileText, ChevronLeft, Plus } from 'lucide-react';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../hooks/useToast';
import { supabaseClient } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'cidade' | 'bairro' | 'categoria' | 'genero';
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

export function DisparoMidia() {
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [includeUserName, setIncludeUserName] = useState(true);
  const [showGreetings, setShowGreetings] = useState(false);
  const [selectedGreeting, setSelectedGreeting] = useState('Olá {nome_eleitor}. Tudo bem?');
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({
    cidade: [],
    bairro: [],
    categoria: [],
    genero: [
      { id: '1', label: 'Masculino', value: 'masculino', type: 'genero' },
      { id: '2', label: 'Feminino', value: 'feminino', type: 'genero' },
    ],
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const [totalEleitores, setTotalEleitores] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const navigate = useNavigate();

  const greetings = [
    { id: 1, text: 'Olá {nome_eleitor}. Tudo bem?' },
    { id: 2, text: 'Olá' },
    { id: 3, text: 'Oi' },
    { id: 4, text: 'Bom dia' },
    { id: 5, text: 'Boa tarde' },
    { id: 6, text: 'Boa noite' },
  ];

  useEffect(() => {
    const fetchTotalEleitores = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar o total de eleitores diretamente do Supabase
        const { count, error: supabaseError } = await supabaseClient
          .from('gbp_eleitores')
          .select('*', { count: 'exact', head: true });

        if (supabaseError) {
          console.error('Erro ao buscar total:', supabaseError);
          setError('Erro ao buscar total de eleitores');
          setTotalEleitores(0);
          return;
        }

        setTotalEleitores(count || 0);
      } catch (err) {
        console.error('Erro ao buscar total:', err);
        setError('Erro ao buscar total de eleitores');
        setTotalEleitores(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalEleitores();
  }, []);

  useEffect(() => {
    // Set initial message with default greeting
    setMessage('Olá {nome_eleitor}. Tudo bem?\n\n');
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar cidades únicas
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) throw cidadesError;

        // Buscar bairros únicos
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) throw bairrosError;

        // Buscar categorias da tabela de categorias
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome')
          .order('nome');

        if (categoriasError) throw categoriasError;

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .map((cidade, index) => ({
            id: `cidade-${index}`,
            label: cidade,
            value: cidade.toLowerCase(),
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .map((bairro, index) => ({
            id: `bairro-${index}`,
            label: bairro,
            value: bairro.toLowerCase(),
            type: 'bairro' as const
          }));

        // Formatar categorias (não precisa remover duplicatas pois vem da tabela de categorias)
        const categorias = categoriasData.map(categoria => ({
          id: categoria.uid,
          label: categoria.nome,
          value: categoria.uid,
          type: 'categoria' as const
        }));

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros,
          categoria: categorias
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast({
          title: 'Erro',
          description: 'Não foi possível carregar as opções de filtro',
          type: 'error'
        });
      }
    };

    fetchFilterOptions();
  }, [showToast]);

  const formatText = (format: 'bold' | 'italic' | 'strike' | 'mono') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    if (selectedText) {
      let newText = message;
      let formattedText = selectedText;

      // Remove aspas se existirem
      if (formattedText.startsWith('"') && formattedText.endsWith('"')) {
        formattedText = formattedText.slice(1, -1);
      }

      // Adiciona marcadores do WhatsApp
      switch (format) {
        case 'bold':
          formattedText = `**${formattedText}**`;
          break;
        case 'italic':
          formattedText = `_${formattedText}_`;
          break;
        case 'strike':
          formattedText = `~~${formattedText}~~`;
          break;
        case 'mono':
          formattedText = `\`\`\`${formattedText}\`\`\``;
          break;
      }

      newText = message.substring(0, start) + formattedText + message.substring(end);
      setMessage(newText);

      // Restaura a seleção após a atualização
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start,
          start + formattedText.length
        );
      }, 0);
    }
  };

  // Lista de emojis do WhatsApp por categoria
  const emojiCategories = [
    {
      name: "Smileys",
      emojis: [
        '🙂', '😊', '🤗', '🤩', '🥰', '😙', '🤪', '😛',
        '😏', '😌', '🤤', '😴', '🤧', '😷', '🤒', '🤕',
        '🤢', '🤮', '🤡', '😈', '👿', '👻', '💀', '☠️',
        '👽', '😺', '😸', '😹', '😻', '😼', '😽', '🙀',
        '😿', '😾', '🤲', '👐', '🙌', '👏', '🤝', '👍',
        '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟',
        '🤘', '👌', '👈', '👉', '👆', '👇', '☝️', '✋',
        '🤚', '🖐️', '🖖', '👋', '🤙', '💪'
      ]
    },
    {
      name: "Gestos",
      emojis: [
        '👍', '👎', '👌', '✌️', '🤘', '🤙', '👋', '🤝',
        '👊', '✊', '🤛', '🤜', '🤞', '🤟', '👈', '👉',
        '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '💪',
        '🦾', '🤳', '💅', '🙏', '✍️', '🤝', '🙌', '👐',
        '🤲', '🤝'
      ]
    },
    {
      name: "Objetos",
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
        '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
        '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈',
        '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
        '♑', '♒', '♓', '🆔', '⚛️'
      ]
    },
    {
      name: "Símbolos",
      emojis: [
        '✅', '❌', '❎', '➕', '➖', '➗', '➰', '➿',
        '〽️', '✳️', '✴️', '❇️', '‼️', '⁉️', '❓', '❔',
        '❕', '❗', '〰️', '©️', '®️', '™️', '#️⃣', '*️⃣',
        '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣',
        '8️⃣', '9️⃣', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤',
        '🅰️', '🆎', '🅱️', '🆑', '🆒', '🆓', 'ℹ️', '🆔',
        '🆕', '🆖', '🅾️', '🆗', '🅿️', '🆘', '🆙', '🆚',
        '🈁', '🈂️', '🈷️', '🈶', '🈯', '🉐', '🈹', '🈚',
        '🈲', '🉑', '🈸', '🈴', '🈳', '㊗️', '㊙️', '🈺',
        '🈵', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '⬛',
        '⬜', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠',
        '🔘', '🔳', '🔲'
      ]
    }
  ];

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = message.substring(0, start) + emoji + message.substring(end);
    
    setMessage(newText);
    setShowEmojis(false);

    // Restaura o foco e move o cursor após o emoji
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'pdf') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Para imagens, permite múltiplos arquivos
      if (type === 'image') {
        const newMediaFiles = await Promise.all(files.map(async (file) => {
          const previewUrl = URL.createObjectURL(file);
          return { file, type, previewUrl };
        }));
        
        setMediaFiles(prev => [...prev, ...newMediaFiles]);
      } else {
        // Para outros tipos, mantém apenas um arquivo
        const file = files[0];
        if (file) {
          const previewUrl = URL.createObjectURL(file);
          setMediaFiles(prev => [...prev, { file, type, previewUrl }]);
        }
      }
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleAddFilter = (filter: FilterOption) => {
    if (!selectedFilters.find(f => f.id === filter.id && f.type === filter.type)) {
      setSelectedFilters([...selectedFilters, filter]);
    }
  };

  const handleRemoveFilter = (filter: FilterOption) => {
    setSelectedFilters(selectedFilters.filter(f => !(f.id === filter.id && f.type === filter.type)));
  };

  const handleSend = () => {
    setShowConfirm(true);
  };

  const uploadFile = (file: File, fileName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().getTime();
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      // Validate file type and size
      if (!isImage && !isVideo) {
        reject(new Error('Tipo de arquivo não suportado. Apenas imagens e vídeos são permitidos.'));
        return;
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        reject(new Error('Arquivo muito grande. O tamanho máximo permitido é 100MB.'));
        return;
      }

      const fileType = isImage ? 'img' : isVideo ? 'vid' : 'file';
      const finalFileName = `${fileType}_${timestamp}.${fileExt}`;

      const formData = new FormData();
      formData.append('mimetype', file.type);
      formData.append('extensao', fileExt);
      formData.append('arquivo_nome', finalFileName);
      formData.append('empresa', 'gbp');
      formData.append('file', file, finalFileName);

      console.log('Preparando upload:', {
        nome: finalFileName,
        tipo: file.type,
        tamanho: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        extensao: fileExt
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://whkn8n.guardia.work/webhook/gbp_midia', true);
      
      // Enhanced headers
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Authorization', 'Bearer gbp_token');
      xhr.setRequestHeader('X-File-Name', finalFileName);
      xhr.setRequestHeader('X-File-Type', file.type);
      xhr.setRequestHeader('X-File-Size', file.size.toString());

      // Progress tracking
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = ((e.loaded / e.total) * 100).toFixed(2);
          console.log(`Upload progress for ${finalFileName}: ${percentComplete}%`);
        }
      };

      xhr.onload = function() {
        const responseLog = {
          status: xhr.status,
          responseText: xhr.responseText,
          responseType: xhr.responseType,
          responseHeaders: xhr.getAllResponseHeaders(),
          requestHeaders: {
            'Content-Type': xhr.getRequestHeader('Content-Type'),
            'Authorization': 'Bearer [REDACTED]',
            'Accept': xhr.getRequestHeader('Accept')
          }
        };
        
        console.log('Resposta completa:', responseLog);

        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Resposta parseada:', response);
            
            const url = response.ulrPublica;
            
            if (url) {
              resolve(url);
            } else {
              console.error('URL não encontrada:', {
                response,
                fileName: finalFileName
              });
              reject(new Error(`URL não encontrada na resposta para ${finalFileName}`));
            }
          } catch (e) {
            console.error('Erro ao processar resposta:', {
              error: e,
              responseText: xhr.responseText,
              fileName: finalFileName
            });
            reject(new Error(`Erro ao processar resposta do servidor para ${finalFileName}`));
          }
        } else {
          let errorMessage;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || 'Erro desconhecido';
          } catch (e) {
            errorMessage = xhr.responseText || 'Erro desconhecido';
          }

          console.error('Erro no upload:', {
            status: xhr.status,
            response: xhr.responseText,
            message: errorMessage,
            fileName: finalFileName,
            fileType: file.type,
            fileSize: file.size
          });
          
          reject(new Error(`Erro no upload do arquivo ${finalFileName}. Status: ${xhr.status}. Erro: ${errorMessage}`));
        }
      };

      xhr.onerror = function() {
        console.error('Erro de rede:', {
          status: xhr.status,
          statusText: xhr.statusText,
          fileName: finalFileName
        });
        reject(new Error(`Erro de rede ao enviar arquivo ${finalFileName}`));
      };

      xhr.send(formData);
    });
  };

  const confirmSend = async () => {
    try {
      setLoading(true);

      // Upload de cada arquivo
      const uploadPromises = mediaFiles.map(async (media) => {
        // Simplificar o nome do arquivo removendo caracteres especiais
        const fileName = media.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        try {
          console.log('Enviando arquivo:', {
            nome: fileName,
            tipo: media.file.type,
            tamanho: media.file.size,
            extensao: fileName.split('.').pop() || ''
          });

          return await uploadFile(media.file, fileName);
        } catch (error) {
          console.error('Erro detalhado no upload:', error);
          throw error;
        }
      });

      // Aguarda todos os uploads terminarem
      const uploadUrls = await Promise.all(uploadPromises);

      console.log('URLs dos uploads:', uploadUrls);

      // Salva o registro do disparo no Supabase
      const { data: disparoData, error: insertError } = await supabaseClient
        .from('gbp_disparo')
        .insert({
          empresa_uid: null, // Ajuste conforme necessário
          upload: uploadUrls,
          categoria: selectedFilters.find(f => f.type === 'categoria')?.value || null,
          bairro: selectedFilters.find(f => f.type === 'bairro')?.value || null,
          cidade: selectedFilters.find(f => f.type === 'cidade')?.value || null,
          nome_disparo: includeUserName,
          qtde: totalEleitores,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir no Supabase:', insertError);
        throw insertError;
      }

      console.log('Disparo salvo com sucesso:', disparoData);

      showToast({
        title: 'Sucesso',
        description: 'Mensagem enviada com sucesso!',
        type: 'success'
      });

      // Limpa o formulário
      setShowConfirm(false);
      setMessage('');
      setMediaFiles([]);
      setSelectedFilters([]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showToast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao enviar a mensagem. Tente novamente.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar o texto com markdown do WhatsApp
  const formatWhatsAppMarkdown = (text: string) => {
    // Substitui {nome_eleitor} por João primeiro
    let formattedText = text.replace(/\{nome_eleitor\}/g, 'João');

    // Aplica as formatações do WhatsApp
    // Negrito: **texto** -> <strong>texto</strong>
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Itálico: _texto_ -> <em>texto</em>
    formattedText = formattedText.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Riscado: ~~texto~~ -> <del>texto</del>
    formattedText = formattedText.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Monospace: ```texto``` -> <code>texto</code>
    formattedText = formattedText.replace(/```(.*?)```/g, '<code>$1</code>');

    return formattedText;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 md:py-6 px-2 md:px-4">
        <div className="flex flex-col space-y-2 md:space-y-4 max-w-[1600px] mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Disparo de Mídia</h1>
                <div className="flex flex-wrap items-center text-sm text-gray-600 mt-2 gap-1">
                  <Users className="h-4 w-4" />
                  <span>Destinatários estimados:</span>
                  <span className="font-medium">
                    {loading ? 'Carregando...' : typeof totalEleitores === 'number' ? totalEleitores.toLocaleString('pt-BR') : '0'}
                  </span>
                  {error && <span className="text-red-500 ml-2">{error}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    showToast({
                      title: 'Teste',
                      description: 'Mensagem de teste enviada com sucesso!',
                      type: 'success'
                    });
                  }}
                  disabled={!message && mediaFiles.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Testar Mensagem
                </button>
                <button
                  onClick={handleSend}
                  disabled={!message && mediaFiles.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            {/* Filtros */}
            <Card className="lg:col-span-3 order-2 lg:order-1">
              <div className="p-3 md:p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </h2>
                
                {/* Filtros selecionados */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedFilters.map(filter => (
                    <span
                      key={`${filter.type}-${filter.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      {filter.label}
                      <button
                        onClick={() => handleRemoveFilter(filter)}
                        className="hover:text-primary-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Seleção de filtros */}
                <div className="space-y-4">
                  {Object.entries(filterOptions).map(([key, options]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1 capitalize">
                        {key}
                      </label>
                      <select
                        onChange={(e) => {
                          const option = options.find(o => o.id === e.target.value);
                          if (option) handleAddFilter(option);
                        }}
                        className="w-full p-2 border rounded-md"
                        value=""
                      >
                        <option value="">Selecione...</option>
                        {options.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Editor de Mensagem */}
            <Card className="lg:col-span-5 overflow-hidden order-1 lg:order-2">
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Mensagem</h2>
                  </div>
                </div>

                {/* Barra de ferramentas */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 px-0 py-0.5 sm:p-1.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                      className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
                      onClick={() => formatText('bold')}
                      title="Negrito"
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
                      onClick={() => formatText('italic')}
                      title="Itálico"
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
                      onClick={() => formatText('strike')}
                      title="Tachado"
                    >
                      <Strikethrough className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
                      onClick={() => formatText('mono')}
                      title="Monospace"
                    >
                      <Code className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="h-5 w-px bg-gray-300 mx-1 sm:mx-2 hidden sm:block" />
                  <div className="relative sm:ml-auto">
                    <button
                      className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200"
                      onClick={() => setShowEmojis(!showEmojis)}
                      title="Emoji"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    {showEmojis && (
                      <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border w-[260px] sm:w-[440px] max-h-[400px] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b">
                          <div className="px-0 py-1 text-sm font-medium text-gray-500">Emojis</div>
                        </div>
                        {emojiCategories.map((category, categoryIndex) => (
                          <div key={categoryIndex} className="px-0 py-1 border-b last:border-b-0">
                            <div className="text-xs text-gray-500 mb-2">{category.name}</div>
                            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                              {category.emojis.map((emoji, emojiIndex) => (
                                <button
                                  key={`${categoryIndex}-${emojiIndex}`}
                                  className="p-1.5 hover:bg-gray-100 rounded flex items-center justify-center text-lg"
                                  onClick={() => insertEmoji(emoji)}
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Editor */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Mensagem:</span>
                          {selectedGreeting && (
                            <div className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-2 py-1 rounded-md text-sm">
                              <span>{selectedGreeting}</span>
                              <button
                                onClick={() => {
                                  setSelectedGreeting('');
                                  setMessage(message.replace(selectedGreeting + '\n\n', ''));
                                }}
                                className="hover:text-primary-800"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                          {!selectedGreeting && (
                            <button
                              type="button"
                              onClick={() => setShowGreetings(!showGreetings)}
                              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Adicionar saudação
                            </button>
                          )}

                          {showGreetings && !selectedGreeting && (
                            <div className="absolute mt-8 w-64 bg-white rounded-lg shadow-lg border z-10">
                              <div className="p-2 border-b">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={includeUserName}
                                    onChange={(e) => setIncludeUserName(e.target.checked)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  Incluir nome do eleitor
                                </label>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {greetings.map((greeting) => (
                                  <button
                                    key={greeting.id}
                                    onClick={() => {
                                      const greetingText = greeting.text.includes('{nome_eleitor}')
                                        ? greeting.text
                                        : includeUserName 
                                          ? `${greeting.text} {nome_eleitor}` 
                                          : greeting.text;
                                      setSelectedGreeting(greetingText);
                                      setMessage(prev => 
                                        greetingText + (prev ? `\n\n${prev}` : '')
                                      );
                                      setShowGreetings(false);
                                    }}
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  >
                                    {greeting.text.includes('{nome_eleitor}')
                                      ? greeting.text
                                      : includeUserName 
                                        ? `${greeting.text} {nome_eleitor}` 
                                        : greeting.text}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="w-full min-h-[8rem] sm:h-32 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow duration-200"
                      />
                    </div>

                    <div className="text-sm text-gray-500 text-right">
                      {message.length}/600 caracteres
                    </div>

                    {/* Upload de mídia */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div 
                        className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 cursor-pointer relative overflow-hidden transition-colors duration-200"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <input
                          type="file"
                          id="image-upload"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleMediaChange(e, 'image')}
                        />
                        <Image className="h-5 w-5 text-gray-400" />
                        <span className="mt-1 text-xs text-gray-500">Imagens</span>
                        <span className="text-[10px] text-gray-400">(Múltiplas)</span>
                      </div>

                      <div 
                        className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 cursor-pointer relative overflow-hidden transition-colors duration-200"
                        onClick={() => document.getElementById('video-upload')?.click()}
                      >
                        <input
                          type="file"
                          id="video-upload"
                          className="hidden"
                          accept="video/*"
                          onChange={(e) => handleMediaChange(e, 'video')}
                        />
                        <Video className="h-5 w-5 text-gray-400" />
                        <span className="mt-1 text-xs text-gray-500">Vídeo</span>
                      </div>

                      <div 
                        className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 cursor-pointer relative overflow-hidden transition-colors duration-200"
                        onClick={() => document.getElementById('audio-upload')?.click()}
                      >
                        <input
                          type="file"
                          id="audio-upload"
                          className="hidden"
                          accept="audio/*"
                          onChange={(e) => handleMediaChange(e, 'audio')}
                        />
                        <Mic className="h-5 w-5 text-gray-400" />
                        <span className="mt-1 text-xs text-gray-500">Áudio</span>
                      </div>

                      <div 
                        className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 cursor-pointer relative overflow-hidden transition-colors duration-200"
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                      >
                        <input
                          type="file"
                          id="pdf-upload"
                          className="hidden"
                          accept=".pdf"
                          onChange={(e) => handleMediaChange(e, 'pdf')}
                        />
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="mt-1 text-xs text-gray-500">PDF</span>
                      </div>
                    </div>

                    {/* Lista de arquivos selecionados */}
                    {mediaFiles.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium mb-2">Arquivos selecionados:</h3>
                        <div className="space-y-2">
                          {mediaFiles.map((media, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {media.type === 'image' && (
                                  <img
                                    src={media.previewUrl}
                                    alt="Preview"
                                    className="h-8 w-8 object-cover rounded"
                                  />
                                )}
                                {media.type === 'video' && (
                                  <video
                                    src={media.previewUrl}
                                    className="h-8 w-8 object-cover rounded"
                                  />
                                )}
                                {media.type === 'audio' && (
                                  <div className="h-8 w-8 flex items-center justify-center bg-gray-200 rounded">
                                    <Mic className="h-4 w-4 text-gray-500" />
                                  </div>
                                )}
                                {media.type === 'pdf' && (
                                  <div className="h-8 w-8 flex items-center justify-center bg-gray-200 rounded">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                  </div>
                                )}
                                <span className="text-sm truncate">
                                  {media.file.name}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  URL.revokeObjectURL(media.previewUrl);
                                  setMediaFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded-full ml-2 transition-colors duration-200"
                                title="Remover arquivo"
                              >
                                <X className="h-4 w-4 text-gray-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Prévia */}
            <Card className="lg:col-span-4">
              <div className="p-3 md:p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Prévia</h2>
                </div>

                {/* Container do Celular */}
                <div className="relative mx-auto w-[240px] h-[480px] bg-gray-900 rounded-[2.5rem] shadow-xl border-[12px] border-gray-900 space-y-1">
                  {/* Entalhe do celular */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-20 bg-gray-900 rounded-b-xl"></div>
                  
                  {/* Tela do WhatsApp */}
                  <div className="h-full w-full bg-gray-100 rounded-[1.8rem] overflow-hidden flex flex-col">
                    {/* Barra de Status */}
                    <div className="bg-[#075E54] text-white p-1.5">
                      <div className="flex items-center gap-1.5">
                        <button className="p-0.5" onClick={() => {}}>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
                          </svg>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-xs">Destinatário</div>
                            <div className="text-[10px] text-gray-400">online</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Área de Mensagens */}
                    <div className="flex-1 bg-[#E5DDD5] p-3 space-y-3 overflow-y-auto" style={{ height: "calc(100% - 90px)" }}>
                      {/* Mensagem do usuário */}
                      <div className="flex justify-end">
                        <div className="bg-[#DCF8C6] rounded-lg p-2 max-w-[80%] shadow-sm">
                          {mediaFiles.map((media, index) => (
                            <div key={index} className="mb-2">
                              {media.type === 'image' && (
                                <img
                                  src={media.previewUrl}
                                  alt="Preview"
                                  className="max-w-full rounded"
                                />
                              )}
                              {media.type === 'video' && (
                                <video
                                  src={media.previewUrl}
                                  className="max-w-full rounded"
                                  controls
                                />
                              )}
                              {media.type === 'audio' && (
                                <audio
                                  src={media.previewUrl}
                                  className="max-w-full"
                                  controls
                                />
                              )}
                              {media.type === 'pdf' && (
                                <FileText className="h-7 w-7 text-gray-400" />
                              )}
                            </div>
                          ))}
                          
                          <p 
                            className="text-xs whitespace-pre-wrap break-words mt-1.5 [&>strong]:font-bold [&>em]:italic [&>del]:line-through [&>code]:font-mono [&>code]:bg-gray-100 [&>code]:px-1 [&>code]:rounded"
                            dangerouslySetInnerHTML={{ 
                              __html: formatWhatsAppMarkdown(message) 
                            }}
                          />

                          <div className="flex justify-end items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">12:00</span>
                            <span className="text-[10px] text-blue-500">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Input */}
                    <div className="bg-gray-200 p-1.5">
                      <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5">
                        <Smile className="w-4 h-4 text-gray-500" />
                        <div className="flex-1 text-xs text-gray-400">Digite uma mensagem</div>
                        <Mic className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Diálogo de confirmação */}
            <Dialog
              open={showConfirm}
              title="Confirmar envio de mensagem"
              onClose={() => setShowConfirm(false)}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Filtros selecionados:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFilters.map(filter => (
                      <span
                        key={`${filter.type}-${filter.id}`}
                        className="px-2 py-1 rounded-full text-sm bg-gray-100"
                      >
                        {filter.label}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Mensagem:</h3>
                  <p className="text-sm bg-gray-50 p-3 rounded">{message}</p>
                </div>

                {mediaFiles.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Arquivos:</h3>
                    <div className="space-y-1">
                      {mediaFiles.map((media, index) => (
                        <div key={index} className="text-sm">
                          📎 {media.file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm bg-yellow-50 p-3 rounded">
                  <Users className="h-4 w-4 text-yellow-500" />
                  <span>Esta mensagem será enviada para <strong>
                    {typeof totalEleitores === 'number' ? totalEleitores.toLocaleString('pt-BR') : '0'}
                  </strong> destinatários</span>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmSend}
                    className="px-3 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Disparar Mensagem
                  </button>
                </div>
              </div>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
