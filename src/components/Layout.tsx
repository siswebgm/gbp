import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from 'react-error-boundary';
import { Menu, User } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useState, useEffect } from 'react';
import { NotificationBell } from './NotificationBell';
import { supabaseClient } from '../lib/supabase';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import { Toaster } from "@/components/ui/toaster";
import { UserProfileModal } from './UserProfileModal';
import { useToast } from "@/components/ui/use-toast";

// Hook personalizado para verificar o status da empresa
const useCheckCompanyStatus = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user?.id) return;

        // Busca o usuário para obter o empresa_uid
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.empresa_uid) return;

        // Verifica o status da empresa
        const { data: empresaData, error: empresaError } = await supabaseClient
          .from('gbp_empresas')
          .select('status, nome')
          .eq('uid', userData.empresa_uid)
          .single();

        if (empresaError) throw empresaError;

        // Se o status for 'suspended', faz logout e redireciona
        if (empresaData?.status === 'suspended') {
          toast({
            title: "Acesso Suspenso",
            description: `O acesso à empresa ${empresaData.nome || ''} foi suspenso. Entre em contato com o suporte para mais informações.`,
            variant: "destructive",
            duration: 5000
          });
          
          await supabaseClient.auth.signOut();
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar status da empresa:', error);
      }
    };

    // Verifica imediatamente e a cada 5 minutos
    checkStatus();
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [navigate, toast]);
};

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">Algo deu errado</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
      </div>
    </div>
  );
}

export function Layout() {
  useCheckCompanyStatus();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [companyPlan, setCompanyPlan] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Adiciona setup de notificações
  useNotificationSetup();

  useEffect(() => {
    const fetchUserPhoto = async () => {
      if (user?.uid) {
        const { data, error } = await supabaseClient
          .from('gbp_usuarios')
          .select('foto')
          .eq('uid', user.uid)
          .single();

        if (!error && data) {
          setUserPhoto(data.foto);
          console.log('Foto do usuário encontrada:', data.foto);
        } else {
          console.error('Erro ao buscar foto do usuário:', error);
          setUserPhoto(null);
        }
      }
    };

    const fetchCompanyPlan = async () => {
      if (user?.empresa_uid) {
        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .select('plano')
          .eq('uid', user.empresa_uid)
          .single();

        if (!error && data) {
          setCompanyPlan(data.plano);
          console.log('Plano da empresa:', data.plano); // Para debug
        } else {
          console.error('Erro ao buscar plano:', error);
          setCompanyPlan(null);
        }
      }
    };

    fetchUserPhoto();
    fetchCompanyPlan();
  }, [user?.uid, user?.empresa_uid]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 md:overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 dark:bg-blue-800 shadow-lg">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-blue-500"
            >
              <span className="sr-only">Abrir menu lateral</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png"
                alt="GBP Politico Logo"
                className="h-6 w-auto sm:h-8 object-contain"
              />
              <div className="flex flex-col justify-center">
                <div className="relative">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">GBP Politico</h1>
                  {companyPlan && (
                    <span className="hidden sm:block absolute left-1/2 -translate-x-1/2 bottom-0 text-[10px] text-white/80 translate-y-[80%]">
                      {companyPlan}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="focus:outline-none focus:ring-2 focus:ring-white/20 rounded-full"
            >
              {userPhoto ? (
                <div className="relative">
                  <img
                    src={userPhoto}
                    alt="Foto do usuário"
                    className="h-8 w-8 rounded-full border-2 border-white/10 hover:border-white/20 transition-colors object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      console.error('Erro ao carregar foto do usuário:', {
                        src: target.src,
                        error: e
                      });
                      // Fallback para o ícone de usuário
                      target.style.display = 'none';
                      // Mostrar o ícone de usuário como fallback
                      const fallbackIcon = target.parentElement?.querySelector('.fallback-icon');
                      if (fallbackIcon) {
                        fallbackIcon.classList.remove('hidden');
                      }
                    }}
                  />
                  <div className="fallback-icon hidden h-8 w-8 rounded-full bg-blue-500 border-2 border-white/10 hover:border-white/20 transition-colors flex items-center justify-center absolute top-0 left-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-white/10 hover:border-white/20 transition-colors flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="w-full h-full px-2 py-3 lg:px-4 lg:py-4">
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      <Toaster />
    </div>
  );
}