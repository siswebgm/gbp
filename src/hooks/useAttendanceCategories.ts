import { useQuery } from '@tanstack/react-query';
import { useCompanyStore } from '../store/useCompanyStore';
import { categoryService } from '../services/categories';

export function useAttendanceCategories() {
  const company = useCompanyStore((state) => state.company);

  return useQuery({
    queryKey: ['attendance-categories', company?.uid],
    queryFn: () => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }
      return categoryService.list(company.uid);
    },
    enabled: !!company?.uid,
  });
} 