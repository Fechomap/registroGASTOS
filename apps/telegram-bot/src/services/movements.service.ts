import {
  movementRepository,
  MovementWithRelations,
  personalMovementRepository,
  userRepository,
  PersonalMovementWithRelations,
  companyRepository,
  permissionsService,
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
import { MovementFilterState } from '../types/filter.types';

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

    // Verificar si es Super Admin
    const user = await userRepository.findById(userId);
    const isSuperAdmin = user ? await permissionsService.isSuperAdmin(user.telegramId) : false;
    console.log(
      `🔍 Verificando permisos - Usuario: ${user?.firstName} (${user?.telegramId}), Super Admin: ${isSuperAdmin}`,
    );

    // Para admins: pueden ver movimientos empresariales + sus personales
    if (userRole === 'ADMIN') {
      if (isSuperAdmin) {
        // Super Admin: ver movimientos de TODAS las empresas aprobadas con paginación eficiente
        const allCompanies = await companyRepository.findApprovedCompanies();
        console.log(
          `🔍 Super Admin detectado! Empresas encontradas:`,
          allCompanies.map(c => ({ id: c.id, name: c.name })),
        );

        // Para cada empresa, obtener solo los movimientos necesarios para la página actual
        let allCompanyMovements: MovementWithRelations[] = [];
        let allCompanyCount = 0;

        for (const company of allCompanies) {
          const companyFilters = filters
            ? { ...filters, companyId: company.id }
            : { companyId: company.id };

          // Obtener movimientos con limit mayor para luego ordenar y paginar globalmente
          const companyMovements = await movementRepository.findMany(companyFilters, {
            skip: 0,
            take: Math.min(500, skip + limit * 2), // Limit razonable
          });
          const companyCount = await movementRepository.count(companyFilters);

          console.log(
            `📊 Empresa ${company.name}: ${companyMovements.length} movimientos encontrados de ${companyCount} totales`,
          );
          allCompanyMovements = [...allCompanyMovements, ...companyMovements];
          allCompanyCount += companyCount;
        }

        // Ordenar todos los movimientos por fecha y aplicar paginación
        movements = allCompanyMovements
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(skip, skip + limit);
        totalCount = allCompanyCount;

        // Si incluye personales, agregar movimientos personales del Super Admin
        if (includePersonal) {
          const personalMovements = await personalMovementRepository.findByUser(userId, {
            offset: 0,
            limit: limit,
          });
          movements = [...movements, ...personalMovements];
          totalCount += personalMovements.length;
        }
      } else {
        // Admin normal: solo su empresa
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
    _summary: MovementSummary,
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

    // Ya no mostramos movimientos individuales ni paginación

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

  async formatMovementMessage(
    summary: MovementSummary,
    companyName: string,
    userRole: 'ADMIN' | 'OPERATOR',
    userName: string,
    userId: string,
  ): Promise<string> {
    // Verificar si es Super Admin
    const user = await userRepository.findById(userId);
    const isSuperAdmin = user ? await permissionsService.isSuperAdmin(user.telegramId) : false;

    let message = '';

    if (isSuperAdmin) {
      message = `📊 **Ver Movimientos - TODAS LAS EMPRESAS**\n\n`;
    } else {
      message = `📊 **Ver Movimientos - ${companyName}**\n\n`;
    }

    if (userRole === 'ADMIN') {
      message += `👑 **Admin:** ${userName}\n`;
      if (isSuperAdmin) {
        message += `🌟 **Super Admin** - Acceso total\n`;
      }
    } else {
      message += `👤 **Usuario:** ${userName}\n`;
    }

    message += `📈 **Resumen:**\n`;
    message += `• Total movimientos: ${summary.totalMovements}\n`;
    message += `• Gastos: $${summary.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Ingresos: $${summary.totalIncomes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Balance: $${summary.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n`;

    // Si es Super Admin, mostrar solo un indicador simple
    if (isSuperAdmin) {
      message += `🌟 **Acceso multi-empresa activo**\n\n`;
    }

    if (summary.movements.length === 0) {
      message += `📭 **No hay movimientos**\n\n`;
      message += `Usa el botón "Registrar Gasto" para agregar tu primer movimiento.`;
      return message;
    }

    message += `📋 **Últimos movimientos** (Página ${summary.pagination.page} de ${summary.pagination.totalPages}):\n\n`;
    console.log(
      `📋 Mostrando ${summary.movements.length} movimientos de ${summary.totalMovements} totales`,
    );

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

  /**
   * Formatear mensaje de movimientos con indicadores de filtros
   */
  async formatMovementMessageWithFilters(
    summary: MovementSummary,
    companyName: string,
    userRole: 'ADMIN' | 'OPERATOR',
    userName: string,
    userId: string,
    filterState?: MovementFilterState,
  ): Promise<string> {
    // Verificar si es Super Admin
    const user = await userRepository.findById(userId);
    const isSuperAdmin = user ? await permissionsService.isSuperAdmin(user.telegramId) : false;

    let message = '';

    if (isSuperAdmin) {
      message = `📊 **Ver Movimientos - TODAS LAS EMPRESAS**\n\n`;
    } else {
      message = `📊 **Ver Movimientos - ${companyName}**\n\n`;
    }

    if (userRole === 'ADMIN') {
      message += `👑 **Admin:** ${userName}\n`;
      if (isSuperAdmin) {
        message += `🌟 **Super Admin** - Acceso total\n`;
      }
    } else {
      message += `👤 **Usuario:** ${userName}\n`;
    }

    // Mostrar filtros activos si existen
    if (filterState?.isActive) {
      message += `🔍 **Filtros activos:**\n`;

      if (filterState.period) {
        message += `• 📅 ${filterState.period.label}\n`;
      }

      if (filterState.type && filterState.type !== 'all') {
        const typeLabel = filterState.type === 'expense' ? 'Solo Gastos' : 'Solo Ingresos';
        message += `• 💰 ${typeLabel}\n`;
      }

      if (filterState.categories && filterState.categories.length > 0) {
        message += `• 📁 ${filterState.categories.length} categoría${filterState.categories.length > 1 ? 's' : ''}\n`;
      }

      if (filterState.scope && filterState.scope !== 'all') {
        const scopeLabel =
          filterState.scope === 'company' ? 'Solo Empresariales' : 'Solo Personales';
        message += `• 🏢 ${scopeLabel}\n`;
      }

      if (filterState.companies && filterState.companies.length > 0) {
        message += `• 🏭 ${filterState.companies.length} empresa${filterState.companies.length > 1 ? 's' : ''}\n`;
      }

      message += '\n';
    }

    message += `📈 **Resumen:**\n`;
    message += `• Total movimientos: ${summary.totalMovements}\n`;
    message += `• Gastos: $${summary.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Ingresos: $${summary.totalIncomes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
    message += `• Balance: $${summary.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n`;

    // Si es Super Admin, mostrar solo un indicador simple
    if (isSuperAdmin) {
      message += `🌟 **Acceso multi-empresa activo**\n\n`;
    }

    return message;
  }
}
