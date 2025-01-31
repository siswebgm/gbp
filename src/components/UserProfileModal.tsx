import { useState, useEffect } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabaseClient } from '../lib/supabase';
import { useToast } from './ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"

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
  const { user, session } = useAuth();
  const { toast } = useToast();

  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
        description: "A imagem é muito grande. O tamanho máximo é 1MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const timestamp = Date.now();
      const fileName = `profile_${user.uid}_${timestamp}`;
      
      // Prepara o FormData para o webhook
      const formData = new FormData();
      formData.append('file', file, `${fileName}.jpeg`);
      formData.append('empresa', 'jmapps');
      formData.append('arquivo_nome', fileName);
      formData.append('extensao', 'jpeg');
      formData.append('mimetype', 'image/jpeg');

      // Faz o upload para o webhook
      const uploadResponse = await fetch('https://whkn8n.guardia.work/webhook/gbp_midia', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Erro no upload da imagem');
      }

      const uploadResult = await uploadResponse.json();
      
      // Verifica se a resposta tem o formato esperado
      if (Array.isArray(uploadResult) && uploadResult[0]?.ulrPublica) {
        // Atualiza o estado com a URL da imagem do servidor
        setUserData(prev => ({ ...prev, foto: uploadResult[0].ulrPublica }));
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer o upload da imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      // Atualiza os dados do usuário
      const { error: updateError } = await supabaseClient
        .from('gbp_usuarios')
        .update({ 
          nome: userData.nome,
          contato: userData.contato,
          email: userData.email,
          foto: userData.foto,
          updated_at: new Date().toISOString()
        })
        .eq('uid', user.uid);

      if (updateError) throw updateError;

      // Se houver nova senha, atualiza
      if (senha && session?.access_token) {
        const { error: passwordError } = await supabaseClient.auth.updateUser({
          password: senha
        });

        if (passwordError) {
          console.error('Erro ao atualizar senha:', passwordError);
          throw passwordError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          setUserData(data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus dados. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, user?.uid, toast]);

  // Função para formatar o nome da empresa
  const formatEmpresaNome = (nome: string): string => {
    return nome
      .toLowerCase() // converte para minúsculas
      .normalize('NFD') // normaliza caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]/g, ''); // remove caracteres especiais
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-[400px] bg-white dark:bg-gray-900 rounded-lg shadow-xl" 
        hideClose
      >
        <div className="relative h-16 bg-gradient-to-r from-blue-600 to-blue-400 rounded-t-lg">
          <DialogTitle className="sr-only">
            Editar Perfil
          </DialogTitle>
          <DialogDescription className="sr-only">
            Atualize suas informações de perfil como nome, telefone, email e foto.
          </DialogDescription>
          <button 
            onClick={onClose}
            className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="absolute -bottom-8 w-full px-4">
            <div className="flex items-end gap-3">
              <div className="relative">
                <label
                  htmlFor="photo-upload"
                  className="block cursor-pointer"
                >
                  {userData.foto ? (
                    <div className="relative group">
                      <img
                        src={userData.foto}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover border-3 border-white dark:border-gray-900 shadow-lg transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-800 border-3 border-white dark:border-gray-900 shadow-lg flex items-center justify-center group hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                      <Camera size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
                    </div>
                  )}
                </label>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <h2 className="text-base font-semibold mb-1 text-gray-900 dark:text-white">
                Editar Perfil
              </h2>
            </div>
          </div>
        </div>

        <div className="p-4 pt-12 space-y-4">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Nome */}
              <div className="space-y-1">
                <label htmlFor="nome" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={userData.nome || ''}
                  onChange={(e) => setUserData(prev => ({ ...prev, nome: e.target.value }))}
                  className="block w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm bg-transparent transition-colors duration-200"
                  required
                />
              </div>

              {/* Contato */}
              <div>
                <label htmlFor="contato" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contato
                </label>
                <input
                  type="tel"
                  id="contato"
                  name="contato"
                  value={userData.contato || ''}
                  onChange={(e) => setUserData(prev => ({ ...prev, contato: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userData.email || ''}
                  onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                  className="block w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm bg-transparent transition-colors duration-200"
                  required
                />
              </div>

              {/* Nova Senha */}
              <div className="space-y-1">
                <label htmlFor="senha" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Nova senha
                </label>
                <input
                  type="password"
                  id="senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm bg-transparent transition-colors duration-200"
                  placeholder="Deixe em branco para não alterar"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 mt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
