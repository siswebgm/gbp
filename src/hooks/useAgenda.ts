import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AgendaEvent } from '../types/agenda';

export function useAgenda(filters?: {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  status?: string;
}) {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['agenda', filters],
    queryFn: async () => {
      const response = await api.get('/agenda', { params: filters });
      return response.data;
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: Omit<AgendaEvent, 'id'>) => {
      const response = await api.post('/agenda', event);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async (event: AgendaEvent) => {
      const response = await api.put(`/agenda/${event.id}`, event);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/agenda/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  return {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
