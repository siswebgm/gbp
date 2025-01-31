import { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Map,
  BarChart2,
  Target,
  BarChart,
  UserCog,
  Settings,
  Send,
  CreditCard
} from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';

export interface MenuItem {
  name: string;
  icon: any;
  path: string;
  permission?: string;
  isGroup?: boolean;
  children?: MenuItem[];
}

export function useMenuItems() {
  const company = useCompanyStore((state) => state.company);
  
  const menuItems = useMemo(() => {
    console.log('[DEBUG] Generating menu items');
    
    // Aqui você pode adicionar lógica baseada nas permissões do usuário
    const hasFullAccess = true; // Exemplo: verificar permissões do usuário
    
    const items: MenuItem[] = [
      {
        name: 'Dashboard',
        icon: LayoutDashboard,
        path: '/app/dashboard',
        permission: 'dashboard.view'
      },
      {
        name: 'Planos',
        icon: CreditCard,
        path: '/app/planos',
        permission: 'planos.view'
      },
      {
        name: 'Eleitores',
        icon: Users,
        path: '/app/eleitores',
        permission: 'eleitores.view'
      },
      {
        name: 'Atendimentos',
        icon: Calendar,
        path: '/app/atendimentos',
        permission: 'atendimentos.view',
        isGroup: false,
        children: []
      },
      {
        name: 'Agenda',
        icon: Calendar,
        path: '/app/agenda',
        permission: 'agenda.view'
      },
      {
        name: 'Resultados Eleitorais',
        icon: BarChart2,
        path: '/app/election-results',
        permission: 'resultados.view'
      },
      {
        name: 'Documentos',
        icon: FileText,
        path: '/app/documentos',
        permission: 'documentos.view'
      },
      {
        name: 'Disparo de Mídia',
        icon: Send,
        path: '/app/disparo-de-midia',
        permission: 'disparo-midia.view'
      },
      {
        name: 'Mapa Eleitoral',
        icon: Map,
        path: '/app/electoral-map',
        permission: 'mapa.view'
      },
      {
        name: 'Metas',
        icon: Target,
        path: '/app/goals',
        permission: 'metas.view'
      },
      {
        name: 'Usuários',
        icon: UserCog,
        path: '/app/users',
        permission: 'usuarios.view'
      },
      {
        name: 'Configurações',
        icon: Settings,
        path: '/app/settings',
        permission: 'configuracoes.view'
      }
    ];

    return items;
  }, []);

  return menuItems;
}
