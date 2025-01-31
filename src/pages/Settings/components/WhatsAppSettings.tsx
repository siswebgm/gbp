import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Send,
  Smartphone,
  Signal,
  Computer,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Phone,
  Battery,
  User,
  X
} from 'lucide-react';
import { whatsappService } from '../../../services/whatsapp';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useAuth } from '../../../providers/AuthProvider';
import { useCompanyStore } from '../../../store/useCompanyStore';
import QRCodeSVG from 'qrcode.react';

const whatsappSchema = z.object({
  port: z.string().min(1, 'Porta é obrigatória'),
  sessionName: z.string().min(1, 'Nome da Sessão é obrigatório'),
  sessionToken: z.string().min(1, 'Token da Sessão é obrigatório'),
});

type WhatsAppFormData = z.infer<typeof whatsappSchema>;

interface TestMessageState {
  number: string;
  text: string;
}

interface SessionInfo {
  deviceName: string;
  lastSeen?: string;
  batteryLevel?: number;
  connectionState: 'connecting' | 'connected' | 'disconnected';
}

interface WhatsAppStatus {
  status: boolean;
  message: string;
  session: {
    profileName: string;
    device: {
      name: string;
      platform: string;
      battery: {
        level: number;
        charging: boolean;
      };
    };
    lastSeen: string;
    state: 'CONNECTED' | 'DISCONNECTED';
  };
}

