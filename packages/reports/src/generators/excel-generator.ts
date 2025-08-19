import ExcelJS from 'exceljs';
import { MovementWithRelations } from '@financial-bot/database';
import { formatCurrency, formatDate } from '@financial-bot/shared';
import { MovementFilters } from '../filters/movement-filters';

export interface ExcelReportOptions {
  companyName: string;
  filters: MovementFilters;
  movements: MovementWithRelations[];
  includeCharts?: boolean;
  groupByCategory?: boolean;
}

export class ExcelReportGenerator {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
    this.workbook.creator = 'Financial Bot';
  }

  async generateMovementsReport(options: ExcelReportOptions): Promise<Buffer> {
    const {
      companyName,
      movements,
      filters,
      includeCharts = true,
      groupByCategory = true,
    } = options;

    // Crear hoja de resumen
    await this.createSummarySheet(companyName, movements, filters);

    // Crear hoja de movimientos detallados
    await this.createMovementsSheet(movements);

    // Crear hoja por categorías si se solicita
    if (groupByCategory) {
      await this.createCategoriesSheet(movements);
    }

    // Crear hoja de gráficos si se solicita
    if (includeCharts) {
      await this.createChartsSheet(movements);
    }

    // Generar buffer
    return Buffer.from(await this.workbook.xlsx.writeBuffer());
  }

  private async createSummarySheet(
    companyName: string,
    movements: MovementWithRelations[],
    filters: MovementFilters,
  ) {
    const worksheet = this.workbook.addWorksheet('Resumen');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Concepto', key: 'concept', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
    ];

    // Título del reporte
    worksheet.mergeCells('A1:B1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Reporte de Movimientos - ${companyName}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Información del filtro
    worksheet.addRow([]);
    worksheet.addRow(['Período:', this.getFilterDescription(filters)]);
    worksheet.addRow(['Generado:', formatDate(new Date())]);
    worksheet.addRow([]);

    // Calcular totales
    const expenses = movements.filter(m => m.type === 'EXPENSE');
    const incomes = movements.filter(m => m.type === 'INCOME');

    const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);
    const balance = totalIncomes - totalExpenses;

    // Agregar datos de resumen
    worksheet.addRow(['RESUMEN GENERAL', '']);
    worksheet.addRow(['Total de Movimientos:', movements.length]);
    worksheet.addRow(['Total de Gastos:', formatCurrency(totalExpenses)]);
    worksheet.addRow(['Total de Ingresos:', formatCurrency(totalIncomes)]);
    worksheet.addRow(['Balance:', formatCurrency(balance)]);
    worksheet.addRow([]);

    // Resumen por usuario
    const userSummary = this.groupByUser(movements);
    worksheet.addRow(['RESUMEN POR USUARIO', '']);

    for (const [userName, userMovements] of Object.entries(userSummary)) {
      const userTotal = userMovements.reduce((sum, m) => sum + Number(m.amount), 0);
      worksheet.addRow([userName, formatCurrency(userTotal)]);
    }

    // Aplicar estilos
    this.applyHeaderStyles(worksheet);
  }

  private async createMovementsSheet(movements: MovementWithRelations[]) {
    const worksheet = this.workbook.addWorksheet('Movimientos Detallados');

    // Configurar columnas con formatos específicos
    worksheet.columns = [
      { header: 'Folio', key: 'folio', width: 15 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Tipo', key: 'type', width: 10 },
      { header: 'Monto', key: 'amount', width: 15 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Usuario', key: 'user', width: 20 },
      { header: 'Proveedor', key: 'vendor', width: 20 },
    ];

    // Agregar datos
    movements.forEach(movement => {
      const row = worksheet.addRow({
        folio: movement.folio,
        date: movement.date,
        type: movement.type === 'EXPENSE' ? 'Gasto' : 'Ingreso',
        amount: Number(movement.amount),
        description: movement.description,
        category: movement.category?.name || 'Sin categoría',
        user: `${movement.user.firstName} ${movement.user.lastName || ''}`.trim(),
        vendor: movement.vendorName || '',
      });

      // Formatear fecha
      row.getCell('date').numFmt = 'dd/mm/yyyy';

      // Formatear monto como moneda
      row.getCell('amount').numFmt = '"$"#,##0.00';

      // Color según tipo
      if (movement.type === 'EXPENSE') {
        row.getCell('amount').font = { color: { argb: 'FFFF0000' } }; // Rojo para gastos
      } else {
        row.getCell('amount').font = { color: { argb: 'FF00B050' } }; // Verde para ingresos
      }
    });

    // Aplicar estilos
    this.applyHeaderStyles(worksheet);
    this.applyBorders(worksheet, movements.length + 1);
  }

  private async createCategoriesSheet(movements: MovementWithRelations[]) {
    const worksheet = this.workbook.addWorksheet('Por Categorías');

    // Agrupar por categoría
    const categoryGroups = this.groupByCategory(movements);

    // Configurar columnas
    worksheet.columns = [
      { header: 'Categoría', key: 'category', width: 25 },
      { header: 'Cantidad', key: 'count', width: 12 },
      { header: 'Total Gastos', key: 'expenses', width: 15 },
      { header: 'Total Ingresos', key: 'incomes', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
    ];

    // Agregar datos
    for (const [categoryName, categoryMovements] of Object.entries(categoryGroups)) {
      const expenses = categoryMovements.filter(m => m.type === 'EXPENSE');
      const incomes = categoryMovements.filter(m => m.type === 'INCOME');

      const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
      const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);
      const balance = totalIncomes - totalExpenses;

      const row = worksheet.addRow({
        category: categoryName,
        count: categoryMovements.length,
        expenses: totalExpenses,
        incomes: totalIncomes,
        balance: balance,
      });

      // Formatear monedas
      row.getCell('expenses').numFmt = '"$"#,##0.00';
      row.getCell('incomes').numFmt = '"$"#,##0.00';
      row.getCell('balance').numFmt = '"$"#,##0.00';

      // Color del balance
      if (balance < 0) {
        row.getCell('balance').font = { color: { argb: 'FFFF0000' } };
      } else {
        row.getCell('balance').font = { color: { argb: 'FF00B050' } };
      }
    }

    this.applyHeaderStyles(worksheet);
    this.applyBorders(worksheet, Object.keys(categoryGroups).length + 1);
  }

  private async createChartsSheet(movements: MovementWithRelations[]) {
    const worksheet = this.workbook.addWorksheet('Gráficos');

    // Datos para gráfico de categorías
    const categoryData = this.groupByCategory(movements);

    // Crear tabla de datos para el gráfico
    worksheet.addRow(['Categoría', 'Total']);

    const chartData: [string, number][] = [];
    for (const [categoryName, categoryMovements] of Object.entries(categoryData)) {
      const total = categoryMovements.reduce((sum, m) => sum + Number(m.amount), 0);
      worksheet.addRow([categoryName, total]);
      chartData.push([categoryName, total]);
    }

    // Nota: ExcelJS tiene soporte limitado para gráficos
    // En una implementación completa, se podrían usar librerías adicionales
    worksheet.addRow([]);
    worksheet.addRow(['Nota: Los gráficos se pueden generar en una versión futura']);
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

  private groupByUser(movements: MovementWithRelations[]): Record<string, MovementWithRelations[]> {
    return movements.reduce(
      (groups, movement) => {
        const userName = `${movement.user.firstName} ${movement.user.lastName || ''}`.trim();
        if (!groups[userName]) {
          groups[userName] = [];
        }
        groups[userName].push(movement);
        return groups;
      },
      {} as Record<string, MovementWithRelations[]>,
    );
  }

  private groupByCategory(
    movements: MovementWithRelations[],
  ): Record<string, MovementWithRelations[]> {
    return movements.reduce(
      (groups, movement) => {
        const categoryName = movement.category?.name || 'Sin categoría';
        if (!groups[categoryName]) {
          groups[categoryName] = [];
        }
        groups[categoryName].push(movement);
        return groups;
      },
      {} as Record<string, MovementWithRelations[]>,
    );
  }

  private applyHeaderStyles(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' },
    };
    headerRow.alignment = { horizontal: 'center' };
  }

  private applyBorders(worksheet: ExcelJS.Worksheet, rowCount: number) {
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= rowCount) {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });
  }
}
