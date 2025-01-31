import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categories';
import { useCompanyStore } from '../store/useCompanyStore';

export function useCategoriasEleitor() {
  const company = useCompanyStore((state) => state.company);

  return useQuery({
    queryKey: ['categorias', company?.uid],
    queryFn: () => categoryService.list(company?.uid || ''),
    enabled: !!company?.uid
  });
}
