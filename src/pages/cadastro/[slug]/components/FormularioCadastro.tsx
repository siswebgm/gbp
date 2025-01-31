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

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  isAnexo?: boolean;
}

interface Documento {
  id: string;
  nome: string;
  required: boolean;
}

interface FormularioCadastroProps {
  fields: Field[];
  documentos?: Documento[];
  onSubmit: (data: any) => void;
  style?: {
    title: string;
    titleColor: string;
    logoUrl: string;
    theme: {
      primaryColor: string;
      backgroundColor: string;
      subtitle?: string;
      subtitleColor?: string;
    };
  };
}

export default function FormularioCadastro({
  fields,
  documentos = [],
  onSubmit,
  style
}: FormularioCadastroProps) {
  // Log do estilo recebido
  console.log('FormularioCadastro - Estilo recebido:', style);

  // Garante que todos os valores de estilo existam
  const defaultStyle = {
    title: 'Formulário de Cadastro',
    titleColor: '#000000',
    logoUrl: '',
    theme: {
      primaryColor: '#1976d2',
      backgroundColor: '#f5f5f5',
      subtitle: 'Preencha os dados abaixo',
      subtitleColor: '#666666'
    }
  };

  // Combina os estilos recebidos com os padrões
  const finalStyle = {
    title: style?.title || defaultStyle.title,
    titleColor: style?.titleColor || defaultStyle.titleColor,
    logoUrl: style?.logoUrl || defaultStyle.logoUrl,
    theme: {
      primaryColor: style?.theme?.primaryColor || defaultStyle.theme.primaryColor,
      backgroundColor: style?.theme?.backgroundColor || defaultStyle.theme.backgroundColor,
      subtitle: style?.theme?.subtitle || defaultStyle.theme.subtitle,
      subtitleColor: style?.theme?.subtitleColor || defaultStyle.theme.subtitleColor
    }
  };

  console.log('FormularioCadastro - Estilo final:', finalStyle);

  const { register, handleSubmit, formState: { errors }, setError, clearErrors, setValue, watch } = useForm();
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});
  const [fileErrors, setFileErrors] = useState<{ [key: string]: string }>({});

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

  const handleFormSubmit = async (formData: any) => {
    try {
      // Verifica se todos os anexos obrigatórios foram enviados
      const errosAnexos: { [key: string]: string } = {};
      documentos.forEach(doc => {
        if (doc.required && !uploadedFiles[doc.id]) {
          errosAnexos[doc.id] = 'Este documento é obrigatório';
        }
      });

      if (Object.keys(errosAnexos).length > 0) {
        setFileErrors(errosAnexos);
        return;
      }

      // Combina os dados do formulário com os arquivos
      const formDataWithFiles = {
        ...formData,
        files: uploadedFiles
      };

      onSubmit(formDataWithFiles);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setError('form', {
        type: 'manual',
        message: 'Erro ao processar formulário'
      });
    }
  };

  // Se não houver campos visíveis, não mostra o formulário
  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Nenhum campo disponível no momento.</p>
      </div>
    );
  }

  // Filtra apenas campos visíveis
  const visibleFields = fields.filter(field => field.visible);

  // Renderiza o formulário
  return (
    <div 
      className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg"
      style={{ backgroundColor: finalStyle.theme.backgroundColor }}
    >
      {/* Cabeçalho do formulário */}
      <div className="text-center mb-8">
        {/* Logo */}
        {finalStyle.logoUrl && (
          <img 
            src={finalStyle.logoUrl} 
            alt="Logo" 
            className="mx-auto mb-4 h-16 w-auto"
          />
        )}
        
        {/* Título */}
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ color: finalStyle.titleColor }}
        >
          {finalStyle.title}
        </h1>
        
        {/* Subtítulo */}
        {finalStyle.theme.subtitle && (
          <p 
            className="text-gray-600"
            style={{ color: finalStyle.theme.subtitleColor }}
          >
            {finalStyle.theme.subtitle}
          </p>
        )}
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Campos de texto */}
        {visibleFields
          .filter(field => !field.isAnexo)
          .map((field) => (
            <div key={field.id}>
              <MuiTextField
                {...register(field.id, { 
                  required: field.required
                })}
                label={field.label}
                type={field.type}
                required={field.required}
                fullWidth
                error={!!errors[field.id]}
                helperText={errors[field.id]?.message as string}
              />
            </div>
          ))}

        {/* Anexos */}
        {documentos && documentos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Anexos</h2>
            {documentos.map((doc) => (
              <MuiFormControl key={doc.id} fullWidth error={!!fileErrors[doc.id]}>
                <div className="flex items-center space-x-4 mb-4">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange(doc.id, doc.required)}
                    style={{ display: 'none' }}
                    id={`file-${doc.id}`}
                  />
                  <label
                    htmlFor={`file-${doc.id}`}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <MuiButton
                      variant="outlined"
                      component="span"
                      startIcon={<UploadFileIcon />}
                    >
                      {uploadedFiles[doc.id]?.name || `Anexar ${doc.nome}`}
                    </MuiButton>
                    {doc.required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </label>
                </div>
                {fileErrors[doc.id] && (
                  <MuiFormHelperText error>
                    {fileErrors[doc.id]}
                  </MuiFormHelperText>
                )}
              </MuiFormControl>
            ))}
          </div>
        )}

        {/* Botão de envio */}
        <div className="mt-8">
          <MuiButton
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            style={{
              backgroundColor: finalStyle.theme.primaryColor
            }}
          >
            Enviar Cadastro
          </MuiButton>
        </div>
      </form>
    </div>
  );
}
