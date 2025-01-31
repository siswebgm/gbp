import React, { useState, useEffect } from 'react';
import { Search, UserSearch, CreditCard } from 'lucide-react';
import { EleitorFilters } from '../../../types/eleitor';
import { useDebounce } from '../../../hooks/useDebounce';

interface EleitoresFiltersProps {
  filters: EleitorFilters;
  onFilterChange: (filters: EleitorFilters) => void;
}

export function EleitoresFilters({
  filters,
  onFilterChange,
}: EleitoresFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.nome || '');
  const [searchByCpf, setSearchByCpf] = useState(false);
  const debouncedSearch = useDebounce(searchValue, 500);

  useEffect(() => {
    // Só adiciona o prefixo 'cpf:' se houver valor e estiver buscando por CPF
    const searchTerm = searchByCpf && debouncedSearch 
      ? `cpf:${debouncedSearch}` 
      : debouncedSearch;
      
    onFilterChange({ ...filters, nome: searchTerm });
  }, [debouncedSearch, onFilterChange, searchByCpf]);

  const handleSearchTypeToggle = () => {
    setSearchByCpf(!searchByCpf);
    // Limpa o campo de busca ao trocar o tipo
    setSearchValue('');
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder={searchByCpf ? "Buscar por CPF..." : "Buscar por nome..."}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <div className="absolute inset-y-0 left-3 flex items-center">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      <button
        onClick={handleSearchTypeToggle}
        className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
        title={`Buscar por ${searchByCpf ? 'nome' : 'CPF'}`}
      >
        {searchByCpf ? (
          <UserSearch className="h-4 w-4 text-gray-500" />
        ) : (
          <CreditCard className="h-4 w-4 text-gray-500" />
        )}
      </button>
    </div>
  );
}
