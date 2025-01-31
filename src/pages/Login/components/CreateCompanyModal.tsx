import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Phone, MapPin, Search, User } from 'lucide-react';
import { supabaseClient, supabasePublicClient } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { IMaskInput } from 'react-imask';
import { forwardRef } from 'react';

const createCompanySchema = z.object({
  // Dados da Empresa
  nomeEmpresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  telefoneEmpresa: z.string().optional(),
  cep: z.string().min(8, 'CEP inválido'),
  logradouro: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2, 'Use a sigla do estado (2 letras)').optional(),
  numero: z.string().optional(),
  
  // Dados do Administrador
  nomeAdmin: z.string().min(1, 'Nome do administrador é obrigatório'),
  telefoneAdmin: z.string().optional(),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "Senhas não conferem",
  path: ["confirmarSenha"],
});

type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ViaCepResponse {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

const MaskedInput = forwardRef<HTMLInputElement, any>(({ mask, onChange, ...props }, ref) => {
  return (
    <IMaskInput
      mask={mask}
      unmask={true}
      ref={ref}
      onAccept={(value: any) => onChange && onChange({ target: { value } })}
      {...props}
    />
  );
});

MaskedInput.displayName = 'MaskedInput';

const StyledMaskedInput = forwardRef<HTMLInputElement, any>((props, ref) => {
  return (
    <Input
      {...props}
      ref={ref}
      render={(inputProps) => (
        <MaskedInput {...inputProps} mask={props.mask} />
      )}
    />
  );
});

StyledMaskedInput.displayName = 'StyledMaskedInput';

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    setError
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
  });

  const cep = watch('cep');

  const buscarCep = async (cep: string) => {
    if (cep?.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data: ViaCepResponse = await response.json();
        
        if (!data.erro) {
          setValue('logradouro', data.logradouro);
          setValue('bairro', data.bairro);
          setValue('cidade', data.localidade);
          setValue('estado', data.uf);
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast.error('Erro ao buscar CEP');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const onSubmit = async (data: CreateCompanyFormData) => {
    try {
      setLoading(true);

      // Cria a empresa
      const { data: empresaData, error: empresaError } = await supabasePublicClient
        .from('gbp_empresas')
        .insert({
          nome: data.nomeEmpresa,
          cep: data.cep.replace(/\D/g, ''),
          logradouro: data.logradouro,
          numero: data.numero,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          status: 'trial',
          data_expiracao: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString()
        })
        .select()
        .single();

      if (empresaError) {
        console.error('Erro ao criar empresa:', empresaError);
        throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
      }

      if (!empresaData) {
        throw new Error('Erro ao criar empresa: Nenhum dado retornado');
      }

      // 2. Criar usuário na tabela gbp_usuarios com o ID da empresa
      const { data: userData, error: userError } = await supabasePublicClient
        .from('gbp_usuarios')
        .insert({
          nome: data.nomeAdmin,
          email: data.email,
          senha: data.senha,
          cargo: 'admin',
          nivel_acesso: 'admin',
          status: 'active',
          empresa_uid: empresaData.uid,
          permissoes: [
            'view_projetos_lei',
            'create_projetos_lei',
            'edit_projetos_lei',
            'delete_projetos_lei',
            'view_oficios',
            'create_oficios',
            'edit_oficios',
            'delete_oficios',
            'view_dashboard',
            'manage_users',
            'manage_roles',
            'manage_settings'
          ],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userError) {
        // Se houver erro ao criar o usuário, deletar a empresa criada
        await supabasePublicClient
          .from('gbp_empresas')
          .delete()
          .eq('uid', empresaData.uid);

        console.error('Erro ao criar usuário:', userError);
        throw new Error(`Erro ao criar usuário: ${userError.message}`);
      }

      if (!userData) {
        // Se não retornar dados do usuário, deletar a empresa criada
        await supabasePublicClient
          .from('gbp_empresas')
          .delete()
          .eq('uid', empresaData.uid);

        throw new Error('Erro ao criar usuário: Nenhum dado retornado');
      }

      toast.success('Empresa criada com sucesso! Você tem 5 dias de período de teste.');
      onSuccess();
      reset();
      onClose();
    } catch (error) {
      console.error('Error creating company:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao criar empresa');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[800px] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Criar Nova Empresa</DialogTitle>
          <DialogDescription className="text-gray-500">
            Preencha os dados abaixo para criar sua empresa e conta de administrador
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Dados da Empresa */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Dados da Empresa
            </h2>
            
            <div className="space-y-4">
              {/* Nome da Empresa */}
              <div>
                <label htmlFor="nomeEmpresa" className="block text-sm font-medium text-gray-700">
                  Nome da Empresa *
                </label>
                <div className="mt-1 relative">
                  <Building2 className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <Input
                    id="nomeEmpresa"
                    type="text"
                    {...register('nomeEmpresa')}
                    className="pl-10"
                    placeholder="Nome da empresa"
                  />
                </div>
                {errors.nomeEmpresa && (
                  <p className="mt-1 text-sm text-red-500">{errors.nomeEmpresa.message}</p>
                )}
              </div>

              {/* Telefone da Empresa */}
              <div>
                <label htmlFor="telefoneEmpresa" className="block text-sm font-medium text-gray-700">
                  Telefone da Empresa
                </label>
                <div className="mt-1 relative">
                  <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <StyledMaskedInput
                    mask="(00) 00000-0000"
                    id="telefoneEmpresa"
                    {...register('telefoneEmpresa')}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* CEP */}
              <div>
                <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                  CEP *
                </label>
                <div className="mt-1 relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <StyledMaskedInput
                    mask="00000-000"
                    id="cep"
                    {...register('cep')}
                    onAccept={(value: string) => {
                      if (value.length === 8) {
                        buscarCep(value);
                      }
                    }}
                    className="pl-10"
                    placeholder="00000-000"
                  />
                  {loadingCep && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                {errors.cep && (
                  <p className="mt-1 text-sm text-red-500">{errors.cep.message}</p>
                )}
              </div>

              {/* Endereço Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logradouro */}
                <div className="md:col-span-2">
                  <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700">
                    Logradouro
                  </label>
                  <div className="mt-1 relative">
                    <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                    <Input
                      id="logradouro"
                      type="text"
                      {...register('logradouro')}
                      className="pl-10"
                      placeholder="Rua, Avenida, etc"
                    />
                  </div>
                </div>

                {/* Número */}
                <div>
                  <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                    Número
                  </label>
                  <Input
                    id="numero"
                    type="text"
                    {...register('numero')}
                    placeholder="Número"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">
                    Bairro
                  </label>
                  <Input
                    id="bairro"
                    type="text"
                    {...register('bairro')}
                    placeholder="Bairro"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                    Cidade
                  </label>
                  <Input
                    id="cidade"
                    type="text"
                    {...register('cidade')}
                    placeholder="Cidade"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <Input
                    id="estado"
                    type="text"
                    {...register('estado')}
                    placeholder="UF"
                    maxLength={2}
                  />
                  {errors.estado && (
                    <p className="mt-1 text-sm text-red-500">{errors.estado.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Administrador */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Dados do Administrador
            </h2>
            
            <div className="space-y-4">
              {/* Nome do Administrador */}
              <div>
                <label htmlFor="nomeAdmin" className="block text-sm font-medium text-gray-700">
                  Nome do Administrador *
                </label>
                <div className="mt-1 relative">
                  <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <Input
                    id="nomeAdmin"
                    type="text"
                    {...register('nomeAdmin')}
                    className="pl-10"
                    placeholder="Nome completo"
                  />
                </div>
                {errors.nomeAdmin && (
                  <p className="mt-1 text-sm text-red-500">{errors.nomeAdmin.message}</p>
                )}
              </div>

              {/* Telefone do Administrador */}
              <div>
                <label htmlFor="telefoneAdmin" className="block text-sm font-medium text-gray-700">
                  Telefone do Administrador
                </label>
                <div className="mt-1 relative">
                  <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <StyledMaskedInput
                    mask="(00) 00000-0000"
                    id="telefoneAdmin"
                    {...register('telefoneAdmin')}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <div className="mt-1 relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="pl-10"
                    placeholder="email@exemplo.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Senha e Confirmar Senha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
                    Senha *
                  </label>
                  <Input
                    id="senha"
                    type="password"
                    {...register('senha')}
                    placeholder="••••••"
                  />
                  {errors.senha && (
                    <p className="mt-1 text-sm text-red-500">{errors.senha.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700">
                    Confirmar Senha *
                  </label>
                  <Input
                    id="confirmarSenha"
                    type="password"
                    {...register('confirmarSenha')}
                    placeholder="••••••"
                  />
                  {errors.confirmarSenha && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmarSenha.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Criando...</span>
                </>
              ) : (
                'Criar Empresa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 