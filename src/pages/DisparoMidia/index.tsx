import { useState, useRef, useEffect } from 'react';
import { Send, Filter, Bold, Italic, Strikethrough, Code, Link, Image, Video, Mic, Smile, Users, X, FileText, ChevronLeft, Plus } from 'lucide-react';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../hooks/useToast';
import { supabaseClient } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { MessageTag } from '../../components/MessageTag';
import { GreetingMenu } from '../../components/GreetingMenu';

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

const STORAGE_BUCKET = 'uploads';

const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB por chunk para arquivos grandes

// Função para sanitizar strings (remover caracteres especiais)
const sanitizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '') // Remove caracteres especiais
    .trim();
};

// Função para sanitizar nomes de arquivo
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '_') // Substitui caracteres especiais por underscore
    .trim();
};

const uploadInChunks = async (file: File, fileName: string, bucketName: string): Promise<string> => {
  console.log('Iniciando upload em chunks:', {
    tamanhoTotal: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    tamanhoChunk: `${(CHUNK_SIZE / (1024 * 1024)).toFixed(2)}MB`,
    numeroChunks: Math.ceil(file.size / CHUNK_SIZE)
  });

  const chunks: Blob[] = [];
  let uploadedSize = 0;

  // Dividir arquivo em chunks
  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    chunks.push(file.slice(start, end));
  }

  console.log(`Arquivo dividido em ${chunks.length} chunks`);

  try {
    // Upload do primeiro chunk
    console.log('Enviando primeiro chunk...');
    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(fileName, chunks[0], {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Erro no primeiro chunk:', uploadError);
      throw uploadError;
    }

    uploadedSize += chunks[0].size;
    console.log(`Progresso: ${Math.round((uploadedSize / file.size) * 100)}%`);

    // Upload dos chunks restantes
    for (let i = 1; i < chunks.length; i++) {
      console.log(`Enviando chunk ${i + 1} de ${chunks.length}...`);
      const { error: appendError } = await supabaseClient.storage
        .from(bucketName)
        .upload(fileName, chunks[i], {
          upsert: true,
          contentType: file.type
        });

      if (appendError) {
        console.error(`Erro no chunk ${i + 1}:`, appendError);
        throw appendError;
      }

      uploadedSize += chunks[i].size;
      console.log(`Progresso: ${Math.round((uploadedSize / file.size) * 100)}%`);
    }

    console.log('Upload em chunks concluído com sucesso');

    // Retornar URL pública
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Erro no upload em chunks:', error);
    throw error;
  }
};

