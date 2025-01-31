import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Company {
  id: number;
  nome: string;
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCompany() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setCompany(null);
          return;
        }

        const { data: userData } = await supabase
          .from('gbp_usuarios')
          .select('empresa_id')
          .eq('id', user.id)
          .single();

        if (userData?.empresa_id) {
          const { data: companyData } = await supabase
            .from('gbp_empresas')
            .select('*')
            .eq('id', userData.empresa_id)
            .single();

          setCompany(companyData);
        }
      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, []);

  return {
    company,
    isLoading,
    hasCompany: !!company
  };
}
