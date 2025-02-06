import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControlLabel,
  TextField,
  Typography,
  Switch,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { QRCodeSVG } from 'qrcode.react';
import { ContentCopy, Share, QrCode2, CategoryOutlined } from '@mui/icons-material';
import { supabaseClient } from '../../../../lib/supabase';
import { useCompanyStore } from '../../../../store/useCompanyStore';
import { categoryService } from '../../../../services/categories';
import { Category } from '../../../../types/category';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Field {
  id: string;
  label: string;
  isAnexo?: boolean;
}

interface FormConfig {
  uid: string;
  categoria_uid: string;
  campos_config: string[];
  form_status: boolean;
  registration_limit: number;
  empresa_uid: string;
  url_slug: string | null;
  form_title: string;
  form_title_color: string;
  form_logo_url: string | null;
  form_theme: {
    primaryColor: string;
    backgroundColor: string;
    subtitle?: string;
    subtitleColor?: string;
  };
}

interface Category {
  uid: string;
  nome: string;
  empresa_uid: string;
  created_at: string;
  tipo_uid: string;
  tipo?: {
    uid: string;
    nome: string;
  };
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: theme.shadows[2]
}));

const fields: Field[] = [
  { id: 'nome', label: 'Nome' },
  { id: 'cpf', label: 'CPF' },
  { id: 'nascimento', label: 'Data de Nascimento' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'genero', label: 'Gênero' },
  { id: 'titulo', label: 'Título de Eleitor' },
  { id: 'zona', label: 'Zona' },
  { id: 'secao', label: 'Seção' },
  { id: 'cep', label: 'CEP' },
  { id: 'logradouro', label: 'Logradouro' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'bairro', label: 'Bairro' },
  { id: 'numero', label: 'Número' },
  { id: 'complemento', label: 'Complemento' },
  { id: 'nome_mae', label: 'Nome da Mãe' }
];

