import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; 
import { CircularProgress } from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import FormularioCadastro from './components/FormularioCadastro';
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

export default function Cadastro() {
  log('Componente Cadastro renderizado');

  const router = useRouter();
  const [formConfigs, setFormConfigs] = useState([]);
  const [visibleFields, setVisibleFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formStyle, setFormStyle] = useState({
    title: 'Formulário de Cadastro',
    titleColor: '#000000',
    logoUrl: '',
    theme: {
      primaryColor: '#1976d2',
      backgroundColor: '#f5f5f5'
    }
  });

  // Log da URL atual
  log('URL atual:', window.location.href);
  log('Query params:', router.query);

  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        log('Iniciando carregamento do formulário');
        
        // Obtém a categoria da URL
        const { categoria } = router.query;
        log('Categoria da URL:', categoria);

        if (!categoria) {
          log('Categoria não encontrada na URL');
          setError('404');
          return;
        }

        // Primeiro, busca o uid da categoria pelo nome
        const { data: categoriaData, error: categoriaError } = await supabaseClient
          .from('gbp_categorias')
          .select('uid')
          .eq('nome', categoria)
          .single();

        if (categoriaError) {
          log('Erro ao buscar categoria:', categoriaError);
          throw categoriaError;
        }

        if (!categoriaData) {
          log('Categoria não encontrada no banco');
          setError('404');
          return;
        }

        log('Categoria encontrada:', categoriaData);

        // Agora busca as configurações de estilo do formulário usando o uid da categoria
        const { data: formConfig, error: formConfigError } = await supabaseClient
          .from('gbp_form_config')
          .select('*')
          .eq('categoria_uid', categoriaData.uid)
          .single();

        if (formConfigError && formConfigError.code !== 'PGRST116') {
          log('Erro ao carregar configurações do formulário:', formConfigError);
          throw formConfigError;
        }

        log('Configurações do formulário:', formConfig);

        if (formConfig) {
          setFormStyle({
            title: formConfig.form_title || 'Formulário de Cadastro',
            titleColor: formConfig.form_title_color || '#000000',
            logoUrl: formConfig.form_logo_url || '',
            theme: formConfig.form_theme || {
              primaryColor: '#1976d2',
              backgroundColor: '#f5f5f5'
            }
          });
        }

        // Busca configurações baseadas na categoria
        const { data: configs, error: configError } = await supabaseClient
          .from('gbp_gerenciar')
          .select('*')
          .eq('categoria_nome', categoria)
          .eq('formulario_ativo', true);

        log('Resultado da query:', { configs, error: configError });

        if (configError) {
          log('Erro na query:', configError);
          throw configError;
        }

        if (!configs || configs.length === 0) {
          log('Nenhuma configuração encontrada');
          setError('404');
          return;
        }

        // Lista de campos padrão
        const defaultFields = [
          { id: 'nome', label: 'Nome Completo', type: 'text' },
          { id: 'cpf', label: 'CPF', type: 'text' },
          { id: 'data_nascimento', label: 'Data de Nascimento', type: 'date' },
          { id: 'titulo_eleitor', label: 'Título de Eleitor', type: 'text' },
          { id: 'zona', label: 'Zona', type: 'text' },
          { id: 'secao', label: 'Seção', type: 'text' },
          { id: 'genero', label: 'Gênero', type: 'select' },
          { id: 'telefone', label: 'Telefone', type: 'tel' },
          { id: 'whatsapp', label: 'WhatsApp', type: 'tel' },
          { id: 'cep', label: 'CEP', type: 'text' },
          { id: 'logradouro', label: 'Logradouro', type: 'text' },
          { id: 'numero', label: 'Número', type: 'text' },
          { id: 'complemento', label: 'Complemento', type: 'text' },
          { id: 'bairro', label: 'Bairro', type: 'text' },
          { id: 'cidade', label: 'Cidade', type: 'text' }
        ];

        // Processa os campos
        const activeFields = defaultFields
          .map(field => {
            const config = configs.find(c => c.nome_campo === field.id);
            return {
              ...field,
              visible: config?.visivel === true && config?.formulario_ativo === true,
              required: config?.obrigatorio || false,
              isAnexo: config?.anexo || false
            };
          })
          .filter(field => field.visible === true);

        log('Campos ativos após filtragem:', activeFields);

        setVisibleFields(activeFields);
        setFormConfigs(configs.filter(c => c.visivel === true));
      } catch (error) {
        log('Erro ao carregar formulário:', error);
        setError('404');
      } finally {
        setLoading(false);
      }
    };

    loadFormConfig();
  }, [router.query]);

  const checkExistingCpf = async (cpf: string) => {
    try {
      // Remove qualquer formatação do CPF
      const cleanCpf = cpf.replace(/[^\d]/g, '');
      
      if (cleanCpf.length !== 11) {
        return false;
      }

      const pathname = window.location.pathname;
      const matches = pathname.match(/\/cadastro\/(\d+)\/(\d+)/);
      const empresaId = matches?.[2];

      if (!empresaId) {
        console.error('ID da empresa não encontrado na URL');
        return false;
      }

      // Consulta usando o CPF limpo e empresa_uid
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('id')
        .eq('cpf', cleanCpf)
        .eq('empresa_uid', empresaId)
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
    const cpf = e.target.value;
    const cleanCpf = cpf.replace(/[^\d]/g, '');
    
    if (cleanCpf.length === 11) {
      const exists = await checkExistingCpf(cleanCpf);
      if (exists) {
        setError('CPF já cadastrado');
      } else {
        setError(null);
      }
    }
  };

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
          documentos={formConfigs
            .filter(c => c.anexo && c.visivel)
            .map(c => ({
              id: c.nome_campo,
              nome: c.nome_campo,
              required: c.obrigatorio
            }))}
          onSubmit={async (data) => {
            try {
              const pathname = window.location.pathname;
              const matches = pathname.match(/\/cadastro\/(\d+)\/(\d+)/);
              const categoriaId = matches?.[1];
              const empresaId = matches?.[2];

              const { error: submitError } = await supabaseClient
                .from('gbp_cadastros')
                .insert([
                  {
                    categoria_id: parseInt(categoriaId),
                    empresa_id: parseInt(empresaId),
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
          style={formStyle}
        />
      </div>
    </div>
  );
}