interface WhatsAppResponse {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

const initialTestMessage: TestMessageState = {
  number: '',
  text: '',
};

const WhatsAppSettings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { company } = useCompanyStore();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !company)) {
      navigate('/app');
      return;
    }
  }, [authLoading, isAuthenticated, company, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<TestMessageState>(initialTestMessage);
  const [session, setSession] = useState<string>('');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<WhatsAppStatus['session']>();
  const [storedPort, setStoredPort] = useLocalStorage<string>('whatsapp_port', '');
  const [storedSessionName, setStoredSessionName] = useLocalStorage<string>('whatsapp_session_name', '');
  const [storedSessionToken, setStoredSessionToken] = useLocalStorage<string>('whatsapp_session_token', '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WhatsAppFormData>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      port: storedPort,
      sessionName: storedSessionName,
      sessionToken: storedSessionToken,
    },
  });

  const port = register('port').value;
  const sessionName = register('sessionName').value;

  useEffect(() => {
    if (isConnected && session) {
      setSessionInfo({
        deviceName: 'WhatsApp Web',
        lastSeen: new Date().toISOString(),
        batteryLevel: 85,
        connectionState: 'connected'
      });
      setLastActivity(new Date());
    }
  }, [isConnected, session]);

  useEffect(() => {
    if (storedPort && storedSessionName && isConnected) {
      checkConnection();
    }
  }, [storedPort, storedSessionName, isConnected]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isConnected && session) {
      interval = setInterval(async () => {
        const isStillConnected = await whatsappService.checkConnection(port, session);
        if (!isStillConnected && isConnected) {
          setIsConnected(false);
          setSessionInfo(prev => prev ? { ...prev, connectionState: 'disconnected' } : null);
          toast.error("Conexão com WhatsApp perdida");
        }
      }, 30000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, session, port]);

  const checkConnection = async () => {
    try {
      const isConnected = await whatsappService.checkConnection(port, session);
      setIsConnected(isConnected);
      if (isConnected) {
        setSessionInfo(prev => prev ? { ...prev, connectionState: 'connected' } : {
          deviceName: 'WhatsApp Web',
          connectionState: 'connected'
        });
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const checkConnectionStatus = useCallback(async () => {
    if (!port || !session) return;
    
    try {
      const status: WhatsAppStatus = await whatsappService.checkConnection(port, session);
      setConnectionInfo(status.session);
      
      if (status.status) {
        toast.success(status.message);
      } else {
        toast.error(status.message);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      toast.error('Erro ao verificar status da conexão');
    }
  }, [port, session]);

  useEffect(() => {
    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, [checkConnectionStatus]);

  const handleGenerateToken = async (data: WhatsAppFormData) => {
    setIsLoading(true);
    setError(null);
    setQrCode('');
    setConnectionState('connecting');
    
    try {
      // Primeiro salva os dados no localStorage
      setStoredPort(data.port);
      setStoredSessionName(data.sessionName);
      setStoredSessionToken(data.sessionToken);
      
      // Tenta gerar o token e QR code
      const response = await whatsappService.generateToken(
        data.port,
        data.sessionName,
        data.sessionToken
      );
      
      if (response.base64) {
        setQrCode(response.base64);
        toast.success('QR Code gerado com sucesso! Escaneie com seu WhatsApp');
        
        // Inicia verificação periódica do status
        const checkInterval = setInterval(async () => {
          try {
            const status = await whatsappService.checkConnection(data.port, data.sessionName);
            if (status.status) {
              clearInterval(checkInterval);
              setConnectionState('connected');
              setConnectionInfo(status.session);
              toast.success('WhatsApp conectado com sucesso!');
            }
          } catch (error) {
            console.error('Error checking connection:', error);
            // Não mostra toast de erro aqui para não sobrecarregar o usuário
          }
        }, 2000);

        // Limpa o intervalo após 60 segundos se não conectar
        setTimeout(() => {
          clearInterval(checkInterval);
          if (connectionState !== 'connected') {
            setConnectionState('disconnected');
            setError('Tempo limite de conexão excedido. Tente novamente.');
            toast.error('Tempo limite excedido. Tente novamente.');
          }
        }, 60000);
      } else {
        setConnectionState('disconnected');
        setError('Não foi possível gerar o QR Code');
        toast.error('Erro ao gerar QR Code');
      }
    } catch (error) {
      console.error('Error generating token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar token';
      setError(errorMessage);
      toast.error(errorMessage);
      setConnectionState('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: WhatsAppFormData) => {
    // Validar campos obrigatórios
    if (!data.port || !data.sessionName || !data.sessionToken) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }
    
    handleGenerateToken(data);
  };

  const handleTestMessage = async () => {
    if (!session || !testMessage.number || !testMessage.text) return;

    setIsSendingTest(true);
    try {
      await whatsappService.sendTextMessage(port, session, testMessage.number, testMessage.text);
      toast.success('Mensagem enviada com sucesso!');
      setTestMessage(initialTestMessage);
      setLastActivity(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      toast.error(errorMessage);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#00a884] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {/* Logo e Título */}
        <div className="flex items-center gap-2 mb-6">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png"
            alt="WhatsApp Logo"
            className="w-8 h-8"
          />
          <h1 className="text-xl font-normal text-[#41525d]">WHATSAPP WEB</h1>
        </div>

        {/* QR Code */}
        {connectionState === 'disconnected' && (
          <div className="flex justify-center mb-8">
            {qrCode && (
              <QRCodeSVG
                value={qrCode}
                size={264}
                level="H"
                includeMargin={true}
              />
            )}
          </div>
        )}

        {/* Instruções */}
        {connectionState === 'disconnected' && (
          <div className="space-y-4">
            <p className="text-base text-[#41525d]">Use o WhatsApp no seu computador:</p>
            
            <ol className="list-decimal pl-6 space-y-3 text-sm text-[#41525d]">
              <li>Abra o WhatsApp no seu celular</li>
              <li>
                Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong> e selecione{" "}
                <strong>Aparelhos conectados</strong>
              </li>
              <li>Toque em <strong>Conectar um aparelho</strong></li>
              <li>Aponte seu celular para capturar o QR code</li>
            </ol>

            <div className="pt-4">
              <a 
                href="#" 
                className="text-[#008069] text-sm hover:underline"
              >
                Conectar com número de telefone
              </a>
            </div>
          </div>
        )}

        {/* Formulário */}
        {connectionState === 'disconnected' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porta
                </label>
                <input
                  type="text"
                  {...register('port')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Ex: 02"
                  disabled={isConnected}
                />
                {errors.port && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.port.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Sessão
                </label>
                <input
                  type="text"
                  {...register('sessionName')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Ex: minha_sessao"
                  disabled={isConnected}
                />
                {errors.sessionName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.sessionName.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token da Sessão
                </label>
                <input
                  type="password"
                  {...register('sessionToken')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Seu token de sessão"
                  disabled={isConnected}
                />
                {errors.sessionToken && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.sessionToken.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 mr-2" />
                  <span>Gerar QR Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Conexão */}
        {(connectionState === 'connecting' || connectionState === 'connected') && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Send className="h-5 w-5 mr-2 text-blue-500" />
              Enviar Mensagem de Teste
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do WhatsApp
                </label>
                <input
                  type="text"
                  value={testMessage.number}
                  onChange={(e) =>
                    setTestMessage((prev) => ({
                      ...prev,
                      number: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Ex: 5511999999999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem
                </label>
                <textarea
                  value={testMessage.text}
                  onChange={(e) =>
                    setTestMessage((prev) => ({
                      ...prev,
                      text: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  rows={3}
                  placeholder="Digite sua mensagem de teste"
                />
              </div>
              <button
                onClick={handleTestMessage}
                disabled={isSendingTest || !testMessage.number || !testMessage.text}
                className="w-full flex items-center justify-center p-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    <span>Enviar Mensagem de Teste</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppSettings;