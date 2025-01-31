import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { whatsappService } from '../../../services/whatsapp';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

interface WhatsAppSession {
  id: string;
  name: string;
  status: string;
}

export const WhatsAppConnections: React.FC = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [storedPort] = useLocalStorage('whatsapp_port', '');

  // Carrega as sessões
  useEffect(() => {
    const loadSessions = async () => {
      if (!storedPort) return;
      
      setLoading(true);
      try {
        const data = await whatsappService.listSessions(storedPort);
        setSessions(data);
      } catch (error) {
        console.error('Error loading sessions:', error);
        toast.error('Erro ao carregar sessões');
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [storedPort, refreshKey]);

  // Atualiza a lista
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Deleta uma sessão
  const handleDelete = async (session: string) => {
    try {
      await whatsappService.deleteSession(storedPort, session);
      toast.success('Sessão deletada com sucesso');
      handleRefresh();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erro ao deletar sessão');
    }
  };

  // Desconecta uma sessão
  const handleLogout = async (session: string) => {
    try {
      await whatsappService.logout(storedPort, session);
      toast.success('Sessão desconectada com sucesso');
      handleRefresh();
    } catch (error) {
      console.error('Error logging out session:', error);
      toast.error('Erro ao desconectar sessão');
    }
  };

  // Renderiza o chip de status
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case 'CONNECTED':
        color = 'success';
        break;
      case 'DISCONNECTED':
        color = 'error';
        break;
      case 'STARTING':
        color = 'warning';
        break;
    }

    return (
      <Chip
        label={status}
        color={color}
        size="small"
      />
    );
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Conexões WhatsApp
          </Typography>
          <Box>
            <Tooltip title="Atualizar">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome da Sessão</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.name}</TableCell>
                    <TableCell>
                      {renderStatusChip(session.status)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Desconectar">
                        <IconButton
                          onClick={() => handleLogout(session.name)}
                          disabled={session.status !== 'CONNECTED'}
                        >
                          <LogoutIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deletar">
                        <IconButton
                          onClick={() => handleDelete(session.name)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Nenhuma sessão encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
