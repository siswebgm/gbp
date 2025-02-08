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
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { ShieldCheck } from 'lucide-react';

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
      <div 
        key={user.uid}
        className="group transition-all duration-300 hover:scale-[1.02]"
        style={{
          animationDelay: `${filteredUsers.indexOf(user) * 100}ms`,
        }}
      >
        <Card className="overflow-visible relative h-full flex flex-col bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 border-0">
          <CardHeader className="pb-4 flex-1 space-y-4">
            {/* Cabeçalho com Avatar e Informações */}
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-white ring-2 ring-primary/10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                  {user.foto ? (
                    <AvatarImage 
                      src={user.foto} 
                      alt={user.nome || 'Avatar'} 
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary-700 font-medium">
                      {user.nome ? getInitials(user.nome) : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className={cn(
                  'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white',
                  isOnline(user.ultimo_acesso) ? 'bg-green-500' : 'bg-gray-300'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                      {user.nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-gray-50 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditUser(user);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(user);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cn(
                    'inline-flex px-2 py-0.5 text-xs font-medium rounded-full border transition-colors duration-300',
                    getStatusInfo(user.status).color
                  )}>
                    {getStatusInfo(user.status).label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.cargo}
                  </span>
                </div>
              </div>
            </div>

            {/* Metas do Ano */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Metas do Ano (2025)</h4>
              
              {/* Meta de Atendimentos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Atendimentos</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.totalAtendimentos} / 1.000
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${porcentagemAtendimentos}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right tabular-nums">
                  {porcentagemAtendimentos}% concluído
                </p>
              </div>

              {/* Meta de Eleitores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <UsersIcon className="h-4 w-4" />
                    <span>Eleitores</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.totalEleitores} / 1.000
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${porcentagemEleitores}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right tabular-nums">
                  {porcentagemEleitores}% concluído
                </p>
              </div>
            </div>

            {/* Último Acesso */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                Último acesso: {formatLastAccess(user.ultimo_acesso)}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 auto-rows-fr">
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
      <Dialog open={isEditModalOpen} onOpenChange={() => {
        setIsEditModalOpen(false);
        setSelectedUser(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Atualize os dados do usuário' : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            // Implementar lógica de edição de usuário aqui
          }} className="space-y-6 mt-4">
            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome completo"
                  value={selectedUser?.nome || ''}
                  onChange={(e) => {
                    // Implementar lógica de atualização do nome do usuário aqui
                  }}
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o email"
                  value={selectedUser?.email || ''}
                  onChange={(e) => {
                    // Implementar lógica de atualização do email do usuário aqui
                  }}
                  className="w-full"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={selectedUser?.status || 'active'}
                  onValueChange={(value) => {
                    // Implementar lógica de atualização do status do usuário aqui
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Ativo
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        Inativo
                      </div>
                    </SelectItem>
                    <SelectItem value="blocked">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Bloqueado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nível de Acesso */}
              <div className="space-y-2">
                <Label htmlFor="cargo">Nível de Acesso</Label>
                <Select
                  value={selectedUser?.cargo || 'admin'}
                  onValueChange={(value) => {
                    // Implementar lógica de atualização do nível de acesso do usuário aqui
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o nível de acesso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="geral">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-blue-500" />
                        Geral
                      </div>
                    </SelectItem>
                    <SelectItem value="comum">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        Comum
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Senha - apenas para novo usuário */}
              {!selectedUser && (
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Digite a senha"
                    value=""
                    onChange={(e) => {
                      // Implementar lógica de atualização da senha do usuário aqui
                    }}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Botões */}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                disabled={false}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={false}>
                {selectedUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        userName={selectedUser?.nome || ''}
      />
    </div>
  );
}