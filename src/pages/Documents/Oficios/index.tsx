import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { formatDate } from '../../../utils/format';

interface Oficio {
  id: string;
  numero: string;
  destinatario: string;
  assunto: string;
  created_at: string;
  tag?: string;
  tag_emoji?: string;
}

export default function Oficios() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const canAccess = user?.nivel_acesso !== 'comum';
  console.log('Empresa atual:', company);
  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }

    const fetchOficios = async () => {
      if (!company?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabaseClient
          .from('gbp_oficios')
          .select('*')
          .eq('empresa_uid', company.uid)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOficios(data || []);
      } catch (error) {
        console.error('Erro ao carregar ofícios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOficios();
  }, [company?.uid, canAccess]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="w-full px-2 sm:px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Ofícios
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Gerencie seus ofícios
                </p>
              </div>
              <button
                onClick={() => navigate('/app/documentos/oficios/novo')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Novo Ofício
              </button>
            </div>
          </div>
        </div>

        <div className="w-full px-2 sm:px-4">
          {!company?.uid ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Selecione uma empresa para visualizar os ofícios.
                </p>
              </div>
            </div>
          ) : oficios.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum ofício encontrado.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {oficios.map((oficio) => (
                  <li key={oficio.id}>
                    <div 
                      className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => navigate(`/app/documentos/oficios/${oficio.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-medium text-primary-600">
                            {oficio.numero}
                          </p>
                          {oficio.tag_emoji && (
                            <span className="text-sm" title={oficio.tag}>
                              {oficio.tag_emoji}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(oficio.created_at)}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {oficio.destinatario}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {oficio.assunto}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
