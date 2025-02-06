import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { eleitorStatsService, EleitorStats } from '../../services/eleitorStats';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, Loader2, Download, Users2, Building2, Home, MapPin, Info, AlertCircle } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { TablePagination } from '../../components/TablePagination';
import { useAuth } from '../../providers/AuthProvider';
import { CargoEnum } from '../../services/auth';

export function EleitoresReport() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EleitorStats | null>(null);
  const [bairroPages, setBairroPages] = useState<Record<string, number>>({});
  
  const canAccess = user?.nivel_acesso !== 'comum';

  // Estados para paginação
  const [cidadePage, setCidadePage] = useState(1);
  const [indicadoPage, setIndicadoPage] = useState(1);
  const [bairroPage, setBairroPage] = useState(1);
  const [zonaPage, setZonaPage] = useState(1);
  const [usuarioPage, setUsuarioPage] = useState(1);
  const itemsPerPage = 10;
  const bairrosPerPage = 5;

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
    loadStats();
  }, [company?.uid, canAccess]);

  const loadStats = async () => {
    if (!company?.uid) {
      // toast.error('Empresa não identificada');
      return;
    }

    try {
      setLoading(true);
      const data = await eleitorStatsService.getStats(company.uid);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!stats) return;

    // Log dos dados que serão exportados
    console.log('Dados para exportação:', {
      totalEleitores: stats.totalEleitores,
      cidades: stats.porCidade,
      bairros: stats.porBairro,
      zonas: stats.porZonaSecao,
      indicados: stats.porIndicado,
      usuarios: stats.porUsuario
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Eleitoral';
    workbook.created = new Date();

    try {
      // 1. Aba de Cidades
      console.log('Criando aba de Cidades...');
      const cidadesSheet = workbook.addWorksheet('Cidades');
      cidadesSheet.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de cidades
      if (stats.porCidade.length === 0) {
        console.warn('Nenhum dado de cidade encontrado');
      }

      // Adicionar todas as cidades
      stats.porCidade.forEach((cidade, index) => {
        console.log(`Adicionando cidade ${index + 1}/${stats.porCidade.length}:`, cidade);
        cidadesSheet.addRow({
          cidade: cidade.cidade,
          total: cidade.total,
          porcentagem: `${((cidade.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 2. Aba de Indicados
      console.log('Criando aba de Indicados...');
      const indicadosSheet = workbook.addWorksheet('Indicados');
      indicadosSheet.columns = [
        { header: 'Indicado', key: 'indicado', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de indicados
      if (stats.porIndicado.length === 0) {
        console.warn('Nenhum dado de indicado encontrado');
      }

      // Adicionar todos os indicados
      stats.porIndicado.forEach((indicado, index) => {
        console.log(`Adicionando indicado ${index + 1}/${stats.porIndicado.length}:`, indicado);
        indicadosSheet.addRow({
          indicado: indicado.indicado_nome,
          total: indicado.total,
          porcentagem: `${((indicado.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 3. Aba de Bairros
      console.log('Criando aba de Bairros...');
      const bairrosSheet = workbook.addWorksheet('Bairros por Cidade');
      bairrosSheet.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Bairro', key: 'bairro', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: '% do Total', key: 'porcentagemTotal', width: 15 },
        { header: '% da Cidade', key: 'porcentagemCidade', width: 15 }
      ];

      // Verificar se há dados de bairros
      if (stats.porBairro.length === 0) {
        console.warn('Nenhum dado de bairro encontrado');
      }

      // Agrupar bairros por cidade
      const bairrosPorCidade = stats.porBairro.reduce((acc, curr) => {
        if (!acc[curr.cidade]) {
          acc[curr.cidade] = [];
        }
        acc[curr.cidade].push(curr);
        return acc;
      }, {} as Record<string, typeof stats.porBairro>);

      console.log('Bairros agrupados por cidade:', bairrosPorCidade);

      // Adicionar todos os bairros agrupados por cidade
      Object.entries(bairrosPorCidade).forEach(([cidade, bairros], cidadeIndex) => {
        console.log(`Processando cidade ${cidadeIndex + 1}: ${cidade} com ${bairros.length} bairros`);
        
        const cidadeTotal = bairros.reduce((sum, b) => sum + b.total, 0);
        
        // Adicionar linha da cidade
        bairrosSheet.addRow({
          cidade: cidade,
          bairro: 'TOTAL DA CIDADE',
          total: cidadeTotal,
          porcentagemTotal: `${((cidadeTotal / stats.totalEleitores) * 100).toFixed(1)}%`,
          porcentagemCidade: '100%'
        });

        // Adicionar todos os bairros da cidade
        bairros.forEach((bairro, bairroIndex) => {
          console.log(`Adicionando bairro ${bairroIndex + 1}/${bairros.length} da cidade ${cidade}:`, bairro);
          bairrosSheet.addRow({
            cidade: '',
            bairro: bairro.bairro,
            total: bairro.total,
            porcentagemTotal: `${((bairro.total / stats.totalEleitores) * 100).toFixed(1)}%`,
            porcentagemCidade: `${((bairro.total / cidadeTotal) * 100).toFixed(1)}%`
          });
        });

        bairrosSheet.addRow({}); // Linha em branco entre cidades
      });

      // 4. Aba de Zonas e Seções
      console.log('Criando aba de Zonas e Seções...');
      const zonasSheet = workbook.addWorksheet('Zonas e Seções');
      zonasSheet.columns = [
        { header: 'Zona', key: 'zona', width: 15 },
        { header: 'Seção', key: 'secao', width: 15 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de zonas
      if (stats.porZonaSecao.length === 0) {
        console.warn('Nenhum dado de zona/seção encontrado');
      }

      // Adicionar todas as zonas e seções
      stats.porZonaSecao.forEach((zona, index) => {
        console.log(`Adicionando zona/seção ${index + 1}/${stats.porZonaSecao.length}:`, zona);
        zonasSheet.addRow({
          zona: zona.zona,
          secao: zona.secao,
          total: zona.total,
          porcentagem: `${((zona.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 5. Aba de Usuários
      console.log('Criando aba de Usuários...');
      const usuariosSheet = workbook.addWorksheet('Usuários');
      usuariosSheet.columns = [
        { header: 'Usuário', key: 'usuario', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de usuários
      if (stats.porUsuario.length === 0) {
        console.warn('Nenhum dado de usuário encontrado');
      }

      // Adicionar todos os usuários
      stats.porUsuario.forEach((usuario, index) => {
        console.log(`Adicionando usuário ${index + 1}/${stats.porUsuario.length}:`, usuario);
        usuariosSheet.addRow({
          usuario: usuario.usuario_nome,
          total: usuario.total,
          porcentagem: `${((usuario.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // Aplicar estilos a todas as abas
      [cidadesSheet, indicadosSheet, bairrosSheet, zonasSheet, usuariosSheet].forEach(sheet => {
        // Estilo para o cabeçalho
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' }
        };

        // Aplicar estilos a todas as células
        sheet.eachRow((row, rowNumber) => {
          row.eachCell(cell => {
            // Bordas
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };

            // Alinhamento
            if (typeof cell.value === 'number') {
              cell.alignment = { horizontal: 'right' };
            }
          });

          // Destacar totais
          if (
            row.getCell(1).value === 'Total Geral' || 
            row.getCell(2).value === 'TOTAL DA CIDADE'
          ) {
            row.eachCell(cell => {
              cell.font = { bold: true };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
              };
            });
          }
        });

        // Congelar cabeçalho
        sheet.views = [
          { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];
      });

      console.log('Gerando arquivo Excel...');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatório_Eleitores_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      console.log('Arquivo Excel gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar o arquivo Excel. Por favor, tente novamente.');
    }
  };

  // Funções auxiliares para paginação
  const getPaginatedData = <T extends any>(data: T[], page: number): T[] => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  // Função para atualizar a página de uma cidade específica
  const handleBairroPageChange = (cidade: string, page: number) => {
    setBairroPages(prev => ({
      ...prev,
      [cidade]: page
    }));
  };

  // Função para obter a página atual dos bairros de uma cidade
  const getBairroPage = (cidade: string) => bairroPages[cidade] || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">Nenhuma estatística disponível</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Relatório de Cadastros
            </h1>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleExportExcel}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm sm:text-base"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Cabeçalho com Total e Líderes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Total de Eleitores */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Total de Eleitores</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Users2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalEleitores.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  eleitores
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span>{stats.porCidade.length} cidades</span>
                <span className="hidden sm:inline">•</span>
                <span>{stats.porBairro.length} bairros</span>
                <span className="hidden sm:inline">•</span>
                <span>{new Set(stats.porZonaSecao.map(z => z.zona)).size} zonas</span>
              </div>
            </div>
          </Card>

          {/* Cidade Líder */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Cidade Líder</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.porCidade[0]?.total.toLocaleString() || '0'}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  eleitores
                </span>
              </div>
              <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate" title={stats.porCidade[0]?.cidade || '-'}>
                  {stats.porCidade[0]?.cidade || '-'}
                </span>
                <span>({((stats.porCidade[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
              </div>
            </div>
          </Card>

          {/* Bairro Líder */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Bairro Líder</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Home className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.porBairro[0]?.total.toLocaleString() || '0'}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  eleitores
                </span>
              </div>
              <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate" title={stats.porBairro[0]?.bairro || '-'}>
                  {stats.porBairro[0]?.bairro || '-'}
                </span>
                <span className="truncate" title={stats.porBairro[0]?.cidade || '-'}>
                  {stats.porBairro[0]?.cidade || '-'}
                </span>
                <span>({((stats.porBairro[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
              </div>
            </div>
          </Card>

          {/* Zona Líder */}
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Zona Líder</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.porZonaSecao[0]?.total.toLocaleString() || '0'}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  eleitores
                </span>
              </div>
              <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Zona {stats.porZonaSecao[0]?.zona || '-'}
                </span>
                <span>Seção {stats.porZonaSecao[0]?.secao || '-'}</span>
                <span>({((stats.porZonaSecao[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Distribuição por Cidade */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Distribuição por Cidade</h3>
              <p className="text-sm text-gray-500">Total de cidades: {stats.porCidade.length}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 text-sm w-full sm:w-auto">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-center">
                Maior: {stats.porCidade[0]?.cidade} ({stats.porCidade[0]?.total})
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-center">
                Menor: {stats.porCidade[stats.porCidade.length - 1]?.cidade} ({stats.porCidade[stats.porCidade.length - 1]?.total})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Cidade</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">%</th>
                    <th className="px-4 py-2 w-1/3">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(stats.porCidade, cidadePage).map(({ cidade, total }, index) => {
                    const percentage = (total / stats.totalEleitores) * 100;
                    return (
                      <tr key={cidade} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                        <td className="py-2">{cidade}</td>
                        <td className="text-right py-2">{total}</td>
                        <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination
            currentPage={cidadePage}
            totalItems={stats.porCidade.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCidadePage}
          />
        </Card>

        {/* Distribuição por Indicado */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Distribuição por Indicado</h3>
              <p className="text-sm text-gray-500">
                Total de indicados: {stats.porIndicado.length}
              </p>
            </div>
            {stats.porIndicado.length > 0 && (
              <div className="text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded block text-center">
                  Maior: {stats.porIndicado[0]?.indicado_nome} ({stats.porIndicado[0]?.total})
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Indicado</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">%</th>
                  <th className="px-4 py-2">Distribuição</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(stats.porIndicado, indicadoPage).map((item, index) => {
                  const percentage = (item.total / stats.totalEleitores) * 100;
                  return (
                    <tr key={item.indicado_nome} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                      <td className="py-2">{item.indicado_nome}</td>
                      <td className="text-right py-2">{item.total}</td>
                      <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                      <td className="px-4 py-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={indicadoPage}
            totalItems={stats.porIndicado.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setIndicadoPage}
          />
        </Card>

        {/* Distribuição por Bairro */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Distribuição por Bairro</h3>
              <p className="text-sm text-gray-500">
                Total de bairros: {stats.porBairro.length} em {new Set(stats.porBairro.map(b => b.cidade)).size} cidades
              </p>
            </div>
            <div className="text-sm w-full sm:w-auto">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded block text-center">
                Maior: {stats.porBairro[0]?.bairro} ({stats.porBairro[0]?.total})
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {getPaginatedData(
              Object.entries(
                stats.porBairro.reduce((acc, curr) => {
                  if (!acc[curr.cidade]) {
                    acc[curr.cidade] = [];
                  }
                  acc[curr.cidade].push(curr);
                  return acc;
                }, {} as Record<string, typeof stats.porBairro>)
              )
                .sort(([, a], [, b]) => b[0].total - a[0].total),
              bairroPage
            ).map(([cidade, bairros]) => {
              const cidadeTotal = bairros.reduce((sum, b) => sum + b.total, 0);
              const cidadePercentage = (cidadeTotal / stats.totalEleitores) * 100;
              const currentPage = getBairroPage(cidade);
              const paginatedBairros = bairros
                .sort((a, b) => b.total - a.total)
                .slice((currentPage - 1) * bairrosPerPage, currentPage * bairrosPerPage);

              return (
                <div key={cidade} className="bg-gray-50 rounded-lg p-4">
                  {/* Cabeçalho da Cidade */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-2 border-b">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">{cidade}</h4>
                      <p className="text-sm text-gray-500">
                        {bairros.length} bairros | Total: {cidadeTotal} ({cidadePercentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>

                  {/* Tabela de Bairros */}
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[600px] px-4 sm:px-0">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Bairro</th>
                            <th className="text-right py-2">Total</th>
                            <th className="text-right py-2">% da Cidade</th>
                            <th className="text-right py-2">% Total</th>
                            <th className="px-4 py-2 w-1/3">Progresso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedBairros.map((bairro, index) => {
                            const percentageTotal = (bairro.total / stats.totalEleitores) * 100;
                            const percentageCidade = (bairro.total / cidadeTotal) * 100;

                            return (
                              <tr
                                key={`${bairro.cidade}-${bairro.bairro}`}
                                className={`border-b hover:bg-white transition-colors ${
                                  index === 0 ? 'bg-green-50/50' : ''
                                }`}
                              >
                                <td className="py-2">{bairro.bairro}</td>
                                <td className="text-right py-2">{bairro.total}</td>
                                <td className="text-right py-2">{percentageCidade.toFixed(1)}%</td>
                                <td className="text-right py-2">{percentageTotal.toFixed(1)}%</td>
                                <td className="px-4 py-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className={`h-2.5 rounded-full ${
                                        index === 0 ? 'bg-green-600' : 'bg-green-400'
                                      }`}
                                      style={{ width: `${percentageCidade}%` }}
                                    ></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <TablePagination
                        currentPage={currentPage}
                        totalItems={bairros.length}
                        itemsPerPage={bairrosPerPage}
                        onPageChange={(page) => handleBairroPageChange(cidade, page)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <TablePagination
              currentPage={bairroPage}
              totalItems={Object.keys(
                stats.porBairro.reduce((acc, curr) => {
                  if (!acc[curr.cidade]) {
                    acc[curr.cidade] = [];
                  }
                  acc[curr.cidade].push(curr);
                  return acc;
                }, {} as Record<string, typeof stats.porBairro>)
              ).length}
              itemsPerPage={itemsPerPage}
              onPageChange={setBairroPage}
            />
          </div>
        </Card>

        {/* Distribuição por Zona e Seção */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Distribuição por Zona e Seção</h3>
              <p className="text-sm text-gray-500">
                Total de zonas/seções: {stats.porZonaSecao.length}
              </p>
            </div>
            {stats.porZonaSecao.length > 0 && (
              <div className="text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded block text-center">
                  Maior: Zona {stats.porZonaSecao[0]?.zona} Seção {stats.porZonaSecao[0]?.secao} ({stats.porZonaSecao[0]?.total})
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Zona</th>
                  <th className="text-left py-2">Seção</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">%</th>
                  <th className="px-4 py-2">Distribuição</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(stats.porZonaSecao, zonaPage).map((item, index) => {
                  const percentage = (item.total / stats.totalEleitores) * 100;
                  return (
                    <tr key={`${item.zona}-${item.secao}`} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                      <td className="py-2">{item.zona}</td>
                      <td className="py-2">{item.secao}</td>
                      <td className="text-right py-2">{item.total}</td>
                      <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                      <td className="px-4 py-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              currentPage={zonaPage}
              totalItems={stats.porZonaSecao.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setZonaPage}
            />
          </div>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Cadastros por Usuário</h3>
              <p className="text-sm text-gray-500">Total de usuários ativos: {stats.porUsuario.length}</p>
            </div>
            <div className="text-sm w-full sm:w-auto">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded block text-center">
                Líder: {stats.porUsuario[0]?.usuario_nome} ({stats.porUsuario[0]?.total})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Usuário</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">%</th>
                    <th className="px-4 py-2 w-1/3">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(stats.porUsuario, usuarioPage).map(({ usuario_nome, total }, index) => {
                    const percentage = (total / stats.totalEleitores) * 100;
                    return (
                      <tr key={usuario_nome} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                        <td className="py-2">{usuario_nome}</td>
                        <td className="text-right py-2">{total}</td>
                        <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination
            currentPage={usuarioPage}
            totalItems={stats.porUsuario.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setUsuarioPage}
          />
        </Card>
      </div>
    </div>
  );
}
