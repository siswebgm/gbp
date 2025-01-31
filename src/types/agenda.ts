export type EventType = 'REUNIAO' | 'SERVICO' | 'OUTROS';

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: EventType;
  location?: string;
  attendees: Attendee[];
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  color?: string;
  allDay?: boolean;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    endDate?: Date;
  };
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // em minutos
  color?: string;
  active: boolean;
}
