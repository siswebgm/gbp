import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { formatCurrency } from '../../../utils/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  periodo_dias: number;
}

export function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
    periodo_dias: '30'
  });

  useEffect(() => {
    loadPlanos();
  }, []);

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_planos')
        .select('*')
        .order('valor', { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (plano?: Plano) => {
    if (plano) {
      setSelectedPlano(plano);
      setFormData({
        nome: plano.nome,
        descricao: plano.descricao || '',
        valor: plano.valor.toString(),
        periodo_dias: plano.periodo_dias.toString()
      });
    } else {
      setSelectedPlano(null);
      setFormData({
        nome: '',
        descricao: '',
        valor: '',
        periodo_dias: '30'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planoData = {
        nome: formData.nome,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        periodo_dias: parseInt(formData.periodo_dias)
      };

      if (selectedPlano) {
        // Atualiza plano existente
        const { error } = await supabaseClient
          .from('gbp_planos')
          .update(planoData)
          .eq('id', selectedPlano.id);

        if (error) throw error;
        toast.success('Plano atualizado com sucesso');
      } else {
        // Cria novo plano
        const { error } = await supabaseClient
          .from('gbp_planos')
          .insert(planoData);

        if (error) throw error;
        toast.success('Plano criado com sucesso');
      }

      setIsModalOpen(false);
      loadPlanos();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      const { error } = await supabaseClient
        .from('gbp_planos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Plano excluído com sucesso');
      loadPlanos();
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Planos</h1>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planos.map((plano) => (
          <div
            key={plano.id}
            className="bg-white rounded-lg shadow p-6 border border-gray-200"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{plano.nome}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(plano)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(plano.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">{plano.descricao}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(plano.valor)}
                </p>
                <p className="text-sm text-gray-500">por {plano.periodo_dias} dias</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPlano ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Plano
              </label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Plano Básico"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva os benefícios do plano"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período (dias)
              </label>
              <Input
                type="number"
                value={formData.periodo_dias}
                onChange={(e) => setFormData({ ...formData, periodo_dias: e.target.value })}
                placeholder="30"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {selectedPlano ? 'Atualizar' : 'Criar'} Plano
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 