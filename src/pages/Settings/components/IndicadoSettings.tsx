import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIndicadosRealtime } from '../../../hooks/useIndicadosRealtime';
import { useCompanyStore } from '../../../hooks/useCompanyContext';
import { indicadoService } from '../../../services/indicados';

const ITEMS_PER_PAGE = 5;

const indicadoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
});

type IndicadoFormData = z.infer<typeof indicadoSchema>;

export function IndicadoSettings() {
  const { indicados, isLoading } = useIndicadosRealtime();
  const { currentCompanyId } = useCompanyStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIndicados = React.useMemo(() => {
    return indicados.filter(indicado => 
      indicado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicado.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicado.bairro?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [indicados, searchTerm]);

  const totalItems = filteredIndicados.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentIndicados = filteredIndicados.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IndicadoFormData>({
    resolver: zodResolver(indicadoSchema),
  });

  const onSubmit = async (data: IndicadoFormData) => {
    try {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }

      await indicadoService.create({
        ...data,
        gbp_empresas: currentCompanyId,
      });

      reset();
      setShowModal(false);
    } catch (error) {
      console.error('Error creating indicado:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar indicado');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Indicados
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            ({filteredIndicados.length} {filteredIndicados.length === 1 ? 'indicado' : 'indicados'})
          </span>
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Indicado
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
      ) : indicados.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Nenhum indicado cadastrado
        </div>
      ) : (
        <>
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar indicados..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="space-y-4 mb-4">
            {currentIndicados.map((indicado) => (
              <div
                key={indicado.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {indicado.nome}
                  </h4>
                  {(indicado.cidade || indicado.bairro) && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {[indicado.cidade, indicado.bairro].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {/* TODO: Edit indicado */}}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Editar indicado"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {/* TODO: Delete indicado */}}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Excluir indicado"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium mx-1">{startIndex + 1}</span>
                até <span className="font-medium mx-1">{endIndex}</span>
                de <span className="font-medium mx-1">{totalItems}</span> indicados
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setError(null);
          reset();
        }}
        title="Novo Indicado"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome
            </label>
            <input
              type="text"
              {...register('nome')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {errors.nome && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.nome.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cidade
            </label>
            <input
              type="text"
              {...register('cidade')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bairro
            </label>
            <input
              type="text"
              {...register('bairro')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setError(null);
                reset();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Salvando...
                </>
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