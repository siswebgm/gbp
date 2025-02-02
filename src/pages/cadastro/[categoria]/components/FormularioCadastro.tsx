import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField as MuiTextField,
  Button as MuiButton,
  FormControl as MuiFormControl,
  FormHelperText as MuiFormHelperText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Função para formatar CPF
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

// Função para remover formatação do CPF
const unformatCPF = (value: string) => {
  return value.replace(/\D/g, '');
};

interface Campo {
  nome: string;
  label?: string;
  required?: boolean;
  type?: string;
}

interface FormularioCadastroProps {
  campos: Campo[];
  onSubmit: (data: any) => Promise<void>;
  style?: {
    title?: string;
    titleColor?: string;
    logoUrl?: string;
    theme?: {
      primaryColor?: string;
      backgroundColor?: string;
    };
  };
}

export default function FormularioCadastro({
  campos,
  onSubmit,
  style = {
    title: 'Formulário de Cadastro',
    titleColor: '#000000',
    logoUrl: '',
    theme: {
      primaryColor: '#1976d2',
      backgroundColor: '#f5f5f5'
    }
  }
}: FormularioCadastroProps) {
  const { register, handleSubmit, formState: { errors }, setError, clearErrors, setValue, watch } = useForm();
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});
  const [fileErrors, setFileErrors] = useState<{ [key: string]: string }>({});
  const [isValidatingCPF, setIsValidatingCPF] = useState(false);

  console.log('FormularioCadastro - Campos recebidos:', campos);

  const handleFileChange = (fieldId: string, required: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (required && !file) {
      setFileErrors(prev => ({ ...prev, [fieldId]: 'Este campo é obrigatório' }));
    } else {
      setFileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    if (file) {
      setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
    }
  };

  // Função para validar CPF na tabela gbp_eleitores
  const validateCPF = async (cpf: string) => {
    try {
      const cleanCpf = cpf.replace(/[^\d]/g, '');
      
      if (cleanCpf.length !== 11) {
        return true; // Retorna true para não bloquear o formulário
      }

      const pathname = window.location.pathname;
      const matches = pathname.match(/\/cadastro\/(\d+)\/(\d+)/);
      const empresaId = matches?.[2];

      if (!empresaId) {
        console.error('ID da empresa não encontrado na URL');
        return true; // Retorna true para não bloquear o formulário
      }

      // Primeiro, busca o empresa_uid
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('empresa_uid')
        .eq('id', parseInt(empresaId))
        .single();

      if (empresaError || !empresaData?.empresa_uid) {
        console.error('Erro ao buscar empresa_uid:', empresaError);
        return true; // Retorna true para não bloquear o formulário
      }

      console.log('Consultando CPF:', {
        cpf: cleanCpf,
        empresa_uid: empresaData.empresa_uid
      });

      // Agora busca o CPF usando o empresa_uid
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('id')
        .eq('cpf', cleanCpf)
        .eq('empresa_uid', empresaData.empresa_uid)
        .maybeSingle();

      if (error) {
        console.error('Erro ao consultar CPF:', error);
        return true; // Retorna true para não bloquear o formulário
      }

      if (data) {
        setError('cpf', {
          type: 'manual',
          message: 'CPF já cadastrado para esta empresa'
        });
        return false;
      }

      clearErrors('cpf');
      return true;
    } catch (error) {
      console.error('Erro ao validar CPF:', error);
      return true; // Retorna true para não bloquear o formulário
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      // Validar CPF antes de prosseguir
      const cpfIsValid = await validateCPF(data.cpf);
      if (!cpfIsValid) {
        return;
      }

      // Remove a formatação do CPF antes de enviar
      const formattedData = {
        ...data,
        cpf: data.cpf?.replace(/[^\d]/g, '') || null
      };

      // Monta o objeto com os campos exatos da tabela
      const formData = {
        nome: formattedData.nome || null,
        cpf: formattedData.cpf || null,
        nascimento: formattedData.nascimento || null,
        whatsapp: formattedData.whatsapp?.replace(/\D/g, '') || null,
        telefone: formattedData.telefone?.replace(/\D/g, '') || null,
        genero: formattedData.genero || null,
        titulo: formattedData.titulo || null,
        zona: formattedData.zona || null,
        secao: formattedData.secao || null,
        cep: formattedData.cep?.replace(/\D/g, '') || null,
        logradouro: formattedData.logradouro || null,
        cidade: formattedData.cidade || null,
        bairro: formattedData.bairro || null,
        numero: formattedData.numero || null,
        complemento: formattedData.complemento || null,
        nome_mae: formattedData.nome_mae || null,
        uf: formattedData.uf || null
      };

      // Log dos dados antes de limpar
      console.log('Dados antes de limpar:', formData);

      // Remove campos null, undefined ou vazios
      const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

      // Log dos dados após limpar
      console.log('Dados após limpar:', cleanData);

      // Se houver arquivos, adiciona separadamente
      if (Object.keys(uploadedFiles).length > 0) {
        cleanData.files = uploadedFiles;
      }

      // Log final dos dados
      console.log('Dados finais do formulário:', cleanData);

      await onSubmit(cleanData);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setError('cpf', {
        type: 'manual',
        message: 'Erro ao processar formulário'
      });
    }
  };

  // Se não houver campos visíveis, não mostra o formulário
  if (!campos || campos.length === 0) {
    console.log('Nenhum campo visível para exibir');
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Nenhum campo disponível no momento.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: style.theme.backgroundColor || '#f5f5f5',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Cabeçalho do Formulário */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {/* Logo */}
        {style.logoUrl && (
          <div style={{ marginBottom: '1.5rem' }}>
            <img 
              src={style.logoUrl} 
              alt="Logo" 
              style={{ 
                maxHeight: '120px',
                maxWidth: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>
        )}
        
        {/* Título */}
        <h1 style={{ 
          color: style.titleColor || '#000000',
          fontSize: '2rem',
          fontWeight: 'bold',
          margin: '0 0 0.5rem 0',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {style.title}
        </h1>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {campos.map((campo) => {
          const isAnexo = campo.nome.startsWith('ax_');
          return (
            <div key={campo.nome}>
              <label>
                {campo.label || campo.nome}
                {campo.required && <span style={{ color: 'red' }}> *</span>}
              </label>
              {isAnexo ? (
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange(campo.nome, campo.required)}
                  style={{ display: 'block' }}
                  id={`file-${campo.nome}`}
                  {...register(campo.nome, { required: campo.required })}
                />
              ) : (
                <input
                  type={campo.type || 'text'}
                  {...register(campo.nome, { required: campo.required })}
                  required={campo.required}
                />
              )}
            </div>
          );
        })}
        <div className="mt-8">
          <MuiButton
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
          >
            Enviar Cadastro
          </MuiButton>
        </div>
      </form>
    </div>
  );
}
