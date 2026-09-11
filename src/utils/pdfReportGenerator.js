import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Generates an executive Monthly PDF Report combining Cash Flow (Income vs Expenses)
 * and Critical Stock Audit (Out of Stock / Below Min).
 */
export function generateMonthlyReportPDF({
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
  cashMovements = [],
  products = [],
  stockMovements = [],
  businessInfo = null,
  userName = 'Administrador',
  reportType = 'FULL', // 'FULL' | 'CASH_ONLY' | 'STOCK_ONLY'
}) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const monthName = MONTH_NAMES[month] || `Mes ${month + 1}`;
    const periodTitle = `${monthName.toUpperCase()} ${year}`;

    // Store / Business info
    const storeName = businessInfo?.businessName || businessInfo?.name || 'TIENDA DE ROPA - GESTIÓN COMERCIAL';
    const storeAddress = businessInfo?.address || '';
    const storePhone = businessInfo?.phone || '';
    const storeCuit = businessInfo?.cuit ? `CUIT: ${businessInfo.cuit}` : '';
    const storeEmail = businessInfo?.email || '';

    // ==========================================
    // 1. FILTER CASH MOVEMENTS BY MONTH & YEAR
    // ==========================================
    const monthlyCash = (cashMovements || []).filter((m) => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    // Calculate Incomes vs Expenses
    let totalIncome = 0;
    let totalExpense = 0;
    const paymentMethodsSummary = {
      EFECTIVO: 0,
      TRANSFERENCIA: 0,
      MERCADO_PAGO: 0,
      DEBITO: 0,
      CREDITO: 0,
      OTROS: 0,
    };

    monthlyCash.forEach((m) => {
      const amount = Number(m.amount) || 0;
      const type = (m.type || '').toUpperCase();
      const isIncome = ['INGRESO', 'VENTA', 'APERTURA_CAJA'].includes(type);
      const isExpense = ['EGRESO', 'RETIRO', 'GASTO', 'COMPRA', 'DEVOLUCION'].includes(type);

      if (isIncome) {
        totalIncome += amount;
        const method = (m.paymentMethod || 'EFECTIVO').toUpperCase();
        if (paymentMethodsSummary[method] !== undefined) {
          paymentMethodsSummary[method] += amount;
        } else if (method.includes('TRANS') || method.includes('MP')) {
          paymentMethodsSummary.TRANSFERENCIA += amount;
        } else {
          paymentMethodsSummary.OTROS += amount;
        }
      } else if (isExpense) {
        totalExpense += amount;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // ==========================================
    // 2. IDENTIFY CRITICAL STOCK ITEMS
    // ==========================================
    const criticalItems = (products || []).filter((p) => {
      const stock = Number(p.stock) || 0;
      const stockMin = Number(p.stockMin !== undefined && p.stockMin !== null ? p.stockMin : 5);
      return stock <= stockMin;
    }).map((p) => {
      const stock = Number(p.stock) || 0;
      const stockMin = Number(p.stockMin !== undefined && p.stockMin !== null ? p.stockMin : 5);
      const isOutOfStock = stock === 0;
      const deficit = Math.max(0, stockMin - stock);
      const costPrice = Number(p.costPrice) || 0;
      const estimatedRestockCost = deficit * costPrice;

      // Extract critical variants
      const criticalVariants = (p.variants || [])
        .filter((v) => (Number(v.stock) || 0) <= 1)
        .map((v) => `${v.size || ''}${v.color ? `/${v.color}` : ''} (${v.stock || 0})`)
        .slice(0, 3)
        .join(', ');

      return {
        ...p,
        currentStock: stock,
        stockMin,
        isOutOfStock,
        deficit,
        costPrice,
        estimatedRestockCost,
        criticalVariantsSummary: criticalVariants || 'Todas',
      };
    });

    // Sort critical items: Out of stock first, then lowest stock
    criticalItems.sort((a, b) => {
      if (a.currentStock !== b.currentStock) return a.currentStock - b.currentStock;
      return b.deficit - a.deficit;
    });

    const outOfStockCount = criticalItems.filter((p) => p.currentStock === 0).length;
    const lowStockCount = criticalItems.filter((p) => p.currentStock > 0).length;
    const totalRestockCost = criticalItems.reduce((acc, p) => acc + p.estimatedRestockCost, 0);

    // ==========================================
    // 3. HEADER DRAWING FUNCTION
    // ==========================================
    const drawHeader = (docInstance) => {
      // Top accent bar
      docInstance.setFillColor(17, 24, 39); // Deep dark slate (#111827)
      docInstance.rect(0, 0, pageWidth, 6, 'F');

      // Brand / Store Name
      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(16);
      docInstance.setTextColor(17, 24, 39);
      docInstance.text(storeName.toUpperCase(), 14, 16);

      // Business subtitle / fiscal info
      docInstance.setFont('helvetica', 'normal');
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(100, 116, 139);
      const contactParts = [storeAddress, storePhone, storeCuit, storeEmail].filter(Boolean);
      docInstance.text(contactParts.join('  •  ') || 'Sistema de Gestion de Indumentaria y Calzado', 14, 21);

      // Report Title Box
      docInstance.setFillColor(248, 250, 252);
      docInstance.setDrawColor(226, 232, 240);
      docInstance.roundedRect(14, 25, pageWidth - 28, 14, 2, 2, 'FD');

      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(11);
      docInstance.setTextColor(15, 23, 42);
      let titleLabel = 'INFORME MENSUAL DE CAJA Y STOCK CRITICO';
      if (reportType === 'CASH_ONLY') titleLabel = 'INFORME MENSUAL DE MOVIMIENTOS DE CAJA (INGRESOS VS EGRESOS)';
      if (reportType === 'STOCK_ONLY') titleLabel = 'AUDITORIA MENSUAL DE STOCK CRITICO Y REPOSICION';
      docInstance.text(titleLabel, 18, 32);

      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(9);
      docInstance.setTextColor(79, 70, 229); // Indigo accent
      docInstance.text(`PERIODO: ${periodTitle}`, 18, 36.5);

      // Emission info on right
      docInstance.setFont('helvetica', 'normal');
      docInstance.setFontSize(7.5);
      docInstance.setTextColor(100, 116, 139);
      const nowStr = formatDate(new Date(), 'full');
      docInstance.text(`Emision: ${nowStr}`, pageWidth - 18, 31, { align: 'right' });
      docInstance.text(`Operador: ${userName}`, pageWidth - 18, 36, { align: 'right' });
    };

    drawHeader(doc);
    let currentY = 44;

    // ==========================================
    // 4. EXECUTIVE METRICS SUMMARY TABLE
    // ==========================================
    const kpiHeaders = ['INDICADOR CLAVE DEL PERIODO', 'VALOR REGISTRADO', 'ESTADO / OBSERVACION'];
    const kpiRows = [
      [
        'Total Ingresos de Caja (Ventas y Entradas)',
        formatCurrency(totalIncome),
        `${monthlyCash.filter((m) => ['INGRESO', 'VENTA', 'APERTURA_CAJA'].includes(m.type)).length} operaciones registradas`,
      ],
      [
        'Total Egresos de Caja (Gastos y Salidas)',
        formatCurrency(totalExpense),
        `${monthlyCash.filter((m) => ['EGRESO', 'RETIRO', 'GASTO', 'COMPRA'].includes(m.type)).length} egresos contabilizados`,
      ],
      [
        'Balance Financiero Neto Mensual',
        formatCurrency(netBalance),
        netBalance >= 0 ? 'SUPERAVIT POSITIVO' : 'DEFICIT MENSUAL (Egresos mayores a ingresos)',
      ],
      [
        'Prendas en Stock Critico / Alerta',
        `${criticalItems.length} articulos (${outOfStockCount} agotados / ${lowStockCount} bajo minimo)`,
        criticalItems.length > 0 ? 'REQUIERE REPOSICION INMEDIATA' : 'Nivel de inventario saludable',
      ],
      [
        'Presupuesto Estimado de Reposicion',
        formatCurrency(totalRestockCost),
        'Costo estimado para reponer prendas al stock minimo',
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [kpiHeaders],
      body: kpiRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { fontStyle: 'bold', halign: 'right', cellWidth: 45 },
        2: { fontStyle: 'normal', textColor: [100, 116, 139] },
      },
      didParseCell: function (data) {
        // Highlight Net Balance row
        if (data.row.index === 2 && data.section === 'body') {
          if (data.column.index === 1) {
            data.cell.styles.textColor = netBalance >= 0 ? [16, 185, 129] : [225, 29, 72];
          }
        }
        // Highlight Critical Stock row
        if (data.row.index === 3 && data.section === 'body') {
          if (data.column.index === 2 && criticalItems.length > 0) {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = doc.lastAutoTable.finalY + 7;

    // ==========================================
    // 5. SECTION: MOVIMIENTOS DE CAJA (INGRESOS VS EGRESOS)
    // ==========================================
    if (reportType === 'FULL' || reportType === 'CASH_ONLY') {
      // Check space, add page if needed
      if (currentY > pageHeight - 50) {
        doc.addPage();
        drawHeader(doc);
        currentY = 44;
      }

      // Section Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`1. DETALLE DE MOVIMIENTOS DE CAJA (${monthlyCash.length} REGISTROS)`, 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Desglose cronologico de ingresos y egresos registrados durante el mes de ${monthName} ${year}.`,
        14,
        currentY + 4
      );

      currentY += 6.5;

      const cashTableHeaders = ['Fecha / Hora', 'Tipo', 'Categoria', 'Detalle / Concepto', 'Medio Pago', 'Monto'];

      const cashTableRows = monthlyCash.length > 0
        ? monthlyCash.map((m) => {
            const isIncome = ['INGRESO', 'VENTA', 'APERTURA_CAJA'].includes((m.type || '').toUpperCase());
            const prefix = isIncome ? '+' : '-';
            const formattedAmount = `${prefix} ${formatCurrency(m.amount)}`;

            return [
              formatDate(m.date, 'full'),
              (m.type || '-').toUpperCase(),
              m.category || (isIncome ? 'Venta Mostrador' : 'Gasto General'),
              m.description || '-',
              (m.paymentMethod || 'Efectivo').toUpperCase(),
              formattedAmount,
            ];
          })
        : [['-', 'SIN REGISTROS', '-', 'No se registraron movimientos en este mes', '-', '$ 0.00']];

      // Total summary footer row
      const cashFoot = [
        [
          'TOTALES DEL MES',
          `Ingresos: ${formatCurrency(totalIncome)}`,
          `Egresos: ${formatCurrency(totalExpense)}`,
          `Movimientos: ${monthlyCash.length}`,
          'SALDO NETO:',
          formatCurrency(netBalance),
        ],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [cashTableHeaders],
        body: cashTableRows,
        foot: cashFoot,
        theme: 'striped',
        headStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85],
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 20, fontStyle: 'bold' },
          2: { cellWidth: 25 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 25 },
          5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 5) {
            const cellText = String(data.cell.raw || '');
            if (cellText.startsWith('+')) {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald
            } else if (cellText.startsWith('-')) {
              data.cell.styles.textColor = [225, 29, 72]; // Rose
            }
          }
          if (data.section === 'foot' && data.column.index === 5) {
            data.cell.styles.textColor = netBalance >= 0 ? [16, 185, 129] : [225, 29, 72];
            data.cell.styles.fontSize = 8.5;
          }
        },
        margin: { left: 14, right: 14 },
      });

      currentY = doc.lastAutoTable.finalY + 9;
    }

    // ==========================================
    // 6. SECTION: STOCK CRÍTICO POR MES
    // ==========================================
    if (reportType === 'FULL' || reportType === 'STOCK_ONLY') {
      // Check space, start on new page if less than 65mm left
      if (currentY > pageHeight - 65) {
        doc.addPage();
        drawHeader(doc);
        currentY = 44;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const sectionNum = reportType === 'FULL' ? '2' : '1';
      doc.text(`${sectionNum}. AUDITORIA DE STOCK CRITICO Y CONTROL DE QUIEBRES`, 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Prendas cuyo inventario actual es menor o igual al umbral minimo de seguridad al cierre de ${monthName} ${year}.`,
        14,
        currentY + 4
      );

      currentY += 6.5;

      const stockHeaders = [
        'SKU / Cod.',
        'Prenda / Descripcion',
        'Categoria',
        'Talles Afectados',
        'Actual',
        'Min.',
        'Estado',
        'Faltante',
        'Inversion Rep.',
      ];

      const stockRows = criticalItems.length > 0
        ? criticalItems.map((p) => {
            const statusLabel = p.currentStock === 0 ? 'AGOTADO' : 'BAJO STOCK';
            return [
              p.sku || '-',
              p.name || 'Sin nombre',
              p.categoryName || '-',
              p.criticalVariantsSummary,
              String(p.currentStock),
              String(p.stockMin),
              statusLabel,
              `${p.deficit} u.`,
              formatCurrency(p.estimatedRestockCost),
            ];
          })
        : [
            [
              '-',
              'TODAS LAS PRENDAS CON STOCK ADECUADO',
              '-',
              '-',
              '-',
              '-',
              'OPTIMO',
              '0 u.',
              '$ 0.00',
            ],
          ];

      const stockFoot = [
        [
          'TOTALES DE AUDITORIA',
          `${criticalItems.length} prendas en alerta`,
          '',
          `${outOfStockCount} agotados | ${lowStockCount} bajos`,
          '',
          '',
          'INVERSION REQUERIDA:',
          `${criticalItems.reduce((acc, p) => acc + p.deficit, 0)} u.`,
          formatCurrency(totalRestockCost),
        ],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [stockHeaders],
        body: stockRows,
        foot: stockFoot,
        theme: 'striped',
        headStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7.2,
          textColor: [51, 65, 85],
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 22 },
          3: { cellWidth: 26 },
          4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 19, halign: 'center', fontStyle: 'bold' },
          7: { cellWidth: 15, halign: 'center' },
          8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 6) {
            const status = String(data.cell.raw || '');
            if (status === 'AGOTADO') {
              data.cell.styles.textColor = [225, 29, 72]; // Red
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'BAJO STOCK') {
              data.cell.styles.textColor = [217, 119, 6]; // Amber
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.section === 'body' && data.column.index === 4) {
            if (Number(data.cell.raw) === 0) {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
          if (data.section === 'foot' && data.column.index === 8) {
            data.cell.styles.textColor = [15, 23, 42];
            data.cell.styles.fontSize = 8.5;
          }
        },
        margin: { left: 14, right: 14 },
      });

      currentY = doc.lastAutoTable.finalY + 12;
    }

    // ==========================================
    // 7. SIGNATURE BLOCK & FINAL COMPLIANCE
    // ==========================================
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 30;
    }

    const signY = Math.max(currentY + 10, pageHeight - 32);
    const colWidth = 60;
    const leftSignX = 25;
    const rightSignX = pageWidth - 25 - colWidth;

    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.4);

    // Left signature line
    doc.line(leftSignX, signY, leftSignX + colWidth, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Firma Responsable de Caja', leftSignX + colWidth / 2, signY + 4, { align: 'center' });
    doc.text(`Aclaracion: ${userName}`, leftSignX + colWidth / 2, signY + 7.5, { align: 'center' });

    // Right signature line
    doc.line(rightSignX, signY, rightSignX + colWidth, signY);
    doc.text('Firma Gerencia / Auditoria', rightSignX + colWidth / 2, signY + 4, { align: 'center' });
    doc.text('Supervision Comercial', rightSignX + colWidth / 2, signY + 7.5, { align: 'center' });

    // ==========================================
    // 8. MULTIPAGE FOOTER WITH PAGE NUMBERS
    // ==========================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      // Top line above footer
      doc.setDrawColor(241, 245, 249);
      doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

      // Left footer text
      doc.text(
        `${storeName}  |  Informe Mensual de Caja y Stock Crítico  |  ${periodTitle}`,
        14,
        pageHeight - 6
      );

      // Right page number
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    }

    // Save File
    const sanitizedStore = (storeName || 'Tienda').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Reporte_${sanitizedStore}_${monthName}_${year}_${reportType}.pdf`;
    doc.save(filename);

    return {
      success: true,
      filename,
      totalIncome,
      totalExpense,
      netBalance,
      criticalCount: criticalItems.length,
      outOfStockCount,
      totalRestockCost,
    };
  } catch (error) {
    console.error('Error in generateMonthlyReportPDF:', error);
    throw error;
  }
}
