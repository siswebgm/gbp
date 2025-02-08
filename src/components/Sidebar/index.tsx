import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  X, 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Calendar, 
  BarChart, 
  FileText, 
  Send, 
  Map, 
  Target, 
  Users2, 
  Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMenuItems } from '../../hooks/useMenuItems';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/app',
      adminOnly: false
    },
    {
      title: 'Eleitores',
      icon: Users,
      href: '/app/eleitores',
      adminOnly: false
    },
    {
      title: 'Atendimentos',
      icon: CalendarCheck,
      href: '/app/atendimentos',
      adminOnly: false
    },
    {
      title: 'Agenda',
      icon: Calendar,
      href: '/app/agenda',
      adminOnly: false
    },
    {
      title: 'Resultados Eleitorais',
      icon: BarChart,
      href: '/app/resultados-eleitorais',
      adminOnly: true
    },
    {
      title: 'Documentos',
      icon: FileText,
      href: '/app/documentos',
      adminOnly: true
    },
    {
      title: 'Disparo de Mídia',
      icon: Send,
      href: '/app/disparo-de-midia',
      adminOnly: true
    },
    {
      title: 'Mapa Eleitoral',
      icon: Map,
      href: '/app/mapa-eleitoral',
      adminOnly: true
    },
    {
      title: 'Metas',
      icon: Target,
      href: '/app/metas',
      adminOnly: false
    },
    {
      title: 'Usuários',
      icon: Users2,
      href: '/app/usuarios',
      adminOnly: true
    },
    {
      title: 'Configurações',
      icon: Settings,
      href: '/app/configuracoes',
      adminOnly: true
    }
  ];

  const handleClick = (path: string) => {
    // Adiciona o prefixo /app se o caminho não começar com ele
    const fullPath = path.startsWith('/app') ? path : `/app${path}`;
    navigate(fullPath);
    if (window.innerWidth < 1024) { // lg breakpoint
      onClose();
    }
  };

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 w-64 h-screen pt-20 pb-4 transition-transform bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
        <ul className="space-y-2 font-medium">
          {menuItems.map((item, index) => {
            const isAdmin = user?.nivel_acesso === 'admin';
            const isDisabled = item.adminOnly && !isAdmin;
            
            return (
              <li key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={isDisabled ? '#' : item.href}
                      onClick={e => {
                        if (isDisabled) {
                          e.preventDefault();
                          toast.showToast({
                            type: 'error',
                            title: 'Acesso Restrito',
                            description: 'Esta funcionalidade é exclusiva para administradores'
                          });
                        }
                      }}
                      className={cn(
                        "flex items-center p-2 text-gray-900 rounded-lg dark:text-white group relative",
                        location.pathname === item.href
                          ? "bg-gray-100 dark:bg-gray-700"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <item.icon className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                      <span className="ml-3">{item.title}</span>
                      {item.adminOnly && (
                        <span className="ml-auto text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent>
                      <p>Acesso restrito a administradores</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
