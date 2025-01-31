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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar envio de mensagem</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>Filtros selecionados:</strong>
              <br />
              {getFilterSummary()}
            </p>
            <p>
              <strong>Mensagem:</strong>
              <br />
              {message}
            </p>
            <p>
              <strong>Arquivos:</strong>
              <br />
              {getFilesSummary()}
            </p>
            <p className="text-yellow-600">
              Esta ação enviará a mensagem para todos os contatos que correspondem
              aos filtros selecionados. Deseja continuar?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirmar Envio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
