import { useAuth } from '../providers/AuthProvider';

const routePermissions: Record<string, string[]> = {
  '/app/eleitores': ['view_voters'],
  '/app/atendimentos': ['view_appointments'],
  '/app/documentos': ['view_documents'],
  '/app/mapa': ['view_map'],
  '/app/metas': ['view_goals'],
  '/app/usuarios': ['manage_users'],
  '/app/configuracoes': ['manage_settings'],
  '/app/planos': ['view_plans']
};

export function usePermissions() {
  const { user } = useAuth();

  console.log('[DEBUG] usePermissions - Hook inicializado:', {
    hasUser: !!user,
    userNivel: user?.nivel_acesso,
    userPermissoes: user?.permissoes,
    isAdmin: user?.nivel_acesso === 'admin'
  });

  const isAdmin = user?.nivel_acesso === 'admin';

  const hasPermission = (path: string) => {
    // Remove /app from the beginning of the path
    const routePath = path.replace(/^\/app/, '');
    
    // Log the path being checked
    console.log('usePermissions - Checking path:', {
      originalPath: path,
      routePath,
      userLevel: user?.nivel_acesso,
      userPermissions: user?.permissoes,
      isAdmin
    });
    
    // Admin has access to everything
    if (isAdmin) {
      console.log('usePermissions - User is admin, granting access');
      return true;
    }

    // If no permissions are required for this route, allow access
    if (!routePermissions[routePath]) {
      console.log('usePermissions - No permissions required for route:', routePath);
      return true;
    }

    // Check if user has all required permissions
    const requiredPermissions = routePermissions[routePath];
    console.log('usePermissions - Required permissions:', requiredPermissions);
    
    const hasAllPermissions = requiredPermissions.every(permission =>
      user?.permissoes?.includes(permission)
    );
    
    console.log('usePermissions - Has all permissions:', hasAllPermissions);
    
    return hasAllPermissions;
  };

  return {
    hasPermission,
    isAdmin
  };
} 