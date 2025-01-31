import { useState, useEffect } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabaseClient } from '../lib/supabase';
import { useToast } from './ui/use-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog"
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  nome: string;
  contato: string;
  email: string;
  foto: string;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [userData, setUserData] = useState<UserData>({
    nome: '',
    contato: '',
    email: '',
    foto: ''
  });
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const authStore = useAuthStore();
  const setCompanyUser = useCompanyStore((state) => state.setUser);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validações
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Formato de arquivo não suportado. Use apenas JPG, PNG ou WebP.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Erro",
        description: "A imagem é muito grande. O tamanho máximo é 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Criar preview local da imagem
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserData(prev => ({ ...prev, foto: reader.result as string }));
    };
    reader.readAsDataURL(file);
    
    // Guardar o arquivo para upload posterior
    setSelectedFile(file);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast({
        title: "Erro",
        description: "Usuário não identificado. Por favor, faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      let photoUrl = userData.foto;

      // Upload da foto se houver uma nova
      if (selectedFile) {
        try {
          const timestamp = Date.now();
          
          if (!user?.empresa_uid) {
            throw new Error('ID da empresa não encontrado');
          }

          // Buscar nome da empresa
          const { data: empresaData, error: empresaError } = await supabaseClient
            .from('gbp_empresas')
            .select('nome')
            .eq('uid', user.empresa_uid)
            .single();

          if (empresaError) {
            console.error('Erro ao buscar empresa:', empresaError);
            throw new Error(`Erro ao buscar empresa: ${empresaError.message}`);
          }

          if (!empresaData?.nome) {
            throw new Error('Nome da empresa não encontrado');
          }

          // Formatar nome do arquivo
          const fileName = `${timestamp}_perfil_${selectedFile.name}`;
          
          console.log('Iniciando upload...', {
            fileSize: selectedFile.size,
            fileType: selectedFile.type,
            fileName,
            empresa: empresaData.nome,
            empresa_uid: user.empresa_uid
          });

          // Fazer upload usando o cliente Supabase
          const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from(empresaData.nome)
            .upload(fileName, selectedFile, {
              cacheControl: '3600',
              contentType: selectedFile.type,
              upsert: false
            });

          if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw new Error(uploadError.message || 'Erro no upload');
          }

          if (!uploadData?.path) {
            throw new Error('Caminho do arquivo não retornado');
          }

          // URL pública do arquivo
          const { data: urlData } = await supabaseClient
            .storage
            .from(empresaData.nome)
            .getPublicUrl(uploadData.path);

          photoUrl = urlData.publicUrl;
          
          console.log('Upload concluído com sucesso. URL:', photoUrl);

        } catch (uploadError: any) {
          console.error('Erro no upload:', uploadError);
          
          toast({
            title: "Erro no upload",
            description: uploadError.message || "Não foi possível fazer o upload da imagem",
            variant: "destructive",
          });
          
          throw new Error('Falha no upload da imagem');
        }
      }

      // Preparar dados para atualização
      const updateData: {
        nome?: string | null;
        contato?: string | null;
        foto?: string | null;
        senha?: string | null;
        email: string;
      } = {
        email: userData.email, // email é obrigatório (not null)
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (userData.nome?.trim()) updateData.nome = userData.nome.trim();
      if (userData.contato?.trim()) updateData.contato = userData.contato.trim();
      if (photoUrl?.trim()) updateData.foto = photoUrl.trim();
      if (senha?.trim()) updateData.senha = senha.trim();

      // Atualizar os dados no Supabase
      const { error: updateError } = await supabaseClient
        .from('gbp_usuarios')
        .update(updateData)
        .eq('uid', user.uid); // Vincula ao uid do usuário logado

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado global
      if (user) {
        const updatedUser = {
          ...user,
          nome: updateData.nome || user.nome,
          foto: photoUrl || user.foto
        };

        // Atualizar AuthStore
        authStore.setUser({
          uid: updatedUser.uid,
          nome: updatedUser.nome,
          email: updatedUser.email || '',
          empresa_uid: updatedUser.empresa_uid || '',
          role: updatedUser.nivel_acesso as 'admin' | 'attendant',
          foto: updatedUser.foto
        });

        // Atualizar CompanyStore
        setCompanyUser(updatedUser);

        // Atualizar localStorage
        localStorage.setItem('gbp_user', JSON.stringify(updatedUser));
      }

      setSaveStatus({
        type: 'success',
        message: 'Perfil atualizado com sucesso!'
      });

    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setSaveStatus({
        type: 'error',
        message: error.message || 'Não foi possível atualizar o perfil.'
      });
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar dados do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      setIsLoading(true);

      try {
        const { data, error } = await supabaseClient
          .from('gbp_usuarios')
          .select('nome, contato, email, foto')
          .eq('uid', user.uid)
          .single();

        if (error) throw error;

        if (data) {
          setUserData({
            nome: data.nome || '',
            contato: data.contato || '',
            email: data.email || '',
            foto: data.foto || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do usuário.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, user?.uid]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações de perfil
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Avatar com upload */}
          <div className="flex flex-col items-center gap-4">
            <label
              htmlFor="avatar-upload"
              className="relative cursor-pointer group"
            >
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 ring-2 ring-offset-2 ring-offset-white ring-primary/20 group-hover:ring-primary/40 transition-all">
                {userData.foto ? (
                  <img
                    src={userData.foto}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary shadow-lg group-hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4 text-white" />
              </div>
              <input
                id="avatar-upload"
                type="file"
                className="hidden"
                accept=".jpeg,.jpg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </label>
            <span className="text-sm text-gray-500">Clique para alterar a foto</span>
          </div>

          {/* Campos do formulário */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={userData.nome}
                onChange={(e) => setUserData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={userData.contato}
                onChange={(e) => setUserData(prev => ({ ...prev, contato: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite para alterar a senha"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-4">
          {/* Área de status */}
          {saveStatus && (
            <div className={cn(
              "w-full p-3 rounded-md text-sm",
              saveStatus.type === 'success' 
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {saveStatus.message}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Fechar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
