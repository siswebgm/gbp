import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PublicRoute } from '../components/PublicRoute';
import { SelectCompany } from '../pages/SelectCompany';
import { Dashboard } from '../pages/app/dashboard';
import { PlanosPage } from '../pages/app/Planos';
import { Eleitores } from '../pages/app/Eleitores';
import { AttendanceList } from '../pages/AttendanceList';
import { Documentos } from '../pages/app/Documentos';
import { Configuracoes } from '../pages/app/Configuracoes';
import { Users } from '../pages/Users';
import WhatsAppPage from '../pages/WhatsApp';
import { Suspense } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useCompanyStore } from '../store/useCompanyStore';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicRoute />,
    children: [
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'select-company',
        element: <SelectCompany />
      }
    ]
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '',
            element: <Dashboard />
          },
          {
            path: 'planos',
            element: (
              <Suspense fallback={<div>Carregando...</div>}>
                <PlanosPage />
              </Suspense>
            )
          },
          {
            path: 'eleitores',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<div>Carregando...</div>}>
                  <Eleitores />
                </Suspense>
              </ProtectedRoute>
            )
          },
          {
            path: 'documentos',
            element: <Documentos />
          },
          {
            path: 'usuarios',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<div>Carregando...</div>}>
                  <Users />
                </Suspense>
              </ProtectedRoute>
            )
          },
          {
            path: 'configuracoes',
            children: [
              {
                path: '',
                element: <Configuracoes />
              },
              {
                path: 'whatsapp',
                element: (
                  <Suspense fallback={<div>Carregando...</div>}>
                    <WhatsAppPage />
                  </Suspense>
                )
              }
            ]
          }
        ]
      }
    ]
  }
]);

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const company = useCompanyStore((state) => state.company);

  console.log('[DEBUG] AppContent - Estado:', {
    path: window.location.pathname,
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userPermissions: user?.permissoes,
    userLevel: user?.nivel_acesso,
    hasCompany: !!company
  });

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <router.RouterProvider />
    </Suspense>
  );
}

export default function AppRoutes() {
  console.log('AppRoutes - Rendering router');
  
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}