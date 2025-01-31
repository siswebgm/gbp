import React, { useState, useMemo } from 'react';
import { useCategories } from '../../../hooks/useCategories';
import { Modal } from '../../../components/Modal';
import { useForm } from 'react-hook-form';
import { categoryService } from '../../../services/categories';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { Edit2, Trash2, Link as LinkIcon, Plus, Loader2, AlertCircle, X } from 'lucide-react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const categorySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
});

const ITEMS_PER_PAGE = 5;

type CategoryFormData = z.infer<typeof categorySchema>;

interface EditModalState {
  isOpen: boolean;
  category?: {
    uid: string;
    nome: string;
    descricao: string | null;
  };
}

export function CategorySettings() {
  // Hooks - devem ser chamados antes de qualquer lógica condicional
  const { categories, isLoading } = useCategories();
  const { company } = useCompanyStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState>({ isOpen: false });
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  // Memoized values
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(category => 
      category.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.descricao?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Event handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      await categoryService.create({
        nome: data.nome.toUpperCase(),
        descricao: data.descricao?.toUpperCase() || null,
        empresa_uid: company.uid,
      });

      reset();
      setShowModal(false);
    } catch (error) {
      console.error('Error creating category:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar categoria');
    }
  };

  const handleEdit = (category: { uid: string; nome: string; descricao: string | null }) => {
    setEditModal({ isOpen: true, category });
    reset({ nome: category.nome, descricao: category.descricao || '' });
  };

  const handleDelete = async (categoryUid: string) => {
    if (!company?.uid) return;
    
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await categoryService.delete(categoryUid);
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Erro ao excluir categoria');
      }
    }
  };

  const handleGenerateLink = (categoryUid: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro?empresa=${company?.uid}&categoria=${categoryUid}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header com busca e botão de adicionar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="w-full sm:w-96">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Categoria
        </button>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-3 flex-shrink-0 text-red-400 hover:text-red-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Lista de categorias */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Descrição
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                [...Array(3)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">
                    Nenhuma categoria encontrada
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((category) => (
                  <tr key={category.uid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {category.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {category.descricao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.uid)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {filteredCategories.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCategories.length)} de {filteredCategories.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <ChevronsLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de criação */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          reset();
        }}
        title="Nova Categoria"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome
            </label>
            <input
              type="text"
              id="nome"
              {...register('nome')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              id="descricao"
              {...register('descricao')}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Criar'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de edição */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => {
          setEditModal({ isOpen: false });
          reset();
        }}
        title="Editar Categoria"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome
            </label>
            <input
              type="text"
              id="nome"
              {...register('nome')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              id="descricao"
              {...register('descricao')}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditModal({ isOpen: false });
                reset();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}