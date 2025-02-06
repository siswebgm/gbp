import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase';
import { useCategories } from '@/hooks/useCategories';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useAuth } from '@/hooks/useAuth';

export interface FilterOption {
  value: string;
  label: string;
}

export function useFilterOptions() {
  const { data: categories } = useCategories('eleitor');
  const company = useCompanyStore(state => state.company);
  const { user } = useAuth();

  console.log('Debug useFilterOptions:', { 
    company,
    companyId: company?.id,
    companyUid: company?.uid,
    hasUser: !!user
  });

  // Queries
  const citiesQuery = useQuery({
    queryKey: ['disparo-midia-cities', company?.uid],
    queryFn: async () => {
      try {
        if (!company?.uid) {
          console.log('Sem company_uid para buscar cidades');
          return [];
        }

        if (!user) {
          console.log('Sem usuário autenticado para buscar cidades');
          return [];
        }

        console.log('Buscando cidades para empresa:', company.uid);

        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', company.uid)
          .not('cidade', 'is', null)
          .not('cidade', 'eq', '')
          .order('cidade')
          .distinct();

        if (error) {
          console.error('Erro ao buscar cidades:', error);
          return [];
        }

        console.log('Dados retornados da busca de cidades:', data);

        // Remove duplicatas e valores vazios
        const uniqueCities = [...new Set((data || [])
          .map(item => item.cidade?.trim())
          .filter(Boolean)
        )];

        const formattedCities = uniqueCities.map(city => ({
          value: city,
          label: city
        }));

        console.log('Cidades formatadas:', formattedCities);
        return formattedCities;
      } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        return [];
      }
    },
    enabled: Boolean(company?.uid && user)
  });

  const neighborhoodsQuery = useQuery({
    queryKey: ['disparo-midia-neighborhoods', company?.uid],
    queryFn: async () => {
      try {
        if (!company?.uid) {
          console.log('Sem company_uid para buscar bairros');
          return [];
        }

        if (!user) {
          console.log('Sem usuário autenticado para buscar bairros');
          return [];
        }

        console.log('Buscando bairros para empresa:', company.uid);

        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', company.uid)
          .not('bairro', 'is', null)
          .not('bairro', 'eq', '')
          .order('bairro')
          .distinct();

        if (error) {
          console.error('Erro ao buscar bairros:', error);
          return [];
        }

        console.log('Dados retornados da busca de bairros:', data);

        // Remove duplicatas e valores vazios
        const uniqueNeighborhoods = [...new Set((data || [])
          .map(item => item.bairro?.trim())
          .filter(Boolean)
        )];

        const formattedNeighborhoods = uniqueNeighborhoods.map(neighborhood => ({
          value: neighborhood,
          label: neighborhood
        }));

        console.log('Bairros formatados:', formattedNeighborhoods);
        return formattedNeighborhoods;
      } catch (error) {
        console.error('Erro ao buscar bairros:', error);
        return [];
      }
    },
    enabled: Boolean(company?.uid && user)
  });

  // Dados fixos
  const genders: FilterOption[] = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ];

  // Formatar categorias
  const formattedCategories = categories?.map(cat => ({
    value: cat.id,
    label: cat.nome
  })) ?? [];

  // Log do estado final
  console.log('Estado final useFilterOptions:', {
    categoriesLength: formattedCategories.length,
    citiesLength: citiesQuery.data?.length ?? 0,
    neighborhoodsLength: neighborhoodsQuery.data?.length ?? 0,
    citiesStatus: citiesQuery.status,
    neighborhoodsStatus: neighborhoodsQuery.status,
    isEnabled: Boolean(company?.uid && user)
  });

  return {
    categories: formattedCategories,
    cities: citiesQuery.data ?? [],
    neighborhoods: neighborhoodsQuery.data ?? [],
    genders
  };
}
