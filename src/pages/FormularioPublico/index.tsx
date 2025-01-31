import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { eleitorService } from '../../services/eleitorService';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import HomeIcon from '@mui/icons-material/Home';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabaseClient as supabase } from '../../lib/supabase';

const FormContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: '#f5f5f5',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    height: '100vh',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch', // Para melhor scroll no iOS
  }
}));

const FormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    height: 'auto',
    minHeight: '100%',
    borderRadius: 0,
  },
  borderRadius: 4,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  animation: 'fadeIn 0.3s ease-in-out',
  '@keyframes fadeIn': {
    '0%': {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  }
}));

const FormHeader = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  }
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  padding: theme.spacing(3),
  borderBottom: '1px solid rgba(0,0,0,0.12)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  '&:last-child': {
    borderBottom: 'none',
    marginBottom: 0
  }
}));

const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
  '& .MuiSvgIcon-root': {
    color: theme.palette.primary.main,
    fontSize: 24,
  }
}));

const FieldGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(4),
  gridTemplateColumns: 'repeat(12, 1fr)',
  [theme.breakpoints.down('md')]: {
    gap: theme.spacing(3),
  }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
    borderRadius: 4,
    '&:hover': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
      }
    },
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      }
    }
  },
  '& .MuiInputLabel-root': {
    color: '#666',
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    }
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 14px',
  }
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  backgroundColor: '#fff',
  borderRadius: 4,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0,0,0,0.23)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: 1,
  }
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 4),
  fontSize: '1rem',
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  '&:hover': {
    boxShadow: theme.shadows[4]
  }
}));

const AttachmentButton = styled(Button)(({ theme }) => ({
  width: '100%',
  padding: '16px',
  backgroundColor: '#fff',
  border: '1px dashed rgba(0,0,0,0.23)',
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(25,118,210,0.04)',
    borderColor: theme.palette.primary.main,
    borderStyle: 'dashed',
  }
}));

const AttachmentIcon = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: 'rgba(25,118,210,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
  '& .MuiSvgIcon-root': {
    fontSize: 24,
    color: theme.palette.primary.main,
  }
}));

interface FieldConfig {
  id: string;
  visivel: boolean;
  obrigatorio: boolean;
  anexo?: boolean;
}

interface FormConfig {
  uid: string;
  categoria_uid: string;
  empresa_uid: string;
  campos_config: string[];
  form_status: boolean;
  registration_limit: number;
  url_slug: string | null;
  form_title?: string;
  form_title_color?: string;
  form_logo_url?: string;
  form_theme?: {
    primaryColor: string;
    backgroundColor: string;
    subtitle?: string;
    subtitleColor?: string;
  };
}

interface CpfApiResponse {
  nome?: string;
  nome_mae?: string;
  nascimento?: string;
  genero?: string;
  titulo?: string;
}

