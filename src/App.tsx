import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { CompanyProvider } from './providers/CompanyProvider';
import { ErrorBoundary } from 'react-error-boundary';
import AppRoutes from './routes';
import { Toaster } from "./components/ui/toaster";
import './styles/scrollbar.css';

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center">
      <div className="bg-red-100 p-8 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800">Algo deu errado:</h2>
        <pre className="mt-2 text-red-600">{error.message}</pre>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <AppRoutes />
              <Toaster />
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}