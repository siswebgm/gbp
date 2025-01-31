import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress } from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import FormularioCadastro from '../components/FormularioCadastro';
import Custom404 from '@/pages/404';

// Forçando console.log a aparecer em produção
const log = (...args) => {
  console.log('[Cadastro]', ...args);
};

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
}

export default function Cadastro() {
  log('Componente Cadastro renderizado');

  const router = useRouter();
  const { categoria, empresa } = router.query;
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [visibleFields, setVisibleFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log da URL atual e parâmetros
  log('URL atual:', window.location.href);
  log('Parâmetros da URL:', { categoria, empresa });

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
        log('Iniciando carregamento do formulário');

        if (!categoria || !empresa) {
          log('Parâmetros da URL não disponíveis ainda');
          return;
        }

        const categoriaId = Array.isArray(categoria) ? categoria[0] : categoria;
        const empresaId = Array.isArray(empresa) ? empresa[0] : empresa;

        log('IDs extraídos:', { categoriaId, empresaId });

        // Busca diretamente pela categoria_uid e empresa_uid
        const { data: config, error } = await supabaseClient
          .from('gbp_form_config')
          .select('*')
          .eq('categoria_uid', categoriaId)
          .eq('empresa_uid', empresaId)
          .eq('form_status', true)
          .maybeSingle();

        if (error) {
          log('Erro na query:', error);
          setError('404');
          return;
        }

        if (!config) {
          log('Nenhuma configuração encontrada');
          setError('404');
          return;
        }

        // Se tiver url_slug configurado, redireciona para a URL amigável
        if (config.url_slug) {
          router.push(`/cadastro/${config.url_slug}`);
          return;
        }

        setFormConfig(config);

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
        log('Erro ao carregar formulário:', error);
        setError('404');
      } finally {
        setLoading(false);
      }
    };

    loadFormConfig();
  }, [categoria, empresa]);

  if (!router.isReady) {
    log('Router ainda não está pronto');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (loading) {
    log('Renderizando loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (error === '404') {
    log('Renderizando 404...');
    return <Custom404 />;
  }

  log('Renderizando formulário com campos:', visibleFields);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
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
          }).map(doc => {
            const docConfigStr = formConfig?.campos_config?.find(configStr => {
              try {
                const config = JSON.parse(configStr);
                return config.id === doc.id;
              } catch {
                return false;
              }
            });

            let required = false;
            try {
              const docConfig = docConfigStr ? JSON.parse(docConfigStr) : null;
              required = docConfig?.obrigatorio || false;
            } catch {
              // Mantém como false em caso de erro
            }

            return {
              id: doc.id,
              nome: doc.label,
              required
            };
          })}
          onSubmit={async (data) => {
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
              log('Erro ao enviar:', error);
              setError('Erro ao enviar formulário');
            }
          }}
        />
      </div>
    </div>
  );
}
