import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Categoria {
  id: string;
  nome: string;
}

export function useCategorias() {
  const { data, isLoading, error } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: async () => {
      const response = await api.get('/categorias');
      // Garante que o retorno é um array
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  return {
    categorias: data || [], // Garante que sempre retorna um array
    isLoading,
    error,
  };
}
