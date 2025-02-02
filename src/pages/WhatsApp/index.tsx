import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Typography } from '@mui/material';
import { useCompanyStore } from '../../store/useCompanyStore';
import { supabaseClient } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function WhatsAppPage() {
  const { company } = useCompanyStore();
  const [whatsappStatus, setWhatsappStatus] = useState<'open' | 'closed' | 'sincronizando'>('closed');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  console.log('WhatsAppPage - Company:', company);

  // Verificar status do WhatsApp na tabela gbp_empresas
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      if (!company?.uid) {
        console.log('Sem company.uid no localStorage');
        return;
      }

      console.log('Verificando status do WhatsApp para empresa:', company.uid);
      setIsLoadingStatus(true);
      
      try {
        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .select('status_wpp, qr_code')
          .eq('uid', company.uid)
          .single();

        if (error) {
          console.error('Erro na consulta:', error);
          throw error;
        }
        
        console.log('Dados recebidos da empresa:', data);
        const newStatus = data?.status_wpp === 'open' || data?.status_wpp === 'sincronizando' 
          ? data.status_wpp 
          : 'closed';
        console.log('Status anterior:', whatsappStatus, 'Novo status:', newStatus);
        
        if (whatsappStatus !== newStatus) {
          console.log('Atualizando status de', whatsappStatus, 'para', newStatus);
          setWhatsappStatus(newStatus as any);
        }

        if (data?.qr_code !== qrCodeBase64) {
          console.log('Atualizando QR code');
          setQrCodeBase64(data?.qr_code);
        }
      } catch (error) {
        console.error('Erro ao verificar status do WhatsApp:', error);
        toast.error('Erro ao verificar status do WhatsApp');
      } finally {
        setIsLoadingStatus(false);
      }
    };

    // Consulta inicial
    checkWhatsAppStatus();

    if (!company?.uid) return;

    // Configurar realtime subscription
    const subscription = supabaseClient
      .channel(`whatsapp-status-${company.uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_empresas',
          filter: `uid=eq.${company.uid}`
        },
        (payload) => {
          console.log('Mudança detectada:', {
            event: payload.eventType,
            old: payload.old,
            new: payload.new
          });
          
          if (payload.new?.status_wpp !== undefined) {
            const newStatus = payload.new.status_wpp === 'open' || payload.new.status_wpp === 'sincronizando' 
              ? payload.new.status_wpp 
              : 'closed';
            console.log('Status anterior:', whatsappStatus, 'Novo status:', newStatus);
            
            if (whatsappStatus !== newStatus) {
              console.log('Atualizando status via subscription de', whatsappStatus, 'para', newStatus);
              setWhatsappStatus(newStatus as any);
            }
          }
          
          if (payload.new?.qr_code !== qrCodeBase64) {
            console.log('Novo QR code recebido via subscription');
            setQrCodeBase64(payload.new.qr_code);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status:`, status);
      });

    return () => {
      console.log('Limpando subscription');
      subscription.unsubscribe();
    };
  }, [company?.uid]);

  // Debug: Mostrar estado atual
  useEffect(() => {
    console.log('Estado atual do WhatsApp:', {
      status: whatsappStatus,
      hasQRCode: !!qrCodeBase64,
      companyUid: company?.uid
    });
  }, [whatsappStatus, qrCodeBase64, company?.uid]);

  const handleGenerateQRCode = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrCode("https://example.com/whatsapp-connection");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSincronizar = async () => {
    if (!company?.uid) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      await axios.post('https://whkn8n.guardia.work/webhook/gbp_sincronizar', {
        acao: 'sincronizar',
        empresaUid: company.uid
      });
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com WhatsApp');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header com Logo */}
      <div className="bg-[#00a884] h-[127px]">
        <div className="p-6 flex items-center">
          <div className="flex items-center text-white gap-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png"
              alt="WhatsApp"
              className="w-7 h-7"
            />
            <span className="text-sm font-normal">WHATSAPP WEB</span>
          </div>
        </div>
      </div>

      {/* Área cinza clara */}
      <div className="flex-1 bg-[#f0f2f5]">
        {/* Conteúdo Principal */}
        <div className="flex justify-center px-4 -mt-16">
          <div className="bg-white rounded shadow-lg w-full max-w-[1000px] p-12">
            <h1 className="text-[#41525d] text-[1.35rem] font-light mb-12">
              USE O WHATSAPP NO SEU COMPUTADOR
            </h1>

            <div className="flex flex-col md:flex-row justify-between gap-20">
              <div className="flex-[1.4]">
                <ol className="list-decimal pl-5 space-y-6 text-[#41525d] text-base">
                  <li>Abra o WhatsApp no seu celular.</li>
                  <li>
                    Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong> e selecione{" "}
                    <strong>Aparelhos conectados</strong>.
                  </li>
                  <li>Toque em <strong>Conectar um aparelho</strong>.</li>
                  <li>Aponte seu celular para esta tela para capturar o QR code.</li>
                </ol>

                <div className="mt-12">
                  <a 
                    href="#" 
                    className="text-[#008069] text-sm hover:underline"
                  >
                    Conectar com número de telefone
                  </a>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-6">
                {isGenerating ? (
                  <div className="w-[264px] h-[264px] border-2 border-[#00a884] rounded flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-[#41525d]">Gerando QR Code...</p>
                    </div>
                  </div>
                ) : whatsappStatus === 'open' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-[#00a884]/10 p-6 rounded-lg">
                      <Wifi className="w-16 h-16 text-[#00a884]" />
                    </div>
                    <p className="text-[#00a884] font-medium">WhatsApp Conectado</p>
                    <p className="text-sm text-gray-500">
                      Seu WhatsApp está conectado e pronto para uso
                    </p>
                  </div>
                ) : whatsappStatus === 'sincronizando' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-blue-100 p-6 rounded-lg">
                      <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                    </div>
                    <p className="text-blue-500 font-medium">Sincronizando WhatsApp</p>
                    <p className="text-sm text-gray-500">
                      Aguarde enquanto conectamos seu WhatsApp
                    </p>
                  </div>
                ) : qrCodeBase64 ? (
                  <img src={qrCodeBase64} alt="QR Code" className="mx-auto" />
                ) : (
                  <div 
                    className="flex flex-col items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleSincronizar}
                  >
                    <div className="bg-red-100 p-6 rounded-lg">
                      <WifiOff className="w-16 h-16 text-red-500" />
                    </div>
                    <p className="text-red-500 font-medium">WhatsApp Desconectado</p>
                    <p className="text-sm text-gray-500">
                      Clique para gerar o QR Code
                    </p>
                  </div>
                )}
                <p className="mt-4 text-sm text-gray-500">
                  {whatsappStatus === 'open' 
                    ? 'Você pode usar o WhatsApp normalmente'
                    : 'Necessário para conectar ao WhatsApp'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
