import { supabaseClient } from '../../../lib/supabase';

const STORAGE_BUCKET = 'uploads';
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB por chunk

const sanitizeFileName = (fileName: string): string => {
  return fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .trim();
};

export function useFileUpload() {
  const uploadFile = async (file: File, path: string) => {
    try {
      const { data, error } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      return { data: null, error };
    }
  };

  return {
    uploadFile
  };
}
