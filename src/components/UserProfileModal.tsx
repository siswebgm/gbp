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
  DialogClose
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const authStore = useAuthStore();
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
    
    try {
      let photoUrl = userData.foto;

      // Upload da foto se houver uma nova
      if (selectedFile) {
        try {
          const fileName = sanitizeFileName(selectedFile.name);
          console.log('Nome do arquivo sanitizado:', fileName);

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

          // Prepara dados do upload
          const uploadData = {
            fileSize: selectedFile.size,
            fileType: selectedFile.type,
            fileName,
            empresa: empresaData.nome,
            empresa_uid: user.empresa_uid
          };

          console.log('Iniciando upload...', uploadData);

          // Fazer upload usando o cliente Supabase
          const { data: uploadDataResponse, error: uploadError } = await supabaseClient
            .storage
            .from(uploadData.empresa)
            .upload(fileName, selectedFile, {
              cacheControl: '3600',
              contentType: selectedFile.type,
              upsert: false
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
            .from(uploadData.empresa)
            .getPublicUrl(uploadDataResponse.path);

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

        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!",
          variant: "default",
          className: "bg-green-50 text-green-700 border-green-200",
        });

        onClose();
      }

    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
      <DialogContent className="sm:max-w-[450px] overflow-hidden rounded-lg" hideClose>
        {/* Header com fundo azul e gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-[60px] relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 bg-white/10 backdrop-blur-sm opacity-80 hover:opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="h-4 w-4 text-white" />
            <span className="sr-only">Fechar</span>
          </button>

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
                ) : fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={() => setFotoUrl(null)} // Em caso de erro ao carregar imagem
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
                onChange={handleFileChange}
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
              <Label htmlFor="senha" className="text-xs font-medium text-gray-700">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50/80 flex justify-end gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
