import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { CreateCompanyModal } from './components/CreateCompanyModal';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      setIsLoading(true);

      if (!data.email || !data.password) {
        toast.error('Por favor, preencha todos os campos');
        return;
      }

      await signIn(data.email, data.password);
      toast.success('Login realizado com sucesso!');
      navigate('/app', { replace: true });
    } catch (error) {
      console.error('Erro no login:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - Fundo azul com logo e descrição */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 flex-col items-center justify-center text-white p-12">
        <div className="mb-6">
          <img 
            src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1682561704007x424862565662542000/gbp%20politico.png"
            alt="GBP Político"
            className="h-16 w-16"
          />
        </div>
        <h1 className="text-3xl font-bold mb-4">GBP Político</h1>
        <p className="text-center text-white/90 text-lg mb-12">
          Gerencie seus processos políticos de forma eficiente e organizada
        </p>
        <div className="space-y-4 w-full max-w-md">
          <div className="bg-blue-500/30 rounded-lg p-4 pl-8 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-white">Gestão completa de ofícios e projetos de lei</p>
          </div>
          <div className="bg-blue-500/30 rounded-lg p-4 pl-8 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-white">Acompanhamento em tempo real</p>
          </div>
          <div className="bg-blue-500/30 rounded-lg p-4 pl-8 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-white">Relatórios e análises detalhadas</p>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário de login */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Entrar no sistema</h2>
          <p className="text-gray-600 mb-8">Entre com suas credenciais para acessar sua conta</p>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ email, password }); }} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Entrando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 4L18 4C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H14M3 12L15 12M3 12L7 8M3 12L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Entrar
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-4">Ou</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="block w-full text-center py-2 px-4 border border-blue-600 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Criar empresa
            </button>
          </div>
        </div>
      </div>

      <CreateCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          toast.success('Empresa criada com sucesso! Faça login para continuar.');
        }}
      />
    </div>
  );
}