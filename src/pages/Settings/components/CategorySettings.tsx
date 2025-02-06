import React, { useState } from 'react';
import { Edit2, Trash2, Plus, X, Check, Loader2, Search } from 'lucide-react';
import { useCategories } from '../../../hooks/useCategories';
import { useCategoriaTipos } from '../../../hooks/useCategoriaTipos';
import { toast } from 'react-toastify';

interface CategoriaFormData {
  nome: string;
  tipo_uid?: string;
}

export function CategorySettings() {
  const { data: categorias, isLoading, createCategory: create, updateCategory: update, deleteCategory: deleteCategoria } = useCategories();
  const { tipos, isLoading: isLoadingTipos } = useCategoriaTipos();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<CategoriaFormData>({
    nome: '',
    tipo_uid: '',
  });
  const [newCategoria, setNewCategoria] = useState<CategoriaFormData>({
    nome: '',
    tipo_uid: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleStartEdit = (categoria: any) => {
    setEditingId(categoria.uid);
    setEditingData({
      nome: categoria.nome,
      tipo_uid: categoria.tipo_uid || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({
      nome: '',
      tipo_uid: '',
    });
  };

  const handleUpdate = async (uid: string) => {
    try {
      await update({ uid, ...editingData });
      toast.success('Categoria atualizada com sucesso!');
      handleCancelEdit();
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    try {
      await deleteCategoria(uid);
      toast.success('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  const handleCreate = async () => {
    try {
      await create(newCategoria);
      toast.success('Categoria criada com sucesso!');
      setNewCategoria({
        nome: '',
        tipo_uid: '',
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
    }
  };

  const filteredCategorias = categorias?.filter((categoria) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      categoria.nome.toLowerCase().includes(searchTermLower) ||
      tipos?.find((tipo) => tipo.uid === categoria.tipo_uid)?.nome.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar categorias..."
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Nova Categoria
        </button>
      </div>

      {isCreating && (
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                value={newCategoria.nome}
                onChange={(e) => setNewCategoria({ ...newCategoria, nome: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={newCategoria.tipo_uid}
                onChange={(e) => setNewCategoria({ ...newCategoria, tipo_uid: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione um tipo</option>
                {tipos?.map((tipo) => (
                  <option key={tipo.uid} value={tipo.uid}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Criar
            </button>
          </div>
        </div>
      )}

      {isLoading || isLoadingTipos ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-gray-500" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCategorias?.map((categoria) => (
                <tr key={categoria.uid}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === categoria.uid ? (
                      <input
                        type="text"
                        value={editingData.nome}
                        onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{categoria.nome}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === categoria.uid ? (
                      <select
                        value={editingData.tipo_uid}
                        onChange={(e) => setEditingData({ ...editingData, tipo_uid: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Selecione um tipo</option>
                        {tipos?.map((tipo) => (
                          <option key={tipo.uid} value={tipo.uid}>
                            {tipo.nome}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {tipos?.find((tipo) => tipo.uid === categoria.tipo_uid)?.nome || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === categoria.uid ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X size={20} />
                        </button>
                        <button
                          onClick={() => handleUpdate(categoria.uid)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Check size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleStartEdit(categoria)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(categoria.uid)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
