import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VoterData {
  nome?: string | null;
  cpf?: string | null;
  titulo?: string | null;
  zona?: string | null;
  seçao?: string | null;
  whatsapp?: string | null;
  contato?: string | null;
  genero?: string | null;
  nascimento?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  nº?: string | null;
  indicação?: string | null;
}

export const generateVoterPDF = (voter: VoterData) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Ficha do Eleitor', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Data de Emissão: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 30, { align: 'center' });

  // Informações Pessoais
  doc.setFontSize(14);
  doc.text('Informações Pessoais', 20, 45);
  doc.setFontSize(12);
  doc.setDrawColor(0, 123, 255);
  doc.line(20, 47, 190, 47);

  const personalInfo = [
    ['Nome:', voter.nome || '-'],
    ['CPF:', voter.cpf || '-'],
    ['Gênero:', voter.genero || '-'],
    ['Data de Nascimento:', voter.nascimento ? format(new Date(voter.nascimento), 'dd/MM/yyyy') : '-'],
  ];

  (doc as any).autoTable({
    startY: 50,
    head: [],
    body: personalInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Informações Eleitorais
  doc.setFontSize(14);
  doc.text('Informações Eleitorais', 20, (doc as any).lastAutoTable.finalY + 15);
  doc.setFontSize(12);
  doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

  const electoralInfo = [
    ['Título de Eleitor:', voter.titulo || '-'],
    ['Zona:', voter.zona || '-'],
    ['Seção:', voter.seçao || '-'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [],
    body: electoralInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Contato
  doc.setFontSize(14);
  doc.text('Contato', 20, (doc as any).lastAutoTable.finalY + 15);
  doc.setFontSize(12);
  doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

  const contactInfo = [
    ['WhatsApp:', voter.whatsapp || '-'],
    ['Telefone:', voter.contato || '-'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [],
    body: contactInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Endereço
  doc.setFontSize(14);
  doc.text('Endereço', 20, (doc as any).lastAutoTable.finalY + 15);
  doc.setFontSize(12);
  doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

  const addressInfo = [
    ['CEP:', voter.cep || '-'],
    ['Logradouro:', `${voter.logradouro || '-'}, ${voter.nº || '-'}`],
    ['Bairro:', voter.bairro || '-'],
    ['Cidade:', voter.cidade || '-'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [],
    body: addressInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Indicação
  if (voter.indicação) {
    doc.setFontSize(14);
    doc.text('Indicação', 20, (doc as any).lastAutoTable.finalY + 15);
    doc.setFontSize(12);
    doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

    const indicationInfo = [['Indicado por:', voter.indicação]];

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [],
      body: indicationInfo,
      theme: 'plain',
      styles: { fontSize: 12, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 50 } },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`ficha-eleitor-${voter.nome?.toLowerCase().replace(/\s+/g, '-') || 'sem-nome'}.pdf`);
};