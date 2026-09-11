// Export utilities for Excel (SheetJS) and PDF (jsPDF)
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';
export { generateMonthlyReportPDF } from './pdfReportGenerator';

export const exportToExcel = (data = [], filename = 'reporte.xlsx', sheetName = 'Datos') => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

export const exportTableToPDF = ({
  title = 'Reporte',
  subtitle = '',
  headers = [],
  data = [],
  filename = 'reporte.pdf',
  businessInfo = null,
}) => {
  try {
    const doc = new jsPDF();
    const storeName = businessInfo?.businessName || businessInfo?.name || 'Tienda de Ropa - Sistema de Gestión';
    const storeAddress = businessInfo?.address || '';
    const storePhone = businessInfo?.phone || '';

    // Header styling
    doc.setFontSize(18);
    doc.setTextColor(20, 24, 33);
    doc.text(storeName, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    if (storeAddress || storePhone) {
      doc.text(`${storeAddress} ${storePhone ? '| Tel: ' + storePhone : ''}`, 14, 24);
    }

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 34);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 14, 40);
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado: ${formatDate(new Date(), 'full')}`, 140, 18);

    autoTable(doc, {
      startY: subtitle ? 45 : 38,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 38, left: 14, right: 14 },
    });

    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
