import { CallbackQueryContext, InputFile } from 'grammy';
import { MyContext } from '../../types';
import { ReportsService, ReportFilters } from '../../services/reports.service';
import { 
  categoryRepository,
  personalCategoryRepository,
  userRepository,
  MovementWithRelations
} from '@financial-bot/database';
import { MovementFilterBuilder } from '@financial-bot/reports';
import { logBotError } from '../../utils/logger';

const reportsService = new ReportsService();

/**
 * Mostrar panel principal de reportes
 */
export async function handleShowReportsPanel(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    // Inicializar filtros si no existen
    if (!ctx.session.reportFilters) {
      ctx.session.reportFilters = reportsService.createDefaultFilters();
    }

    // Obtener resumen con filtros actuales
    const summary = await reportsService.getReportSummary(
      user.companyId,
      user.id,
      user.role,
      ctx.session.reportFilters
    );

    // Crear teclado y mensaje
    const keyboard = reportsService.createReportsKeyboard(ctx.session.reportFilters, user.role);
    const message = reportsService.formatReportsMessage(summary, user.company.name, user.role, user.firstName);

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_reports_panel' });
    await ctx.answerCallbackQuery('❌ Error al cargar panel de reportes');
  }
}

/**
 * Manejar filtro de período
 */
export async function handlePeriodFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    const currentPeriod = ctx.session.reportFilters?.period || 'month';
    
    // Rotar entre períodos disponibles
    const periods = ['today', 'week', 'month', 'custom'];
    const currentIndex = periods.indexOf(currentPeriod);
    const nextIndex = (currentIndex + 1) % periods.length;
    const newPeriod = periods[nextIndex] as ReportFilters['period'];

    // Actualizar filtros
    if (!ctx.session.reportFilters) {
      ctx.session.reportFilters = reportsService.createDefaultFilters();
    }
    ctx.session.reportFilters.period = newPeriod;

    // Refrescar panel
    await handleShowReportsPanel(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'period_filter' });
    await ctx.answerCallbackQuery('❌ Error al cambiar período');
  }
}

/**
 * Manejar filtro de tipo (Gastos/Ingresos)
 */
export async function handleTypeFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    const currentType = ctx.session.reportFilters?.type || 'ALL';
    
    // Rotar entre tipos
    const types = ['ALL', 'EXPENSE', 'INCOME'];
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    const newType = types[nextIndex] as ReportFilters['type'];

    // Actualizar filtros
    if (!ctx.session.reportFilters) {
      ctx.session.reportFilters = reportsService.createDefaultFilters();
    }
    ctx.session.reportFilters.type = newType;

    // Refrescar panel
    await handleShowReportsPanel(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'type_filter' });
    await ctx.answerCallbackQuery('❌ Error al cambiar tipo');
  }
}

/**
 * Manejar filtro de scope (solo admins)
 */
export async function handleScopeFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden cambiar el alcance');
    return;
  }

  try {
    const currentScope = ctx.session.reportFilters?.scope || 'ALL';
    
    // Rotar entre scopes
    const scopes = ['ALL', 'COMPANY', 'PERSONAL'];
    const currentIndex = scopes.indexOf(currentScope);
    const nextIndex = (currentIndex + 1) % scopes.length;
    const newScope = scopes[nextIndex] as ReportFilters['scope'];

    // Actualizar filtros
    if (!ctx.session.reportFilters) {
      ctx.session.reportFilters = reportsService.createDefaultFilters();
    }
    ctx.session.reportFilters.scope = newScope;

    // Refrescar panel
    await handleShowReportsPanel(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'scope_filter' });
    await ctx.answerCallbackQuery('❌ Error al cambiar alcance');
  }
}

/**
 * Mostrar selector de categorías
 */
export async function handleCategoryFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    // Obtener categorías disponibles según el scope actual
    const scope = ctx.session.reportFilters?.scope || 'ALL';
    let categories: any[] = [];

    if (user.role === 'ADMIN') {
      if (scope === 'COMPANY' || scope === 'ALL') {
        const companyCategories = await categoryRepository.findByCompany(user.companyId);
        categories = [...categories, ...companyCategories];
      }
      if (scope === 'PERSONAL' || scope === 'ALL') {
        const personalCategories = await personalCategoryRepository.findByUser(user.id);
        categories = [...categories, ...personalCategories];
      }
    } else {
      // Operadores solo ven categorías personales
      categories = await personalCategoryRepository.findByUser(user.id);
    }

    if (categories.length === 0) {
      await ctx.answerCallbackQuery('📭 No hay categorías disponibles');
      return;
    }

    // Crear mensaje de selección
    let message = `📁 **Seleccionar Categoría**\n\n`;
    message += `Elige una categoría para filtrar los movimientos:\n\n`;

    const keyboard = reportsService.createCategorySelectionKeyboard(categories);

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'category_filter' });
    await ctx.answerCallbackQuery('❌ Error al cargar categorías');
  }
}

/**
 * Aplicar selección de categoría
 */
