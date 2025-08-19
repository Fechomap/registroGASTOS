import {
  movementRepository,
  personalMovementRepository,
  MovementWithRelations,
  PersonalMovementWithRelations,
  MovementType,
} from '@financial-bot/database';
import {
  MovementFilterBuilder,
  MovementFilters,
  ExcelReportGenerator,
  PDFReportGenerator,
  ExcelReportOptions,
  PDFReportOptions,
} from '@financial-bot/reports';
import { InlineKeyboard } from 'grammy';

export interface ReportFilters {
  period: 'today' | 'week' | 'month' | 'custom';
  categoryId?: string;
  categoryName?: string;
  userId?: string;
  userName?: string;
  type: 'EXPENSE' | 'INCOME' | 'ALL';
  scope: 'COMPANY' | 'PERSONAL' | 'ALL'; // Para admins
}

export interface ReportSummary {
  totalMovements: number;
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  appliedFilters: ReportFilters;
}

export class ReportsService {
  /**
   * Crear filtros por defecto
   */
  createDefaultFilters(): ReportFilters {
    return {
      period: 'month',
      type: 'ALL',
      scope: 'ALL',
    };
  }

  /**
   * Obtener resumen con filtros aplicados
   */
  async getReportSummary(
    companyId: string,
    userId: string,
    userRole: 'ADMIN' | 'OPERATOR',
    filters: ReportFilters,
  ): Promise<ReportSummary> {
    // Usar el MovementFilterBuilder existente
    const filterBuilder = new MovementFilterBuilder(companyId);

    // Aplicar filtros de fecha según período
    switch (filters.period) {
      case 'today':
        filterBuilder.today();
        break;
      case 'week':
        filterBuilder.thisWeek();
        break;
      case 'month':
        filterBuilder.thisMonth();
        break;
    }

    // Aplicar otros filtros
    if (filters.categoryId) {
      filterBuilder.byCategory(filters.categoryId);
    }

    if (filters.userId) {
      filterBuilder.byUser(filters.userId);
    }

    if (filters.type !== 'ALL') {
      filterBuilder.byType(filters.type as MovementType);
    }

    const dbFilters = filterBuilder.build();

    // Obtener movimientos según el role y scope
    let allMovements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];

    if (userRole === 'ADMIN') {
      if (filters.scope === 'COMPANY' || filters.scope === 'ALL') {
        const companyMovements = await movementRepository.findMany(dbFilters);
        allMovements = [...allMovements, ...companyMovements];
      }

      if (filters.scope === 'PERSONAL' || filters.scope === 'ALL') {
        // Para movimientos personales, usar los filtros adaptados
        const personalFilters = {
          dateFrom: dbFilters.dateFrom,
          dateTo: dbFilters.dateTo,
          type: dbFilters.type,
          categoryId: dbFilters.categoryId,
        };
        const personalMovements = await personalMovementRepository.findByUser(
          userId,
          personalFilters,
        );
        allMovements = [...allMovements, ...personalMovements];
      }
    } else {
      // Operadores solo ven sus movimientos personales
      const personalFilters = {
        dateFrom: dbFilters.dateFrom,
        dateTo: dbFilters.dateTo,
        type: dbFilters.type,
        categoryId: dbFilters.categoryId,
      };
      const personalMovements = await personalMovementRepository.findByUser(
        userId,
        personalFilters,
      );
      allMovements = personalMovements;
    }

    // Calcular totales
    const expenses = allMovements.filter(m => m.type === 'EXPENSE');
    const incomes = allMovements.filter(m => m.type === 'INCOME');

