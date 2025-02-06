import React, { useState, useEffect } from 'react';
import { CategorySettings } from './components/CategorySettings';
import { IndicadoSettings } from './components/IndicadoSettings';
import { BirthdaySettings } from './components/BirthdaySettings';
import { PlanosPage } from '../app/Planos';
import { Cog, Users, Gift, Upload, FormInput, CreditCard, MessageSquare } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useLocation, useNavigate } from 'react-router-dom';

type SettingsTab = 'categories' | 'indicados' | 'birthday' | 'whatsapp' | 'upload' | 'form' | 'planos';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('categories');
  const { isAuthenticated, isLoading, session, user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const location = useLocation();
  const navigate = useNavigate();

  const canAccess = user?.nivel_acesso !== 'comum';

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !company || !canAccess)) {
      navigate('/app');
      return;
    }
  }, [isLoading, isAuthenticated, company, canAccess, navigate]);

  useEffect(() => {
    if (activeTab === 'upload') {
      navigate('/app/eleitores/importar');
    } else if (activeTab === 'form') {
      navigate('/app/settings/gerenciar-formulario');
    }
  }, [activeTab, navigate]);

  const handleTabChange = (tab: SettingsTab) => {
    if (tab === 'whatsapp') {
      navigate('/app/whatsapp');
      return;
    }
    if (tab === 'planos') {
      navigate('/app/planos');
      return;
    }
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-0 sm:px-4 pt-0 sm:pt-6 pb-4 sm:pb-6">
            <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow animate-pulse">
              <div className="p-2 sm:p-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'categories', label: 'Categorias', icon: Cog },
    { id: 'indicados', label: 'Indicados', icon: Users },
    { id: 'birthday', label: 'Aniversário', icon: Gift },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'form', label: 'Formulário de Cadastro', icon: FormInput },
    { id: 'planos', label: 'Planos', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-0 sm:px-4 pt-0 sm:pt-6 pb-4 sm:pb-6">
          <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow">
            <div className="p-2 sm:p-6">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Gerencie categorias, indicados e configurações de aniversário
                </p>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as SettingsTab)}
                        className={`
                          flex items-center whitespace-nowrap px-1 py-4 border-b-2 text-sm font-medium transition-colors duration-200
                          ${activeTab === tab.id
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5 mr-2" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                  {activeTab === 'categories' && <CategorySettings />}
                  {activeTab === 'indicados' && <IndicadoSettings />}
                  {activeTab === 'birthday' && <BirthdaySettings />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}