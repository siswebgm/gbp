import React, { useState } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { EleitorFilters } from '../../../types/eleitor';
import { useEleitorOptions } from '../../../hooks/useEleitorOptions';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: EleitorFilters;
  onFilterChange: (filters: EleitorFilters) => void;
}

export function FiltersModal({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: FiltersModalProps) {
  const { 
    categorias: categories,
    indicadores: indications,
    responsaveis: users,
    isLoading 
  } = useEleitorOptions();

  const handleFilterChange = (field: keyof EleitorFilters, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const FilterField = ({ id, label, value, placeholder = `Digite ${label.toLowerCase()}...` }: { 
    id: keyof EleitorFilters; 
    label: string; 
    value: string | undefined;
    placeholder?: string;
  }) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        id={id}
        value={value || ''}
        onChange={(e) => handleFilterChange(id, e.target.value)}
        className="block w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white text-sm bg-transparent transition-colors duration-200"
        placeholder={placeholder}
      />
    </div>
  );

  const SelectField = ({ id, label, options, value }: {
    id: keyof EleitorFilters;
    label: string;
    options: { value: string; label: string }[];
    value: string | undefined;
  }) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value || ''}
        onChange={(e) => handleFilterChange(id, e.target.value)}
        className="block w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white text-sm bg-transparent transition-colors duration-200"
      >
        <option value="">Selecione...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
      <div 
        className={`fixed top-16 right-0 w-[400px] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50 h-[calc(100vh-4rem)] border-l border-gray-200 dark:border-gray-700`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
          <FilterField id="nome" label="Nome" value={filters.nome} />
          <FilterField id="cpf" label="CPF" value={filters.cpf} />
          <FilterField id="whatsapp" label="WhatsApp" value={filters.whatsapp} />
          <FilterField id="zona" label="Zona" value={filters.zona} />
          <FilterField id="secao" label="Seção" value={filters.secao} />
          <FilterField id="bairro" label="Bairro" value={filters.bairro} />
          <FilterField id="cidade" label="Cidade" value={filters.cidade} />
          <FilterField id="logradouro" label="Logradouro" value={filters.logradouro} />
          <SelectField id="categoria_uid" label="Categoria" options={categories.map(category => ({ value: category.uid, label: category.name }))} value={filters.categoria_uid} />
          <SelectField id="indicado_uid" label="Indicado por" options={indications.map(indication => ({ value: indication.uid, label: indication.name }))} value={filters.indicado_uid} />
          <SelectField id="responsavel_uid" label="Responsável" options={users.map(user => ({ value: user.uid, label: user.name }))} value={filters.responsavel_uid} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm py-4 px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={() => {
                onFilterChange({
                  nome: '',
                  genero: '',
                  zona: '',
                  secao: '',
                  bairro: '',
                  categoria_uid: undefined,
                  logradouro: '',
                  indicado_uid: '',
                  cep: '',
                  responsavel_uid: '',
                  cidade: '',
                  whatsapp: '',
                  cpf: '',
                });
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Limpar
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 border border-transparent rounded-lg hover:from-primary-700 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