export function FormularioPublico() {
  const { slug, categoria, empresa_uid } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [parsedFields, setParsedFields] = useState<FieldConfig[]>([]);
  const [completed, setCompleted] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const arquivoInputRef = useRef<HTMLInputElement>(null);
  const [cpfChecking, setCpfChecking] = useState(false);
  const [cpfExists, setCpfExists] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: {
      file: File;
      name: string;
      type: string;
    }[]
  }>({});

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    whatsapp: '',
    telefone: '',
    genero: '',
    titulo_eleitor: '',
    zona: '',
    secao: '',
    cep: '',
    logradouro: '',
    cidade: '',
    bairro: '',
    numero: '',
    complemento: '',
    nome_mae: '',
    upload_url: '',
    categoriaId: '',
    empresaId: ''
  });

  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        let query = supabase.from('gbp_form_config').select('*');

        // Se tiver slug, busca por ele
        if (slug) {
          query = query.eq('url_slug', slug);
        } 
        // Se não tiver slug, busca por categoria e empresa_uid
        else if (categoria && empresa_uid) {
          query = query
            .eq('categoria_uid', categoria)
            .eq('empresa_uid', empresa_uid);
        } else {
          throw new Error('Parâmetros inválidos');
        }

        const { data, error } = await query.single();

        if (error) throw error;
        if (!data) throw new Error('Formulário não encontrado');

        // Verifica se o formulário está ativo
        if (!data.form_status) {
          throw new Error('Este formulário está desativado');
        }

        setFormConfig(data);

        // Parse campos_config
        const fields = data.campos_config.map(configStr => {
          try {
            return JSON.parse(configStr) as FieldConfig;
          } catch (e) {
            console.error('Erro ao fazer parse do campo:', configStr);
            return null;
          }
        }).filter((field): field is FieldConfig => field !== null);

        setParsedFields(fields);
      } catch (error) {
        console.error('Erro ao carregar configuração do formulário:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar formulário');
      } finally {
        setLoading(false);
      }
    };

    loadFormConfig();
  }, [slug, categoria, empresa_uid]);

  useEffect(() => {
    if (categoria && empresa_uid) {
      setFormData(prev => ({
        ...prev,
        categoriaId: categoria,
        empresaId: empresa_uid
      }));
    }
  }, [categoria, empresa_uid]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      let formattedValue = numbers;
      if (numbers.length > 9) {
        formattedValue = numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      } else if (numbers.length > 6) {
        formattedValue = numbers.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      } else if (numbers.length > 3) {
        formattedValue = numbers.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      }
      return formattedValue;
    }
    return value.slice(0, 14); // Limita ao tamanho máximo com formatação
  };

  const checkExistingCpf = async (cpf: string) => {
    try {
      // Verifica se temos o empresa_uid
      if (!formConfig?.empresa_uid) {
        console.error('empresa_uid não disponível');
        return false;
      }

      const cleanCpf = cpf.replace(/[^\d]/g, '');
      
      if (cleanCpf.length !== 11) {
        return false;
      }

      console.log('Consultando CPF:', {
        cpf: cleanCpf,
        empresa_uid: formConfig.empresa_uid
      });

      const { data, error } = await supabase
        .from('gbp_eleitores')
        .select('id')
        .eq('cpf', cleanCpf)
        .eq('empresa_uid', formConfig.empresa_uid)
        .maybeSingle();

      if (error) {
        console.error('Erro ao consultar CPF:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      return false;
    }
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCPF(rawValue);
    
    // Atualiza o valor formatado no campo
    handleChange({ target: { name: 'cpf', value: formattedValue } });
    
    // Verifica CPF quando completar 11 dígitos
    const cleanCpf = formattedValue.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      const exists = await checkExistingCpf(cleanCpf);
      if (exists) {
        setError('CPF já cadastrado para esta empresa');
        // Não limpa o campo, apenas mostra o aviso
      } else {
        setError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formConfig?.empresa_uid) {
      setError('Configuração da empresa não disponível');
      return;
    }

    try {
      setLoading(true);

      // Validar CPF
      const exists = await checkExistingCpf(formData.cpf);
      if (exists) {
        setError('CPF já cadastrado');
        return;
      }

      // Preparar dados para envio
      const submitData = {
        ...formData,
        cpf: formData.cpf.replace(/[^\d]/g, ''),
        empresa_uid: formConfig.empresa_uid,
        categoria_uid: formConfig.categoria_uid
      };

      // Inserir no banco
      const { error: insertError } = await supabase
        .from('gbp_eleitores')
        .insert([submitData]);

      if (insertError) throw insertError;

      // Sucesso
      setCompleted(true);
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setError('Erro ao enviar formulário');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  const handleArquivosChange = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        file,
        name: file.name,
        type: file.type
      }));

      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: [...(prev[documentType] || []), ...newFiles]
      }));
    }
  };

  const handleRemoveArquivo = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função auxiliar para verificar se um campo está visível
  const isFieldVisible = (fieldId: string) => {
    return parsedFields.some(field => field.id === fieldId && field.visivel);
  };

  // Função auxiliar para verificar se um campo é obrigatório
  const isFieldRequired = (fieldId: string) => {
    return parsedFields.some(field => field.id === fieldId && field.obrigatorio);
  };

  // Função auxiliar para verificar se os anexos estão ativos
  const areAttachmentsEnabled = () => {
    return parsedFields.some(field => field.id === 'anexos_ativos' && field.visivel);
  };

  // Função auxiliar para obter a lista de anexos configurados
  const getConfiguredAttachments = () => {
    return parsedFields.filter(field => 
      field.visivel && [
        'rg_cnh',
        'cpf_anexo',
        'certidao_nascimento',
        'titulo_eleitor',
        'comprovante_residencia',
        'foto_3x4'
      ].includes(field.id)
    );
  };

  const steps = [
    { label: 'Dados Pessoais', fields: ['nome', 'cpf', 'nascimento', 'nome_mae', 'genero'] },
    { label: 'Contato', fields: ['whatsapp', 'telefone'] },
    { label: 'Endereço', fields: ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade'] },
    { label: 'Informações Eleitorais', fields: ['titulo', 'zona', 'secao'] },
    { label: 'Anexos', fields: ['rg_cnh', 'cpf_anexo', 'certidao_nascimento', 'titulo_eleitor', 'comprovante_residencia', 'foto_3x4'] }
  ];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  if (loading) {
    return (
      <FormContainer>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2, color: '#4a5568' }}>
            Carregando formulário...
          </Typography>
        </Box>
      </FormContainer>
    );
  }

  if (error || !formConfig) {
    return (
      <FormContainer>
        <Alert 
          severity="error" 
          sx={{ 
            maxWidth: 400,
            width: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {error || 'Formulário não encontrado'}
        </Alert>
      </FormContainer>
    );
  }

  if (completed) {
    return (
      <FormContainer>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, color: '#2d3748', fontWeight: 600 }}>
            Cadastro Realizado!
          </Typography>
          <Typography sx={{ color: '#4a5568', mb: 3 }}>
            Obrigado por se cadastrar. Suas informações foram enviadas com sucesso.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Fazer Novo Cadastro
          </Button>
        </Box>
      </FormContainer>
    );
  }

  return (
    <FormContainer maxWidth="lg">
      <FormPaper>
        <FormHeader 
          sx={{
            backgroundColor: formConfig?.form_theme?.backgroundColor || '#f5f5f5',
            '& .MuiTypography-h5': {
              color: formConfig?.form_title_color || '#000000',
              fontWeight: 600,
              marginBottom: 1
            },
            '& .MuiTypography-body2': {
              color: formConfig?.form_theme?.subtitleColor || '#666666'
            },
            [theme.breakpoints.down('sm')]: {
              backgroundColor: `${formConfig?.form_theme?.backgroundColor || '#f5f5f5'} !important`
            }
          }}
        >
          {formConfig?.form_logo_url && (
            <Box 
              sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                marginBottom: 1.5
              }}
            >
              <Box 
                component="img"
                src={formConfig.form_logo_url}
                alt="Logo"
                sx={{
                  width: '90px',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                  [theme.breakpoints.down('sm')]: {
                    width: '80px'
                  }
                }}
              />
            </Box>
          )}
          <Typography variant="h5">
            {formConfig?.form_title || 'Formulário de Cadastro'}
          </Typography>
          {formConfig?.form_theme?.subtitle && (
            <Typography variant="body2">
              {formConfig.form_theme.subtitle}
            </Typography>
          )}
        </FormHeader>

        <Box 
          component="form" 
          onSubmit={handleSubmit}
          sx={{
            [theme.breakpoints.down('sm')]: {
              overflowY: 'auto',
              height: 'calc(100vh - 200px)',
              WebkitOverflowScrolling: 'touch',
              '& > :first-of-type': {
                marginTop: 2
              }
            }
          }}
        >
          {/* Dados Pessoais */}
          <FormSection>
            <SectionTitle>
              <PersonIcon />
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#333' }}>
                Dados Pessoais
              </Typography>
            </SectionTitle>
            
            <FieldGrid>
              {isFieldVisible('nome') && (
                <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 8' } }}>
                  <StyledTextField
                    fullWidth
                    label="Nome Completo"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required={isFieldRequired('nome')}
                    placeholder="Digite seu nome completo"
                  />
                </Box>
              )}

              {isFieldVisible('cpf') && (
                <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 4' } }}>
                  <StyledTextField
                    fullWidth
                    label="CPF"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    required={isFieldRequired('cpf')}
                    placeholder="000.000.000-00"
                  />
                </Box>
              )}

              {isFieldVisible('nascimento') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 6', md: 'span 4' } }}>
                  <StyledTextField
                    fullWidth
                    label="Data de Nascimento"
                    name="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={handleChange}
                    required={isFieldRequired('nascimento')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}

              {isFieldVisible('nome_mae') && (
                <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 8' } }}>
                  <StyledTextField
                    fullWidth
                    label="Nome da Mãe"
                    name="nome_mae"
                    value={formData.nome_mae}
                    onChange={handleChange}
                    required={isFieldRequired('nome_mae')}
                    placeholder="Digite o nome completo da sua mãe"
                  />
                </Box>
              )}

              {isFieldVisible('genero') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 6', md: 'span 4' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Gênero</InputLabel>
                    <StyledSelect
                      name="genero"
                      value={formData.genero}
                      onChange={handleChange}
                      label="Gênero"
                      required={isFieldRequired('genero')}
                    >
                      <MenuItem value="">Selecione...</MenuItem>
                      <MenuItem value="MASCULINO">Masculino</MenuItem>
                      <MenuItem value="FEMININO">Feminino</MenuItem>
                      <MenuItem value="OUTRO">Outro</MenuItem>
                    </StyledSelect>
                  </FormControl>
                </Box>
              )}
            </FieldGrid>
          </FormSection>

          {/* Contato */}
          <FormSection>
            <SectionTitle>
              <ContactPhoneIcon />
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#333' }}>
                Contato
              </Typography>
            </SectionTitle>
            
            <FieldGrid>
              {isFieldVisible('whatsapp') && (
                <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 6' } }}>
                  <StyledTextField
                    fullWidth
                    label="WhatsApp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    required={isFieldRequired('whatsapp')}
                    placeholder="(00) 00000-0000"
                  />
                </Box>
              )}

              {isFieldVisible('telefone') && (
                <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 6' } }}>
                  <StyledTextField
                    fullWidth
                    label="Telefone Adicional"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    required={isFieldRequired('telefone')}
                    placeholder="(00) 0000-0000"
                  />
                </Box>
              )}
            </FieldGrid>
          </FormSection>

          {/* Endereço */}
          <FormSection>
            <SectionTitle>
              <HomeIcon />
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#333' }}>
                Endereço
              </Typography>
            </SectionTitle>
            
            <FieldGrid>
              {isFieldVisible('cep') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 4', md: 'span 3' } }}>
                  <StyledTextField
                    fullWidth
                    label="CEP"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    required={isFieldRequired('cep')}
                    placeholder="00000-000"
                  />
                </Box>
              )}

              {isFieldVisible('logradouro') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 8', md: 'span 9' } }}>
                  <StyledTextField
                    fullWidth
                    label="Logradouro"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleChange}
                    required={isFieldRequired('logradouro')}
                    placeholder="Rua, Avenida, etc."
                  />
                </Box>
              )}

              {isFieldVisible('numero') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 3' } }}>
                  <StyledTextField
                    fullWidth
                    label="Número"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    required={isFieldRequired('numero')}
                    placeholder="Nº"
                  />
                </Box>
              )}

              {isFieldVisible('complemento') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 9' } }}>
                  <StyledTextField
                    fullWidth
                    label="Complemento"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    required={isFieldRequired('complemento')}
                    placeholder="Apartamento, Bloco, etc."
                  />
                </Box>
              )}

              {isFieldVisible('bairro') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 6' } }}>
                  <StyledTextField
                    fullWidth
                    label="Bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    required={isFieldRequired('bairro')}
                    placeholder="Digite o bairro"
                  />
                </Box>
              )}

              {isFieldVisible('cidade') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 6' } }}>
                  <StyledTextField
                    fullWidth
                    label="Cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    required={isFieldRequired('cidade')}
                    placeholder="Digite a cidade"
                  />
                </Box>
              )}
            </FieldGrid>
          </FormSection>

          {/* Informações Eleitorais */}
          <FormSection>
            <SectionTitle>
              <HowToVoteIcon />
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#333' }}>
                Informações Eleitorais
              </Typography>
            </SectionTitle>
            
            <FieldGrid>
              {isFieldVisible('titulo') && (
                <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 6' } }}>
                  <StyledTextField
                    fullWidth
                    label="Título de Eleitor"
                    name="titulo_eleitor"
                    value={formData.titulo_eleitor}
                    onChange={handleChange}
                    required={isFieldRequired('titulo')}
                    placeholder="Digite o número do título"
                  />
                </Box>
              )}

              {isFieldVisible('zona') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 6', md: 'span 3' } }}>
                  <StyledTextField
                    fullWidth
                    label="Zona"
                    name="zona"
                    value={formData.zona}
                    onChange={handleChange}
                    required={isFieldRequired('zona')}
                    placeholder="Digite a zona"
                  />
                </Box>
              )}

              {isFieldVisible('secao') && (
                <Box sx={{ gridColumn: { xs: '1/-1', sm: 'span 6', md: 'span 3' } }}>
                  <StyledTextField
                    fullWidth
                    label="Seção"
                    name="secao"
                    value={formData.secao}
                    onChange={handleChange}
                    required={isFieldRequired('secao')}
                    placeholder="Digite a seção"
                  />
                </Box>
              )}
            </FieldGrid>
          </FormSection>

          {/* Anexos */}
          {areAttachmentsEnabled() && (
            <FormSection>
              <SectionTitle>
                <UploadFileIcon />
                <Typography variant="h6" sx={{ fontWeight: 500, color: '#333' }}>
                  Documentos
                </Typography>
              </SectionTitle>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 3 
              }}>
                {getConfiguredAttachments().map((attachment) => (
                  <Box key={attachment.id}>
                    <AttachmentButton
                      component="label"
                      variant="outlined"
                    >
                      <AttachmentIcon>
                        <AttachFileIcon />
                      </AttachmentIcon>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: '#333',
                          fontWeight: 500,
                          textTransform: 'none',
                          mb: 0.5
                        }}
                      >
                        {attachment.id.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#666',
                          textTransform: 'none'
                        }}
                      >
                        {attachment.obrigatorio ? 'Documento obrigatório' : 'Documento opcional'}
                      </Typography>
                      <input
                        type="file"
                        hidden
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(event) => handleArquivosChange(event, attachment.id)}
                        required={attachment.obrigatorio}
                      />
                    </AttachmentButton>
                    
                    {/* Lista de arquivos anexados */}
                    {uploadedFiles[attachment.id] && uploadedFiles[attachment.id].length > 0 && (
                      <List dense sx={{ mt: 1, bgcolor: 'background.paper' }}>
                        {uploadedFiles[attachment.id].map((fileData, index) => (
                          <ListItem
                            key={index}
                            secondaryAction={
                              <IconButton edge="end" onClick={() => handleRemoveArquivo(index)}>
                                <DeleteIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={fileData.name}
                              secondary={formatFileSize(fileData.file.size)}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { color: '#333' }
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                sx: { color: '#666' }
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                ))}
              </Box>
            </FormSection>
          )}

          {/* Botão de Envio */}
          <FormSection sx={{ textAlign: 'center', borderBottom: 'none' }}>
            <SubmitButton
              type="submit"
              variant="contained"
              size="large"
              sx={{
                backgroundColor: formConfig?.form_theme?.primaryColor || '#1976d2',
                '&:hover': {
                  backgroundColor: formConfig?.form_theme?.primaryColor 
                    ? `${formConfig.form_theme.primaryColor}dd`
                    : '#1565c0'
                }
              }}
            >
              Enviar Cadastro
            </SubmitButton>
          </FormSection>
        </Box>
      </FormPaper>

      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'center' 
        }}
        sx={{
          [theme.breakpoints.down('sm')]: {
            bottom: { xs: 0 },
            left: { xs: 0 },
            right: { xs: 0 }
          }
        }}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity="success" 
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: 1,
            fontSize: '0.875rem'
          }}
        >
          Cadastro realizado com sucesso! Obrigado por se cadastrar.
        </Alert>
      </Snackbar>
    </FormContainer>
  );
}

// Funções auxiliares
function getFieldLabel(fieldId: string): string {
  const labels: Record<string, string> = {
    nome: 'Nome Completo',
    cpf: 'CPF',
    nascimento: 'Data de Nascimento',
    nome_mae: 'Nome da Mãe',
    genero: 'Gênero',
    whatsapp: 'WhatsApp',
    telefone: 'Telefone',
    cep: 'CEP',
    logradouro: 'Logradouro',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    titulo: 'Título de Eleitor',
    zona: 'Zona',
    secao: 'Seção',
  };
  return labels[fieldId] || fieldId;
}

function getFieldType(fieldId: string): string {
  const types: Record<string, string> = {
    nascimento: 'date',
    whatsapp: 'tel',
    telefone: 'tel',
    numero: 'number',
  };
  return types[fieldId] || 'text';
}
