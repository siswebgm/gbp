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

interface FormConfig {
  id: number;
  categoria_uid: string;
  campos_config: string[];
  created_at: string;
  updated_at: string;
  form_status: boolean;
  registration_limit: number | null;
  empresa_uid: string;
  uid: string;
  url_slug: string;
  form_title: string;
  form_title_color: string;
  form_logo_url: string | null;
  form_theme: {
    primaryColor: string;
    backgroundColor: string;
  };
  categoria: {
    uid: string;
    nome: string;
    descricao: string;
  };
  empresa: {
    uid: string;
    nome: string;
    logo_url: string;
  };
}

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  isAnexo: boolean;
}

interface FormStyle {
  title: string;
  titleColor: string;
  logoUrl: string;
  theme: {
    primaryColor: string;
    backgroundColor: string;
  };
}

const defaultFormStyle: FormStyle = {
  title: 'Formulário de Cadastro',
  titleColor: '#000000',
  logoUrl: '',
  theme: {
    primaryColor: '#1976d2',
    backgroundColor: '#f5f5f5'
  }
};

export default function Cadastro() {
  console.log('=== COMPONENTE CADASTRO INICIADO ===');
  
  const router = useRouter();
  console.log('Router inicial:', {
    query: router.query,
    isReady: router.isReady,
    pathname: router.pathname,
    asPath: router.asPath
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [visibleFields, setVisibleFields] = useState<Field[]>([]);
  const [formStyle, setFormStyle] = useState<FormStyle>(defaultFormStyle);
  const [categoriaUid, setCategoriaUid] = useState<string | null>(null);
  const [empresaUid, setEmpresaUid] = useState<string | null>(null);

  // Efeito para monitorar mudanças no router
  useEffect(() => {
    console.log('Router mudou:', {
      query: router.query,
      isReady: router.isReady,
      pathname: router.pathname,
      asPath: router.asPath
    });
  }, [router.query, router.isReady, router.pathname, router.asPath]);

  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        if (!router.isReady || !router.query.categoria) {
          console.log('Router não está pronto ou categoria não definida:', {
            isReady: router.isReady,
            categoria: router.query.categoria
          });
          return;
        }

        const { categoria } = router.query;
        console.log('1. URL Slug da categoria:', categoria);

        // Busca a configuração do formulário com joins para empresa e categoria
        console.log('2. Buscando configuração do formulário com dados relacionados...');
        const { data: formConfigData, error: formConfigError } = await supabaseClient
          .from('gbp_form_config')
          .select(`
            *,
            empresa:gbp_empresas!gbp_form_config_empresa_uid_fkey (
              uid,
              nome,
              logo_url
            ),
            categoria:gbp_categorias!gbp_form_config_categoria_uid_fkey (
              uid,
              nome,
              descricao
            )
          `)
          .eq('url_slug', categoria)
          .single();

        if (formConfigError) {
          console.error('3. Erro ao carregar form_config:', formConfigError);
          throw formConfigError;
        }

        if (!formConfigData) {
          console.error('3. form_config não encontrado para url_slug:', categoria);
          setError('Configuração não encontrada');
          return;
        }

        console.log('4. Dados carregados:', {
          formConfig: formConfigData,
          empresa: formConfigData.empresa,
          categoria: formConfigData.categoria
        });

        // Validações importantes
        if (!formConfigData.categoria?.uid) {
          console.error('5. Categoria não encontrada');
          setError('Configuração inválida: categoria não encontrada');
          return;
        }

        if (!formConfigData.empresa?.uid) {
          console.error('5. Empresa não encontrada');
          setError('Configuração inválida: empresa não encontrada');
          return;
        }

        if (!formConfigData.form_status) {
          console.error('5. Formulário desativado');
          setError('Este formulário está desativado');
          return;
        }

        // Armazena os UIDs
        setCategoriaUid(formConfigData.categoria.uid);
        setEmpresaUid(formConfigData.empresa.uid);

        // Define o estilo do formulário com dados da empresa
        setFormStyle({
          title: formConfigData.form_title || `Cadastro - ${formConfigData.categoria.nome}`,
          titleColor: formConfigData.form_title_color || '#000000',
          logoUrl: formConfigData.form_logo_url || formConfigData.empresa.logo_url || '',
          theme: formConfigData.form_theme || {
            primaryColor: '#1976d2',
            backgroundColor: '#f5f5f5'
          }
        });

        // Armazena a configuração completa
        setFormConfig(formConfigData);

        // Busca configurações dos campos
        console.log('6. Buscando campos para categoria:', formConfigData.categoria.nome);
        const { data: configs, error: configError } = await supabaseClient
          .from('gbp_gerenciar')
          .select('*')
          .eq('categoria_uid', formConfigData.categoria.uid)
          .eq('formulario_ativo', true);

        if (configError) {
          console.error('7. Erro ao carregar configurações dos campos:', configError);
          throw configError;
        }

        if (!configs || configs.length === 0) {
          console.error('7. Nenhuma configuração de campo encontrada');
          setError('Configuração de campos não encontrada');
          return;
        }

        console.log('8. Campos encontrados:', configs);

        // Processa os campos visíveis
        const activeFields = configs
          .filter(config => config.visivel && config.formulario_ativo)
          .map(config => ({
            id: config.nome_campo,
            label: config.label || config.nome_campo,
            type: config.tipo || 'text',
            required: config.obrigatorio || false,
            visible: true,
            isAnexo: config.anexo || false
          }));

        setVisibleFields(activeFields);
        setLoading(false);

      } catch (error) {
        console.error('Erro durante o carregamento:', error);
        setError('Erro ao carregar formulário');
        setLoading(false);
      }
    };

    if (router.isReady) {
      console.log('Router está pronto, iniciando carregamento...');
      loadFormConfig();
    }
  }, [router.isReady, router.query]);

  const handleSubmit = async (formData: any) => {
    try {
      console.log('Dados do formulário:', formData);
      console.log('UIDs disponíveis:', {
        categoria_uid: categoriaUid,
        empresa_uid: empresaUid
      });

      if (!categoriaUid || !empresaUid) {
        console.error('categoria_uid ou empresa_uid não definidos');
        setError('Erro: Configuração incompleta do formulário');
        return;
      }

      // Preparar dados para envio
      const dadosParaEnviar = {
        nome: formData.nome,
        cpf: formData.cpf,
        nascimento: formData.nascimento,
        whatsapp: formData.whatsapp,
        telefone: formData.telefone,
        genero: formData.genero,
        titulo: formData.titulo,
        zona: formData.zona,
        secao: formData.secao,
        cep: formData.cep,
        logradouro: formData.logradouro,
        cidade: formData.cidade,
        bairro: formData.bairro,
        numero: formData.numero,
        complemento: formData.complemento,
        nome_mae: formData.nome_mae,
        uf: formData.uf,
        categoria_uid: categoriaUid,
        empresa_uid: empresaUid,
        created_at: new Date().toISOString()
      };

      console.log('Dados preparados para envio:', dadosParaEnviar);

      // Enviar para o Supabase
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .insert([dadosParaEnviar])
        .select();

      if (error) {
        console.error('Erro ao enviar formulário:', error);
        throw error;
      }

      console.log('Formulário enviado com sucesso:', data);
      
      // Redirecionar ou mostrar mensagem de sucesso
      router.push('/sucesso');
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setError('Erro ao enviar formulário. Por favor, tente novamente.');
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
          campos={visibleFields.map(field => ({
            nome: field.id,
            label: field.label,
            type: field.type,
            required: field.required
          }))}
          onSubmit={handleSubmit}
          style={formStyle}
        />
      </div>
    </div>
  );
}