const documentosDisponiveis = [
  { id: 'rg_cnh', label: 'RG/CNH' },
  { id: 'cpf_anexo', label: 'CPF' },
  { id: 'certidao_nascimento', label: 'Certidão de Nascimento' },
  { id: 'titulo_eleitor', label: 'Título de Eleitor' },
  { id: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { id: 'foto_3x4', label: 'Foto 3x4' }
];

const predefinedColors = [
  { name: 'Branco', color: '#ffffff' },
  { name: 'Azul', color: '#1976d2' },
  { name: 'Verde', color: '#2e7d32' },
  { name: 'Vermelho', color: '#d32f2f' },
  { name: 'Roxo', color: '#7b1fa2' },
  { name: 'Laranja', color: '#ed6c02' },
  { name: 'Rosa', color: '#c2185b' },
  { name: 'Cinza', color: '#424242' },
  { name: 'Preto', color: '#000000' }
];

const predefinedBackgrounds = [
  // Cores Claras
  { name: 'Branco', color: '#ffffff' },
  { name: 'Azul Claro', color: '#e3f2fd' },
  { name: 'Verde Claro', color: '#e8f5e9' },
  { name: 'Rosa Claro', color: '#fce4ec' },
  { name: 'Cinza Claro', color: '#f5f5f5' },
  // Cores Escuras
  { name: 'Azul Escuro', color: '#1a237e' },
  { name: 'Verde Escuro', color: '#1b5e20' },
  { name: 'Vermelho Escuro', color: '#b71c1c' },
  { name: 'Roxo Escuro', color: '#4a148c' },
  { name: 'Cinza Escuro', color: '#212121' },
  { name: 'Azul Marinho', color: '#0d47a1' },
  { name: 'Verde Musgo', color: '#33691e' },
  { name: 'Preto', color: '#000000' }
];

export default function GerenciarFormulario() {
  const { id: formularioId } = useParams();
  const company = useCompanyStore((state) => state.company);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [tiposCategorias, setTiposCategorias] = useState<{uid: string; nome: string}[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [formConfigs, setFormConfigs] = useState<FormConfig[]>([]);
  const [pendingChanges, setPendingChanges] = useState<FormConfig | null>(null);
  const [formularioAtivo, setFormularioAtivo] = useState(false);
  const [limiteCadastros, setLimiteCadastros] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formUrl, setFormUrl] = useState<string>('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);

  // Estados de personalização
  const [formTitle, setFormTitle] = useState<string>('Formulário de Cadastro');
  const [formTitleColor, setFormTitleColor] = useState<string>('#000000');
  const [formLogoUrl, setFormLogoUrl] = useState<string>('');
  const [themePrimaryColor, setThemePrimaryColor] = useState<string>('#1976d2');
  const [themeBackgroundColor, setThemeBackgroundColor] = useState<string>('#f5f5f5');
  const [themeSubtitle, setThemeSubtitle] = useState<string>('');
  const [themeSubtitleColor, setThemeSubtitleColor] = useState<string>('#666666');

  // Efeito para carregar configurações quando a categoria é selecionada
  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        if (!selectedCategoria || !company?.uid) return;

        const { data: existingConfig, error } = await supabaseClient
          .from('gbp_form_config')
          .select('*')
          .eq('categoria_uid', selectedCategoria)
          .eq('empresa_uid', company.uid)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar configurações:', error);
          return;
        }

        if (existingConfig) {
          // Atualiza os estados com os valores do banco
          setFormConfig(existingConfig);
          setPendingChanges(existingConfig);
          setFormularioAtivo(existingConfig.form_status ?? true);
          setLimiteCadastros(existingConfig.registration_limit || 0);
          
          // Atualiza estados de personalização
          setFormTitle(existingConfig.form_title || 'Formulário de Cadastro');
          setFormTitleColor(existingConfig.form_title_color || '#000000');
          setFormLogoUrl(existingConfig.form_logo_url || '');

          // Processa o form_theme
          const theme = existingConfig.form_theme ? 
            (typeof existingConfig.form_theme === 'string' ? 
              JSON.parse(existingConfig.form_theme) : 
              existingConfig.form_theme
            ) : 
            { primaryColor: '#1976d2', backgroundColor: '#f5f5f5' };

          setThemePrimaryColor(theme.primaryColor || '#1976d2');
          setThemeBackgroundColor(theme.backgroundColor || '#f5f5f5');
          setThemeSubtitle(theme.subtitle || '');
          setThemeSubtitleColor(theme.subtitleColor || '#666666');
        } else {
          // Reset para valores padrão
          setFormConfig(null);
          setPendingChanges(null);
          setFormularioAtivo(true);
          setLimiteCadastros(0);
          
          // Reset dos estados de personalização
          setFormTitle('Formulário de Cadastro');
          setFormTitleColor('#000000');
          setFormLogoUrl('');
          setThemePrimaryColor('#1976d2');
          setThemeBackgroundColor('#f5f5f5');
          setThemeSubtitle('');
          setThemeSubtitleColor('#666666');
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadFormConfig();
  }, [selectedCategoria, company?.uid]);

  // Atualiza pendingChanges quando os valores de personalização mudam
  useEffect(() => {
    if (pendingChanges) {
      setPendingChanges(prev => ({
        ...prev,
        form_title: formTitle,
        form_title_color: formTitleColor,
        form_logo_url: formLogoUrl,
        form_theme: {
          primaryColor: themePrimaryColor,
          backgroundColor: themeBackgroundColor,
          subtitle: themeSubtitle,
          subtitleColor: themeSubtitleColor
        }
      }));
    }
  }, [formTitle, formTitleColor, formLogoUrl, themePrimaryColor, themeBackgroundColor, themeSubtitle, themeSubtitleColor]);

  // Carregar categorias
  const loadCategorias = async () => {
    try {
      setIsLoading(true);
      const { data: categorias, error: categoriasError } = await supabaseClient
        .from('gbp_categorias')
        .select(`
          uid, 
          nome, 
          empresa_uid, 
          created_at,
          tipo_uid,
          tipo:gbp_categoria_tipos(uid, nome)
        `)
        .eq('empresa_uid', company?.uid)
        .order('nome');

      if (categoriasError) throw categoriasError;
      setCategorias(categorias || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (company?.uid) {
      loadCategorias();
    }
  }, [company?.uid]);

  // Carregar dados iniciais quando o ID do formulário estiver disponível
  useEffect(() => {
    if (formularioId && company?.uid) {
      loadFormularioById(formularioId);
    }
  }, [formularioId, company?.uid]);

  // Carregar configurações do formulário
  const loadFormularioById = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Primeiro tenta buscar por url_slug
      let query = supabaseClient
        .from('gbp_form_config')
        .select('*')
        .eq('empresa_uid', company?.uid);

      // Verifica se é um UUID válido
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        query = query.eq('categoria_uid', id);
      } else {
        query = query.eq('url_slug', id);
      }

      const { data: configs, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações:', error);
        throw new Error('Erro ao carregar configurações do formulário');
      }

      // Se não encontrou configuração e é um UUID, cria uma configuração padrão
      if (!configs && isUUID) {
        const defaultConfig: FormConfig = {
          uid: '',
          empresa_uid: company?.uid || '',
          categoria_uid: id,
          campos_config: fields.map(field => 
            JSON.stringify({
              id: field.id,
              visivel: true,
              obrigatorio: false,
              anexo: field.isAnexo || false
            })
          ),
          form_status: true,
          registration_limit: 0,
          form_title: "TESTE - Formulário de Cadastro Personalizado",
          form_title_color: "#FF0000",
          form_logo_url: "",
          form_theme: {
            primaryColor: "#2196F3",
            backgroundColor: "#E3F2FD",
            subtitle: "TESTE - Subtítulo Personalizado",
            subtitleColor: "#1976D2"
          }
        };
        setFormConfig(defaultConfig);
        setPendingChanges(defaultConfig);
        setFormularioAtivo(defaultConfig.form_status);
        setLimiteCadastros(defaultConfig.registration_limit);
        return;
      }
      
      // Se não encontrou e não é UUID, retorna erro
      if (!configs && !isUUID) {
        throw new Error('Formulário não encontrado');
      }

      // Se encontrou configuração, carrega normalmente
      setFormConfig(configs);
      setPendingChanges(configs);
      setFormularioAtivo(configs.form_status);
      setLimiteCadastros(configs.registration_limit);
      setSelectedCategoria(configs.categoria_uid);
      
    } catch (error) {
      console.error('Erro ao carregar configuração do formulário:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar as configurações do formulário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar configurações do formulário
  const loadFormConfigs = async (categoriaUid: string) => {
    try {
      setIsLoading(true);
      
      const { data: existingConfig, error: checkError } = await supabaseClient
        .from('gbp_form_config')
        .select('*')
        .eq('empresa_uid', company?.uid)
        .eq('categoria_uid', categoriaUid)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar configuração existente:', checkError);
        throw checkError;
      }

      if (!existingConfig) {
        // Cria configuração padrão sem salvar no banco
        const defaultConfig: FormConfig = {
          uid: '', // Será gerado ao salvar
          empresa_uid: company?.uid || '',
          categoria_uid: categoriaUid,
          campos_config: fields.map(field => 
            JSON.stringify({
              id: field.id,
              visivel: true,
              obrigatorio: false,
              anexo: field.isAnexo || false
            })
          ),
          form_status: true,
          registration_limit: 0
        };

        setPendingChanges(defaultConfig);
      } else {
        setPendingChanges(existingConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Não foi possível carregar as configurações do formulário');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para alternar o estado visível/obrigatório de um campo
  const handleFieldToggle = (fieldId: string, type: 'visivel' | 'obrigatorio') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    
    setPendingChanges(prevChanges => 
      prevChanges.campos_config[fieldId][type] = checked,
      prevChanges
    );
  };

  // Handler para salvar todas as alterações
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!selectedCategoria || !company?.uid) {
        throw new Error('Categoria ou empresa não selecionada');
      }

      // Garante que campos_config é um array de strings
      const campos_config = Array.isArray(pendingChanges?.campos_config) 
        ? pendingChanges.campos_config.map(campo => String(campo))
        : [];

      // Garante que form_theme é um objeto válido e serializado corretamente
      const form_theme = {
        primaryColor: themePrimaryColor || '#1976d2',
        backgroundColor: themeBackgroundColor || '#f5f5f5',
        subtitle: themeSubtitle || '',
        subtitleColor: themeSubtitleColor || '#666666'
      };

      // Prepara os dados para salvar garantindo tipos corretos
      const formData = {
        categoria_uid: selectedCategoria,
        empresa_uid: company.uid,
        campos_config,
        form_status: Boolean(formularioAtivo),
        registration_limit: Number(limiteCadastros) || 0,
        url_slug: pendingChanges?.url_slug || null,
        form_title: String(formTitle || 'Formulário de Cadastro'),
        form_title_color: String(formTitleColor || '#000000'),
        form_logo_url: formLogoUrl || null,
        form_theme
      };

      // Log para debug
      console.log('Dados a serem salvos:', formData);

      // Verifica se já existe um registro
      const { data: existingConfig, error: fetchError } = await supabaseClient
        .from('gbp_form_config')
        .select('uid')
        .eq('categoria_uid', selectedCategoria)
        .eq('empresa_uid', company.uid)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao verificar configuração existente:', fetchError);
        throw fetchError;
      }

      let savedConfig;
      let error;

      if (existingConfig?.uid) {
        // Update
        const { error: updateError, data } = await supabaseClient
          .from('gbp_form_config')
          .update(formData)
          .eq('uid', existingConfig.uid)
          .select()
          .single();

        error = updateError;
        savedConfig = data;
      } else {
        // Insert
        const { error: insertError, data } = await supabaseClient
          .from('gbp_form_config')
          .insert(formData)
          .select()
          .single();

        error = insertError;
        savedConfig = data;
      }

      if (error) {
        console.error('Erro detalhado ao salvar:', error);
        toast.error(error.message || 'Erro ao salvar as configurações');
        return;
      }

      // Atualiza o estado local
      setFormConfig(savedConfig);
      setPendingChanges(savedConfig);
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Erro detalhado ao salvar configurações:', error);
      toast.error(error.message || 'Erro ao salvar as configurações');
    } finally {
      setIsSaving(false);
    }
  };

  // Carrega as configurações quando a categoria é selecionada
  useEffect(() => {
    if (selectedCategoria && company?.uid) {
      loadFormConfigs(selectedCategoria);
    }
  }, [selectedCategoria, company?.uid]);

  // Handler para o toggle do formulário ativo
  const handleFormularioAtivoToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFormularioAtivo(checked);
    if (pendingChanges) {
      setPendingChanges({
        ...pendingChanges,
        form_status: checked
      });
    }
  };

  // Handler para o limite de cadastros
  const handleLimiteCadastrosChange = (value: number) => {
    setLimiteCadastros(value);
    if (pendingChanges) {
      setPendingChanges({
        ...pendingChanges,
        registration_limit: value
      });
    }
  };

  useEffect(() => {
    if (selectedCategoria && company?.uid) {
      const baseUrl = window.location.origin;
      setFormUrl(`${baseUrl}/cadastro/${selectedCategoria}/${company.uid}`);
    } else {
      setFormUrl('');
    }
  }, [selectedCategoria, company?.uid]);

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSeverity(type);
    setOpenSnackbar(true);
  };

  const handleCopyUrl = async () => {
    const url = getFormUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setShowCopySuccess(true);
      } catch (err) {
        console.error('Erro ao copiar URL:', err);
      }
    }
  };

  const handleDownloadQrCode = () => {
    const svgElement = document.getElementById('form-qrcode')?.querySelector('svg');
    if (!svgElement) return;

    // Criar um canvas com o tamanho desejado (incluindo margem)
    const canvas = document.createElement('canvas');
    const qrSize = 256; // Tamanho base do QR Code
    const margin = 40; // Margem maior para garantir espaço
    const size = qrSize + (margin * 2); // Tamanho total com margens
    canvas.width = size;
    canvas.height = size;

    // Obter o contexto 2D do canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Desenhar fundo branco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // Converter SVG para uma imagem
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    
    // Criar um blob do SVG
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Desenhar a imagem no canvas com margem
      ctx.drawImage(img, margin, margin, qrSize, qrSize);

      // Converter o canvas para PNG e fazer o download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qrcode-formulario-${selectedCategoria}.png`;
      link.href = pngUrl;
      link.click();

      // Limpar a URL do objeto
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const getFormUrl = () => {
    if (!selectedCategoria || !company?.uid) return '';
    const baseUrl = window.location.origin;
    const slug = pendingChanges?.url_slug || selectedCategoria;
    return `${baseUrl}/cadastro/${slug}`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Formulário de Cadastro',
          text: 'Acesse nosso formulário de cadastro',
          url: formUrl
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      handleCopyUrl();
    }
  };

  // Função para converter imagem para base64
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB
        toast.error('A imagem deve ter menos de 500KB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormLogoUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Carregar tipos de categorias
  useEffect(() => {
    const loadTiposCategorias = async () => {
      try {
        setIsLoading(true);
        const { data: tipos, error } = await supabaseClient
          .from('gbp_categoria_tipos')
          .select('uid, nome')
          .eq('empresa_uid', company?.uid)
          .order('nome');

        if (error) throw error;
        setTiposCategorias(tipos || []);
      } catch (error) {
        console.error('Erro ao carregar tipos de categorias:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os tipos de categorias",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (company?.uid) {
      loadTiposCategorias();
    }
  }, [company?.uid]);

  // Atualizar lista de categorias quando selecionar um tipo
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setIsLoading(true);
        const query = supabaseClient
          .from('gbp_categorias')
          .select('uid, nome, empresa_uid, created_at, tipo_uid')
          .eq('empresa_uid', company?.uid);

        if (selectedTipo) {
          query.eq('tipo_uid', selectedTipo);
        }

        const { data: categorias, error: categoriasError } = await query.order('nome');

        if (categoriasError) throw categoriasError;
        setCategorias(categorias || []);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as categorias",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (company?.uid) {
      loadCategorias();
    }
  }, [company?.uid, selectedTipo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress size={40} color="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-12">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800">
        <header className="mx-auto max-w-7xl px-4 py-6 pb-8 sm:py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 pb-4 sm:pb-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Gerenciar Formulário de Cadastro
              </h1>
              <p className="mt-1 sm:mt-2 text-sm text-blue-100">
                Configure os campos e documentos necessários para o formulário de cadastro.
              </p>
            </div>
            {selectedCategoria && (
              <div className="flex items-center space-x-3 bg-white/10 px-3 sm:px-4 py-2 rounded-lg shrink-0">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formularioAtivo}
                      onChange={handleFormularioAtivoToggle}
                      color="primary"
                      size="medium"
                    />
                  }
                  label={
                    <Typography className="text-sm sm:text-base text-white font-medium">
                      {formularioAtivo ? "Formulário Ativo" : "Formulário Inativo"}
                    </Typography>
                  }
                />
              </div>
            )}
          </div>
        </header>
      </div>

      {/* Aviso Informativo */}
      <div className="mx-auto max-w-7xl px-4 -mt-6 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white rounded-lg border border-blue-100 p-4 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                Importante: Configurações por Categoria
              </h3>
              <div className="mt-1 text-sm text-gray-500">
                As configurações de campos e documentos são específicas para cada categoria. 
                Ao gerar URLs para diferentes categorias, você pode personalizar quais campos 
                e documentos serão exibidos em cada formulário. Isso permite criar formulários 
                customizados para cada tipo de cadastro.
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="space-y-6">
            {/* Select da Categoria */}
            <div className="bg-white rounded-lg border-0 p-6 shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="flex flex-col space-y-4">
                <div className="text-center max-w-lg mx-auto">
                  <h2 className="text-lg font-medium text-gray-900">Selecione a Categoria</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Escolha uma categoria para configurar seus campos e documentos
                  </p>
                </div>
                <FormControl fullWidth size="medium">
                  <InputLabel id="tipo-select-label">Tipo de Categoria</InputLabel>
                  <Select
                    labelId="tipo-select-label"
                    value={selectedTipo}
                    label="Tipo de Categoria"
                    onChange={(e) => {
                      setSelectedTipo(e.target.value);
                      setSelectedCategoria(''); // Limpa a categoria selecionada
                    }}
                    sx={{
                      '& .MuiSelect-select': {
                        padding: '14px',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2563eb',
                      },
                      marginBottom: 2
                    }}
                  >
                    <MenuItem value="">
                      <em>Todos os tipos</em>
                    </MenuItem>
                    {tiposCategorias.map((tipo) => (
                      <MenuItem 
                        key={tipo.uid} 
                        value={tipo.uid}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#eff6ff',
                          },
                          '&.Mui-selected': {
                            backgroundColor: '#bfdbfe',
                            '&:hover': {
                              backgroundColor: '#93c5fd',
                            },
                          },
                        }}
                      >
                        <div className="flex items-center py-1">
                          <CategoryOutlined className="w-5 h-5 mr-2 text-blue-600" />
                          <span>{tipo.nome}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="medium">
                  <InputLabel id="categoria-select-label">Categoria</InputLabel>
                  <Select
                    labelId="categoria-select-label"
                    value={selectedCategoria}
                    label="Categoria"
                    onChange={(e) => {
                      setSelectedCategoria(e.target.value);
                      loadFormConfigs(e.target.value);
                    }}
                    sx={{
                      '& .MuiSelect-select': {
                        padding: '14px',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2563eb',
                      },
                    }}
                  >
                    {categorias.map((categoria) => (
                      <MenuItem 
                        key={categoria.uid} 
                        value={categoria.uid}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#eff6ff',
                          },
                          '&.Mui-selected': {
                            backgroundColor: '#bfdbfe',
                            '&:hover': {
                              backgroundColor: '#93c5fd',
                            },
                          },
                        }}
                      >
                        <div className="flex items-center justify-between w-full py-1">
                          <div className="flex items-center">
                            <CategoryOutlined className="w-5 h-5 mr-2 text-blue-600" />
                            <span>{categoria.nome}</span>
                          </div>
                          {categoria.tipo && (
                            <span className="text-sm text-gray-500 ml-2">
                              {categoria.tipo.nome}
                            </span>
                          )}
                        </div>
                      </MenuItem>
                    ))}
                  </Select>
                  {categorias.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      {categorias.length} {categorias.length === 1 ? 'categoria disponível' : 'categorias disponíveis'}
                    </p>
                  )}
                </FormControl>
              </div>
            </div>

            {selectedCategoria && pendingChanges && (
              <>
                {/* URL do Formulário */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      URL do Formulário
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* QR Code */}
                      <div id="form-qrcode" className="w-48 h-48 bg-white p-2 border border-gray-200 rounded-lg flex items-center justify-center">
                        <QRCodeSVG
                          value={getFormUrl()}
                          size={256}
                          level="H"
                          includeMargin={false}
                          style={{ width: '176px', height: '176px' }}
                        />
                      </div>

                      {/* URL e Botões */}
                      <div className="flex-1 flex flex-col gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Personalizar URL:</div>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Digite um identificador personalizado para a URL"
                            value={pendingChanges?.url_slug || ''}
                            onChange={(e) => {
                              if (!pendingChanges) return;
                              setPendingChanges({
                                ...pendingChanges,
                                url_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                              });
                            }}
                            helperText="Use apenas letras minúsculas, números e hífens"
                          />
                        </div>

                        <div>
                          <div className="text-sm text-gray-600 mb-2">URL do formulário:</div>
                          <div className="text-gray-900 break-all">
                            {getFormUrl()}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ContentCopy />}
                            onClick={handleCopyUrl}
                            disabled={!getFormUrl()}
                          >
                            COPIAR URL
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<QrCode2 />}
                            onClick={handleDownloadQrCode}
                            disabled={!getFormUrl()}
                          >
                            BAIXAR QRCODE
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limite de Cadastros */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Limite de Cadastros
                    </h2>
                    
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Limite de cadastros:</div>
                        <TextField
                          type="number"
                          value={limiteCadastros}
                          onChange={(e) => handleLimiteCadastrosChange(Number(e.target.value))}
                          variant="outlined"
                          size="small"
                          inputProps={{ min: 0 }}
                          sx={{ width: 120 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campos do Formulário */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Campos do Formulário
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Configure a visibilidade e obrigatoriedade dos campos
                        </p>
                      </div>
                    </div>

                    {/* Lista de campos */}
                    <div className="space-y-4">
                      {fields.map((field) => {
                        const fieldConfigStr = pendingChanges?.campos_config?.find(config => {
                          try {
                            const parsed = JSON.parse(config);
                            return parsed.id === field.id;
                          } catch {
                            return false;
                          }
                        });

                        let fieldConfig;
                        try {
                          fieldConfig = fieldConfigStr ? JSON.parse(fieldConfigStr) : {
                            id: field.id,
                            visivel: true,
                            obrigatorio: false,
                            anexo: field.isAnexo || false
                          };
                        } catch {
                          fieldConfig = {
                            id: field.id,
                            visivel: true,
                            obrigatorio: false,
                            anexo: field.isAnexo || false
                          };
                        }

                        return (
                          <div key={field.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-4">
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={fieldConfig.visivel}
                                    onChange={(e) => {
                                      if (!pendingChanges?.campos_config) return;
                                      
                                      const updatedCamposConfig = pendingChanges.campos_config.map(configStr => {
                                        try {
                                          const config = JSON.parse(configStr);
                                          if (config.id === field.id) {
                                            return JSON.stringify({
                                              ...config,
                                              visivel: e.target.checked,
                                              obrigatorio: e.target.checked ? config.obrigatorio : false
                                            });
                                          }
                                          return configStr;
                                        } catch {
                                          return configStr;
                                        }
                                      });

                                      setPendingChanges({
                                        ...pendingChanges,
                                        campos_config: updatedCamposConfig
                                      });
                                    }}
                                  />
                                }
                                label={
                                  <span className="text-sm font-medium text-gray-900">
                                    {field.label}
                                  </span>
                                }
                              />
                            </div>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={fieldConfig.obrigatorio}
                                  disabled={!fieldConfig.visivel}
                                  onChange={(e) => {
                                    if (!pendingChanges?.campos_config) return;
                                    
                                    const updatedCamposConfig = pendingChanges.campos_config.map(configStr => {
                                      try {
                                        const config = JSON.parse(configStr);
                                        if (config.id === field.id) {
                                          return JSON.stringify({
                                            ...config,
                                            obrigatorio: e.target.checked,
                                            visivel: true
                                          });
                                        }
                                        return configStr;
                                      } catch {
                                        return configStr;
                                      }
                                    });

                                    setPendingChanges({
                                      ...pendingChanges,
                                      campos_config: updatedCamposConfig
                                    });
                                  }}
                                />
                              }
                              label=""
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Anexos do Formulário */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-6">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Anexos do Formulário
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Configure quais anexos serão solicitados
                        </p>
                      </div>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={pendingChanges?.campos_config?.some(configStr => {
                              try {
                                const config = JSON.parse(configStr);
                                return config.id === 'anexos_ativos' && config.visivel;
                              } catch {
                                return false;
                              }
                            }) ?? false}
                            onChange={(e) => {
                              if (!pendingChanges?.campos_config) return;
                              
                              // Encontra o índice do config de anexos_ativos
                              const anexosIndex = pendingChanges.campos_config.findIndex(configStr => {
                                try {
                                  const config = JSON.parse(configStr);
                                  return config.id === 'anexos_ativos';
                                } catch {
                                  return false;
                                }
                              });

                              let updatedCamposConfig = [...pendingChanges.campos_config];
                              
                              if (anexosIndex >= 0) {
                                // Atualiza o existente
                                updatedCamposConfig[anexosIndex] = JSON.stringify({
                                  id: 'anexos_ativos',
                                  visivel: e.target.checked
                                });
                              } else {
                                // Adiciona novo
                                updatedCamposConfig.push(JSON.stringify({
                                  id: 'anexos_ativos',
                                  visivel: e.target.checked
                                }));
                              }

                              // Se estiver desativando, desativa todos os anexos
                              if (!e.target.checked) {
                                updatedCamposConfig = updatedCamposConfig.map(configStr => {
                                  try {
                                    const config = JSON.parse(configStr);
                                    if (documentosDisponiveis.some(doc => doc.id === config.id)) {
                                      return JSON.stringify({ ...config, visivel: false });
                                    }
                                    return configStr;
                                  } catch {
                                    return configStr;
                                  }
                                });
                              }

                              setPendingChanges({
                                ...pendingChanges,
                                campos_config: updatedCamposConfig
                              });
                            }}
                          />
                        }
                        label={
                          <span className="text-sm font-medium text-gray-900">
                            Ativar Anexos
                          </span>
                        }
                      />
                    </div>

                    {pendingChanges?.campos_config?.some(configStr => {
                      try {
                        const config = JSON.parse(configStr);
                        return config.id === 'anexos_ativos' && config.visivel;
                      } catch {
                        return false;
                      }
                    }) && (
                      <div className="space-y-4">
                        {documentosDisponiveis.map((doc) => {
                          const docConfigStr = pendingChanges?.campos_config?.find(configStr => {
                            try {
                              const config = JSON.parse(configStr);
                              return config.id === doc.id;
                            } catch {
                              return false;
                            }
                          });

                          let docConfig;
                          try {
                            docConfig = docConfigStr ? JSON.parse(docConfigStr) : {
                              id: doc.id,
                              visivel: false
                            };
                          } catch {
                            docConfig = {
                              id: doc.id,
                              visivel: false
                            };
                          }

                          return (
                            <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-4">
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={docConfig.visivel}
                                      onChange={(e) => {
                                        if (!pendingChanges?.campos_config) return;
                                        
                                        const docIndex = pendingChanges.campos_config.findIndex(configStr => {
                                          try {
                                            const config = JSON.parse(configStr);
                                            return config.id === doc.id;
                                          } catch {
                                            return false;
                                          }
                                        });

                                        const updatedCamposConfig = [...pendingChanges.campos_config];
                                        
                                        if (docIndex >= 0) {
                                          // Atualiza o existente
                                          updatedCamposConfig[docIndex] = JSON.stringify({
                                            id: doc.id,
                                            visivel: e.target.checked,
                                            obrigatorio: e.target.checked ? docConfig.obrigatorio : false
                                          });
                                        } else {
                                          // Adiciona novo
                                          updatedCamposConfig.push(JSON.stringify({
                                            id: doc.id,
                                            visivel: e.target.checked,
                                            obrigatorio: false
                                          }));
                                        }

                                        setPendingChanges({
                                          ...pendingChanges,
                                          campos_config: updatedCamposConfig
                                        });
                                      }}
                                    />
                                  }
                                  label={
                                    <span className="text-sm font-medium text-gray-900">
                                      {doc.label}
                                    </span>
                                  }
                                />
                              </div>
                              <FormControlLabel
                                control={
                                  <Switch
                                    size="small"
                                    checked={docConfig.obrigatorio ?? false}
                                    disabled={!docConfig.visivel}
                                    onChange={(e) => {
                                      if (!pendingChanges?.campos_config) return;
                                      
                                      const docIndex = pendingChanges.campos_config.findIndex(configStr => {
                                        try {
                                          const config = JSON.parse(configStr);
                                          return config.id === doc.id;
                                        } catch {
                                          return false;
                                        }
                                      });

                                      const updatedCamposConfig = [...pendingChanges.campos_config];
                                      
                                      if (docIndex >= 0) {
                                        // Atualiza o existente
                                        updatedCamposConfig[docIndex] = JSON.stringify({
                                          id: doc.id,
                                          visivel: true,
                                          obrigatorio: e.target.checked
                                        });
                                      } else {
                                        // Adiciona novo
                                        updatedCamposConfig.push(JSON.stringify({
                                          id: doc.id,
                                          visivel: true,
                                          obrigatorio: e.target.checked
                                        }));
                                      }

                                      setPendingChanges({
                                        ...pendingChanges,
                                        campos_config: updatedCamposConfig
                                      });
                                    }}
                                  />
                                }
                                label=""
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção de Personalização do Formulário */}
                <div className="bg-white rounded-lg border-0 p-6 shadow-lg ring-1 ring-black ring-opacity-5 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Personalização do Título
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Logo do Formulário */}
                    <div>
                      <div className="flex gap-4 mb-4">
                        <TextField
                          fullWidth
                          label="URL da Logo (opcional)"
                          value={formLogoUrl}
                          onChange={(e) => setFormLogoUrl(e.target.value)}
                          variant="outlined"
                          size="small"
                          placeholder="Ex: https://exemplo.com/logo.png"
                          helperText="Insira a URL de uma imagem ou faça upload"
                        />
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                            id="logo-upload"
                          />
                          <label htmlFor="logo-upload">
                            <Button
                              variant="outlined"
                              component="span"
                              style={{ height: '40px' }}
                            >
                              Upload
                            </Button>
                          </label>
                        </div>
                      </div>
                      {formLogoUrl && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">Preview da Logo:</p>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setFormLogoUrl('')}
                            >
                              Remover
                            </Button>
                          </div>
                          <div className="flex items-center justify-center bg-white p-2 rounded border">
                            <img
                              src={formLogoUrl}
                              alt="Logo Preview"
                              className="max-h-16 object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                toast.error('Erro ao carregar a imagem. Verifique a URL.');
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Título e Cor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-2">
                        <TextField
                          fullWidth
                          label="Título do Formulário"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          variant="outlined"
                          size="small"
                          placeholder="Ex: Formulário de Cadastro"
                        />
                      </div>
                      <div>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Cor do Título
                        </Typography>
                        <div className="flex flex-wrap gap-0.5 mb-2">
                          {predefinedColors.map((colorOption) => (
                            <Tooltip title={colorOption.name} key={colorOption.color} arrow>
                              <div
                                onClick={() => setFormTitleColor(colorOption.color)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: colorOption.color,
                                  border: formTitleColor === colorOption.color ? '2px solid #000' : '1px solid #ddd',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                className="hover:scale-110"
                              />
                            </Tooltip>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={formTitleColor}
                            onChange={(e) => setFormTitleColor(e.target.value)}
                            className="h-6 w-12 rounded border border-gray-300"
                          />
                          <span className="text-sm text-gray-500">{formTitleColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subtítulo e Cor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-2">
                        <TextField
                          fullWidth
                          label="Subtítulo do Formulário"
                          value={themeSubtitle}
                          onChange={(e) => setThemeSubtitle(e.target.value)}
                          variant="outlined"
                          size="small"
                          placeholder="Ex: Preencha os campos abaixo"
                        />
                      </div>
                      <div>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Cor do Subtítulo
                        </Typography>
                        <div className="flex flex-wrap gap-0.5 mb-2">
                          {predefinedColors.map((colorOption) => (
                            <Tooltip title={colorOption.name} key={colorOption.color} arrow>
                              <div
                                onClick={() => setThemeSubtitleColor(colorOption.color)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: colorOption.color,
                                  border: themeSubtitleColor === colorOption.color ? '2px solid #000' : '1px solid #ddd',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                className="hover:scale-110"
                              />
                            </Tooltip>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={themeSubtitleColor}
                            onChange={(e) => setThemeSubtitleColor(e.target.value)}
                            className="h-6 w-12 rounded border border-gray-300"
                          />
                          <span className="text-sm text-gray-500">{themeSubtitleColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cor de Fundo */}
                    <div>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Cor de Fundo
                      </Typography>
                      <div className="flex flex-wrap gap-0.5 mb-2">
                        {predefinedBackgrounds.map((colorOption) => (
                          <Tooltip title={colorOption.name} key={colorOption.color} arrow>
                            <div
                              onClick={() => setThemeBackgroundColor(colorOption.color)}
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: colorOption.color,
                                border: themeBackgroundColor === colorOption.color ? '2px solid #000' : '1px solid #ddd',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              className="hover:scale-110"
                            />
                          </Tooltip>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={themeBackgroundColor}
                          onChange={(e) => setThemeBackgroundColor(e.target.value)}
                          className="h-6 w-12 rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-500">{themeBackgroundColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview do Formulário */}
                  <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: themeBackgroundColor }}>
                    <div className="max-w-2xl mx-auto text-center">
                      {formLogoUrl && (
                        <div className="mb-4">
                          <img
                            src={formLogoUrl}
                            alt="Logo"
                            className="h-16 mx-auto object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '';
                            }}
                          />
                        </div>
                      )}
                      <h1 className="text-2xl font-bold mb-2" style={{ color: formTitleColor }}>
                        {formTitle}
                      </h1>
                      <p style={{ color: themeSubtitleColor }}>
                        {themeSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de ação */}
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={20} /> : null}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Box>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal do QR Code */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={() => setQrDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          QR Code do Formulário
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            p: 2 
          }}>
            <QRCodeSVG 
              value={getFormUrl()}
              size={256}
              level="H"
              includeMargin
            />
            <Typography variant="caption" color="textSecondary" align="center">
              Escaneie este QR Code para acessar o formulário
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de feedback */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={severity}
          elevation={6}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showCopySuccess}
        autoHideDuration={3000}
        onClose={() => setShowCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowCopySuccess(false)} severity="success">
          URL copiada com sucesso!
        </Alert>
      </Snackbar>

      {/* Adiciona o container do Toast */}
      <ToastContainer />
    </div>
  );
}
