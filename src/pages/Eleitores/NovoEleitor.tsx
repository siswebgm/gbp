import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useCategories } from '../../hooks/useCategories';
import { useIndicados } from '../../hooks/useIndicados';
import { useCep } from '../../hooks/useCep';
import { useCPF } from '../../hooks/useCPF';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "../../components/ui/use-toast";
import { NovaCategoriaModal } from './components/NovaCategoriaModal';
import { NovoIndicadoModal } from './components/NovoIndicadoModal';
import { NestedCategoryDropdown } from '../../components/NestedCategoryDropdown';

interface Indicado {
  uid: string;
  id: number;
  nome: string;
}

interface NovoEleitorForm {
  nome: string;
  cpf: string;
  nome_mae: string;
  nascimento: string;
  whatsapp: string;
  telefone: string;
  genero: string;
  titulo: string;
  zona: string;
  secao: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
  categoria_uid: string;
  indicado_uid: string;
  latitude: string | null;
  longitude: string | null;
}

const defaultValues: NovoEleitorForm = {
  nome: '',
  cpf: '',
  nome_mae: '',
  nascimento: '',
  whatsapp: '',
  telefone: '',
  genero: '',
  titulo: '',
  zona: '',
  secao: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  complemento: '',
  categoria_uid: '',
  indicado_uid: '',
  latitude: null,
  longitude: null
};

const formatName = (name: string) => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Ignora artigos e preposições comuns
      const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e'];
      return minusculas.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Função para formatar a data para o formato yyyy-MM-dd
const formatDateString = (dateString: string) => {
  if (!dateString) return '';
  return dateString.split(' ')[0]; // Pega apenas a parte da data, removendo o tempo
};

