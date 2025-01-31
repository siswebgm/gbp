import { Box as MuiBox, Typography as MuiTypography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';

export default function FormularioSuspenso() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md w-full text-center">
        <BlockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <MuiTypography variant="h5" component="h1" gutterBottom>
          Formulário Suspenso
        </MuiTypography>
        <MuiTypography variant="body1" color="textSecondary">
          Este formulário de cadastro está temporariamente suspenso.
          Por favor, tente novamente mais tarde.
        </MuiTypography>
      </div>
    </div>
  );
}
