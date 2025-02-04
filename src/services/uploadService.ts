import { supabaseClient } from '../lib/supabase';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB por chunk

async function uploadInChunks(file: File, fileName: string, bucketName: string): Promise<string> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedSize = 0;

  for (let chunk = 0; chunk < totalChunks; chunk++) {
    const start = chunk * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);

    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(`${fileName}_${chunk}`, chunkBlob, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error(`Erro ao fazer upload do chunk ${chunk}:`, uploadError);
      throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
    }

    uploadedSize += chunkBlob.size;
  }

  // Combinar chunks (implementar se necessário)
  return `${fileName}`;
}

export async function uploadFile(file: File, fileName: string, empresaNome: string): Promise<string> {
  try {
    const bucketName = 'uploads';
    const finalFileName = `${empresaNome}/${fileName}`;

    if (file.size > CHUNK_SIZE) {
      return await uploadInChunks(file, finalFileName, bucketName);
    }

    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(finalFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(finalFileName);

    return publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw error;
  }
}
