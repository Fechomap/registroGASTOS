import {
  movementRepository,
  MovementWithRelations,
  personalMovementRepository,
  userRepository,
  PersonalMovementWithRelations,
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

export interface MovementViewOptions {
  page?: number;
  limit?: number;
  filters?: MovementFilters;
  includePersonal?: boolean;
}

export interface MovementSummary {
  totalMovements: number;
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  movements: (MovementWithRelations | PersonalMovementWithRelations)[];
  pagination: {
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class MovementsService {
  async getMovements(
    companyId: string,
    userId: string,
    userRole: 'ADMIN' | 'OPERATOR',
    options: MovementViewOptions = {},
  ): Promise<MovementSummary> {
    const { page = 1, limit = 10, filters, includePersonal = false } = options;
    const skip = (page - 1) * limit;

    let movements: (MovementWithRelations | PersonalMovementWithRelations)[] = [];
    let totalCount = 0;

    // Para admins: pueden ver movimientos empresariales + sus personales
    if (userRole === 'ADMIN') {
      // Movimientos empresariales (con filtros si se proporcionan)
      const companyFilters = filters || { companyId };

      const companyMovements = await movementRepository.findMany(companyFilters, {
        skip,
        take: limit,
      });
      const companyCount = await movementRepository.count(companyFilters);

      movements = [...companyMovements];
      totalCount = companyCount;

      // Si incluye personales, agregar movimientos personales del admin
      if (includePersonal) {
        const personalMovements = await personalMovementRepository.findByUser(userId, {
          offset: 0,
          limit: limit,
        });
        movements = [...movements, ...personalMovements];
        totalCount += personalMovements.length;
      }
    } else {
      // Para operadores: solo movimientos personales
      const personalMovements = await personalMovementRepository.findByUser(userId, {
        offset: skip,
        limit: limit,
      });
      // Contar total de movimientos personales (usar findByUser sin limit para contar)
      const allPersonalMovements = await personalMovementRepository.findByUser(userId);
      const personalCount = allPersonalMovements.length;

      movements = personalMovements;
      totalCount = personalCount;
    }

    // Ordenar por fecha descendente
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calcular totales
    const expenses = movements.filter(m => m.type === 'EXPENSE');
    const incomes = movements.filter(m => m.type === 'INCOME');

    const totalExpenses = expenses.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalIncomes = incomes.reduce((sum, m) => sum + Number(m.amount), 0);
    const balance = totalIncomes - totalExpenses;

    const totalPages = Math.ceil(totalCount / limit);

    return {
      totalMovements: totalCount,
      totalExpenses,
      totalIncomes,
      balance,
      movements,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  createFilterBuilder(companyId: string): MovementFilterBuilder {
    return new MovementFilterBuilder(companyId);
  }

  createMovementsKeyboard(
    summary: MovementSummary,
    userRole: 'ADMIN' | 'OPERATOR',
    _currentFilters?: MovementFilters,
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Botones de filtros
    keyboard
      .text('📅 Filtrar por Fecha', 'movements_filter_date')
      .text('📁 Por Categoría', 'movements_filter_category')
      .row();

    if (userRole === 'ADMIN') {
      keyboard
        .text('👤 Por Usuario', 'movements_filter_user')
        .text('🏢 Solo Empresariales', 'movements_filter_company')
        .row()
        .text('👥 Solo Personales', 'movements_filter_personal')
        .text('📊 Todos', 'movements_filter_all')
        .row();
    }

    // Botones de exportación
    keyboard
      .text('📊 Exportar Excel', 'movements_export_excel')
      .text('📄 Exportar PDF', 'movements_export_pdf')
      .row();

    // Paginación
    if (summary.pagination.hasPrev) {
      keyboard.text('⬅️ Anterior', `movements_page_${summary.pagination.page - 1}`);
    }

    if (summary.pagination.hasNext) {
      keyboard.text('➡️ Siguiente', `movements_page_${summary.pagination.page + 1}`);
    }

    if (summary.pagination.hasPrev || summary.pagination.hasNext) {
      keyboard.row();
    }

    // Botones de acción para movimientos individuales (primeros 5)
    summary.movements.slice(0, 5).forEach((movement, _index) => {
      const movementId = movement.id;
      const shortDescription =
        movement.description.length > 20
          ? movement.description.substring(0, 17) + '...'
          : movement.description;

      keyboard.text(`📝 ${shortDescription}`, `movement_detail_${movementId}`);

      if ((_index + 1) % 2 === 0) {
        keyboard.row();
      }
    });

    // Botón volver al menú
    keyboard.row().text('◀️ Menú Principal', 'main_menu');

    return keyboard;
  }

  async generateExcelReport(
    companyName: string,
    movements: MovementWithRelations[],
    filters: MovementFilters,
  ): Promise<Buffer> {
    const generator = new ExcelReportGenerator();

    const options: ExcelReportOptions = {
      companyName,
      movements,
      filters,
      includeCharts: true,
      groupByCategory: true,
    };

    return await generator.generateMovementsReport(options);
  }

  async generatePDFReport(
    companyName: string,
    movements: MovementWithRelations[],
    filters: MovementFilters,
  ): Promise<Buffer> {
    const generator = new PDFReportGenerator();

    const options: PDFReportOptions = {
      companyName,
      movements,
      filters,
      includeDetails: true,
      groupByCategory: true,
    };

    return await generator.generateMovementsReport(options);
  }

  formatMovementMessage(
    summary: MovementSummary,
    companyName: string,
    userRole: 'ADMIN' | 'OPERATOR',
    userName: string,
  ): string {
    let message = `📊 **Ver Movimientos - ${companyName}**\n\n`;

    if (userRole === 'ADMIN') {
      message += `👑 **Admin:** ${userName}\n`;
    } else {
      message += `👤 **Usuario:** ${userName}\n`;
    }

    message += `📈 **Resumen:**\n`;
    message += `• Total movimientos: ${summary.totalMovements}\n`;
    message += `• Gastos: $${summary.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Ingresos: $${summary.totalIncomes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Balance: $${summary.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n`;

    if (summary.movements.length === 0) {
      message += `📭 **No hay movimientos**\n\n`;
      message += `Usa el botón "Registrar Gasto" para agregar tu primer movimiento.`;
      return message;
    }

    message += `📋 **Últimos movimientos** (Página ${summary.pagination.page} de ${summary.pagination.totalPages}):\n\n`;

    summary.movements.forEach((movement, _index) => {
      const typeIcon = movement.type === 'EXPENSE' ? '💸' : '💰';
      const amount = `$${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      const date = new Date(movement.date).toLocaleDateString('es-MX');

      // Determinar si es movimiento empresarial o personal
      const isPersonal = 'userId' in movement && !('companyId' in movement);
      const typeLabel = isPersonal ? '👤 Personal' : '🏢 Empresarial';

      message += `${typeIcon} **${movement.folio}** ${typeLabel}\n`;
      message += `💰 ${amount}\n`;
      message += `📝 ${movement.description}\n`;
      message += `📅 ${date}`;

      // Mostrar usuario solo si es admin viendo movimientos empresariales
      if (userRole === 'ADMIN' && !isPersonal && 'user' in movement) {
        message += ` • ${movement.user.firstName}`;
      }

      // Mostrar categoría si existe
      if (movement.category) {
        message += `\n📁 ${movement.category.name}`;
      }

      message += '\n\n';
    });

    message += `💡 **Acciones disponibles:**\n`;
    message += `• Usa los filtros para refinar la búsqueda\n`;
    message += `• Exporta a Excel o PDF para análisis detallado\n`;
    message += `• Haz clic en un movimiento para ver detalles`;

    return message;
  }

  async getCompaniesForUser(userId: string): Promise<Array<{ id: string; name: string }>> {
    const userCompanies = await userRepository.getUserCompanies(userId);
    return userCompanies.map(uc => ({
      id: uc.company.id,
      name: uc.company.name,
    }));
  }

  createDateFilterKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('📅 Hoy', 'movements_date_today')
      .text('📅 Esta Semana', 'movements_date_week')
      .row()
      .text('📅 Este Mes', 'movements_date_month')
      .text('📅 Personalizado', 'movements_date_custom')
      .row()
      .text('◀️ Volver', 'main_movements');
  }

  createTypeFilterKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('💸 Solo Gastos', 'movements_type_expense')
      .text('💰 Solo Ingresos', 'movements_type_income')
      .row()
      .text('📊 Ambos', 'movements_type_all')
      .row()
      .text('◀️ Volver', 'main_movements');
  }
}
