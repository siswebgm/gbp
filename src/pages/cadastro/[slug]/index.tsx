import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress } from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import FormularioCadastro from './components/FormularioCadastro';
import Custom404 from '@/pages/404';

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
  visible?: boolean;
  required?: boolean;
  isAnexo?: boolean;
}

interface FormConfig {
  uid: string;
  categoria_uid: string;
  empresa_uid: string;
  campos_config: string[];
  form_status: boolean;
  registration_limit: number;
  url_slug?: string;
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

export default function CadastroSlug() {
  const router = useRouter();
  const { slug } = router.query;
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [visibleFields, setVisibleFields] = useState<Field[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formStyle, setFormStyle] = useState({
    title: '',
    titleColor: '',
    logoUrl: '',
    theme: {
      primaryColor: '',
      backgroundColor: '',
      subtitle: '',
      subtitleColor: ''
    }
  });

  // Lista de campos padrão
  const defaultFields: Field[] = [
    { id: 'nome', label: 'Nome Completo', type: 'text' },
    { id: 'cpf', label: 'CPF', type: 'text' },
    { id: 'nascimento', label: 'Data de Nascimento', type: 'date' },
    { id: 'whatsapp', label: 'WhatsApp', type: 'tel' },
    { id: 'telefone', label: 'Telefone', type: 'tel' },
    { id: 'genero', label: 'Gênero', type: 'select' },
    { id: 'titulo', label: 'Título de Eleitor', type: 'text' },
    { id: 'zona', label: 'Zona', type: 'text' },
    { id: 'secao', label: 'Seção', type: 'text' },
    { id: 'cep', label: 'CEP', type: 'text' },
    { id: 'logradouro', label: 'Logradouro', type: 'text' },
    { id: 'cidade', label: 'Cidade', type: 'text' },
    { id: 'bairro', label: 'Bairro', type: 'text' },
    { id: 'numero', label: 'Número', type: 'text' },
    { id: 'complemento', label: 'Complemento', type: 'text' },
    { id: 'nome_mae', label: 'Nome da Mãe', type: 'text' }
  ];

  const documentosDisponiveis = [
    { id: 'rg_cnh', label: 'RG/CNH' },
    { id: 'cpf_anexo', label: 'CPF' },
    { id: 'certidao_nascimento', label: 'Certidão de Nascimento' },
    { id: 'titulo_eleitor', label: 'Título de Eleitor' },
    { id: 'comprovante_residencia', label: 'Comprovante de Residência' },
    { id: 'foto_3x4', label: 'Foto 3x4' }
  ];

  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        if (!slug) return;

        const slugValue = Array.isArray(slug) ? slug[0] : slug;
        console.log('Buscando configuração para slug:', slugValue);

        // Busca a configuração pelo url_slug com todos os campos explícitos
        const { data: configs, error: searchError } = await supabaseClient
          .from('gbp_form_config')
          .select(`
            uid,
            categoria_uid,
            empresa_uid,
            campos_config,
            form_status,
            registration_limit,
            url_slug,
            form_title,
            form_title_color,
            form_logo_url,
            form_theme
          `)
          .eq('url_slug', slugValue)
          .eq('form_status', true);

        if (searchError) {
          console.error('Erro ao buscar configurações:', searchError);
          setError('404');
          return;
        }

        // Log de todas as configurações encontradas
        console.log('Configurações encontradas:', configs);

        if (!configs || configs.length === 0) {
          console.error('Nenhuma configuração encontrada para o slug:', slugValue);
          setError('404');
          return;
        }

        if (configs.length > 1) {
          console.warn('Múltiplas configurações encontradas para o slug:', slugValue);
        }

        // Usa a primeira configuração encontrada
        const config = configs[0];

        // Log dos dados brutos
        console.log('Dados brutos do banco:', {
          form_title: config.form_title,
          form_title_color: config.form_title_color,
          form_logo_url: config.form_logo_url,
          form_theme: config.form_theme
        });

        // Atualiza o estilo do formulário
        const newFormStyle = {
          title: config.form_title,
          titleColor: config.form_title_color,
          logoUrl: config.form_logo_url,
          theme: config.form_theme
        };

        console.log('Novo estilo do formulário:', newFormStyle);
        setFormStyle(newFormStyle);
        setFormConfig(config);

        // Log após atualização
        console.log('Estado do formStyle após atualização:', newFormStyle);

        // Processa os campos visíveis e obrigatórios
        const activeFields = defaultFields.map(field => {
          const fieldConfigStr = config.campos_config?.find(configStr => {
            try {
              const parsed = JSON.parse(configStr);
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
              obrigatorio: false
            };
          } catch {
            fieldConfig = {
              id: field.id,
              visivel: true,
              obrigatorio: false
            };
          }

          return {
            ...field,
            visible: fieldConfig.visivel,
            required: fieldConfig.obrigatorio
          };
        }).filter(field => field.visible);

        setVisibleFields(activeFields);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setError('404');
      } finally {
        setLoading(false);
      }
    };

    loadFormConfig();
  }, [slug]);

  const handleSubmit = async (data) => {
    try {
      if (!formConfig) throw new Error('Configuração não encontrada');

      const { error: submitError } = await supabaseClient
        .from('gbp_cadastros')
        .insert([
          {
            categoria_uid: formConfig.categoria_uid,
            empresa_uid: formConfig.empresa_uid,
            ...data
          }
        ]);

      if (submitError) throw submitError;
      router.push('/sucesso');
    } catch (error) {
      console.error('Erro ao enviar:', error);
      setError('Erro ao enviar formulário');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <CircularProgress />
        </div>
      ) : error ? (
        <Custom404 />
      ) : (
        <FormularioCadastro
          fields={visibleFields}
          documentos={documentosDisponiveis.filter(doc => {
            const docConfigStr = formConfig?.campos_config?.find(configStr => {
              try {
                const config = JSON.parse(configStr);
                return config.id === doc.id;
              } catch {
                return false;
              }
            });

            try {
              const docConfig = docConfigStr ? JSON.parse(docConfigStr) : null;
              return docConfig?.visivel;
            } catch {
              return false;
            }
          }).map(doc => ({
            id: doc.id,
            nome: doc.label,
            required: false
          }))}
          style={formStyle}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}