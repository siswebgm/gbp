import { useState, useEffect } from 'react';
import { UserModal } from './components/UserModal';
import { EditUserModal } from './components/EditUserModal';
import { DeleteUserModal } from './components/DeleteUserModal';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuthStore } from '../../store/useAuthStore'; // Corrigido o import
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Phone, 
  Users as UsersIcon, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2
} from 'lucide-react';
import { userService, User as UserType } from '../../services/users';
import { statsService, UserStats } from '../../services/stats';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';
import { UserFormModal } from '@/components/UserFormModal';
import { useAuth } from '../../providers/AuthProvider';

export function Users() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccess = user?.nivel_acesso !== 'comum';

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
  }, [canAccess, navigate]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const company = useCompanyStore((state) => state.company);
  const authUser = useAuthStore((state) => state.user); // Usando o store corretamente
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadUsers = async () => {
    if (!company?.uid) {
      console.log('Nenhuma empresa selecionada');
      return;
    }

    try {
      setLoading(true);
      console.log('Carregando usuários para empresa:', company.uid);
      const data = await userService.list(company.uid);
      console.log('Usuários carregados:', data);
      setUsers(data);
    } catch (error) {
      console.error('Erro detalhado ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [company?.uid]);

  useEffect(() => {
    // Atualiza o currentTime a cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSuccess = () => loadUsers();

  const isOnline = (lastAccess: string | null) => {
    if (!lastAccess) return false;
    const lastAccessDate = new Date(lastAccess);
    const diffInSeconds = Math.floor((currentTime.getTime() - lastAccessDate.getTime()) / 1000);
    return diffInSeconds <= 30; // Considera online se acessou nos últimos 30 segundos
  };

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return null;
    const lastAccessDate = new Date(lastAccess);
    
    if (isOnline(lastAccess)) {
      return 'Online';
    }

    const diffInSeconds = Math.floor((currentTime.getTime() - lastAccessDate.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);

    // Se foi há menos de 1 minuto
    if (diffInSeconds < 60) {
      return `há ${diffInSeconds} ${diffInSeconds === 1 ? 'segundo' : 'segundos'}`;
    }

    // Se foi há menos de 1 hora
    if (diffInMinutes < 60) {
      return `há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    }

    // Se foi há menos de 24 horas
    if (diffInHours < 24) {
      return `há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    }

    // Se foi hoje
    if (lastAccessDate.toDateString() === currentTime.toDateString()) {
      return `Hoje às ${format(lastAccessDate, 'HH:mm:ss')}`;
    }

    // Se foi ontem
    const yesterday = new Date(currentTime);
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastAccessDate.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${format(lastAccessDate, 'HH:mm:ss')}`;
    }

    // Para outras datas
    return format(lastAccessDate, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
  };

  const formatDisplayName = (fullName: string | null) => {
    if (!fullName) return '';
    
    // Divide o nome em partes
    const nameParts = fullName.trim().split(' ');
    
    // Se tiver apenas uma parte, retorna ela
    if (nameParts.length === 1) {
      return nameParts[0];
    }
    
    // Pega o primeiro e último nome
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Retorna primeiro e último nome
    return `${firstName} ${lastName}`;
  };

  const loadUserStats = async () => {
    if (!company?.uid) {
      console.log('Empresa não encontrada');
      return;
    }
    
    const stats: Record<string, UserStats> = {};
    console.log('Empresa:', company);
    
    for (const user of users) {
      console.log('Carregando stats para usuário:', user);
      if (user.uid) {
        const userStat = await statsService.getUserStats(user.uid, company.uid);
        stats[user.uid] = userStat;
      }
    }
    console.log('Stats finais:', stats);
    setUserStats(stats);
  };

  useEffect(() => {
    if (users.length > 0 && company?.uid) {
      console.log('Iniciando carregamento de stats para', users.length, 'usuários');
      loadUserStats();
    }
  }, [users, company?.uid]);

  const calcularPorcentagem = (valor: number, meta: number = 1000) => {
    return Math.min(Math.round((valor / meta) * 100), 100);
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setIsDeleting(true);
      await userService.delete(selectedUser.uid);
      toast.success('Usuário excluído com sucesso!');
      loadUsers();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusInfo = (status: string | null) => {
    switch (status) {
      case 'active':
        return { label: 'Ativo', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'pending':
        return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'blocked':
        return { label: 'Bloqueado', color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nivel_acesso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contato?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (selectedTab) {
      case 'ativos':
        return matchesSearch && user.status === 'active';
      case 'pendentes':
        return matchesSearch && user.status === 'pending';
      default:
        return matchesSearch;
    }
  });

  const stats = {
    total: users.length,
    ativos: users.filter(u => u.status === 'active').length,
    pendentes: users.filter(u => u.status === 'pending').length,
    online: users.filter(u => isOnline(u.ultimo_acesso)).length
  };

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderUserCard = (user: UserType) => {
    const stats = userStats[user.uid] || {
      totalEleitores: 0,
      totalAtendimentos: 0
    };

    const porcentagemAtendimentos = calcularPorcentagem(stats.totalAtendimentos);
    const porcentagemEleitores = calcularPorcentagem(stats.totalEleitores);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    };

    return (
      <Card 
        key={user.uid} 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => handleEditUser(user)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12 border border-gray-200">
              {user.foto ? (
                <AvatarImage 
                  src={user.foto} 
                  alt={user.nome || 'Avatar'} 
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-primary-50 text-primary-700 font-medium">
                  {user.nome ? getInitials(user.nome) : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {user.nome}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full border',
                    getStatusInfo(user.status).color
                  )}>
                    {getStatusInfo(user.status).label}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Metas do Ano */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Metas do Ano (2025)</h4>
            
            {/* Meta de Atendimentos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Atendimentos
                </span>
                <span className="font-medium">{stats.totalAtendimentos} / 1.000</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${porcentagemAtendimentos}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{porcentagemAtendimentos}% da meta anual</p>
            </div>

            {/* Meta de Eleitores */}
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <UsersIcon className="h-4 w-4" />
                  Eleitores
                </span>
                <span className="font-medium">{stats.totalEleitores} / 1.000</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${porcentagemEleitores}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{porcentagemEleitores}% da meta anual</p>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Último acesso</p>
              <p className="font-medium">{formatLastAccess(user.ultimo_acesso)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Função</p>
              <p className="font-medium">{user.cargo}</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selecione uma empresa para gerenciar usuários</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-1 md:py-4 px-2 md:px-4">
        <div className="flex flex-col space-y-2 md:space-y-4 max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/app/dashboard')} 
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Voltar para Dashboard"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Usuários
                </h1>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-[250px]"
                  />
                </div>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="hidden md:flex"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <UsersIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                      <h3 className="text-2xl font-bold">{stats.total}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Usuários Ativos</p>
                      <h3 className="text-2xl font-bold">{stats.ativos}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <Mail className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Usuários Pendentes</p>
                      <h3 className="text-2xl font-bold">{stats.pendentes}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Usuários Online</p>
                      <h3 className="text-2xl font-bold">{stats.online}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="ativos">Ativos</TabsTrigger>
                <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab}>
                {loading ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : currentUsers.length === 0 ? (
                  <Card className="p-6">
                    <div className="text-center">
                      <User className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium">Nenhum usuário encontrado</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'Tente uma busca diferente.' : 'Comece adicionando um novo usuário.'}
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {currentUsers.map(renderUserCard)}
                  </div>
                )}

                {/* Paginação */}
                {currentUsers.length > 0 && (
                  <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                    <div className="w-full md:w-auto order-2 md:order-1">
                      <span className="hidden md:inline text-sm text-gray-700">
                        Mostrando {startIndex + 1} até {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length} resultados
                      </span>
                    </div>

                    <div className="flex space-x-1 md:space-x-2 order-1 md:order-2 w-full md:w-auto justify-center md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const start = Math.max(1, currentPage - (isMobile ? 1 : 2));
                          const end = Math.min(totalPages, start + (isMobile ? 2 : 4));
                          return page >= start && page <= end;
                        })
                        .map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            disabled={loading}
                          >
                            {page}
                          </Button>
                        ))
                      }

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages || loading}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Button
        onClick={() => setIsCreateModalOpen(true)}
        className="md:hidden fixed right-4 bottom-4 rounded-full w-14 h-14 shadow-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white z-50 transition-transform hover:scale-110"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <UserFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadUsers}
        empresaUid={company?.uid || ''}
      />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={loadUsers}
        user={selectedUser}
      />
    </div>
  );
}