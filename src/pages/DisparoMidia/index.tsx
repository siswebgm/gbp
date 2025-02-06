import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Filter, Image, Video, Mic, FileText, Users, X, MessageSquare, Upload, Smartphone, Play, List, ListOrdered, Code, Building2, User, Info } from 'lucide-react';
import { Card } from '../../components/Card';
import { useToast } from '../../hooks/useToast';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../hooks/useCompany';
import { Loading } from '../../components/Loading';
import { useFileUpload } from './hooks/useFileUpload';
import { useCategories } from '../../features/categories/hooks/useCategories';
import { Button } from '../../components/ui/button';
import { WhatsAppPreview } from './components/WhatsAppPreview';
import { Select } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useFilterOptions } from './hooks/useFilterOptions';
import {
  Select as NewSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserBanner } from './components/UserBanner';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'categoria' | 'cidade' | 'bairro' | 'genero';
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

export function DisparoMidia() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const company = useCompany();
  const toast = useToast();
  const { uploadFile } = useFileUpload();

  // Estados
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [previewDisparo, setPreviewDisparo] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Estados para os filtros (arrays para múltipla seleção)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedCities, setSelectedCities] = useState<string[]>(['all']);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(['all']);
  const [selectedGender, setSelectedGender] = useState<string>('all');

  // Buscar opções de filtro
  const { categories, cities, neighborhoods, genders } = useFilterOptions();

  // Carregar dados iniciais
  useEffect(() => {
  }, []);

  async function loadCidades() {
    const { data } = await supabaseClient
      .from('gbp_cidade')
      .select('id, nome')
      .order('nome');
    if (data) return data;
  }

  async function loadBairros() {
    const { data } = await supabaseClient
      .from('gbp_bairro')
      .select('id, nome')
      .order('nome');
    if (data) return data;
  }

  // Handlers para filtros
  const handleFilterChange = (type: string, value: string, label: string) => {
    const newFilter = {
      id: `${type}-${value}`,
      type: type as FilterOption['type'],
      value,
      label
    };

    // Verifica se o filtro já existe
    const filterExists = selectedFilters.some(f => f.id === newFilter.id);

    if (filterExists) {
      // Remove o filtro se já existir
      setSelectedFilters(prev => prev.filter(f => f.id !== newFilter.id));
    } else {
      // Adiciona o novo filtro
      setSelectedFilters(prev => [...prev, newFilter]);
    }
  };

  const handleRemoveFilter = (filter: FilterOption) => {
    setSelectedFilters(prev => prev.filter(f => f.id !== filter.id));
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
  };

  // Handlers para múltipla seleção
  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      setSelectedCategories(['all']);
    } else {
      const newCategories = selectedCategories.filter(c => c !== 'all');
      if (newCategories.includes(value)) {
        const updated = newCategories.filter(c => c !== value);
        setSelectedCategories(updated.length ? updated : ['all']);
      } else {
        setSelectedCategories([...newCategories, value]);
      }
    }
  };

  const handleCityChange = (value: string) => {
    if (value === 'all') {
      setSelectedCities(['all']);
    } else {
      const newCities = selectedCities.filter(c => c !== 'all');
      if (newCities.includes(value)) {
        const updated = newCities.filter(c => c !== value);
        setSelectedCities(updated.length ? updated : ['all']);
      } else {
        setSelectedCities([...newCities, value]);
      }
    }
  };

  const handleNeighborhoodChange = (value: string) => {
    if (value === 'all') {
      setSelectedNeighborhoods(['all']);
    } else {
      const newNeighborhoods = selectedNeighborhoods.filter(n => n !== 'all');
      if (newNeighborhoods.includes(value)) {
        const updated = newNeighborhoods.filter(n => n !== value);
        setSelectedNeighborhoods(updated.length ? updated : ['all']);
      } else {
        setSelectedNeighborhoods([...newNeighborhoods, value]);
      }
    }
  };

  // Preparar dados para inserção
  const prepareDisparo = () => {
    return {
      empresa_uid: company?.uid,
      empresa_nome: company?.nome,
      usuario_nome: user?.nome,
      mensagem: message,
      upload: [],  // Será preenchido após upload
      categoria: selectedFilters
        .filter(f => f.type === 'categoria')
        .map(f => f.value),
      cidade: selectedFilters
        .filter(f => f.type === 'cidade')
        .map(f => f.value),
      bairro: selectedFilters
        .filter(f => f.type === 'bairro')
        .map(f => f.value),
      qtde: selectedFilters.length > 0 ? 1 : null,
      token: null,
      instancia: null,
      porta: null,
      nome_disparo: false,
      saudacao: null
    };
  };

  // Handlers para mensagens
  const handleSendClick = async () => {
    if (!message && mediaFiles.length === 0) {
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Adicione uma mensagem ou arquivo para enviar'
      });
      return;
    }

    const disparo = prepareDisparo();
    setPreviewDisparo(disparo);
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    try {
      setLoading(true);

      // Upload dos arquivos
      const uploadPromises = mediaFiles.map(async (file) => {
        const path = `${company?.uid}/disparos/${Date.now()}-${file.file.name}`;
        const { data: uploadData, error: uploadError } = await uploadFile(file.file, path);
        if (uploadError) throw uploadError;
        return uploadData?.path;
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Atualizar o disparo com os arquivos
      const disparo = {
        ...previewDisparo,
        upload: uploadedFiles.filter(Boolean),
      };

      // Inserir na tabela gbp_disparo
      const { error: insertError } = await supabaseClient
        .from('gbp_disparo')
        .insert([disparo]);

      if (insertError) throw insertError;

      toast.showToast({
        type: 'success',
        title: 'Sucesso',
        description: 'Mensagem enviada com sucesso!'
      });

      // Limpar formulário
      setMessage('');
      setMediaFiles([]);
      setSelectedFilters([]);
      setIsConfirmOpen(false);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Erro ao enviar mensagem. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderiza os filtros selecionados
  const renderSelectedFilters = () => {
    const filterGroups: { [key: string]: string } = {
      categoria: 'Categoria',
      cidade: 'Cidade',
      bairro: 'Bairro',
      genero: 'Gênero'
    };

    return selectedFilters.map((filter) => (
      <div
        key={filter.id}
        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm"
      >
        <span className="font-medium">{filterGroups[filter.type]}:</span>
        {filter.label}
        <button
          onClick={() => handleRemoveFilter(filter)}
          className="hover:text-blue-600 dark:hover:text-blue-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ));
  };

  // Verificação de nível de acesso
  const canAccess = user?.nivel_acesso !== 'comum';

  useEffect(() => {
    // Redireciona usuários sem acesso para /app
    if (!canAccess) {
      toast.showToast({
        type: 'error',
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página'
      });
      navigate('/app');
      return;
    }
  }, [canAccess, navigate]);

  // Impede qualquer renderização se não tiver acesso
  if (!canAccess) {
    return null;
  }

  // Handlers para upload de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: MediaFile['type']) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const newFiles = Array.from(files).map((file) => ({
        file,
        type,
        previewUrl: type === 'image' || type === 'video' ? URL.createObjectURL(file) : ''
      }));

      setMediaFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Erro ao adicionar arquivos:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Erro ao adicionar arquivos'
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Banner de Identificação */}
      {user && company && (
        <div className="bg-indigo-100 text-indigo-900">
          <div className="max-w-7xl mx-auto py-1.5 px-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-lg">⭐ PÁGINA PRINCIPAL (ATUAL/CORRETA)</span>
              <span className="text-sm">Caminho: pages/DisparoMidia/index.tsx</span>
              <span className="text-xs text-indigo-600">Esta página contém todos os componentes, hooks e serviços</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span className="font-medium">{company.nome}</span>
              </div>
              <div className="h-3.5 w-px bg-indigo-200" />
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                <span>{user.nome || user.email}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Título da Página */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Disparo de Mídia</h1>
            </div>

            <Button
              onClick={handleSendClick}
              disabled={loading || !message}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Mensagem
            </Button>
          </div>
        </div>

        {/* Área Principal */}
        <div className="grid grid-cols-[1fr,400px] gap-4">
          {/* Coluna Esquerda: Formulário */}
          <div className="space-y-6">
            {/* Grupo Mensagem */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <h2 className="font-medium">Mensagem</h2>
                </div>
              </div>
              
              {/* Barra de Formatação */}
              <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 px-2">
                  <button
                    onClick={() => {
                      const selStart = message.substring(0, textareaRef.current?.selectionStart || 0);
                      const selText = message.substring(
                        textareaRef.current?.selectionStart || 0,
                        textareaRef.current?.selectionEnd || 0
                      );
                      const selEnd = message.substring(textareaRef.current?.selectionEnd || 0);
                      setMessage(`${selStart}*${selText}*${selEnd}`);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Negrito (*)">
                    <span className="font-bold">B</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const selStart = message.substring(0, textareaRef.current?.selectionStart || 0);
                      const selText = message.substring(
                        textareaRef.current?.selectionStart || 0,
                        textareaRef.current?.selectionEnd || 0
                      );
                      const selEnd = message.substring(textareaRef.current?.selectionEnd || 0);
                      setMessage(`${selStart}_${selText}_${selEnd}`);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Itálico (_)">
                    <span className="italic">I</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const selStart = message.substring(0, textareaRef.current?.selectionStart || 0);
                      const selText = message.substring(
                        textareaRef.current?.selectionStart || 0,
                        textareaRef.current?.selectionEnd || 0
                      );
                      const selEnd = message.substring(textareaRef.current?.selectionEnd || 0);
                      setMessage(`${selStart}~${selText}~${selEnd}`);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Riscado (~)">
                    <span className="line-through">S</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const selStart = message.substring(0, textareaRef.current?.selectionStart || 0);
                      const selText = message.substring(
                        textareaRef.current?.selectionStart || 0,
                        textareaRef.current?.selectionEnd || 0
                      );
                      const selEnd = message.substring(textareaRef.current?.selectionEnd || 0);
                      setMessage(`${selStart}\`\`\`${selText}\`\`\`${selEnd}`);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Monospace (```)">
                    <span className="font-mono">M</span>
                  </button>
                </div>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />
                
                <div className="flex items-center gap-1 px-2">
                  <button
                    onClick={() => {
                      setMessage(prev => prev + "\n• ");
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Lista com marcadores">
                    <List className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => {
                      setMessage(prev => prev + "\n1. ");
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Lista numerada">
                    <ListOrdered className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />

                <div className="flex items-center gap-1 px-2">
                  <button
                    onClick={() => {
                      setMessage(prev => prev + "```\n[Seu código aqui]\n```");
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    title="Bloco de código">
                    <Code className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="resize-none min-h-[120px] border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                />

                {/* Dicas de Formatação */}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="font-medium">Dicas:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">*negrito*</span>
                  <span className="text-gray-700 dark:text-gray-300 italic">_itálico_</span>
                  <span className="text-gray-700 dark:text-gray-300 line-through">~riscado~</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono">```código```</span>
                </div>
              </div>
            </div>

            {/* Grupo Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-500" />
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">Filtros</h2>
                      {(selectedCategories[0] !== 'all' || selectedCities[0] !== 'all' || selectedNeighborhoods[0] !== 'all' || selectedGender !== 'all') && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                          {selectedCategories[0] !== 'all' ? selectedCategories.length : 0 +
                           selectedCities[0] !== 'all' ? selectedCities.length : 0 +
                           selectedNeighborhoods[0] !== 'all' ? selectedNeighborhoods.length : 0 +
                           (selectedGender !== 'all' ? 1 : 0)}
                        </span>
                      )}
                    </div>
                  </div>
                  {(selectedCategories[0] !== 'all' || selectedCities[0] !== 'all' || selectedNeighborhoods[0] !== 'all' || selectedGender !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs text-gray-500 hover:text-purple-500 flex items-center gap-1"
                      onClick={() => {
                        setSelectedCategories(['all']);
                        setSelectedCities(['all']);
                        setSelectedNeighborhoods(['all']);
                        setSelectedGender('all');
                      }}
                    >
                      <X className="h-3 w-3" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Debug Info */}
                  <div className="col-span-4 text-sm text-gray-500">
                    Debug: Cidades carregadas: {cities.length}, Bairros: {neighborhoods.length}
                  </div>

                  {/* Categoria */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Categoria</span>
                      {selectedCategories[0] !== 'all' && (
                        <span className="text-xs text-purple-600">{selectedCategories.length} selecionado(s)</span>
                      )}
                    </Label>
                    <NewSelect 
                      value={selectedCategories[0]} 
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todas as categorias
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem 
                            key={category.value} 
                            value={category.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${selectedCategories.includes(category.value) ? 'bg-purple-500' : 'bg-gray-200'}`} />
                              {category.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Cidade */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Cidade</span>
                      {selectedCities[0] !== 'all' && (
                        <span className="text-xs text-blue-600">{selectedCities.length} selecionado(s)</span>
                      )}
                    </Label>
                    <NewSelect 
                      value={selectedCities[0]} 
                      onValueChange={handleCityChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todas as cidades
                        </SelectItem>
                        {cities.map((city) => (
                          <SelectItem 
                            key={city.value} 
                            value={city.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${selectedCities.includes(city.value) ? 'bg-blue-500' : 'bg-gray-200'}`} />
                              {city.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Bairro */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Bairro</span>
                      {selectedNeighborhoods[0] !== 'all' && (
                        <span className="text-xs text-green-600">{selectedNeighborhoods.length} selecionado(s)</span>
                      )}
                    </Label>
                    <NewSelect 
                      value={selectedNeighborhoods[0]} 
                      onValueChange={handleNeighborhoodChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todos os bairros" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todos os bairros
                        </SelectItem>
                        {neighborhoods.map((neighborhood) => (
                          <SelectItem 
                            key={neighborhood.value} 
                            value={neighborhood.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${selectedNeighborhoods.includes(neighborhood.value) ? 'bg-green-500' : 'bg-gray-200'}`} />
                              {neighborhood.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Gênero */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gênero
                    </Label>
                    <NewSelect value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todos os gêneros" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todos os gêneros
                        </SelectItem>
                        {genders.map((gender) => (
                          <SelectItem 
                            key={gender.value} 
                            value={gender.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {gender.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>
                </div>

                {/* Tags dos filtros selecionados */}
                {(selectedCategories[0] !== 'all' || selectedCities[0] !== 'all' || selectedNeighborhoods[0] !== 'all' || selectedGender !== 'all') && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCategories[0] !== 'all' && selectedCategories.map(categoryId => {
                      const category = categories.find(c => c.value === categoryId);
                      return category && (
                        <span key={categoryId} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                          {category.label}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-purple-900" 
                            onClick={() => handleCategoryChange(categoryId)}
                          />
                        </span>
                      );
                    })}
                    
                    {selectedCities[0] !== 'all' && selectedCities.map(cityId => {
                      const city = cities.find(c => c.value === cityId);
                      return city && (
                        <span key={cityId} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                          {city.label}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-blue-900" 
                            onClick={() => handleCityChange(cityId)}
                          />
                        </span>
                      );
                    })}

                    {selectedNeighborhoods[0] !== 'all' && selectedNeighborhoods.map(neighborhoodId => {
                      const neighborhood = neighborhoods.find(n => n.value === neighborhoodId);
                      return neighborhood && (
                        <span key={neighborhoodId} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md border border-green-200">
                          {neighborhood.label}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-green-900" 
                            onClick={() => handleNeighborhoodChange(neighborhoodId)}
                          />
                        </span>
                      );
                    })}

                    {selectedGender !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-pink-50 text-pink-700 rounded-md border border-pink-200">
                        {genders.find(g => g.value === selectedGender)?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-pink-900" 
                          onClick={() => setSelectedGender('all')}
                        />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Grupo Arquivos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-green-500" />
                    <h2 className="font-medium">Arquivos</h2>
                  </div>
                  <span className="text-xs text-gray-500">Arraste arquivos ou clique para fazer upload</span>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Imagens */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('imageInput')?.click()}
                  >
                    <input
                      type="file"
                      id="imageInput"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'image')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <Image className="h-8 w-8" />
                      <span className="text-sm font-medium">Imagens</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'image').length} arquivos</span>
                    </div>
                  </div>

                  {/* Vídeos */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('videoInput')?.click()}
                  >
                    <input
                      type="file"
                      id="videoInput"
                      className="hidden"
                      accept="video/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'video')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <Video className="h-8 w-8" />
                      <span className="text-sm font-medium">Vídeos</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'video').length} arquivos</span>
                    </div>
                  </div>

                  {/* Áudios */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('audioInput')?.click()}
                  >
                    <input
                      type="file"
                      id="audioInput"
                      className="hidden"
                      accept="audio/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'audio')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <Mic className="h-8 w-8" />
                      <span className="text-sm font-medium">Áudios</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'audio').length} arquivos</span>
                    </div>
                  </div>

                  {/* PDFs */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('pdfInput')?.click()}
                  >
                    <input
                      type="file"
                      id="pdfInput"
                      className="hidden"
                      accept=".pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, 'pdf')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <FileText className="h-8 w-8" />
                      <span className="text-sm font-medium">PDFs</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'pdf').length} arquivos</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Arquivos */}
                {mediaFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {mediaFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-colors"
                        >
                          {/* Preview do Arquivo */}
                          <div className="w-full h-20">
                            {file.type === 'image' && (
                              <img
                                src={file.previewUrl}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {file.type === 'video' && (
                              <div className="w-full h-full">
                                <video
                                  src={file.previewUrl}
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              </div>
                            )}
                            {file.type === 'audio' && (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-1">
                                <button
                                  onClick={() => {
                                    const audio = new Audio(file.previewUrl);
                                    audio.play();
                                  }}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                  title="Reproduzir áudio"
                                >
                                  <Play className="h-8 w-8 text-gray-400" />
                                </button>
                              </div>
                            )}
                            {file.type === 'pdf' && (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                            )}

                            {/* Botão Remover */}
                            <div 
                              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center"
                            >
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                title="Clique para remover"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total de Arquivos */}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {mediaFiles.length} arquivo{mediaFiles.length !== 1 ? 's' : ''} 
                      <span className="text-gray-400"> (passe o mouse sobre o arquivo para remover)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Preview */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Preview
              </h2>
              <WhatsAppPreview
                message={message}
                files={mediaFiles}
              />
            </Card>
          </div>
        </div>

        {/* Modal de Confirmação */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Envio</DialogTitle>
              <DialogDescription>
                Revise os dados antes de enviar:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Mensagem:</h4>
                <p className="text-sm text-gray-500">{message}</p>
              </div>

              {mediaFiles.length > 0 && (
                <div>
                  <h4 className="font-medium">Arquivos:</h4>
                  <p className="text-sm text-gray-500">
                    {mediaFiles.length} arquivo(s) anexado(s)
                  </p>
                </div>
              )}

              {selectedFilters.length > 0 && (
                <div>
                  <h4 className="font-medium">Filtros:</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {renderSelectedFilters()}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSend}
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Confirmar Envio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
