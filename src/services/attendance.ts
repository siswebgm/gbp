import { supabaseClient } from '../lib/supabase';
import { api } from '../lib/api';

export async function deleteAttendance(id: string) {
  const { error } = await supabaseClient
    .from('gbp_atendimentos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }

  return true;
}

export async function updateAttendance(id: number, data: any) {
  const { error } = await supabaseClient
    .from('gbp_atendimentos')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
}