const uploadFile = async (file: File, fileName: string, empresaNome: string): Promise<string> => {
  try {
    if (!empresaNome) {
      throw new Error('Nome da empresa não encontrado. Por favor, recarregue a página.');
    }

    // Verificar tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. O tamanho máximo permitido é ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Sanitizar o nome do bucket
    const bucketName = sanitizeString(empresaNome);

    // Criar o nome do arquivo sanitizado com timestamp
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop();
    const baseFileName = sanitizeFileName(fileName.substring(0, fileName.lastIndexOf('.')));
    const newFileName = `${timestamp}-${baseFileName}.${fileExt}`;
    
    console.log('Tentando upload do arquivo:', {
      nome: newFileName,
      tamanho: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      tipo: file.type,
      bucket: bucketName
    });

    // Para arquivos maiores que 5MB, usar upload em chunks direto
    if (file.size > 5 * 1024 * 1024) {
      console.log('Arquivo grande detectado, usando upload em chunks...');
      return await uploadInChunks(file, newFileName, bucketName);
    }

    // Para arquivos pequenos, tentar upload normal
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(newFileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Erro detalhado do upload:', uploadError);
      
      if (uploadError.message?.includes('Bucket not found')) {
        throw new Error(`Bucket '${bucketName}' não encontrado. Por favor, verifique as configurações de armazenamento.`);
      }
      
      if (uploadError.statusCode === 500) {
        console.log('Erro 500 detectado, tentando upload em chunks como fallback...');
        return await uploadInChunks(file, newFileName, bucketName);
      }
      
      throw new Error('Erro ao fazer upload do arquivo: ' + uploadError.message);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    console.log('Upload concluído com sucesso:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Erro no upload:', error);
    throw error;
  }
};

export function DisparoMidia() {
  const company = useCompanyStore((state) => state.company);
  const user = useAuthStore((state) => state.user);
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
  }>({ success: false, message: '' });
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<{
    step: string;
    detail: string;
    status: 'loading' | 'success' | 'error';
  }>({ step: '', detail: '', status: 'loading' });
  const [showEmojis, setShowEmojis] = useState(false);
  const [showGreetings, setShowGreetings] = useState(false);
  const [includeUserName, setIncludeUserName] = useState(true);
  const [selectedGreeting, setSelectedGreeting] = useState<string | null>('Olá {nome_eleitor}. Tudo bem?');
  const [categorias, setCategorias] = useState<FilterOption[]>([]);
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({
    cidade: [],
    bairro: [],
    categoria: [],
    genero: [
      { id: '1', value: 'masculino', label: 'Masculino', type: 'genero' },
      { id: '2', value: 'feminino', label: 'Feminino', type: 'genero' },
    ],
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const [totalEleitores, setTotalEleitores] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const navigate = useNavigate();

  const greetings = [
    { id: 1, text: 'Olá {nome_eleitor}. Tudo bem?' },
    { id: 2, text: 'Olá' },
    { id: 3, text: 'Oi' },
    { id: 4, text: 'Bom dia' },
    { id: 5, text: 'Boa tarde' },
    { id: 6, text: 'Boa noite' },
  ];

  const handleRemoveTag = () => {
    setSelectedGreeting(null);
    // Clear the greeting from the message if it exists at the start
    setMessage(prevMessage => {
      const lines = prevMessage.split('\n');
      if (lines[0].includes('{nome_eleitor}')) {
        // Remove the first line and any empty lines that follow
        while (lines.length > 0 && !lines[0].trim()) {
          lines.shift();
        }
        return lines.join('\n');
      }
      return prevMessage;
    });
  };

  const handleEditTag = (newTag: string) => {
    setSelectedGreeting(newTag);
  };

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
      }
    };

    fetchFilterOptions();
  }, [showToast]);

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
    // Remove default greeting initialization
    setMessage('');
  }, []);

  useEffect(() => {
    setFilterOptions(prev => ({
      ...prev,
      categoria: categorias
    }));
  }, [categorias]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar empresa_uid do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa_uid) {
          console.error('Erro ao buscar usuário:', userError);
          return;
        }

        console.log('Buscando categorias para empresa:', userData.empresa_uid);

        // Buscar categorias da empresa
        const { data: categoriasData, error: categoriasError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, descricao')
          .eq('empresa_uid', userData.empresa_uid)
          .order('nome');

        if (categoriasError) {
          console.error('Erro ao buscar categorias:', categoriasError);
          return;
        }

        console.log('Categorias encontradas:', categoriasData);

        // Converter para o formato FilterOption
        const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
          id: cat.uid,
          value: cat.uid,
          label: cat.nome,
          type: 'categoria'
        }));

        console.log('Categorias formatadas:', categoriasFormatted);

        setCategorias(categoriasFormatted);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Buscar empresa_uid do usuário atual
        const authStore = useAuthStore.getState();
        const user = authStore.getStoredUser();
        
        if (!user?.uid) {
          console.error('Usuário não autenticado');
          return;
        }

        // Buscar dados da empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select(`
            empresa_uid,
            empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
              uid
            )
          `)
          .eq('uid', user.uid)
          .single();

        if (userError || !userData?.empresa) {
          console.error('Erro ao buscar empresa:', userError);
          return;
        }

        const empresaUid = userData.empresa.uid;
        console.log('Buscando dados para empresa UID:', empresaUid);

        // Buscar cidades únicas da empresa
        const { data: cidadesData, error: cidadesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', empresaUid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade');

        if (cidadesError) {
          console.error('Erro ao buscar cidades:', cidadesError);
          return;
        }

        console.log('Cidades encontradas:', cidadesData);

        // Buscar bairros únicos da empresa
        const { data: bairrosData, error: bairrosError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', empresaUid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro');

        if (bairrosError) {
          console.error('Erro ao buscar bairros:', bairrosError);
          return;
        }

        console.log('Bairros encontrados:', bairrosData);

        // Remover duplicatas e formatar os dados
        const uniqueCidades = Array.from(new Set(cidadesData.map(item => item.cidade)))
          .filter(cidade => cidade && cidade.trim()) // Remove valores vazios
          .map(cidade => ({
            id: cidade,
            label: cidade,
            value: cidade,
            type: 'cidade' as const
          }));

        const uniqueBairros = Array.from(new Set(bairrosData.map(item => item.bairro)))
          .filter(bairro => bairro && bairro.trim()) // Remove valores vazios
          .map(bairro => ({
            id: bairro,
            label: bairro,
            value: bairro,
            type: 'bairro' as const
          }));

        console.log('Cidades formatadas:', uniqueCidades);
        console.log('Bairros formatadas:', uniqueBairros);

        setFilterOptions(prev => ({
          ...prev,
          cidade: uniqueCidades,
          bairro: uniqueBairros
        }));

      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error);
        showToast('Erro ao carregar opções de filtro', 'error');
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
      textarea.setSelectionRange(
        start + emoji.length,
        start + emoji.length
      );
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
    // Se for um filtro de gênero, remove qualquer outro filtro de gênero existente
    if (filter.type === 'genero') {
      setSelectedFilters(prev => prev.filter(f => f.type !== 'genero').concat(filter));
    } else {
      // Para outros tipos, mantém o comportamento normal
      setSelectedFilters(prev => {
        // Verifica se o filtro já existe
        const exists = prev.some(f => f.id === filter.id);
        if (!exists) {
          return [...prev, filter];
        }
        return prev;
      });
    }
  };

  const handleRemoveFilter = (filter: FilterOption) => {
    setSelectedFilters(selectedFilters.filter(f => !(f.id === filter.id && f.type === filter.type)));
  };

  const handleSend = async () => {
    setShowConfirm(true);
  };

  const confirmSend = async () => {
    try {
      setShowConfirm(false);
      setShowProgress(true);
      setProgress({
        step: 'Iniciando processo',
        detail: 'Verificando autenticação...',
        status: 'loading'
      });

      // Verificar autenticação usando AuthStore
      const authStore = useAuthStore.getState();
      const user = authStore.getStoredUser();
      
      if (!user?.uid) {
        throw new Error('Usuário não está autenticado. Por favor, faça login novamente.');
      }

      setProgress({
        step: 'Verificando dados',
        detail: 'Buscando informações do usuário...',
        status: 'loading'
      });

      // Buscar dados do usuário incluindo nome
      const { data: userData, error: userError } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
          nome,
          empresa_uid,
          empresa:gbp_empresas!gbp_usuarios_empresa_uid_fkey (
            uid
          )
        `)
        .eq('uid', user.uid)
        .single();

      if (userError) {
        throw new Error('Não foi possível carregar seus dados. Por favor, tente novamente.');
      }

      setProgress({
        step: 'Preparando mensagem',
        detail: 'Processando informações...',
        status: 'loading'
      });

      // Pegar o texto exato da tag de mensagem
      const saudacao = "Olá {nome_eleitor}. Tudo bem?";
      const qtde = totalEleitores || 0;
      const nome_disparo = message.includes('{nome_eleitor}');

      setProgress({
        step: 'Salvando',
        detail: 'Registrando mensagem no banco de dados...',
        status: 'loading'
      });

      // Inserir o disparo no banco
      const { error: insertError } = await supabaseClient
        .from('gbp_disparo')
        .insert({
          disparo_id: Date.now(),
          empresa_uid: userData.empresa.uid,
          empresa_nome: userData.empresa.nome,
          token: userData.empresa.token,
          instancia: userData.empresa.instancia || "whatsapp",
          porta: userData.empresa.porta || "8080",
          upload: mediaFiles.length > 0 ? mediaFiles.map(media => media.previewUrl) : null,
          categoria: categorias.length > 0 ? categorias.map(cat => cat.label) : null,
          mensagem: message,
          usuario_uid: userData.nome,
          bairro: selectedFilters.filter(f => f.type === 'bairro').map(f => f.value),
          cidade: selectedFilters.filter(f => f.type === 'cidade').map(f => f.value),
          nome_disparo,
          qtde,
          saudacao
        });

      if (insertError) {
        throw new Error('Não foi possível salvar a mensagem. Por favor, tente novamente.');
      }

      // Atualizar progresso com sucesso
      setProgress({
        step: 'Concluído',
        detail: 'Mensagem registrada com sucesso!',
        status: 'success'
      });

      // Aguardar 2 segundos antes de resetar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Resetar o formulário
      resetForm();

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setProgress({
        step: 'Erro',
        detail: error instanceof Error ? error.message : 'Erro ao processar sua solicitação',
        status: 'error'
      });
    }
  };

  // Atualizar o progresso do upload em chunks
  const onUploadProgress = (progress: number) => {
    setUploadProgress(progress);
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

  const resetForm = () => {
    setMessage('');
    setMediaFiles([]);
    setSelectedFilters([]);
    setShowConfirm(false);
    setShowProgress(false);
    setProgress({ step: '', detail: '', status: 'loading' });
    setMessage('');
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
                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">Filtros</h2>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {selectedFilters.length} selecionado(s)
                    </span>
                  </div>

                  {/* Campos de filtro com tags */}
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Users className="w-4 h-4" />
                        Cidade
                      </label>
                      <div className="relative">
                        <div className="w-full border rounded-xl focus-within:ring-2 focus-within:ring-primary/50 bg-white shadow-sm">
                          {/* Container para as tags com scroll */}
                          <div className="max-h-[120px] overflow-y-auto scrollbar-thin">
                            <div className="flex flex-wrap gap-2 p-3">
                              {selectedFilters.filter(f => f.type === 'cidade').map((filter) => (
                                <div
                                  key={filter.value}
                                  className="group inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 hover:to-primary/15 text-primary-600 rounded-full text-sm font-medium shadow-sm transition-all duration-200 ease-in-out"
                                >
                                  <Users className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  {filter.label}
                                  <button
                                    onClick={() => handleRemoveFilter(filter)}
                                    className="ml-0.5 p-1 -mr-1 hover:bg-primary/10 rounded-full transition-colors duration-200"
                                    aria-label="Remover filtro"
                                  >
                                    <X className="w-3 h-3 opacity-70 hover:opacity-100 transition-opacity" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Dropdown sempre visível na parte inferior */}
                          <div className="p-2.5 border-t bg-gray-50/80 backdrop-blur-sm">
                            <select
                              className="w-full outline-none bg-transparent text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                              value=""
                              onChange={(e) => {
                                const option = filterOptions.cidade.find(o => o.value === e.target.value);
                                if (option) handleAddFilter(option);
                              }}
                            >
                              <option value="" className="text-gray-500">Selecione uma cidade...</option>
                              {filterOptions.cidade.map((option) => (
                                <option key={option.value} value={option.value} className="text-gray-900">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Link className="w-4 h-4" />
                        Bairro
                      </label>
                      <div className="relative">
                        <div className="w-full border rounded-xl focus-within:ring-2 focus-within:ring-primary/50 bg-white shadow-sm">
                          {/* Container para as tags com scroll */}
                          <div className="max-h-[120px] overflow-y-auto scrollbar-thin">
                            <div className="flex flex-wrap gap-2 p-3">
                              {selectedFilters.filter(f => f.type === 'bairro').map((filter) => (
                                <div
                                  key={filter.id}
                                  className="group inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 hover:to-primary/15 text-primary-600 rounded-full text-sm font-medium shadow-sm transition-all duration-200 ease-in-out"
                                >
                                  <Link className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  {filter.label}
                                  <button
                                    onClick={() => handleRemoveFilter(filter)}
                                    className="ml-0.5 p-1 -mr-1 hover:bg-primary/10 rounded-full transition-colors duration-200"
                                    aria-label="Remover filtro"
                                  >
                                    <X className="w-3 h-3 opacity-70 hover:opacity-100 transition-opacity" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Dropdown sempre visível na parte inferior */}
                          <div className="p-2.5 border-t bg-gray-50/80 backdrop-blur-sm">
                            <select
                              className="w-full outline-none bg-transparent text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                              value=""
                              onChange={(e) => {
                                const option = filterOptions.bairro.find(o => o.value === e.target.value);
                                if (option) handleAddFilter(option);
                              }}
                            >
                              <option value="" className="text-gray-500">Selecione um bairro...</option>
                              {filterOptions.bairro.map((option) => (
                                <option key={option.id} value={option.value} className="text-gray-900">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="w-4 h-4" />
                        Categoria
                      </label>
                      <div className="relative">
                        <div className="w-full border rounded-xl focus-within:ring-2 focus-within:ring-primary/50 bg-white shadow-sm">
                          {/* Container para as tags com scroll */}
                          <div className="max-h-[120px] overflow-y-auto scrollbar-thin">
                            <div className="flex flex-wrap gap-2 p-3">
                              {selectedFilters.filter(f => f.type === 'categoria').map((filter) => (
                                <div
                                  key={filter.id}
                                  className="group inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 hover:to-primary/15 text-primary-600 rounded-full text-sm font-medium shadow-sm transition-all duration-200 ease-in-out"
                                >
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  {filter.label}
                                  <button
                                    onClick={() => handleRemoveFilter(filter)}
                                    className="ml-0.5 p-1 -mr-1 hover:bg-primary/10 rounded-full transition-colors duration-200"
                                    aria-label="Remover filtro"
                                  >
                                    <X className="w-3 h-3 opacity-70 hover:opacity-100 transition-opacity" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Dropdown sempre visível na parte inferior */}
                          <div className="p-2.5 border-t bg-gray-50/80 backdrop-blur-sm">
                            <select
                              className="w-full outline-none bg-transparent text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                              value=""
                              onChange={(e) => {
                                const option = filterOptions.categoria.find(o => o.value === e.target.value);
                                if (option) handleAddFilter(option);
                              }}
                            >
                              <option value="" className="text-gray-500">Selecione uma categoria...</option>
                              {filterOptions.categoria.map((option) => (
                                <option key={option.id} value={option.value} className="text-gray-900">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Users className="w-4 h-4" />
                        Gênero
                      </label>
                      <div className="relative">
                        <div className="w-full border rounded-xl focus-within:ring-2 focus-within:ring-primary/50 bg-white shadow-sm">
                          {/* Container para as tags com scroll */}
                          <div className="max-h-[120px] overflow-y-auto scrollbar-thin">
                            <div className="flex flex-wrap gap-2 p-3">
                              {selectedFilters.filter(f => f.type === 'genero').map((filter) => (
                                <div
                                  key={filter.id}
                                  className="group inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 hover:-to-primary/15 text-primary-600 rounded-full text-sm font-medium shadow-sm transition-all duration-200 ease-in-out"
                                >
                                  <Users className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  {filter.label}
                                  <button
                                    onClick={() => handleRemoveFilter(filter)}
                                    className="ml-0.5 p-1 -mr-1 hover:bg-primary/10 rounded-full transition-colors duration-200"
                                    aria-label="Remover filtro"
                                  >
                                    <X className="w-3 h-3 opacity-70 hover:opacity-100 transition-opacity" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Dropdown sempre visível na parte inferior */}
                          <div className="p-2.5 border-t bg-gray-50/80 backdrop-blur-sm">
                            <select
                              className="w-full outline-none bg-transparent text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                              value=""
                              onChange={(e) => {
                                const option = filterOptions.genero.find(o => o.value === e.target.value);
                                if (option) handleAddFilter(option);
                              }}
                            >
                              <option value="" className="text-gray-500">Selecione um gênero...</option>
                              {filterOptions.genero.map((option) => (
                                <option key={option.id} value={option.value} className="text-gray-900">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                          <MessageTag
                            tag={selectedGreeting}
                            onRemove={handleRemoveTag}
                            onEdit={handleEditTag}
                          />
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
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
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
            
            {/* Barra de Progresso */}
            {loading && (
              <div className="fixed top-0 left-0 right-0 z-50">
                <div className="bg-gray-200 h-2">
                  <div 
                    className="bg-blue-600 h-2 transition-all duration-300"
                    style={{ 
                      width: `${Math.max(uploadProgress, totalProgress)}%`
                    }}
                  />
                </div>
                {uploadProgress > 0 && (
                  <div className="text-center text-sm text-gray-600">
                    Enviando arquivo: {Math.round(uploadProgress)}%
                  </div>
                )}
                {totalProgress > 0 && (
                  <div className="text-center text-sm text-gray-600">
                    Progresso total: {Math.round(totalProgress)}%
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
