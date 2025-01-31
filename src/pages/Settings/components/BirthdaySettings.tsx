import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';

const birthdaySchema = z.object({
  texto: z.string().nullable(),
  card: z.string().url('URL inválida').nullable(),
  video: z.string().url('URL inválida').nullable(),
  audio: z.string().url('URL inválida').nullable(),
});

type BirthdayFormData = z.infer<typeof birthdaySchema>;

const defaultValues: BirthdayFormData = {
  texto: '',
  card: '',
  video: '',
  audio: '',
};

export function BirthdaySettings() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSettings, setCurrentSettings] = useState<BirthdayFormData>(defaultValues);
  const company = useCompanyStore((state) => state.company);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<BirthdayFormData>({
    resolver: zodResolver(birthdaySchema),
    defaultValues: currentSettings,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabaseClient
          .from('empresas')
          .select('birthday_texto, birthday_card, birthday_video, birthday_audio')
          .eq('id', company.id)
          .single();

        if (error) throw error;

        const settings: BirthdayFormData = {
          texto: data.birthday_texto || '',
          card: data.birthday_card || '',
          video: data.birthday_video || '',
          audio: data.birthday_audio || '',
        };

        setCurrentSettings(settings);
        reset(settings);
      } catch (err) {
        console.error('Error loading birthday settings:', err);
        setError('Erro ao carregar configurações de aniversário');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [company?.id, reset]);

  const onSubmit = async (data: BirthdayFormData) => {
    if (!company?.id) return;

    try {
      const { error: updateError } = await supabaseClient
        .from('empresas')
        .update({
          birthday_texto: data.texto,
          birthday_card: data.card,
          birthday_video: data.video,
          birthday_audio: data.audio,
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      // Atualizar o store com os novos dados
      useCompanyStore.setState((state) => ({
        company: state.company ? {
          ...state.company,
          birthday_texto: data.texto,
          birthday_card: data.card,
          birthday_video: data.video,
          birthday_audio: data.audio,
        } : null,
      }));
    } catch (err) {
      setError('Erro ao salvar configurações de aniversário');
      console.error('Error updating birthday settings:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagem de erro */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-3 flex-shrink-0 text-red-400 hover:text-red-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="texto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensagem de Aniversário
          </label>
          <textarea
            id="texto"
            {...register('texto')}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Digite a mensagem que será enviada no aniversário..."
          />
          {errors.texto && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.texto.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="card" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            URL do Cartão de Aniversário
          </label>
          <input
            type="url"
            id="card"
            {...register('card')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="https://exemplo.com/cartao.jpg"
          />
          {errors.card && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.card.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="video" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            URL do Vídeo de Aniversário
          </label>
          <input
            type="url"
            id="video"
            {...register('video')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="https://exemplo.com/video.mp4"
          />
          {errors.video && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.video.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="audio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            URL do Áudio de Aniversário
          </label>
          <input
            type="url"
            id="audio"
            {...register('audio')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="https://exemplo.com/audio.mp3"
          />
          {errors.audio && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.audio.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Salvar Configurações'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}