export const NovoEleitor: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const { data: categorias, isLoading: isLoadingCategorias } = useCategories();
  const { data: indicados, isLoading: isLoadingIndicados } = useIndicados();
  const { fetchAddress, isLoading: isLoadingCep } = useCep();
  const { fetchCPFData, isLoading: isLoadingCPF, error: cpfError } = useCPF();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<NovoEleitorForm>({
    defaultValues
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showNovaCategoriaModal, setShowNovaCategoriaModal] = useState(false);
  const [showNovoIndicadoModal, setShowNovoIndicadoModal] = useState(false);
  const [isPrimeiroAtendimento, setIsPrimeiroAtendimento] = useState(false);
  const [descricaoAtendimento, setDescricaoAtendimento] = useState('');
  const [statusAtendimento, setStatusAtendimento] = useState('');
  const [categoriaAtendimento, setCategoriaAtendimento] = useState('');
  const cpfValue = watch('cpf');
  const [lastCheckedCPF, setLastCheckedCPF] = useState<string>('');
  const [atendimentoErrors, setAtendimentoErrors] = useState({
    categoria: '',
    descricao: '',
    status: ''
  });

  // Estado global para os estilos dos placeholders e selects
  const globalStyles = {
    input: {
      '::placeholder': {
        color: 'rgba(0, 0, 0, 0.3)',
        opacity: 1,
      },
      color: 'rgba(0, 0, 0, 0.87)',
    },
    select: {
      color: 'rgba(0, 0, 0, 0.87)',
      '& option:first-of-type': {
        color: 'rgba(0, 0, 0, 0.3)',
      },
      '& option': {
        color: 'rgba(0, 0, 0, 0.87)',
      },
    }
  };

  // Função para limpar os campos preenchidos pela API
  const clearApiFields = useCallback(() => {
    setValue('nome', '');
    setValue('nome_mae', '');
    setValue('nascimento', '');
    setValue('genero', '');
    setValue('titulo', '');
    // Força a limpeza do estado interno do formulário
    reset({
      ...defaultValues,
      nome_mae: ''
    });
    setLastCheckedCPF('');
  }, [setValue, reset]);

  // Função para limpar campos de endereço
  const clearAddressFields = () => {
    setValue('endereco', '');
    setValue('bairro', '');
    setValue('cidade', '');
    setValue('uf', '');
    setValue('latitude', null);
    setValue('longitude', null);
  };

  // Monitora mudanças no CPF
  useEffect(() => {
    const cleanCPF = cpfValue?.replace(/\D/g, '');
    
    // Se já temos um CPF verificado e o usuário tenta modificá-lo
    if (lastCheckedCPF && cleanCPF !== lastCheckedCPF) {
      setValue('cpf', ''); // Limpa o campo CPF
      clearApiFields();
      toast({
        title: "⚠️ Atenção",
        description: "CPF alterado. Os campos foram limpos para nova consulta.",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        duration: 3000,
      });
      return;
    }

    // Se o CPF tem 11 dígitos e ainda não foi verificado
    if (cleanCPF?.length === 11 && !lastCheckedCPF) {
      const timeoutId = setTimeout(async () => {
        try {
          setLastCheckedCPF(cleanCPF);
          const cpfData = await fetchCPFData(cleanCPF);
          
          if (cpfData) {
            // Preenche os campos com os dados da API
            if (cpfData.nome) setValue('nome', cpfData.nome);
            if (cpfData.nome_mae) setValue('nome_mae', cpfData.nome_mae);
            if (cpfData.data_nascimento) setValue('nascimento', formatDateString(cpfData.data_nascimento));
            if (cpfData.genero) setValue('genero', cpfData.genero);
            if (cpfData.titulo) setValue('titulo', cpfData.titulo);
          }
        } catch (error) {
          console.error('Erro ao preencher dados do CPF:', error);
          clearApiFields();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [cpfValue, fetchCPFData, setValue, lastCheckedCPF, clearApiFields, toast]);

  // Observa o valor do CEP
  const cepValue = watch('cep');
  const [lastCheckedCep, setLastCheckedCep] = useState<string>('');

  // Monitor de mudanças no CEP
  useEffect(() => {
    const cleanCEP = cepValue?.replace(/\D/g, '');
    
    // Limpa os campos se o CEP for modificado
    if (cleanCEP?.length !== 8) {
      clearAddressFields();
      return;
    }
    
    // Evita consultas duplicadas
    if (cleanCEP === lastCheckedCep) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLastCheckedCep(cleanCEP);
      const data = await fetchAddress(cleanCEP);
      if (data) {
        setValue('endereco', data.logradouro || '');
        setValue('bairro', data.bairro || '');
        setValue('cidade', data.localidade || '');
        setValue('uf', data.uf || '');
        if (data.latitude && data.longitude) {
          setValue('latitude', data.latitude.toString());
          setValue('longitude', data.longitude.toString());
        } else {
          setValue('latitude', null);
          setValue('longitude', null);
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [cepValue, fetchAddress, setValue, lastCheckedCep]);

  // Função para validar os campos de atendimento
  const validateAtendimentoFields = () => {
    const errors = {
      categoria: '',
      descricao: '',
      status: ''
    };
    let isValid = true;

    if (isPrimeiroAtendimento) {
      if (!categoriaAtendimento) {
        errors.categoria = 'Campo obrigatório';
        isValid = false;
      }
      if (!descricaoAtendimento) {
        errors.descricao = 'Campo obrigatório';
        isValid = false;
      }
      if (!statusAtendimento) {
        errors.status = 'Campo obrigatório';
        isValid = false;
      }
    }

    setAtendimentoErrors(errors);
    return isValid;
  };

  const onSubmit = async (data: NovoEleitorForm) => {
    try {
      // Validar campos de atendimento se o checkbox estiver marcado
      if (!validateAtendimentoFields()) {
        return;
      }

      setIsLoading(true);

      // Pega todos os valores atuais diretamente dos inputs
      const currentValues = {
        nome: watch('nome'),
        cpf: watch('cpf'),
        nome_mae: watch('nome_mae'),
        nascimento: watch('nascimento'),
        whatsapp: watch('whatsapp'),
        telefone: watch('telefone'),
        genero: watch('genero'),
        titulo: watch('titulo'),
        zona: watch('zona'),
        secao: watch('secao'),
        cep: watch('cep'),
        endereco: watch('endereco'),
        numero: watch('numero'),
        bairro: watch('bairro'),
        cidade: watch('cidade'),
        uf: watch('uf'),
        complemento: watch('complemento'),
        categoria_uid: watch('categoria_uid'),
        indicado_uid: watch('indicado_uid'),
        latitude: watch('latitude'),
        longitude: watch('longitude')
      };

      // Preparar dados para inserção
      const formattedData = {
        nome: formatName(currentValues.nome),
        cpf: currentValues.cpf.replace(/\D/g, ''),
        nome_mae: formatName(currentValues.nome_mae),
        nascimento: currentValues.nascimento,
        mes_nascimento: new Date(currentValues.nascimento).getMonth() + 1, // Extrai o mês (1-12)
        whatsapp: currentValues.whatsapp.replace(/\D/g, ''),
        telefone: currentValues.telefone.replace(/\D/g, ''),
        genero: currentValues.genero,
        titulo: currentValues.titulo,
        zona: currentValues.zona,
        secao: currentValues.secao,
        cep: currentValues.cep.replace(/\D/g, ''),
        logradouro: currentValues.endereco,
        numero: currentValues.numero,
        bairro: currentValues.bairro,
        cidade: currentValues.cidade,
        uf: currentValues.uf,
        complemento: currentValues.complemento,
        categoria_uid: currentValues.categoria_uid || null,
        indicado_uid: currentValues.indicado_uid || null,
        responsavel: user?.nome || null,
        usuario_uid: user?.uid || null,
        latitude: currentValues.latitude || null,
        longitude: currentValues.longitude || null,
        empresa_uid: company?.uid || null
      };

      // Log detalhado dos dados
      console.log('Colunas enviadas:', Object.keys(formattedData));
      console.log('Dados completos:', formattedData);

      // Inserir eleitor
      const { data: eleitorData, error: eleitorError } = await supabaseClient
        .from('gbp_eleitores')
        .insert([formattedData])
        .select()
        .single();

      if (eleitorError) {
        console.error('Erro ao cadastrar eleitor:', eleitorError);
        console.error('Dados enviados:', formattedData);
        console.error('Detalhes completos do erro:', {
          code: eleitorError.code,
          message: eleitorError.message,
          details: eleitorError.details,
          hint: eleitorError.hint
        });

        // Log adicional para verificar a estrutura da tabela
        console.log('Colunas enviadas:', Object.keys(formattedData));

        toast({
          title: "Erro!",
          description: `Erro ao cadastrar eleitor: ${eleitorError.message}`,
          variant: "danger",
          duration: 2000,
        });
        return;
      }

      // Criar atendimento se for primeiro atendimento
      if (isPrimeiroAtendimento) {
        // Buscar o último número de atendimento para a empresa atual
        const { data: ultimosAtendimentos, error: erroUltimoAtendimento } = await supabaseClient
          .from('gbp_atendimentos')
          .select('numero')
          .eq('empresa_uid', company?.uid)
          .not('numero', 'is', null)
          .order('numero', { ascending: false })
          .limit(1);

        if (erroUltimoAtendimento) {
          console.error('Erro ao buscar último número de atendimento:', erroUltimoAtendimento);
          toast({
            title: "Erro",
            description: `Erro ao buscar número de atendimento: ${erroUltimoAtendimento.message}`,
            variant: "destructive",
          });
          return;
        }

        // Definir o próximo número
        const ultimoNumero = ultimosAtendimentos && ultimosAtendimentos.length > 0 ? ultimosAtendimentos[0].numero : 0;
        const proximoNumero = ultimoNumero + 1;

        console.log('Último número encontrado:', ultimoNumero);
        console.log('Próximo número a ser usado:', proximoNumero);

        const atendimentoData = {
          eleitor_uid: eleitorData.uid,
          usuario_uid: user?.uid || null,
          categoria_uid: categoriaAtendimento || null,
          descricao: descricaoAtendimento,
          empresa_uid: company?.uid || null,
          status: statusAtendimento || 'pendente',
          responsavel: user?.nome || null,
          data_atendimento: new Date().toISOString(),
          created_at: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD
          numero: proximoNumero // Adicionando o número sequencial
        };

        const { error: atendimentoError } = await supabaseClient
          .from('gbp_atendimentos')
          .insert([atendimentoData]);

        if (atendimentoError) {
          console.error('Erro ao criar atendimento:', atendimentoError);
          console.error('Dados do atendimento:', atendimentoData);
          toast({
            title: "Erro",
            description: `Erro ao criar atendimento: ${atendimentoError.message}`,
            variant: "destructive",
          });
        }
      }

      // Sucesso
      toast({
        title: "✨ Tudo certo!",
        description: "Eleitor cadastrado com sucesso! Redirecionando...",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });
      resetForm();
      navigate('/app/eleitores');
    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({
        title: "Erro!",
        description: "Erro no cadastro",
        variant: "danger",
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Reseta o formulário para os valores padrão
    reset(defaultValues);

    // Força a limpeza explícita de campos críticos
    setValue('nome_mae', '');
    setValue('nome', '');
    setValue('cpf', '');

    // Reseta a localização
    setValue('latitude', null);
    setValue('longitude', null);

    // Limpa o último CPF consultado
    setLastCheckedCPF('');

    // Reseta os estados
    setIsPrimeiroAtendimento(false);
    setDescricaoAtendimento('');
    setStatusAtendimento('');
    setCategoriaAtendimento('');
  };

  const handleVoltar = () => {
    navigate('/app/eleitores');
  };

  return (
    <>
      <div className="min-h-full bg-white dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleVoltar}
                  className="mr-4 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Novo Eleitor
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:pb-6 sm:px-6 lg:px-8">
          {/* Dados Pessoais */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                  Dados Pessoais
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* CPF Field */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    CPF
                  </label>
                  <div className="relative">
                    <InputMask
                      mask="999.999.999-99"
                      placeholder="000.000.000-00"
                      {...register('cpf')}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                      style={globalStyles.input}
                    />
                    {isLoadingCPF && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nome Field */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome completo"
                    {...register('nome', { required: true })}
                    onChange={(e) => {
                      const formattedName = formatName(e.target.value);
                      setValue('nome', formattedName);
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.nome && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>

                {/* Nome da Mãe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Nome da Mãe
                  </label>
                  <input
                    type="text"
                    {...register('nome_mae')}
                    onChange={(e) => {
                      const formattedName = formatName(e.target.value);
                      setValue('nome_mae', formattedName);
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Digite o nome da mãe"
                    style={globalStyles.input}
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Data de Nascimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    placeholder="Data de nascimento"
                    {...register('nascimento', { required: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.nascimento && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>

                {/* Gênero */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gênero
                  </label>
                  <select
                    {...register('genero')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                  >
                    <option value="">Selecione o gênero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                  {errors.genero && (
                    <span className="text-sm text-red-500">{errors.genero.message}</span>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <NestedCategoryDropdown
                        value={watch('categoria_uid')}
                        onChange={(value) => setValue('categoria_uid', value)}
                        categories={categorias || []}
                        isLoading={isLoadingCategorias}
                        error={errors.categoria_uid?.message}
                        placeholder="Selecione uma categoria..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNovaCategoriaModal(true)}
                      className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600"
                      title="Nova Categoria"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Indicado por
                  </label>
                  <div className="flex space-x-2">
                    <select
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                      disabled={isLoadingIndicados}
                      {...register('indicado_uid')}
                      style={globalStyles.select}
                    >
                      <option value="">Selecione um indicado...</option>
                      {indicados?.map((indicado) => (
                        <option key={indicado.uid} value={indicado.uid}>
                          {indicado.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNovoIndicadoModal(true)}
                      className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600"
                      title="Novo Indicado"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <InputMask
                    mask="(99) 9 9999-9999"
                    placeholder="(00) 0 0000-0000"
                    {...register('whatsapp', { required: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.whatsapp && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Telefone
                  </label>
                  <InputMask
                    mask="(99) 9 9999-9999"
                    placeholder="(00) 0 0000-0000"
                    {...register('telefone')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados Eleitorais */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                  Dados Eleitorais
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Título de Eleitor
                  </label>
                  <InputMask
                    mask="9999 9999 9999"
                    placeholder="0000 0000 0000"
                    {...register('titulo')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Zona
                  </label>
                  <InputMask
                    mask="9999"
                    placeholder="0000"
                    {...register('zona')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Seção
                  </label>
                  <InputMask
                    mask="9999"
                    placeholder="0000"
                    {...register('secao')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                  Endereço
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-1">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                      CEP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <InputMask
                        mask="99999-999"
                        placeholder="00000-000"
                        {...register('cep')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                      {isLoadingCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>Não sabe o CEP?</span>
                      <a
                        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-200 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center space-x-1"
                      >
                        <span>Busque aqui</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                          <path
                            d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Logradouro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o logradouro"
                    {...register('endereco', { required: true })}
                    className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 ${errors.endereco ? 'border-red-500' : ''}`}
                    style={globalStyles.input}
                  />
                  {errors.endereco && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o número"
                    {...register('numero', { required: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.numero && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o complemento (opcional)"
                    {...register('complemento')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o bairro"
                    {...register('bairro', { required: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.bairro && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite a cidade"
                    {...register('cidade', { required: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.cidade && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="UF"
                    {...register('uf', { required: true })}
                    maxLength={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.uf && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Primeiro Atendimento */}
          <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="primeiro-atendimento"
                  checked={isPrimeiroAtendimento}
                  onChange={(e) => {
                    setIsPrimeiroAtendimento(e.target.checked);
                    // Limpa os erros quando desmarca o checkbox
                    if (!e.target.checked) {
                      setAtendimentoErrors({
                        categoria: '',
                        descricao: '',
                        status: ''
                      });
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="primeiro-atendimento" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                  Primeiro Atendimento
                </label>
              </div>

              {isPrimeiroAtendimento && (
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Categoria do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={categoriaAtendimento}
                      onChange={(e) => {
                        setCategoriaAtendimento(e.target.value);
                        setAtendimentoErrors(prev => ({ ...prev, categoria: '' }));
                      }}
                      className={`mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                        atendimentoErrors.categoria ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Selecione a categoria</option>
                      {categorias?.map((categoria) => (
                        <option key={categoria.uid} value={categoria.uid}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                    {atendimentoErrors.categoria && (
                      <p className="mt-1 text-sm text-red-500">{atendimentoErrors.categoria}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Descrição do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descreva o atendimento..."
                      value={descricaoAtendimento}
                      onChange={(e) => {
                        setDescricaoAtendimento(e.target.value);
                        setAtendimentoErrors(prev => ({ ...prev, descricao: '' }));
                      }}
                      className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 p-3 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                        atendimentoErrors.descricao ? 'border-red-500' : ''
                      }`}
                    />
                    {atendimentoErrors.descricao && (
                      <p className="mt-1 text-sm text-red-500">{atendimentoErrors.descricao}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Status do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={statusAtendimento}
                      onChange={(e) => {
                        setStatusAtendimento(e.target.value);
                        setAtendimentoErrors(prev => ({ ...prev, status: '' }));
                      }}
                      className={`mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                        atendimentoErrors.status ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Selecione o status</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                    {atendimentoErrors.status && (
                      <p className="mt-1 text-sm text-red-500">{atendimentoErrors.status}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/app/eleitores')}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Salvando...
                </div>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>

        {/* Modal de Nova Categoria */}
        <NovaCategoriaModal
          isOpen={showNovaCategoriaModal}
          onClose={() => setShowNovaCategoriaModal(false)}
        />

        {/* Modal de Novo Indicado */}
        <NovoIndicadoModal
          isOpen={showNovoIndicadoModal}
          onClose={() => setShowNovoIndicadoModal(false)}
        />
      </div>
    </>
  );
}