export async function handleCategorySelection(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;
  if (!user || !data) return;

  try {
    const categoryId = data.replace('reports_category_', '');
    
    if (categoryId === 'all') {
      // Limpiar filtro de categoría
      if (ctx.session.reportFilters) {
        delete ctx.session.reportFilters.categoryId;
        delete ctx.session.reportFilters.categoryName;
      }
    } else {
      // Buscar la categoría seleccionada
      let category: any = await categoryRepository.findById(categoryId);
      if (!category) {
        category = await personalCategoryRepository.findById(categoryId);
      }

      if (category) {
        if (!ctx.session.reportFilters) {
          ctx.session.reportFilters = reportsService.createDefaultFilters();
        }
        ctx.session.reportFilters.categoryId = categoryId;
        ctx.session.reportFilters.categoryName = category.name;
      }
    }

    // Volver al panel principal
    await handleShowReportsPanel(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'category_selection' });
    await ctx.answerCallbackQuery('❌ Error al seleccionar categoría');
  }
}

/**
 * Mostrar selector de usuarios (solo admins)
 */
export async function handleUserFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden filtrar por usuario');
    return;
  }

  try {
    const users = await userRepository.findByCompany(user.companyId);

    if (users.length === 0) {
      await ctx.answerCallbackQuery('📭 No hay usuarios disponibles');
      return;
    }

    let message = `👤 **Seleccionar Usuario**\n\n`;
    message += `Elige un usuario para filtrar los movimientos:\n\n`;

    const keyboard = reportsService.createUserSelectionKeyboard(users);

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'user_filter' });
    await ctx.answerCallbackQuery('❌ Error al cargar usuarios');
  }
}

/**
 * Aplicar selección de usuario
 */
export async function handleUserSelection(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;
  if (!user || !data || user.role !== 'ADMIN') return;

  try {
    const userId = data.replace('reports_user_', '');
    
    if (userId === 'all') {
      // Limpiar filtro de usuario
      if (ctx.session.reportFilters) {
        delete ctx.session.reportFilters.userId;
        delete ctx.session.reportFilters.userName;
      }
    } else {
      // Buscar el usuario seleccionado
      const selectedUser = await userRepository.findById(userId);

      if (selectedUser) {
        if (!ctx.session.reportFilters) {
          ctx.session.reportFilters = reportsService.createDefaultFilters();
        }
        ctx.session.reportFilters.userId = userId;
        ctx.session.reportFilters.userName = `${selectedUser.firstName} ${selectedUser.lastName || ''}`.trim();
      }
    }

    // Volver al panel principal
    await handleShowReportsPanel(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'user_selection' });
    await ctx.answerCallbackQuery('❌ Error al seleccionar usuario');
  }
}

/**
 * Limpiar todos los filtros
 */
export async function handleClearFilters(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    // Resetear filtros a valores por defecto
    ctx.session.reportFilters = reportsService.createDefaultFilters();

    // Refrescar panel
    await handleShowReportsPanel(ctx);
    await ctx.answerCallbackQuery('🔄 Filtros limpiados');
  } catch (error) {
    logBotError(error as Error, { command: 'clear_filters' });
    await ctx.answerCallbackQuery('❌ Error al limpiar filtros');
  }
}

/**
 * Generar reportes completos (Excel y PDF)
 */
export async function handleGenerateReports(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    await ctx.answerCallbackQuery('📊 Generando reportes...');

    const filters = ctx.session.reportFilters || reportsService.createDefaultFilters();
    
    // Obtener todos los movimientos con filtros aplicados
    const allMovements = await reportsService.getAllMovements(user.companyId, user.id, user.role, filters);
    
    if (allMovements.length === 0) {
      await ctx.reply('📭 **No hay movimientos para exportar**\n\nAjusta los filtros para incluir más datos.');
      return;
    }

    // Crear filtros para los generadores
    const filterBuilder = new MovementFilterBuilder(user.companyId);
    switch (filters.period) {
      case 'today': filterBuilder.today(); break;
      case 'week': filterBuilder.thisWeek(); break;
      case 'month': filterBuilder.thisMonth(); break;
    }
    if (filters.categoryId) filterBuilder.byCategory(filters.categoryId);
    if (filters.userId) filterBuilder.byUser(filters.userId);
    if (filters.type !== 'ALL') filterBuilder.byType(filters.type as any);
    const dbFilters = filterBuilder.build();

    // Generar Excel
    const excelBuffer = await reportsService.generateExcelReport(
      user.company.name,
      allMovements,
      dbFilters
    );

    // Generar PDF
    const pdfBuffer = await reportsService.generatePDFReport(
      user.company.name,
      allMovements,
      dbFilters
    );

    // Crear nombres de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const excelFileName = `movimientos_${fecha}.xlsx`;
    const pdfFileName = `movimientos_${fecha}.pdf`;

    // Enviar Excel
    await ctx.api.sendDocument(ctx.chat!.id, new InputFile(excelBuffer, excelFileName), {
      caption: `📊 **Reporte Excel - ${user.company.name}**\n\nMovimientos: ${allMovements.length}\nGenerado: ${new Date().toLocaleDateString('es-MX')}`,
      parse_mode: 'Markdown'
    });

    // Enviar PDF
    await ctx.api.sendDocument(ctx.chat!.id, new InputFile(pdfBuffer, pdfFileName), {
      caption: `📄 **Reporte PDF - ${user.company.name}**\n\nMovimientos: ${allMovements.length}\nGenerado: ${new Date().toLocaleDateString('es-MX')}`,
      parse_mode: 'Markdown'
    });

    await ctx.reply('✅ **Reportes generados exitosamente**\n\nSe han enviado los archivos Excel y PDF con todos los movimientos filtrados.');
    
  } catch (error) {
    logBotError(error as Error, { command: 'generate_reports' });
    await ctx.api.sendMessage(ctx.chat!.id, '❌ Error al generar los reportes. Inténtalo de nuevo.');
  }
}