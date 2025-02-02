import React, { useState, useEffect } from 'react';
import { Search, UserSearch, CreditCard, Phone } from 'lucide-react';
import { EleitorFilters } from '../../../types/eleitor';
import { useDebounce } from '../../../hooks/useDebounce';

interface EleitoresFiltersProps {
  filters: EleitorFilters;
  onFilterChange: (filters: EleitorFilters) => void;
}

type SearchType = 'nome' | 'cpf' | 'whatsapp';

export function EleitoresFilters({
  filters,
  onFilterChange,
}: EleitoresFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.nome || '');
  const [searchType, setSearchType] = useState<SearchType>('nome');
  const debouncedSearch = useDebounce(searchValue, 500);

  useEffect(() => {
    let searchTerm = debouncedSearch;
    if (searchType === 'cpf') {
      searchTerm = `cpf:${debouncedSearch}`;
    } else if (searchType === 'whatsapp') {
      searchTerm = `whatsapp:${debouncedSearch}`;
    }
    
    onFilterChange({ ...filters, nome: searchTerm });
  }, [debouncedSearch, onFilterChange, searchType]);

  const getPlaceholder = () => {
    switch (searchType) {
      case 'cpf':
        return 'Buscar por CPF...';
      case 'whatsapp':
        return 'Buscar por WhatsApp...';
      default:
        return 'Buscar por nome...';
    }
  };

  const getSearchIcon = () => {
    switch (searchType) {
      case 'cpf':
        return <CreditCard className="h-4 w-4 text-gray-400" />;
      case 'whatsapp':
        return <Phone className="h-4 w-4 text-gray-400" />;
      default:
        return <UserSearch className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={getPlaceholder()}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="absolute inset-y-0 left-3 flex items-center">
            {getSearchIcon()}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSearchType('nome');
              setSearchValue('');
            }}
            className={`h-10 px-3 flex items-center justify-center rounded-lg border ${
              searchType === 'nome'
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600'
            }`}
            title="Buscar por nome"
          >
            <UserSearch className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSearchType('cpf');
              setSearchValue('');
            }}
            className={`h-10 px-3 flex items-center justify-center rounded-lg border ${
              searchType === 'cpf'
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600'
            }`}
            title="Buscar por CPF"
          >
            <CreditCard className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSearchType('whatsapp');
              setSearchValue('');
            }}
            className={`h-10 px-3 flex items-center justify-center rounded-lg border ${
              searchType === 'whatsapp'
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600'
            }`}
            title="Buscar por WhatsApp"
          >
            <Phone className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
