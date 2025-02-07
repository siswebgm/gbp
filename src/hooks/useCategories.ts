import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/categories';
import { useCompanyStore } from '../store/useCompanyStore';
import type { Category } from '../types/category';

export function useCategories(tipo?: string) {
  const { company } = useCompanyStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['categorias', company?.uid, tipo],
    queryFn: async () => {
      if (!company?.uid) return [];
      const categorias = await categoryService.list(company.uid);
      if (tipo) {
        return categorias.filter(cat => cat.tipo === tipo);
      }
      return categorias;
    },
    enabled: !!company?.uid,
  });

  const createCategory = useMutation({
    mutationFn: (category: Omit<Category, 'uid' | 'created_at'>) => {
      if (!company?.uid) throw new Error('Empresa não selecionada');
      return categoryService.create({ ...category, empresa_uid: company.uid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias', company?.uid] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: (category: Partial<Category> & { uid: string }) => {
      if (!company?.uid) throw new Error('Empresa não selecionada');
      return categoryService.update(category.uid, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias', company?.uid] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (uid: string) => {
      if (!company?.uid) throw new Error('Empresa não selecionada');
      return categoryService.delete(uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias', company?.uid] });
    },
  });

  return {
    ...query,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}