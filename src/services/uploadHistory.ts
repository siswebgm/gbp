import { supabaseClient } from '../lib/supabase';

export type UploadStatus = 'success' | 'error' | 'in_progress' | 'deleted';

export interface UploadHistory {
  id: number;
  empresa_id: number;
  arquivo_nome: string;
  registros_total: number;
  registros_processados: number;
  registros_erro?: number;
  status: UploadStatus;
  erro_mensagem?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUploadHistoryParams {
  nome_arquivo: string;
  empresa_id: number;
}

export async function createUploadHistory(params: CreateUploadHistoryParams): Promise<{ uploadHistory: UploadHistory | null; error: Error | null }> {
  try {
    console.log('Verificando arquivo duplicado:', params);
    
    // Verificar se já existe um arquivo com o mesmo nome para a empresa que foi importado com sucesso
    const { data: existingFiles, error: queryError } = await supabaseClient
      .from('gbp_upload_history')
      .select('*')
      .eq('arquivo_nome', params.nome_arquivo)
      .eq('empresa_id', params.empresa_id)
      .eq('status', 'success');

    if (queryError) {
      console.error('Erro ao verificar arquivo duplicado:', queryError);
      throw queryError;
    }

    console.log('Arquivos encontrados:', existingFiles);

    // Só considera duplicado se houver um arquivo com status 'success'
    if (existingFiles && existingFiles.length > 0) {
      const successfulImport = existingFiles.find(file => file.status === 'success');
      if (successfulImport) {
        return { uploadHistory: null, error: new Error('Arquivo já importado') };
      }
    }

    // Verificar se há uma importação em andamento
    const { data: inProgressFiles, error: inProgressError } = await supabaseClient
      .from('gbp_upload_history')
      .select('*')
      .eq('arquivo_nome', params.nome_arquivo)
      .eq('empresa_id', params.empresa_id)
      .eq('status', 'in_progress');

    if (inProgressError) {
      console.error('Erro ao verificar importações em andamento:', inProgressError);
      throw inProgressError;
    }

    // Limpar importações antigas com erro ou em andamento
    if (inProgressFiles && inProgressFiles.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('gbp_upload_history')
        .delete()
        .in('id', inProgressFiles.map(f => f.id));

      if (deleteError) {
        console.error('Erro ao limpar importações antigas:', deleteError);
        throw deleteError;
      }
    }

    // Criar novo registro de histórico
    const { data, error } = await supabaseClient
      .from('gbp_upload_history')
      .insert({
        arquivo_nome: params.nome_arquivo,
        empresa_id: params.empresa_id,
        status: 'in_progress',
        registros_total: 0,
        registros_processados: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar histórico:', error);
      throw error;
    }

    console.log('Histórico criado:', data);
    return { uploadHistory: data, error: null };
  } catch (error) {
    console.error('Erro ao criar histórico:', error);
    return { uploadHistory: null, error: error as Error };
  }
}

export const refreshUploadHistory = async (empresaId: number) => {
  const { data, error } = await supabaseClient
    .from('gbp_upload_history')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('status', 'success')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export async function updateUploadHistory(id: number, data: Partial<UploadHistory>): Promise<void> {
  try {
    console.log('Atualizando histórico:', { id, data });
    
    const { error } = await supabaseClient
      .from('gbp_upload_history')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar histórico:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar histórico:', error);
    throw error;
  }
}
