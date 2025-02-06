import { useEffect, useState, Suspense, lazy } from 'react';
import { Map } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuth } from '../../providers/AuthProvider';

// Importando o mapa com lazy loading
const MapComponent = lazy(() => import('../../components/ElectoralMap'));

interface Voter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export function ElectoralMap() {
  const { user } = useAuth();
  const canAccess = user?.nivel_acesso !== 'comum';

  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const company = useCompanyStore(state => state.company);

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }

    async function loadVoters() {
      if (!company?.id) {
        setError('Empresa não selecionada');
        setLoading(false);
        return;
      }

      try {
        // Busca os eleitores diretamente do Supabase
        const { data: eleitores, error: supabaseError } = await supabaseClient
          .from('gbp_eleitores')
          .select('*')
          .eq('empresa_id', company.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (supabaseError) {
          throw supabaseError;
        }

        console.log('Eleitores encontrados:', eleitores); // Debug

        if (!eleitores) {
          setVoters([]);
          return;
        }

        // Mapeia os dados do eleitor para o formato esperado
        const votersWithLocation = eleitores
          .filter((voter: any) => {
            // Garante que temos coordenadas válidas
            const lat = parseFloat(voter.latitude);
            const lng = parseFloat(voter.longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          })
          .map((voter: any) => {
            // Formata o endereço, removendo partes vazias
            const addressParts = [
              voter.logradouro,
              voter.numero && `nº ${voter.numero}`,
              voter.bairro,
              voter.cidade,
              voter.estado
            ].filter(Boolean);

            return {
              id: voter.id.toString(),
              name: voter.nome || '',
              address: addressParts.join(', '),
              lat: parseFloat(voter.latitude),
              lng: parseFloat(voter.longitude)
            };
          });

        console.log('Eleitores processados:', votersWithLocation); // Debug
        setVoters(votersWithLocation);
      } catch (err: any) {
        console.error('Erro ao carregar eleitores:', err);
        const errorMessage = err.message || 'Erro ao carregar eleitores';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadVoters();
  }, [company, canAccess]);

  // Calcula estatísticas
  const totalEleitores = voters.length;
  const totalComLocalizacao = voters.length;
  const bairrosUnicos = new Set(voters.map(v => {
    const parts = v.address.split(',');
    return parts.length > 2 ? parts[2].trim() : '';
  })).size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa Eleitoral</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visualização geográfica dos eleitores
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Map className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">
                Carregando mapa...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Map className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-500">
                {error}
              </p>
            </div>
          </div>
        ) : voters.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum eleitor com localização cadastrada.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Certifique-se de que os endereços dos eleitores estão cadastrados corretamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[600px] relative">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Map className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Carregando mapa...
                  </p>
                </div>
              </div>
            }>
              <MapComponent voters={voters} />
            </Suspense>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Estatísticas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total de Eleitores</p>
            <p className="text-2xl font-bold">{totalEleitores}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Com Localização</p>
            <p className="text-2xl font-bold">{totalComLocalizacao}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Bairros</p>
            <p className="text-2xl font-bold">{bairrosUnicos}</p>
          </div>
        </div>
      </div>
    </div>
  );
}