import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { format, isAfter, isBefore, addHours } from 'date-fns';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../providers/AuthProvider';
import { toast } from 'react-toastify';

interface Reminder {
  uid: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  atendimento_uid: string;
  created_at: string;
  updated_at: string;
}

interface NotificationState {
  notifications: Reminder[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
    error: null,
    lastUpdate: null
  });
  
  const { company } = useCompanyStore();
  const { user } = useAuth();

  const loadNotifications = useCallback(async () => {
    if (!company?.uid) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      console.log('Iniciando busca de notificações...', {
        empresa_uid: company.uid,
        timestamp: new Date().toISOString()
      });

      const now = new Date();
      const fourHoursAgo = addHours(now, -4);
      const fourHoursAhead = addHours(now, 4);

      console.log('Parâmetros de busca:', {
        now: format(now, 'dd/MM/yyyy HH:mm:ss'),
        fourHoursAgo: format(fourHoursAgo, 'dd/MM/yyyy HH:mm:ss'),
        fourHoursAhead: format(fourHoursAhead, 'dd/MM/yyyy HH:mm:ss')
      });

      const { data: reminders, error } = await supabaseClient
        .from('gbp_lembretes')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erro ao carregar notificações',
          isLoading: false 
        }));
        return;
      }

      console.log('Lembretes encontrados:', reminders);

      // Filtra lembretes próximos (4 horas antes ou depois do horário atual)
      const upcomingReminders = reminders?.filter(reminder => {
        const dueDate = new Date(reminder.due_date);
        const isUpcoming = isAfter(dueDate, fourHoursAgo) && 
                         isBefore(dueDate, fourHoursAhead) &&
                         reminder.status === 'pending';
        
        console.log('Verificando lembrete:', {
          id: reminder.uid,
          title: reminder.title,
          dueDate: format(dueDate, 'dd/MM/yyyy HH:mm:ss'),
          isUpcoming,
          status: reminder.status
        });

        // Se o lembrete está próximo do vencimento, envia notificação push
        if (isUpcoming && user?.uid) {
          notificationService.sendNotification({
            title: 'Lembrete Próximo',
            body: `${reminder.title} - Vence em ${format(dueDate, 'dd/MM/yyyy HH:mm')}`,
            data: {
              id: reminder.uid,
              type: 'reminder',
              dueDate: reminder.due_date
            },
            userIds: [user.uid]
          }).catch(error => {
            console.error('Erro ao enviar notificação push:', error);
          });
        }

        return isUpcoming;
      }) || [];

      console.log('Lembretes filtrados:', upcomingReminders);

      setState(prev => ({
        ...prev,
        notifications: upcomingReminders,
        unreadCount: upcomingReminders.length,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
        error: null
      }));
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erro ao carregar notificações',
        isLoading: false 
      }));
    }
  }, [company?.uid, user?.uid]);

  const markAsRead = useCallback(async (uid: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log('Marcando notificação como lida:', uid);

      const { error } = await supabaseClient
        .from('gbp_lembretes')
        .update({ status: 'completed' })
        .eq('uid', uid);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        toast.error('Erro ao marcar notificação como lida');
        throw error;
      }

      console.log('Notificação marcada como lida com sucesso');
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.uid !== uid),
        unreadCount: prev.unreadCount - 1,
        isLoading: false
      }));

      toast.success('Notificação marcada como lida');
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Carrega notificações iniciais
  useEffect(() => {
    if (company?.uid) {
      console.log('Empresa alterada, recarregando notificações...');
      loadNotifications();
    }
  }, [company?.uid, loadNotifications]);

  // Setup do canal de tempo real
  useEffect(() => {
    if (!company?.uid) return;

    console.log('Configurando canal de tempo real para notificações...');
    
    const channel = supabaseClient
      .channel('public:gbp_lembretes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_lembretes',
          filter: `empresa_uid=eq.${company.uid}`
        },
        (payload) => {
          console.log('Mudança em notificações detectada:', payload);
          loadNotifications();
        }
      )
      .subscribe((status) => {
        console.log('Status da inscrição:', status);
      });

    return () => {
      console.log('Limpando inscrição de tempo real...');
      channel.unsubscribe();
    };
  }, [company?.uid, loadNotifications]);

  // Atualiza periodicamente
  useEffect(() => {
    if (!company?.uid) return;

    const interval = setInterval(loadNotifications, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, [company?.uid, loadNotifications]);

  return {
    ...state,
    markAsRead,
    refresh: loadNotifications
  };
} 