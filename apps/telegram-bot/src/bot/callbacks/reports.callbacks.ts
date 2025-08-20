import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { ReportsService } from '../../services/reports.service';
import {
  categoryRepository,
  personalCategoryRepository,
  userRepository,
  permissionsService,
  companyRepository,
  movementRepository,
  MovementWithRelations,
} from '@financial-bot/database';
import { logBotError } from '../../utils/logger';
import {
  advancedReportsService,
  AdvancedReportFilters,
} from '../../services/advanced-reports.service';

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
    // Verificar si el usuario tiene permisos de reportes
    const reportScope = await permissionsService.getUserReportScope(user.id);

    // Inicializar filtros avanzados si no existen
    if (!ctx.session.advancedReportFilters) {
      ctx.session.advancedReportFilters = {
        period: 'month',
        type: 'ALL',
        scope: 'COMPANY',
      };
    }

    // Obtener resumen con permisos y filtros
    const summary = await advancedReportsService.generateReport(
      user.id,
      ctx.session.advancedReportFilters,
    );

    // Crear teclado respetando permisos
    const keyboard = await advancedReportsService.createReportsKeyboard(
      user.id,
      ctx.session.advancedReportFilters,
    );

    // Formatear mensaje con información de permisos
    const accessibleCompanies = await permissionsService.getUserAccessibleCompanies(user.id);
    let message = `📊 **Panel de Reportes**\n\n`;
    message += `👤 **Usuario:** ${user.firstName}\n`;
    message += `🔐 **Alcance:** ${reportScope === 'all' ? 'Super Admin' : reportScope === 'company' ? 'Multi-empresa' : 'Personal'}\n`;
    message += `🏢 **Empresas accesibles:** ${accessibleCompanies.length}\n\n`;

    // Resumen de movimientos
    message += `📈 **Resumen**\n`;
    message += `• Movimientos: ${summary.totalMovements}\n`;
    message += `• Gastos: $${summary.totalExpenses.toLocaleString()}\n`;
    message += `• Ingresos: $${summary.totalIncomes.toLocaleString()}\n`;
    message += `• Balance: $${summary.balance.toLocaleString()}\n\n`;

    // Filtros aplicados
    message += `🔍 **Filtros activos:**\n`;
    message += `• Período: ${summary.appliedFilters.period}\n`;
    message += `• Tipo: ${summary.appliedFilters.type}\n`;
    if (summary.appliedFilters.companyIds?.length) {
      message += `• Empresas: ${summary.appliedFilters.companyIds.length} seleccionadas\n`;
    }

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
    const currentPeriod = ctx.session.advancedReportFilters?.period || 'month';

    // Rotar entre períodos disponibles
    const periods = ['today', 'week', 'month', 'custom'];
    const currentIndex = periods.indexOf(currentPeriod);
    const nextIndex = (currentIndex + 1) % periods.length;
    const newPeriod = periods[nextIndex] as AdvancedReportFilters['period'];

    // Actualizar filtros avanzados
    if (!ctx.session.advancedReportFilters) {
      ctx.session.advancedReportFilters = {
        period: 'month',
        type: 'ALL',
        scope: 'COMPANY',
      };
    }
    ctx.session.advancedReportFilters.period = newPeriod;

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
    const currentType = ctx.session.advancedReportFilters?.type || 'ALL';

    // Rotar entre tipos
    const types = ['ALL', 'EXPENSE', 'INCOME'];
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    const newType = types[nextIndex] as AdvancedReportFilters['type'];

    // Actualizar filtros avanzados
    if (!ctx.session.advancedReportFilters) {
      ctx.session.advancedReportFilters = {
        period: 'month',
        type: 'ALL',
        scope: 'COMPANY',
      };
    }
    ctx.session.advancedReportFilters.type = newType;

    // Refrescar panel
    await handleShowReportsPanel(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'type_filter' });
    await ctx.answerCallbackQuery('❌ Error al cambiar tipo');
  }
}

/**
 * Manejar filtro de scope - respeta permisos multi-empresa
 */