    const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);
    const balance = totalIncomes - totalExpenses;

    return {
      totalMovements: allMovements.length,
      totalExpenses,
      totalIncomes,
      balance,
      appliedFilters: filters,
    };
  }

  /**
   * Crear teclado del panel de reportes
   */
  createReportsKeyboard(filters: ReportFilters, userRole: 'ADMIN' | 'OPERATOR'): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Fila 1: Período
    keyboard
      .text(`📅 ${this.getPeriodLabel(filters.period)}`, 'reports_filter_period')
      .text(`💰 ${this.getTypeLabel(filters.type)}`, 'reports_filter_type')
      .row();

    // Fila 2: Categoría
    keyboard.text(`📁 ${filters.categoryName || 'Todas'}`, 'reports_filter_category');

    if (userRole === 'ADMIN') {
      keyboard.text(`👤 ${filters.userName || 'Todos'}`, 'reports_filter_user');
    }
    keyboard.row();

    // Fila 3: Scope (solo para admins)
    if (userRole === 'ADMIN') {
      keyboard.text(`🏢 ${this.getScopeLabel(filters.scope)}`, 'reports_filter_scope').row();
    }

    // Fila 4: Generar reporte completo
    keyboard.text('📊 Generar Reporte de Movimientos', 'reports_generate').row();

    // Fila 5: Limpiar filtros y volver
    keyboard
      .text('🔄 Limpiar Filtros', 'reports_clear_filters')
      .text('◀️ Menú Principal', 'main_menu')
      .row();

    return keyboard;
  }

  /**
   * Crear teclado de selección de categorías
   */
  createCategorySelectionKeyboard(
    categories: Array<{ id: string; name: string; icon?: string }>,
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Opción "Todas las categorías"
    keyboard.text('📁 Todas las Categorías', 'reports_category_all').row();

    // Categorías disponibles (máximo 8 por simplicidad)
    categories.slice(0, 8).forEach((category, index) => {
      const icon = category.icon || '📁';
      keyboard.text(`${icon} ${category.name}`, `reports_category_${category.id}`);

      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });

    if (categories.length % 2 !== 0) {
      keyboard.row();
    }

    // Botón volver
    keyboard.text('◀️ Volver al Panel', 'reports_show_panel').row();

    return keyboard;
  }

  /**
   * Crear teclado de selección de usuarios
   */
  createUserSelectionKeyboard(
    users: Array<{ id: string; firstName: string; lastName?: string }>,
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Opción "Todos los usuarios"
    keyboard.text('👥 Todos los Usuarios', 'reports_user_all').row();

    // Usuarios disponibles (máximo 8)
    users.slice(0, 8).forEach((user, index) => {
      const userName = `${user.firstName} ${user.lastName || ''}`.trim();
      keyboard.text(`👤 ${userName}`, `reports_user_${user.id}`);

      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });

    if (users.length % 2 !== 0) {
      keyboard.row();
    }

    // Botón volver
    keyboard.text('◀️ Volver al Panel', 'reports_show_panel').row();

    return keyboard;
  }

  /**
   * Formatear mensaje del panel de reportes
   */
  formatReportsMessage(
    summary: ReportSummary,
    companyName: string,
    userRole: 'ADMIN' | 'OPERATOR',
    userName: string,
  ): string {
    let message = `📊 **Panel de Reportes - ${companyName}**\n\n`;

    if (userRole === 'ADMIN') {
      message += `👑 **Admin:** ${userName}\n\n`;
    } else {
      message += `👤 **Usuario:** ${userName}\n\n`;
    }

    // Filtros aplicados
    message += `🔍 **Filtros Aplicados:**\n`;
    message += `📅 Período: ${this.getPeriodLabel(summary.appliedFilters.period)}\n`;

    if (summary.appliedFilters.categoryName) {
      message += `📁 Categoría: ${summary.appliedFilters.categoryName}\n`;
    }

    if (summary.appliedFilters.userName) {
      message += `👤 Usuario: ${summary.appliedFilters.userName}\n`;
    }

    message += `💰 Tipo: ${this.getTypeLabel(summary.appliedFilters.type)}\n`;

    if (userRole === 'ADMIN') {
      message += `🏢 Alcance: ${this.getScopeLabel(summary.appliedFilters.scope)}\n`;
    }

    message += `\n📈 **Resumen:**\n`;
    message += `• Total movimientos: ${summary.totalMovements.toLocaleString('es-MX')}\n`;
    message += `• Gastos: $${summary.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Ingresos: $${summary.totalIncomes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Balance: $${summary.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n`;

    message += `💡 **Instrucciones:**\n`;
    message += `• Ajusta los filtros usando los botones\n`;
    message += `• El resumen se actualiza automáticamente\n`;
    message += `• Usa "Generar Reporte" para obtener Excel y PDF`;

    return message;
  }

  /**
   * Obtener todos los movimientos según filtros (para reportes)
   */
  async getAllMovements(
    companyId: string,
    userId: string,
    userRole: 'ADMIN' | 'OPERATOR',
    filters: ReportFilters,
  ): Promise<(MovementWithRelations | PersonalMovementWithRelations)[]> {
    // Usar el MovementFilterBuilder existente
    const filterBuilder = new MovementFilterBuilder(companyId);

    // Aplicar filtros de fecha según período
    switch (filters.period) {
      case 'today':
        filterBuilder.today();
        break;
      case 'week':
        filterBuilder.thisWeek();
        break;
      case 'month':
        filterBuilder.thisMonth();
        break;
    }

    // Aplicar otros filtros
    if (filters.categoryId) {
      filterBuilder.byCategory(filters.categoryId);
    }

    if (filters.userId) {
      filterBuilder.byUser(filters.userId);
    }

    if (filters.type !== 'ALL') {
      filterBuilder.byType(filters.type as MovementType);
    }

    const dbFilters = filterBuilder.build();

    // Obtener movimientos según el role y scope
    let allMovements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];

    if (userRole === 'ADMIN') {
      if (filters.scope === 'COMPANY' || filters.scope === 'ALL') {
        const companyMovements = await movementRepository.findMany(dbFilters);
        allMovements = [...allMovements, ...companyMovements];
      }

      if (filters.scope === 'PERSONAL' || filters.scope === 'ALL') {
        // Para movimientos personales, usar los filtros adaptados
        const personalFilters = {
          dateFrom: dbFilters.dateFrom,
          dateTo: dbFilters.dateTo,
          type: dbFilters.type,
          categoryId: dbFilters.categoryId,
        };
        const personalMovements = await personalMovementRepository.findByUser(
          userId,
          personalFilters,
        );
        allMovements = [...allMovements, ...personalMovements];
      }
    } else {
      // Operadores solo ven sus movimientos personales
      const personalFilters = {
        dateFrom: dbFilters.dateFrom,
        dateTo: dbFilters.dateTo,
        type: dbFilters.type,
        categoryId: dbFilters.categoryId,
      };
      const personalMovements = await personalMovementRepository.findByUser(
        userId,
        personalFilters,
      );
      allMovements = personalMovements;
    }

    // Ordenar por fecha descendente
    allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allMovements;
  }

  /**
   * Generar reporte Excel - usa los generadores existentes
   */
  async generateExcelReport(
    companyName: string,
    movements: (MovementWithRelations | PersonalMovementWithRelations)[],
    filters: MovementFilters,
  ): Promise<Buffer> {
    const generator = new ExcelReportGenerator();

    const options: ExcelReportOptions = {
      companyName,
      movements: movements as ExcelReportOptions['movements'],
      filters,
      includeCharts: true,
      groupByCategory: true,
    };

    return await generator.generateMovementsReport(options);
  }

  /**
   * Generar reporte PDF - usa los generadores existentes
   */
  async generatePDFReport(
    companyName: string,
    movements: (MovementWithRelations | PersonalMovementWithRelations)[],
    filters: MovementFilters,
  ): Promise<Buffer> {
    const generator = new PDFReportGenerator();

    const options: PDFReportOptions = {
      companyName,
      movements: movements as PDFReportOptions['movements'],
      filters,
      includeDetails: true,
      groupByCategory: true,
    };

    return await generator.generateMovementsReport(options);
  }

  // Métodos de utilidad para labels
  private getPeriodLabel(period: string): string {
    switch (period) {
      case 'today':
        return 'Hoy';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Este Mes';
      case 'custom':
        return 'Personalizado';
      default:
        return 'Este Mes';
    }
  }

  private getTypeLabel(type: string): string {
    switch (type) {
      case 'EXPENSE':
        return 'Solo Gastos';
      case 'INCOME':
        return 'Solo Ingresos';
      case 'ALL':
        return 'Gastos e Ingresos';
      default:
        return 'Gastos e Ingresos';
    }
  }

  private getScopeLabel(scope: string): string {
    switch (scope) {
      case 'COMPANY':
        return 'Solo Empresariales';
      case 'PERSONAL':
        return 'Solo Personales';
      case 'ALL':
        return 'Empresariales y Personales';
      default:
        return 'Empresariales y Personales';
    }
  }
}
