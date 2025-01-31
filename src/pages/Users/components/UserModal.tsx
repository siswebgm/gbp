import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userService } from '../../../services/users';
import { emailService } from '../../../services/email';
import { toast } from 'react-hot-toast';
import { Copy, Mail } from 'lucide-react';
import { generateToken } from '../../../utils/token';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nivel_acesso: z.enum(['admin', 'atendente'], {
    required_error: 'Nível de acesso é obrigatório',
  }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa_id: number;
  onSuccess: () => void;
}

export function UserModal({ isOpen, onClose, empresa_id, onSuccess }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      setLoading(true);

      // 1. Criar usuário
      const { user_id } = await userService.create({
        email: data.email,
        nivel_acesso: data.nivel_acesso,
        empresa_id,
        status: 'pending'
      });

      // 2. Gerar token
      const token = generateToken();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // Token válido por 7 dias

      await userService.saveRegistrationToken({
        user_id,
        token,
        expires_at: expirationDate
      });

      // 3. Gerar link de convite
      const inviteUrl = `${window.location.origin}/register/${token}`;
      setInviteLink(inviteUrl);

      // 4. Enviar email
      await emailService.sendInvite({
        email: data.email,
        invite_link: inviteUrl
      });

      toast.success('Usuário criado com sucesso!');
      onSuccess();
      reset();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleClose = () => {
    reset();
    setInviteLink(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Digite o email do usuário"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nivel_acesso" className="block text-sm font-medium text-gray-700">
              Nível de Acesso
            </label>
            <select
              id="nivel_acesso"
              {...register('nivel_acesso')}
              className={`w-full rounded-md border ${
                errors.nivel_acesso ? 'border-red-500' : 'border-gray-300'
              } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Selecione um nível</option>
              <option value="admin">Administrador</option>
              <option value="atendente">Atendente</option>
            </select>
            {errors.nivel_acesso && (
              <p className="text-sm text-red-500">{errors.nivel_acesso.message}</p>
            )}
          </div>

          {inviteLink ? (
            <div className="space-y-4">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Convite enviado com sucesso!
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Um email com o link de convite foi enviado para o usuário.
                        Você também pode copiar o link abaixo e compartilhar manualmente:
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleClose}
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end space-x-2">
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
              >
                {loading ? (
                  <>
                    <span className="animate-spin">&#8987;</span>
                    <span className="ml-2">Criando...</span>
                  </>
                ) : (
                  'Criar Usuário'
                )}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}