export async function handleScopeFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    // Verificar permisos de reportes del usuario
    const reportScope = await permissionsService.getUserReportScope(user.id);

    if (reportScope === 'own') {
      await ctx.answerCallbackQuery('❌ Solo puedes ver tus movimientos personales');
      return;
    }

    const currentScope = ctx.session.advancedReportFilters?.scope || 'COMPANY';

    // Determinar scopes disponibles según permisos
    let availableScopes: AdvancedReportFilters['scope'][] = [];

    if (reportScope === 'all') {
      // Super Admin - todos los scopes
      availableScopes = ['ALL', 'COMPANY', 'PERSONAL'];
    } else if (reportScope === 'company') {
      // Admin con permisos de empresa
      availableScopes = ['COMPANY', 'PERSONAL'];
    }

    if (availableScopes.length <= 1) {
      await ctx.answerCallbackQuery('✅ Solo tienes un alcance disponible');
      return;
    }

    // Rotar entre scopes disponibles
    const currentIndex = availableScopes.indexOf(currentScope);
    const nextIndex = (currentIndex + 1) % availableScopes.length;
    const newScope = availableScopes[nextIndex];

    // Actualizar filtros avanzados
    if (!ctx.session.advancedReportFilters) {
      ctx.session.advancedReportFilters = {
        period: 'month',
        type: 'ALL',
        scope: 'COMPANY',
      };
    }
    ctx.session.advancedReportFilters.scope = newScope;

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
    let rawCategories: Array<{ id: string; name: string; icon: string | null }> = [];

    if (user.role === 'ADMIN') {
      if (scope === 'COMPANY' || scope === 'ALL') {
        const companyCategories = await categoryRepository.findByCompany(user.companyId);
        rawCategories = [...rawCategories, ...companyCategories];
      }
      if (scope === 'PERSONAL' || scope === 'ALL') {
        const personalCategories = await personalCategoryRepository.findByUser(user.id);
        rawCategories = [...rawCategories, ...personalCategories];
      }
    } else {
      // Operadores solo ven categorías personales
      rawCategories = await personalCategoryRepository.findByUser(user.id);
    }

    // Transformar a formato esperado
    const categories = rawCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || undefined,
    }));

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
      let category: { id: string; name: string } | null =
        await categoryRepository.findById(categoryId);
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

    const keyboard = reportsService.createUserSelectionKeyboard(
      users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName || undefined,
      })),
    );

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
        ctx.session.reportFilters.userName =
          `${selectedUser.firstName} ${selectedUser.lastName || ''}`.trim();
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
    // Resetear filtros avanzados a valores por defecto
    ctx.session.advancedReportFilters = {
      period: 'month',
      type: 'ALL',
      scope: 'COMPANY',
    };

    // Refrescar panel
    await handleShowReportsPanel(ctx);
    await ctx.answerCallbackQuery('🔄 Filtros limpiados');
  } catch (error) {
    logBotError(error as Error, { command: 'clear_filters' });
    await ctx.answerCallbackQuery('❌ Error al limpiar filtros');
  }
}

/**
 * Generar reportes completos (Excel y PDF) - Multi-empresa con permisos
 */
export async function handleGenerateReports(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  if (!user) return;

  try {
    await ctx.answerCallbackQuery('📊 Generando reportes...');

    const filters = ctx.session.advancedReportFilters || {
      period: 'month',
      type: 'ALL',
      scope: 'COMPANY',
    };

    // Generar reporte usando el servicio avanzado con permisos
    const summary = await advancedReportsService.generateReport(user.id, filters);

    if (summary.totalMovements === 0) {
      await ctx.reply(
        '📭 **No hay movimientos para exportar**\n\nAjusta los filtros para incluir más datos.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Verificar si es Super Admin para determinar el nombre del reporte
    const isSuperAdmin = await permissionsService.isSuperAdmin(user.telegramId);
    const companyNameForReport = isSuperAdmin ? 'TODAS LAS EMPRESAS' : user.company.name;

    // Obtener todos los movimientos del reporte
    let allMovements: MovementWithRelations[] = [];

    if (isSuperAdmin) {
      // Super Admin: obtener movimientos de todas las empresas
      const allCompanies = await companyRepository.findApprovedCompanies();

      for (const company of allCompanies) {
        const companyFilters = { companyId: company.id };
        const companyMovements = await movementRepository.findMany(companyFilters);
        allMovements = [...allMovements, ...companyMovements];
      }
    } else {
      // Usuario normal: solo su empresa
      const companyFilters = { companyId: user.companyId };
      allMovements = await movementRepository.findMany(companyFilters);
    }

    // Generar Excel
    const excelBuffer = await reportsService.generateExcelReport(
      companyNameForReport,
      allMovements,
      { companyId: isSuperAdmin ? '' : user.companyId },
    );

    // Generar PDF
    const pdfBuffer = await reportsService.generatePDFReport(companyNameForReport, allMovements, {
      companyId: isSuperAdmin ? '' : user.companyId,
    });

    const fecha = new Date().toISOString().split('T')[0];

    // Enviar Excel
    await ctx.api.sendDocument(
      ctx.chat!.id,
      new (await import('grammy')).InputFile(excelBuffer, `reporte_${fecha}.xlsx`),
      {
        caption: `📊 **Reporte Excel - ${companyNameForReport}**\n${summary.totalMovements} movimientos`,
        parse_mode: 'Markdown',
      },
    );

    // Enviar PDF
    await ctx.api.sendDocument(
      ctx.chat!.id,
      new (await import('grammy')).InputFile(pdfBuffer, `reporte_${fecha}.pdf`),
      {
        caption: `📄 **Reporte PDF - ${companyNameForReport}**\n${summary.totalMovements} movimientos`,
        parse_mode: 'Markdown',
      },
    );
  } catch (error) {
    logBotError(error as Error, { command: 'generate_reports' });
    await ctx.api.sendMessage(
      ctx.chat!.id,
      '❌ Error al generar los reportes. Inténtalo de nuevo.',
    );
  }
}
