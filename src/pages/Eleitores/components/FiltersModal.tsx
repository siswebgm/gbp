import React, { useState } from 'react';
import { X, Search, Filter, MapPin, Home, Building2, User2 } from 'lucide-react';
import { EleitorFilters } from '../../../types/eleitor';
import { useEleitorOptions } from '../../../hooks/useEleitorOptions';
import { useCategories } from '../../../hooks/useCategories';

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
    indicadores: indications,
    responsaveis: users,
    isLoading 
  } = useEleitorOptions();

  const { data: categorias, isLoading: isLoadingCategorias } = useCategories();

  console.log('[DEBUG] FiltersModal - Indicadores:', indications);
  console.log('[DEBUG] FiltersModal - Responsáveis:', users);

  const indicadoresOptions = [
    { value: '', label: 'Selecione...' },
    ...(indications || []).map(item => ({
      value: item.value,
      label: item.label || 'Sem nome'
    }))
  ];

  const responsaveisOptions = [
    { value: '', label: 'Selecione...' },
    ...(users || []).map(item => ({
      value: item.value,
      label: item.label || 'Sem nome'
    }))
  ];

  const categoriasOptions = [
    { value: '', label: 'Selecione...' },
    ...(categorias?.map(category => ({ 
      value: category.uid, 
      label: category.nome 
    })) || [])
  ];

  const handleFilterChange = (field: keyof EleitorFilters, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const FilterField = ({ id, label, value, placeholder = `Digite ${label.toLowerCase()}...`, icon: Icon }: { 
    id: keyof EleitorFilters; 
    label: string; 
    value: string | undefined;
    placeholder?: string;
    icon?: React.ComponentType<any>;
  }) => (
    <div className="relative group">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-hover:text-primary-500">
            <Icon className="h-4 w-4 text-gray-400 group-hover:text-primary-500" />
          </div>
        )}
        <input
          type="text"
          id={id}
          value={value || ''}
          onChange={(e) => handleFilterChange(id, e.target.value)}
          className={`block w-full h-10 ${Icon ? 'pl-9' : 'pl-3'} pr-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
            dark:bg-gray-800 dark:text-white text-sm bg-white
            transition-all duration-200
            hover:border-primary-400 dark:hover:border-primary-600
            group-hover:shadow-sm
            placeholder-gray-400 dark:placeholder-gray-500`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );

  const SelectField = ({ id, label, options, value, icon: Icon, isLoading, onChange }: {
    id: keyof EleitorFilters;
    label: string;
    options: { value: string; label: string }[];
    value: string | undefined;
    icon?: React.ComponentType<any>;
    isLoading?: boolean;
    onChange?: (value: string) => void;
  }) => (
    <div className="relative group">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''} text-gray-400 group-hover:text-primary-500`} />
          </div>
        )}
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange ? onChange(e.target.value) : handleFilterChange(id, e.target.value)}
          disabled={isLoading}
          className={`block w-full h-10 ${Icon ? 'pl-9' : 'pl-3'} pr-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
            dark:bg-gray-800 dark:text-white text-sm bg-white
            transition-all duration-200
            hover:border-primary-400 dark:hover:border-primary-600
            group-hover:shadow-sm
            appearance-none cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {options.map((option, index) => (
            <option key={`${id}-${option.value || 'empty'}-${index}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
          <svg className={`h-4 w-4 text-gray-400 group-hover:text-primary-500 ${isLoading ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
      <div 
        className={`fixed top-16 right-0 w-[400px] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50 h-[calc(100vh-4rem)] border-l border-gray-200 dark:border-gray-700 overflow-hidden`}
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

        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          <div className="p-4 space-y-6">
            {/* Grupo Localização */}
            <div className="space-y-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-500" />
                Localização
              </h3>
              <div className="space-y-4">
                <FilterField id="zona" label="Zona" value={filters.zona} icon={MapPin} />
                <FilterField id="secao" label="Seção" value={filters.secao} icon={MapPin} />
                <FilterField id="bairro" label="Bairro" value={filters.bairro} icon={Home} />
                <FilterField id="cidade" label="Cidade" value={filters.cidade} icon={Building2} />
                <FilterField id="logradouro" label="Logradouro" value={filters.logradouro} icon={MapPin} />
              </div>
            </div>

            {/* Grupo Categorização */}
            <div className="space-y-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User2 className="h-4 w-4 text-primary-500" />
                Categorização
              </h3>
              <div className="space-y-4">
                <SelectField 
                  id="categoria_uid" 
                  label="Categoria" 
                  options={categoriasOptions}
                  value={typeof filters.categoria_uid === 'object' ? filters.categoria_uid.uid : filters.categoria_uid}
                  onChange={(value) => {
                    const categoria = categorias?.find(c => c.uid === value);
                    handleFilterChange('categoria_uid', categoria ? { uid: categoria.uid, nome: categoria.nome } : value);
                  }}
                  icon={User2}
                  isLoading={isLoadingCategorias}
                />
                <SelectField 
                  id="indicado" 
                  label="Indicado por" 
                  options={indicadoresOptions}
                  value={filters.indicado}
                  icon={User2}
                  isLoading={isLoading}
                />
                <SelectField 
                  id="responsavel" 
                  label="Responsável" 
                  options={responsaveisOptions}
                  value={filters.responsavel}
                  icon={User2}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="pt-4 flex gap-3">
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
                    indicado: '',
                    cep: '',
                    responsavel: '',
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
      </div>
    </>
  );
}
