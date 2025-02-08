import { useState, useEffect } from 'react';
import { X, Camera, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabaseClient } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
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
  DialogClose
} from "./ui/dialog"
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const toast = useToast();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { user } = useAuth();
  const authStore = useAuthStore();
  const { company } = useCompanyStore();
  const setCompanyUser = useCompanyStore((state) => state.setUser);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const sanitizeFileName = (fileName: string): string => {
    // Remove caracteres especiais e espaços
    const cleanName = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9.]/g, '_') // Substitui caracteres especiais por _
      .replace(/_+/g, '_') // Remove underscores múltiplos
      .toLowerCase();

    // Separa nome e extensão
    const [name, ext] = cleanName.split('.');
    
    // Gera um timestamp
    const timestamp = Date.now();
    
    // Retorna o nome formatado
    return `${timestamp}_${name}.${ext}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.showToast({
          type: 'error',
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 10MB",
        });
        return;
      }

      setSelectedFile(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.showToast({
        type: 'error',
        title: "Erro",
        description: "Usuário não identificado. Por favor, faça login novamente.",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let photoUrl = userData.foto;

      // Upload da foto se houver uma nova
      if (selectedFile) {
        try {
          const fileName = sanitizeFileName(selectedFile.name);
          console.log('Nome do arquivo sanitizado:', fileName);

          // Preparar dados do upload
          const uploadData = {
            fileSize: selectedFile.size,
            fileType: selectedFile.type,
            fileName,
            empresa: company?.nome,
            empresa_uid: user.empresa_uid
          };

          if (!company?.nome) {
            throw new Error('Empresa não encontrada');
          }

          // Garantir que o nome do bucket esteja em minúsculas
          const bucketName = company.nome.toLowerCase();

          console.log('Iniciando upload...', uploadData);

          // Criar nome do arquivo com timestamp para evitar conflitos
          const timestamp = new Date().getTime();
          const safeFileName = `${timestamp}_${fileName}`;

          // Fazer upload usando o cliente Supabase
          const { data: uploadDataResponse, error: uploadError } = await supabaseClient
            .storage
            .from(bucketName) // Usar o nome da empresa em minúsculas
            .upload(safeFileName, selectedFile, {
              cacheControl: '3600',
              contentType: selectedFile.type,
              upsert: true // Permitir sobrescrever se arquivo existir
            });

          if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw new Error(uploadError.message || 'Erro no upload');
          }

          if (!uploadDataResponse?.path) {
            throw new Error('Caminho do arquivo não retornado');
          }

          // URL pública do arquivo
          const { data: urlData } = await supabaseClient
            .storage
            .from(bucketName) // Usar o mesmo nome em minúsculas
            .getPublicUrl(uploadDataResponse.path);

          photoUrl = urlData.publicUrl;
          
          console.log('Upload concluído com sucesso. URL:', photoUrl);

        } catch (uploadError: any) {
          console.error('Erro no upload:', uploadError);
          
          toast.showToast({
            type: 'error',
            title: "Erro no upload",
            description: uploadError.message || "Não foi possível fazer o upload da imagem",
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

        toast.showToast({
          type: 'success',
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!",
        });

        onClose();
      }

    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.showToast({
        type: 'error',
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Fecha o modal
      onClose();
      
      // Faz logout no Supabase
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      
      // Limpa os dados do usuário no AuthStore
      authStore.logout();
      
      // Limpa os dados da empresa
      setCompanyUser(null);
      
      // Mostra mensagem de sucesso
      toast.showToast({
        type: 'success',
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso'
      });

      // Redireciona para a página de login
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro ao desconectar',
        description: 'Ocorreu um erro ao tentar desconectar'
      });
    }
  };

  useEffect(() => {
    const carregarFoto = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('foto')
          .eq('uid', user.uid)
          .single();

        if (userError) {
          console.error('Erro ao buscar foto:', userError);
          setFotoUrl(null); // Define como null em caso de erro
          return; // Retorna sem tentar novamente
        }

        // Se não houver foto, define como null e retorna
        if (!userData?.foto) {
          setFotoUrl(null);
          return;
        }

        // Verifica se a URL da foto é válida
        try {
          const response = await fetch(userData.foto);
          if (!response.ok) {
            console.warn('Foto não encontrada:', userData.foto);
            setFotoUrl(null); // Define como null se a foto não existir
            return;
          }
          setFotoUrl(userData.foto);
        } catch (error) {
          console.error('Erro ao verificar foto:', error);
          setFotoUrl(null); // Define como null em caso de erro de rede
        }
      } catch (error) {
        console.error('Erro ao carregar foto:', error);
        setFotoUrl(null);
      } finally {
        setLoading(false);
      }
    };

    carregarFoto();
  }, [user?.uid]);

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
        toast.showToast({
          type: 'error',
          title: "Erro",
          description: "Não foi possível carregar os dados do usuário.",
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
      <DialogContent className="sm:max-w-[450px] overflow-hidden rounded-lg" hideClose>
        {/* Header com fundo azul e gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-[60px] relative">
          {/* Botões do topo */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="rounded-full p-2 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 group"
              title="Sair do Sistema"
            >
              <LogOut 
                className="h-[18px] w-[18px] text-white/90 transition-all duration-200 group-hover:text-white" 
                strokeWidth={2.5}
              />
              <span className="sr-only">Sair</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <X className="h-[18px] w-[18px] text-white/90 hover:text-white" strokeWidth={2.5} />
              <span className="sr-only">Fechar</span>
            </button>
          </div>

          {/* Título centralizado */}
          <div className="h-full flex items-center justify-center">
            <DialogTitle className="text-lg font-semibold text-white">Editar Perfil</DialogTitle>
          </div>

          {/* Avatar */}
          <div className="absolute -bottom-6 left-4">
            <label
              htmlFor="avatar-upload"
              className="relative cursor-pointer group"
            >
              <div className="h-14 w-14 rounded-full overflow-hidden bg-white shadow-lg ring-2 ring-white transition-transform duration-200 group-hover:scale-105">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="loading loading-spinner loading-sm"></span>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={() => setFotoUrl(null)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-50">
                    <Camera className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>

              <input
                id="avatar-upload"
                type="file"
                className="hidden"
                accept=".jpeg,.jpg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>

        {/* Formulário */}
        <div className="p-4 pt-8 space-y-2.5">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="nome" className="text-xs font-medium text-gray-700">Nome completo</Label>
              <Input
                id="nome"
                value={userData.nome}
                onChange={(e) => setUserData(prev => ({ ...prev, nome: e.target.value }))}
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contato" className="text-xs font-medium text-gray-700">Contato</Label>
              <Input
                id="contato"
                value={userData.contato}
                onChange={(e) => setUserData(prev => ({ ...prev, contato: e.target.value }))}
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-medium text-gray-700">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="senha" className="text-xs font-medium text-gray-700">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite para alterar a senha"
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>
          </div>

          {/* Divisor */}
          <div className="my-4 border-t border-gray-200" />

          {/* Footer */}
          <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-7 px-3 text-xs border-gray-200 hover:bg-white hover:text-gray-900 transition-colors duration-200"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-7 px-4 text-xs bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
