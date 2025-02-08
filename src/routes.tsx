import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { Dashboard } from './pages/Dashboard';
import { Eleitores } from './pages/Eleitores';
import { NovoEleitor } from './pages/Eleitores/NovoEleitor';
import { EleitorDetalhes } from './pages/Eleitores/EleitorDetalhes';
import { ImportarEleitores } from './pages/ImportarEleitores';
import { Login } from './pages/Login';
import { useAuth } from './providers/AuthProvider';
import { useCompanyStore } from './store/useCompanyStore';
import { Agenda } from './pages/Agenda';
import ResultadosEleitorais from './pages/ResultadosEleitorais';
import { Documents } from './pages/Documents';
import { NewDocument } from './pages/Documents/NewDocument';
import { EditDocument } from './pages/Documents/EditDocument';
import { AttendanceList } from './pages/AttendanceList';
import { AttendanceForm } from './pages/AttendanceForm';
import { Settings } from './pages/Settings';
import { DisparoMidia } from './pages/DisparoMidia';
import { ElectoralMap } from './pages/MapaEleitoral';
import { Users } from './pages/Users';
import { RegisterInvite } from './pages/RegisterInvite';
import { FormularioPublico } from './pages/FormularioPublico';
import GerenciarFormulario from './pages/app/configuracoes/GerenciarFormulario';
import { PublicAtendimento } from './pages/public/atendimento';
import Oficios from './pages/Documents/Oficios';
import { ProjetosLei } from './pages/Documents/ProjetosLei';
import { Requerimentos } from './pages/Documents/Requerimentos';
import NovoOficio from './pages/Documents/Oficios/NovoOficio';
import WhatsAppPage from './pages/WhatsApp';
import { PlanosPage } from './pages/app/Planos';
import { Suspense } from 'react';
import { EleitoresReport } from './pages/EleitoresReport';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const company = useCompanyStore((state) => state.company);
  
  // Lista de rotas públicas e rotas sem empresa
  const publicPaths = ['/cadastro'];
  const noCompanyPaths = ['/select-company', '/app/whatsapp', '/app/planos'];
  const currentPath = window.location.pathname;
  
  // Se for uma rota pública, permite o acesso direto
  if (publicPaths.some(path => currentPath.startsWith(path))) {
    return <>{children}</>;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!company && !noCompanyPaths.some(path => currentPath.startsWith(path))) {
    return <Navigate to="/select-company" replace />;
  }

  return <>{children}</>;
}

export default function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const currentPath = window.location.pathname;

  console.log('[DEBUG] AppRoutes rendered:', {
    isAuthenticated,
    isLoading,
    hasCompany: !!company
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route
        path="/cadastro/:slug"
        element={
          <PublicLayout>
            <FormularioPublico />
          </PublicLayout>
        }
      />
      <Route
        path="/cadastro/:categoria/:empresa_uid"
        element={
          <PublicLayout>
            <FormularioPublico />
          </PublicLayout>
        }
      />

      {/* Rota pública para atendimentos */}
      <Route
        path="/atendimento/:uid"
        element={
          <PublicLayout>
            <PublicAtendimento />
          </PublicLayout>
        }
      />

      {/* Rota de Login */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            company ? (
              <Navigate to="/app" replace />
            ) : (
              <Navigate to="/select-company" replace />
            )
          ) : (
            <Login />
          )
        } 
      />
      <Route path="/register/:token" element={<RegisterInvite />} />
      
      <Route 
        path="/app" 
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="planos" element={
          <Suspense fallback={<div>Carregando...</div>}>
            <PlanosPage />
          </Suspense>
        } />
        <Route path="eleitores">
          <Route index element={<Eleitores />} />
          <Route path=":id" element={<EleitorDetalhes />} />
          <Route path="novo" element={<NovoEleitor />} />
          <Route path=":id/editar" element={<NovoEleitor />} />
          <Route path="importar" element={<ImportarEleitores />} />
          <Route path="relatorio" element={<EleitoresReport />} />
        </Route>
        <Route path="atendimentos">
          <Route index element={<AttendanceList />} />
          <Route path="novo" element={<AttendanceForm />} />
          <Route path=":id" element={<AttendanceForm />} />
        </Route>
        <Route path="agenda" element={<Agenda />} />
        <Route path="resultados-eleitorais" element={<ResultadosEleitorais />} />
        <Route path="documentos">
          <Route index element={<Documents />} />
          <Route path="novo" element={<NewDocument />} />
          <Route path=":id/editar" element={<EditDocument />} />
          <Route path="oficios">
            <Route index element={<Oficios />} />
            <Route path="novo" element={<NovoOficio />} />
          </Route>
          <Route path="projetos-lei" element={<ProjetosLei />} />
          <Route path="requerimentos" element={<Requerimentos />} />
        </Route>
        <Route path="disparo-de-midia" element={<DisparoMidia />} />
        <Route path="mapa-eleitoral" element={<ElectoralMap />} />
        <Route path="settings">
          <Route index element={<Settings />} />
          <Route path="gerenciar-formulario" element={<GerenciarFormulario />} />
        </Route>
        <Route path="whatsapp" element={
          <Suspense fallback={<div>Carregando...</div>}>
            <WhatsAppPage />
          </Suspense>
        } />
        <Route path="users" element={<Users />} />
      </Route>

      <Route path="*" element={
        isAuthenticated ? (
          company ? (
            <Navigate to="/app" replace />
          ) : (
            <Navigate to="/select-company" replace />
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}
