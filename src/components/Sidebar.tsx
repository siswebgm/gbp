import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Calendar,
  BarChart3,
  FileText,
  MessageSquare,
  Map,
  Target,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Focus,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useMenuItems } from '../hooks/useMenuItems';
import cn from 'classnames';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Eleitores', href: '/app/eleitores', icon: Users },
  { name: 'Atendimentos', href: '/app/atendimentos', icon: CalendarCheck },
  { name: 'Agenda', href: '/app/agenda', icon: Calendar },
  { name: 'Resultados Eleitorais', href: '/app/resultados-eleitorais', icon: BarChart3 },
  { name: 'Documentos', href: '/app/documentos', icon: FileText },
  { name: 'Disparo de Mídia', href: '/app/disparo-de-midia', icon: MessageSquare },
  { name: 'Mapa Eleitoral', href: '/app/mapa-eleitoral', icon: Map },
  { name: 'Metas', href: '/app/goals', icon: Target },
  { name: 'Usuários', href: '/app/users', icon: UserCircle },
  { name: 'Configurações', href: '/app/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const menuItems = useMenuItems();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 shadow-lg z-30 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-20' : 'w-64'
        }`}
      >
        {/* Navigation */}
        <nav className="flex flex-col h-full">
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block absolute top-4 -right-3 p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg dark:hover:bg-gray-700/50 transition-all duration-200 group"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400" />
            )}
          </button>

          <div className={`flex-1 overflow-y-auto py-4 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}>
            <div>
              {navigation.map((item) => {
                const isActive = 
                  item.href === '/app' 
                    ? location.pathname === '/app' || location.pathname === '/app/'
                    : location.pathname.startsWith(item.href);

                const isRestrito = [
                  '/app/resultados-eleitorais',
                  '/app/documentos',
                  '/app/disparo-de-midia',
                  '/app/mapa-eleitoral',
                  '/app/users',
                  '/app/settings'
                ].includes(item.href);

                const isDisabled = isRestrito && user?.nivel_acesso !== 'admin';
                
                return (
                  <Link
                    key={item.name}
                    to={isDisabled ? '#' : item.href}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        // toast.showToast({
                        //   type: 'error',
                        //   title: 'Acesso Restrito',
                        //   description: 'Esta funcionalidade é exclusiva para administradores'
                        // });
                        return;
                      }
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={`flex items-center ${
                      isCollapsed 
                        ? 'justify-center w-12 h-10 mx-auto' 
                        : 'gap-3 px-4 py-2'
                    } rounded-lg text-sm font-medium transition-all duration-200 group hover:scale-[1.02] ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-800/50 dark:text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                    } ${
                      isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className={`flex items-center justify-center ${isCollapsed ? 'w-8 h-8' : 'w-8 h-8'} rounded-lg transition-transform duration-200 ${
                      isActive 
                        ? 'text-blue-600 dark:text-white' 
                        : 'text-gray-400 dark:text-gray-400 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    {!isCollapsed && (
                      <span className="truncate flex-1">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Footer com Menu de Perfil */}
          <div className="border-t border-gray-100 dark:border-gray-700">
            <div className="relative">
              <button
                onClick={() => !isCollapsed && setShowProfileMenu(!showProfileMenu)}
                className={`w-full flex items-center ${
                  isCollapsed 
                    ? 'justify-center h-16 hover:bg-gray-50 dark:hover:bg-gray-700/50' 
                    : 'gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } transition-colors duration-200`}
                title={isCollapsed ? user?.nome || 'Usuário' : undefined}
              >
                {user?.foto ? (
                  <img
                    src={user.foto}
                    alt=""
                    className={`${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'} rounded-full border-2 border-gray-200 dark:border-gray-600 transition-transform duration-200 hover:scale-105 object-cover`}
                  />
                ) : (
                  <div className={`${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'} rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center transition-transform duration-200 hover:scale-105`}>
                    <User className={`${isCollapsed ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600 dark:text-blue-400`} />
                  </div>
                )}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                      {user?.nome?.toLowerCase() || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {user?.cargo || 'Cargo/Função'}
                    </p>
                  </div>
                )}
              </button>

              {/* Menu de Perfil - só mostra quando não está colapsado */}
              {showProfileMenu && !isCollapsed && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
                  <Link
                    to="/app/perfil"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                  <Link
                    to="/app/focos"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Focus className="h-4 w-4" />
                    Grupos de Foco
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}