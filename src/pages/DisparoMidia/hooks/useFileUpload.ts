import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';

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
  const company = useCompanyStore(state => state.company);

  const uploadFile = async (file: File) => {
    try {
      if (!company?.nome) {
        throw new Error('Empresa não encontrada');
      }

      // Nome do bucket sempre em minúsculas
      const bucket = company.nome.toLowerCase();
      
      // Criar nome do arquivo seguro com timestamp
      const timestamp = new Date().getTime();
      const safeFileName = sanitizeFileName(file.name);
      const fileName = `${timestamp}_${safeFileName}`;

      // Upload no bucket da empresa
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Retornar a URL completa do arquivo
      const fileUrl = `https://studio.gbppolitico.com/storage/v1/object/${bucket}/${fileName}`;
      return fileUrl;

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  };

  return {
    uploadFile
  };
}
