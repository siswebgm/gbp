import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Wifi } from 'lucide-react';

interface WhatsAppPreviewProps {
  message: string;
  files: Array<{
    type: 'image' | 'video' | 'audio' | 'pdf';
    previewUrl: string;
  }>;
}

export function WhatsAppPreview({ message, files }: WhatsAppPreviewProps) {
  const currentTime = format(new Date(), 'HH:mm', { locale: ptBR });

  return (
    <div className="w-[280px] h-[580px] bg-gray-100 rounded-[3rem] p-2 shadow-xl border-8 border-gray-800 relative mx-auto">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-xl" />

      {/* Screen */}
      <div className="h-full rounded-[2.5rem] overflow-hidden bg-[#E5DDD5] relative">
        {/* Status Bar */}
        <div className="h-6 bg-[#075E54] flex items-center justify-between px-4">
          <span className="text-white text-xs">{currentTime}</span>
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-white" />
            <div className="w-4 h-2 bg-white rounded-sm" />
          </div>
        </div>

        {/* Chat Header */}
        <div className="bg-[#075E54] text-white p-2 flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-gray-300" />
          <div>
            <p className="font-medium">Destinatário</p>
            <p className="text-xs opacity-80">online</p>
          </div>
        </div>

        {/* Chat Background */}
        <div className="h-full bg-[#E5DDD5] p-4 space-y-2 overflow-y-auto">
          {/* Message Bubble */}
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[#DCF8C6] rounded-lg p-2 shadow">
              {files.length > 0 && (
                <div className="space-y-2 mb-2">
                  {files.map((file, index) => (
                    <div key={index} className="rounded-lg overflow-hidden">
                      {file.type === 'image' && (
                        <img
                          src={file.previewUrl}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                        />
                      )}
                      {file.type === 'video' && (
                        <div className="w-full h-32 bg-black flex items-center justify-center text-white">
                          Vídeo
                        </div>
                      )}
                      {file.type === 'audio' && (
                        <div className="w-full h-12 bg-[#075E54] flex items-center justify-center text-white rounded">
                          Áudio
                        </div>
                      )}
                      {file.type === 'pdf' && (
                        <div className="w-full h-16 bg-red-500 flex items-center justify-center text-white rounded">
                          PDF
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {message && (
                <p className="text-sm break-words">{message}</p>
              )}
              <div className="flex items-center justify-end space-x-1 mt-1">
                <span className="text-[10px] text-gray-500">{currentTime}</span>
                <Check className="w-3 h-3 text-gray-500" />
                <Check className="w-3 h-3 text-gray-500 -ml-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
