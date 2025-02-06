import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { CheckCircle2, FileText, Filter, MessageCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  message: string;
  files: FileList | null;
  filters: {
    bairro: string;
    cidade: string;
    categoria: string;
    genero: string;
  };
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  message,
  files,
  filters,
}: ConfirmDialogProps) {
  const getFilterSummary = () => {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    return activeFilters.length > 0
      ? activeFilters.join(', ')
      : 'Nenhum filtro selecionado';
  };

  const getFilesSummary = () => {
    if (!files) return 'Nenhum arquivo anexado';
    return `${files.length} arquivo(s) anexado(s)`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-primary">
            <CheckCircle2 className="h-8 w-8" />
            <AlertDialogTitle className="text-2xl font-bold">
              Confirmar Envio
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="space-y-6">
            {/* Filtros */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-primary mb-2">
                <Filter className="h-5 w-5" />
                <h3 className="font-semibold">Filtros selecionados</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {getFilterSummary()}
              </p>
            </div>

            {/* Mensagem */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-primary mb-2">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-semibold">Mensagem</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {message}
              </p>
            </div>

            {/* Arquivos */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-primary mb-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold">Arquivos</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {getFilesSummary()}
              </p>
            </div>

            {/* Aviso */}
            <div className="flex items-start space-x-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Esta ação enviará a mensagem para todos os contatos que correspondem
                aos filtros selecionados. Certifique-se de que todos os dados estão corretos antes de confirmar.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:space-x-4">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={cn(
              "w-full sm:w-auto",
              "bg-primary hover:bg-primary/90",
              "text-white font-semibold"
            )}
          >
            Confirmar Envio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
