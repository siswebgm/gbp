import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMenuItems } from '../../hooks/useMenuItems';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useMenuItems();

  const handleClick = (path: string) => {
    // Adiciona o prefixo /app se o caminho não começar com ele
    const fullPath = path.startsWith('/app') ? path : `/app${path}`;
    navigate(fullPath);
    if (window.innerWidth < 1024) { // lg breakpoint
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-lg',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b dark:border-gray-700">
            <span className="text-lg font-semibold text-gray-800 dark:text-white">Menu</span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto">
            <div className="pt-6 px-3 flex flex-col gap-2">
              {menuItems.map((item) => {
                const fullPath = item.path.startsWith('/app') ? item.path : `/app${item.path}`;
                const active = location.pathname === fullPath;
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleClick(item.path)}
                    className={cn(
                      'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out',
                      'hover:scale-[1.02]',
                      active
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    )}
                  >
                    {Icon && (
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg mr-3',
                        active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                    <span className="flex-1 truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
