import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, Filter } from 'lucide-react';
import { useAgenda } from '../../hooks/useAgenda';
import { AgendaEvent } from '../../types/agenda';
import { NewEventModal } from './components/NewEventModal';
import { EventDetailsModal } from './components/EventDetailsModal';
import { FilterModal } from './components/FilterModal';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

export function Agenda() {
  const [isNewEventModalOpen, setIsNewEventModalOpen] = React.useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<AgendaEvent | null>(null);
  const [filters, setFilters] = React.useState({
    startDate: new Date(),
    endDate: moment().add(1, 'month').toDate(),
    type: '',
    status: '',
  });

  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useAgenda(filters);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setIsNewEventModalOpen(true);
  };

  const handleSelectEvent = (event: AgendaEvent) => {
    setSelectedEvent(event);
  };

  const handleCreateEvent = async (event: Omit<AgendaEvent, 'id'>) => {
    try {
      await createEvent.mutateAsync(event);
      setIsNewEventModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    }
  };

  const handleUpdateEvent = async (event: AgendaEvent) => {
    try {
      await updateEvent.mutateAsync(event);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent.mutateAsync(eventId);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
    }
  };

  const eventStyleGetter = (event: AgendaEvent) => {
    return {
      style: {
        backgroundColor: event.color || '#3B82F6',
        borderRadius: '4px',
      },
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="inline-flex items-center p-2 text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsNewEventModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Evento
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[calc(100vh-12rem)]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          messages={{
            today: 'Hoje',
            previous: 'Anterior',
            next: 'Próximo',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            agenda: 'Agenda',
            date: 'Data',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'Não há eventos neste período.',
          }}
        />
      </div>

      {isNewEventModalOpen && (
        <NewEventModal
          isOpen={isNewEventModalOpen}
          onClose={() => setIsNewEventModalOpen(false)}
          onSubmit={handleCreateEvent}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          isOpen={!!selectedEvent}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {isFilterModalOpen && (
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onApplyFilters={setFilters}
        />
      )}
    </div>
  );
}
