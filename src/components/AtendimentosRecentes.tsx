import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  useTheme, 
  alpha,
  Avatar
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  History as HistoryIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { supabaseClient } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface AtendimentoRecente {
  uid: string;
  eleitor: {
    nome: string;
  };
  categoria: {
    nome: string;
  };
  created_at: string;
  status: string;
}

const statusSteps = [
  { label: 'Pendente', color: '#FFA726' },
  { label: 'Em Andamento', color: '#29B6F6' },
  { label: 'Concluído', color: '#66BB6A' }
];

export function AtendimentosRecentes() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [atendimentosRecentes, setAtendimentosRecentes] = useState<AtendimentoRecente[]>([]);

  useEffect(() => {
    if (user?.email) {
      fetchAtendimentosRecentes();
    }
  }, [user?.email]);

  async function fetchAtendimentosRecentes() {
    try {
      if (!user?.email) {
        console.log('Usuário não autenticado');
        return;
      }

      // Primeiro buscar as permissões do usuário
      const { data: permissoesData, error: permissoesError } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .select('atendimento_uid')
        .eq('usuario_email', user.email);

      if (permissoesError) throw permissoesError;

      const atendimentosPermitidos = permissoesData?.map(p => p.atendimento_uid) || [];
      
      if (atendimentosPermitidos.length === 0) {
        setAtendimentosRecentes([]);
        return;
      }

      // Buscar apenas os atendimentos permitidos
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .select(`
          uid,
          eleitor:gbp_eleitores(nome),
          categoria:gbp_categorias(nome),
          created_at,
          status
        `)
        .in('uid', atendimentosPermitidos)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Converter os dados para o formato correto
      const atendimentosFormatados: AtendimentoRecente[] = (data || []).map(item => ({
        uid: item.uid,
        eleitor: { nome: item.eleitor?.[0]?.nome || 'N/A' },
        categoria: { nome: item.categoria?.[0]?.nome || 'N/A' },
        created_at: item.created_at,
        status: item.status
      }));

      setAtendimentosRecentes(atendimentosFormatados);
    } catch (err) {
      console.error('Erro ao buscar atendimentos recentes:', err);
    }
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: { xs: 2, sm: 3 }, 
        mb: { xs: 2, sm: 3 }, 
        borderRadius: 3,
        background: 'white',
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.1)
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 1,
          mb: 2
        }}
      >
        <Avatar
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            width: 40,
            height: 40
          }}
        >
          <HistoryIcon />
        </Avatar>
        <Typography variant="h6" color="primary">
          Atendimentos Recentes
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2
        }}
      >
        {atendimentosRecentes.map((atend) => (
          <Paper
            key={atend.uid}
            component={Link}
            to={`/atendimento/${atend.uid}`}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" color="primary" noWrap sx={{ flex: 1 }}>
                {atend.eleitor?.nome || 'N/A'}
              </Typography>
              <OpenInNewIcon 
                sx={{ 
                  fontSize: 16, 
                  color: 'action.active',
                  ml: 1
                }} 
              />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {atend.categoria?.nome || 'N/A'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(atend.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </Typography>
              <Chip 
                label={atend.status}
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '0.75rem',
                  backgroundColor: alpha(
                    statusSteps.find(s => s.label === atend.status)?.color || theme.palette.grey[500],
                    0.1
                  ),
                  color: statusSteps.find(s => s.label === atend.status)?.color || theme.palette.grey[500]
                }}
              />
            </Box>
          </Paper>
        ))}
      </Box>
    </Paper>
  );
} 