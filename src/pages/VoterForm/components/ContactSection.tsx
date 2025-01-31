import React from 'react';
import { UseFormRegister, FormState } from 'react-hook-form';
import { Phone } from 'lucide-react';
import { FormattedInput } from '../../../components/FormattedInput';
import { EleitorFormData } from '../../../types/eleitor';

interface ContactSectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
}

export function ContactSection({ register, formState }: ContactSectionProps) {
  const { errors } = formState;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Contato
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            WhatsApp*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="tel"
              mask="(99) 99999-9999"
              name="whatsapp"
              register={register}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="(00) 00000-0000"
            />
          </div>
          {errors.whatsapp && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.whatsapp.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Telefone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="tel"
              mask="(99) 99999-9999"
              name="telefone"
              register={register}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="(00) 00000-0000"
            />
          </div>
          {errors.telefone && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.telefone.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}