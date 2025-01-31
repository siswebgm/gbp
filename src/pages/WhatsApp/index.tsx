import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function WhatsAppPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleGenerateQRCode = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrCode("https://example.com/whatsapp-connection");
    } finally {
      setIsGenerating(false);
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
              Use o WhatsApp no seu computador
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
                ) : qrCode ? (
                  <div className="relative">
                    <QRCodeSVG
                      value={qrCode}
                      size={264}
                      level="H"
                      includeMargin={true}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png"
                        alt=""
                        className="w-12 h-12 opacity-20"
                      />
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleGenerateQRCode}
                    className="w-[264px] h-[264px] border-2 border-[#00a884] rounded flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#f0f2f5] transition-colors group"
                  >
                    {/* Ícone de QR Code */}
                    <div className="w-16 h-16 border-2 border-[#00a884] rounded flex items-center justify-center group-hover:bg-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
                        <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z"/>
                        <path d="M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"/>
                      </svg>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-[#41525d] font-medium mb-1">Clique aqui para gerar o QR Code</p>
                      <p className="text-sm text-[#667781]">Necessário para conectar ao WhatsApp</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
