import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface CategoriaAtendimento {
  id: number;
  nome: string;
}

export function useCategoriasAtendimento() {
  return useQuery<CategoriaAtendimento[]>({
    queryKey: ['categorias-atendimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gbp_categorias_atendimento')
        .select('id, nome')
        .order('nome');

      if (error) {
        throw error;
      }

      return data;
    }
  });
}
