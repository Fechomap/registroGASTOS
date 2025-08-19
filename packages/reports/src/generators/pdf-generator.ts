import PDFDocument from 'pdfkit';
import { MovementWithRelations, PersonalMovementWithRelations } from '@financial-bot/database';
import { formatCurrency, formatDate } from '@financial-bot/shared';
import { MovementFilters } from '../filters/movement-filters';

export interface PDFReportOptions {
  companyName: string;
  filters: MovementFilters;
  movements: (MovementWithRelations | PersonalMovementWithRelations)[];
  includeDetails?: boolean;
  groupByCategory?: boolean;
}

export class PDFReportGenerator {
  private doc: PDFKit.PDFDocument;
  private pageMargin = 50;
  private currentY = 0;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.pageMargin,
    });
    this.currentY = this.pageMargin;
  }

  async generateMovementsReport(options: PDFReportOptions): Promise<Buffer> {
    const {
      companyName,
      movements,
      filters,
      includeDetails = true,
      groupByCategory = true,
    } = options;

    // Encabezado del reporte
    this.addHeader(companyName, filters);

    // Resumen general
    this.addSummary(movements);

    // Resumen por categorías
    if (groupByCategory) {
      this.addCategorySummary(movements);
    }

    // Detalles de movimientos
    if (includeDetails) {
      this.addMovementDetails(movements);
    }

    // Pie de página
    this.addFooter();

    this.doc.end();

    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      this.doc.on('error', reject);
    });
  }

  private addHeader(companyName: string, filters: MovementFilters) {
    // Logo/Título principal
    this.doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('REPORTE DE MOVIMIENTOS FINANCIEROS', this.pageMargin, this.currentY, {
        align: 'center',
      });

    this.currentY += 40;

    // Información de la empresa
    this.doc.fontSize(16).text(companyName, this.pageMargin, this.currentY, {
      align: 'center',
    });

    this.currentY += 30;

    // Información del filtro
    this.doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Período: ${this.getFilterDescription(filters)}`, this.pageMargin, this.currentY);

    this.currentY += 15;

    this.doc.text(`Generado: ${formatDate(new Date())}`, this.pageMargin, this.currentY);

    this.currentY += 30;

    // Línea separadora
    this.doc
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(this.doc.page.width - this.pageMargin, this.currentY)
      .stroke();

    this.currentY += 20;
  }

  private addSummary(movements: (MovementWithRelations | PersonalMovementWithRelations)[]) {
    // Título de la sección
    this.doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('RESUMEN GENERAL', this.pageMargin, this.currentY);

    this.currentY += 25;

    // Calcular totales
    const expenses = movements.filter(m => m.type === 'EXPENSE');
    const incomes = movements.filter(m => m.type === 'INCOME');

    const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);
    const balance = totalIncomes - totalExpenses;

    // Crear tabla de resumen
    const summaryData = [
      ['Total de Movimientos:', movements.length.toString()],
      ['Total de Gastos:', formatCurrency(totalExpenses)],
      ['Total de Ingresos:', formatCurrency(totalIncomes)],
      ['Balance:', formatCurrency(balance)],
    ];

    this.addTable(summaryData, ['Concepto', 'Valor'], [300, 150]);
    this.currentY += 30;
  }

  private addCategorySummary(movements: (MovementWithRelations | PersonalMovementWithRelations)[]) {
    if (this.currentY > 700) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    // Título de la sección
    this.doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('RESUMEN POR CATEGORÍAS', this.pageMargin, this.currentY);

    this.currentY += 25;

    // Agrupar por categoría
    const categoryGroups = this.groupByCategory(movements);

    const categoryData: string[][] = [];

    for (const [categoryName, categoryMovements] of Object.entries(categoryGroups)) {
      const expenses = categoryMovements.filter(m => m.type === 'EXPENSE');
      const incomes = categoryMovements.filter(m => m.type === 'INCOME');

      const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
      const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);
      const balance = totalIncomes - totalExpenses;

      categoryData.push([
        categoryName,
        categoryMovements.length.toString(),
        formatCurrency(totalExpenses),
        formatCurrency(totalIncomes),
        formatCurrency(balance),
      ]);
    }

    if (categoryData.length > 0) {
      this.addTable(
        categoryData,
        ['Categoría', 'Cant.', 'Gastos', 'Ingresos', 'Balance'],
        [150, 50, 90, 90, 90],
      );
    }

    this.currentY += 30;
  }

  private addMovementDetails(movements: (MovementWithRelations | PersonalMovementWithRelations)[]) {
    if (this.currentY > 600) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    // Título de la sección
    this.doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('DETALLE DE MOVIMIENTOS', this.pageMargin, this.currentY);

    this.currentY += 25;

    // Preparar datos de la tabla
    const movementData: string[][] = [];

    movements.slice(0, 50).forEach(movement => {
      // Limitar a 50 para evitar páginas muy largas
      movementData.push([
        movement.folio,
        formatDate(movement.date, 'short'),
        movement.type === 'EXPENSE' ? 'Gasto' : 'Ingreso',
        formatCurrency(Number(movement.amount)),
        movement.description.length > 30
          ? movement.description.substring(0, 27) + '...'
          : movement.description,
        `${movement.user.firstName} ${movement.user.lastName || ''}`.trim(),
      ]);
    });

    if (movementData.length > 0) {
      this.addTable(
        movementData,
        ['Folio', 'Fecha', 'Tipo', 'Monto', 'Descripción', 'Usuario'],
        [80, 60, 50, 80, 120, 80],
      );
    }

    if (movements.length > 50) {
      this.currentY += 15;
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          `* Mostrando los primeros 50 de ${movements.length} movimientos`,
          this.pageMargin,
          this.currentY,
        );
    }
  }

  private addTable(data: string[][], headers: string[], columnWidths: number[]) {
    const startX = this.pageMargin;
    const rowHeight = 20;
    const headerHeight = 25;

    // Verificar si hay espacio suficiente
    const neededHeight = (data.length + 1) * rowHeight + headerHeight;
    if (this.currentY + neededHeight > this.doc.page.height - this.pageMargin) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    // Dibujar encabezados
    this.doc.font('Helvetica-Bold').fontSize(10);

    let currentX = startX;
    headers.forEach((header, i) => {
      this.doc
        .rect(currentX, this.currentY, columnWidths[i], headerHeight)
        .fillAndStroke('#e0e0e0', '#000000')
        .fillColor('#000000')
        .text(header, currentX + 5, this.currentY + 7, {
          width: columnWidths[i] - 10,
          align: 'center',
        });
      currentX += columnWidths[i];
    });

    this.currentY += headerHeight;

    // Dibujar filas de datos
    this.doc.font('Helvetica').fontSize(9);

    data.forEach((row, rowIndex) => {
      const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f5f5f5';
      currentX = startX;

      row.forEach((cell, cellIndex) => {
        this.doc
          .rect(currentX, this.currentY, columnWidths[cellIndex], rowHeight)
          .fillAndStroke(fillColor, '#cccccc')
          .fillColor('#000000')
          .text(cell, currentX + 5, this.currentY + 5, {
            width: columnWidths[cellIndex] - 10,
            height: rowHeight - 10,
            ellipsis: true,
          });
        currentX += columnWidths[cellIndex];
      });

      this.currentY += rowHeight;
    });
  }

  private addFooter() {
    const footerY = this.doc.page.height - this.pageMargin - 20;

    this.doc
      .font('Helvetica')
      .fontSize(8)
      .text('Generado por Financial Bot', this.pageMargin, footerY)
      .text(`Página ${this.doc.bufferedPageRange().start + 1}`, this.doc.page.width - 100, footerY);
  }

  private getFilterDescription(filters: MovementFilters): string {
    const parts: string[] = [];

    if (filters.dateFrom && filters.dateTo) {
      parts.push(`${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`);
    }

    if (filters.type) {
      parts.push(`Tipo: ${filters.type === 'EXPENSE' ? 'Gastos' : 'Ingresos'}`);
    }

    if (filters.userId) {
      parts.push('Usuario específico');
    }

    return parts.length > 0 ? parts.join(', ') : 'Todos los movimientos';
  }

  private groupByCategory(
    movements: (MovementWithRelations | PersonalMovementWithRelations)[],
  ): Record<string, (MovementWithRelations | PersonalMovementWithRelations)[]> {
    return movements.reduce(
      (groups, movement) => {
        const categoryName = movement.category?.name || 'Sin categoría';
        if (!groups[categoryName]) {
          groups[categoryName] = [];
        }
        groups[categoryName].push(movement);
        return groups;
      },
      {} as Record<string, (MovementWithRelations | PersonalMovementWithRelations)[]>,
    );
  }
}
