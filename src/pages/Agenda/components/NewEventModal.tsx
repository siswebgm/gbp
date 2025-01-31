import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { AgendaEvent, EventType } from '../../../types/agenda';
import { useEleitores } from '../../../hooks/useEleitores';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<AgendaEvent, 'id'>) => void;
}

export function NewEventModal({ isOpen, onClose, onSubmit }: NewEventModalProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [type, setType] = React.useState<EventType>('REUNIAO');
  const [location, setLocation] = React.useState('');
  const [selectedAttendees, setSelectedAttendees] = React.useState<string[]>([]);
  const [isRecurrent, setIsRecurrent] = React.useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = React.useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = React.useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = React.useState('');

  const { eleitores = [] } = useEleitores({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const attendees = eleitores
      .filter(eleitor => selectedAttendees.includes(eleitor.id))
      .map(eleitor => ({
        id: eleitor.id,
        name: eleitor.nome,
        phone: eleitor.telefone,
      }));

    const newEvent: Omit<AgendaEvent, 'id'> = {
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      type,
      location,
      attendees,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user-id', // Substituir pelo ID do usuário atual
      ...(isRecurrent && {
        recurrence: {
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          ...(recurrenceEndDate && { endDate: new Date(recurrenceEndDate) }),
        },
      }),
    };

    onSubmit(newEvent);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              Novo Evento
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Início
                </label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Fim
                </label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white"
              >
                <option value="REUNIAO">Reunião</option>
                <option value="SERVICO">Serviço</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Local
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Participantes
              </label>
              <select
                multiple
                value={selectedAttendees}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedAttendees(values);
                }}
                className="mt-1 block w-full rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white min-h-[132px]"
              >
                {eleitores.map(eleitor => (
                  <option key={eleitor.id} value={eleitor.id}>
                    {eleitor.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="recurrent"
                checked={isRecurrent}
                onChange={(e) => setIsRecurrent(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
              />
              <label
                htmlFor="recurrent"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Evento recorrente
              </label>
            </div>

            {isRecurrent && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Frequência
                  </label>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                    className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white"
                  >
                    <option value="DAILY">Diário</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Intervalo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Data Final (opcional)
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="mt-1 block w-full h-11 rounded-lg border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Criar Evento
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
