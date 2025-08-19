import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { MovementsService } from '../../services/movements.service';
import { MovementsUIService } from '../../services/movements-ui.service';
import { MovementsFiltersService } from '../../services/movements-filters.service';
import {
  movementRepository,
  personalMovementRepository,
  MovementWithRelations,
  PersonalMovementWithRelations,
} from '@financial-bot/database';
import { logBotError } from '../../utils/logger';
import { PeriodFilter, MovementTypeFilter, ScopeFilter } from '../../types/filter.types';

// Servicios instanciados
const movementsService = new MovementsService();
const uiService = new MovementsUIService();
const filtersService = new MovementsFiltersService();

/**
 * Callback principal para Ver Movimientos
 */
export async function handleShowMovements(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    // Inicializar estado de filtros si no existe
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
      ctx.session.filterNavigation = filtersService.createInitialNavigationContext();
    }

    // Obtener resumen de movimientos con filtros aplicados
    const filters = ctx.session.movementFilterState.isActive
      ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, user.companyId)
      : { companyId: user.companyId };

    const summary = await movementsService.getMovements(user.companyId, user.id, user.role, {
      page: 1,
      limit: 10,
      filters,
    });

    // Crear teclado principal con nuevo diseño
    const keyboard = uiService.createMainMovementsKeyboard(
      ctx.session.movementFilterState,
      user.role,
    );

    // Formatear mensaje con indicadores de filtros
    const message = movementsService.formatMovementMessageWithFilters(
      summary,
      user.company.name,
      user.role,
      user.firstName,
      ctx.session.movementFilterState,
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_movements' });
    await ctx.answerCallbackQuery('❌ Error al cargar movimientos');
  }
}

/**
 * Mostrar panel principal de filtros
 */
export async function handleShowFiltersMain(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    // Obtener categorías y empresas disponibles
    const availableCategories = await filtersService.getAvailableCategories(
      user.id,
      user.companyId,
      user.role,
    );
    const availableCompanies = await filtersService.getAvailableCompanies(user);

    // Actualizar contexto de navegación
    ctx.session.filterNavigation = {
      currentSection: 'main',
      breadcrumb: ['Filtros'],
    };

    // Crear keyboard de filtros principales
    const keyboard = uiService.createFiltersMainKeyboard({
      userRole: user.role,
      currentFilters: ctx.session.movementFilterState || filtersService.createInitialFilterState(),
      navigation: ctx.session.filterNavigation,
      availableCategories,
      availableCompanies,
    });

    // Crear mensaje de filtros
    const filterStats = uiService.getFilterStats(
      ctx.session.movementFilterState || filtersService.createInitialFilterState(),
    );

    const message =
      `🔍 **Panel de Filtros**\n\n` +
      `**Estado actual:** ${filterStats.summary}\n\n` +
      `Selecciona el tipo de filtro que deseas configurar:\n\n` +
      `📅 **Período** - Filtrar por rango de fechas\n` +
      `💰 **Tipo** - Gastos, ingresos o ambos\n` +
      `📁 **Categorías** - Seleccionar categorías específicas\n` +
      (user.role === 'ADMIN' ? `🏢 **Alcance** - Empresariales, personales o ambos\n` : '') +
      (availableCompanies.length > 1 ? `🏭 **Empresa** - Seleccionar empresas específicas\n` : '') +
      `\n💡 Los filtros se pueden combinar para obtener resultados más precisos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_filters_main' });
    await ctx.answerCallbackQuery('❌ Error al cargar filtros');
  }
}

/**
 * Mostrar opciones de filtro de período
 */
export async function handleShowPeriodFilter(ctx: CallbackQueryContext<MyContext>) {
  try {
    const currentPeriod = ctx.session.movementFilterState?.period?.type;
    const keyboard = uiService.createPeriodSelectionKeyboard(currentPeriod);

    const message =
      `📅 **Filtrar por Período**\n\n` +
      `Selecciona el período de tiempo que deseas consultar:\n\n` +
      `• **Hoy** - Movimientos de hoy únicamente\n` +
      `• **Esta Semana** - Desde el lunes hasta hoy\n` +
      `• **Este Mes** - Desde el 1° del mes hasta hoy\n` +
      `• **Últimos 3 Meses** - Trimestre completo\n` +
      `• **Personalizado** - Rango de fechas específico\n\n` +
      `💡 El período seleccionado se aplicará junto con otros filtros activos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_period_filter' });
    await ctx.answerCallbackQuery('❌ Error al cargar filtro de período');
  }
}

/**
 * Aplicar filtro de período
 */
export async function handleApplyPeriodFilter(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  try {
    const periodType = data.replace('movements_period_', '') as PeriodFilter['type'];

    // Inicializar filtros si no existen
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
    }

    // Aplicar filtro de período
    ctx.session.movementFilterState = filtersService.applyPeriodFilter(
      ctx.session.movementFilterState,
      periodType,
    );

    await ctx.answerCallbackQuery(
      `✅ Período aplicado: ${ctx.session.movementFilterState.period?.label}`,
    );

    // Regresar al panel de filtros
    await handleShowFiltersMain(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'apply_period_filter' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtro de período');
  }
}

/**
 * Mostrar opciones de filtro de tipo
 */
export async function handleShowTypeFilter(ctx: CallbackQueryContext<MyContext>) {
  try {
    const currentType = ctx.session.movementFilterState?.type;
    const keyboard = uiService.createTypeSelectionKeyboard(currentType);

    const message =
      `💰 **Filtrar por Tipo de Movimiento**\n\n` +
      `Selecciona el tipo de movimientos que deseas ver:\n\n` +
      `• **Gastos e Ingresos** - Todos los movimientos (por defecto)\n` +
      `• **Solo Gastos** - Únicamente movimientos de salida\n` +
      `• **Solo Ingresos** - Únicamente movimientos de entrada\n\n` +
      `💡 Este filtro afecta tanto el resumen como la lista de movimientos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_type_filter' });
    await ctx.answerCallbackQuery('❌ Error al cargar filtro de tipo');
  }
}

/**
 * Aplicar filtro de tipo
 */
export async function handleApplyTypeFilter(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  try {
    const typeFilter = data.replace('movements_type_', '') as MovementTypeFilter;

    // Inicializar filtros si no existen
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
    }

    // Aplicar filtro de tipo
    ctx.session.movementFilterState = filtersService.applyTypeFilter(
      ctx.session.movementFilterState,
      typeFilter,
    );

    const typeConfigs = uiService.getTypeConfigs();
    const selectedConfig = typeConfigs.find(c => c.type === typeFilter);

    await ctx.answerCallbackQuery(`✅ Tipo aplicado: ${selectedConfig?.label || typeFilter}`);

    // Regresar al panel de filtros
    await handleShowFiltersMain(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'apply_type_filter' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtro de tipo');
  }
}

/**
 * Mostrar opciones de filtro de categorías
 */
export async function handleShowCategoriesFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    const availableCategories = await filtersService.getAvailableCategories(
      user.id,
      user.companyId,
      user.role,
    );

    if (availableCategories.length === 0) {
      await ctx.answerCallbackQuery('No hay categorías disponibles');
      return;
    }

    const currentSelection = ctx.session.movementFilterState?.categories || [];
    const keyboard = uiService.createCategoriesSelectionKeyboard(
      availableCategories,
      currentSelection,
    );

    const message =
      `📁 **Filtrar por Categorías**\n\n` +
      `Selecciona las categorías que deseas incluir en el reporte:\n\n` +
      `🏢 **Empresariales** - Categorías de la empresa\n` +
      (user.role === 'OPERATOR' ? `👤 **Personales** - Tus categorías personales\n` : '') +
      `\n💡 Puedes seleccionar múltiples categorías para combinar resultados.\n` +
      `${currentSelection.length > 0 ? `\n**Seleccionadas:** ${currentSelection.length}` : ''}`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_categories_filter' });
    await ctx.answerCallbackQuery('❌ Error al cargar filtro de categorías');
  }
}

/**
 * Toggle selección de categoría
 */
export async function handleToggleCategory(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  try {
    const categoryId = data.replace('movements_category_toggle_', '');

    // Inicializar filtros si no existen
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
    }

    const currentCategories = ctx.session.movementFilterState.categories || [];
    let newCategories: string[];

    if (currentCategories.includes(categoryId)) {
      // Remover categoría
      newCategories = currentCategories.filter(id => id !== categoryId);
    } else {
      // Agregar categoría
      newCategories = [...currentCategories, categoryId];
    }

    // Aplicar nuevo filtro de categorías
    ctx.session.movementFilterState = filtersService.applyCategoriesFilter(
      ctx.session.movementFilterState,
      newCategories,
    );

    await ctx.answerCallbackQuery();

    // Actualizar vista de categorías
    await handleShowCategoriesFilter(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'toggle_category' });
    await ctx.answerCallbackQuery('❌ Error al seleccionar categoría');
  }
}

/**
 * Mostrar opciones de filtro de alcance (solo admins)
 */
export async function handleShowScopeFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden usar este filtro');
    return;
  }

  try {
    const currentScope = ctx.session.movementFilterState?.scope;
    const keyboard = uiService.createScopeSelectionKeyboard(currentScope);

    const message =
      `🏢 **Filtrar por Alcance**\n\n` +
      `Selecciona el tipo de movimientos que deseas incluir:\n\n` +
      `• **Empresariales y Personales** - Todos los movimientos (por defecto)\n` +
      `• **Solo Empresariales** - Movimientos de la empresa únicamente\n` +
      `• **Solo Personales** - Movimientos personales únicamente\n\n` +
      `💡 Como administrador, puedes ver tanto movimientos empresariales como personales.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'show_scope_filter' });
    await ctx.answerCallbackQuery('❌ Error al cargar filtro de alcance');
  }
}

/**
 * Aplicar filtro de alcance
 */
export async function handleApplyScopeFilter(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  try {
    const scopeFilter = data.replace('movements_scope_', '') as ScopeFilter;

    // Inicializar filtros si no existen
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
    }

    // Aplicar filtro de alcance
    ctx.session.movementFilterState = filtersService.applyScopeFilter(
      ctx.session.movementFilterState,
      scopeFilter,
    );

    const scopeConfigs = uiService.getScopeConfigs();
    const selectedConfig = scopeConfigs.find(c => c.type === scopeFilter);

    await ctx.answerCallbackQuery(`✅ Alcance aplicado: ${selectedConfig?.label || scopeFilter}`);

    // Regresar al panel de filtros
    await handleShowFiltersMain(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'apply_scope_filter' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtro de alcance');
  }
}

/**
 * Aplicar todos los filtros y volver a ver movimientos
 */
export async function handleApplyFilters(ctx: CallbackQueryContext<MyContext>) {
  try {
    const filterState =
      ctx.session.movementFilterState || filtersService.createInitialFilterState();
    const result = filtersService.applyFilters(filterState);

    await ctx.answerCallbackQuery(
      `✅ ${result.filtersApplied} filtro${result.filtersApplied !== 1 ? 's' : ''} aplicado${result.filtersApplied !== 1 ? 's' : ''}`,
    );

    // Regresar a ver movimientos con filtros aplicados
    await handleShowMovements(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'apply_filters' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtros');
  }
}

/**
 * Limpiar todos los filtros
 */
export async function handleClearAllFilters(ctx: CallbackQueryContext<MyContext>) {
  try {
    // Limpiar estado de filtros
    ctx.session.movementFilterState = filtersService.clearAllFilters();

    await ctx.answerCallbackQuery('✅ Todos los filtros han sido limpiados');

    // Regresar a ver movimientos sin filtros
    await handleShowMovements(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'clear_all_filters' });
    await ctx.answerCallbackQuery('❌ Error al limpiar filtros');
  }
}

/**
 * Generar reporte con filtros aplicados
 */
export async function handleGenerateReport(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    await ctx.answerCallbackQuery('⏳ Generando reporte...');

    // Obtener filtros aplicados
    const filters = ctx.session.movementFilterState?.isActive
      ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, user.companyId)
      : { companyId: user.companyId };

    // Obtener todos los movimientos con filtros
    const allMovements = await movementRepository.findMany(filters);

    // Generar Excel
    const excelBuffer = await movementsService.generateExcelReport(
      user.company.name,
      allMovements,
      filters,
    );

    // Generar PDF
    const pdfBuffer = await movementsService.generatePDFReport(
      user.company.name,
      allMovements,
      filters,
    );

    const fecha = new Date().toISOString().split('T')[0];

    // Enviar Excel
    await ctx.api.sendDocument(
      ctx.chat!.id,
      new (await import('grammy')).InputFile(excelBuffer, `movimientos_${fecha}.xlsx`),
    );

    // Enviar PDF
    await ctx.api.sendDocument(
      ctx.chat!.id,
      new (await import('grammy')).InputFile(pdfBuffer, `movimientos_${fecha}.pdf`),
    );
  } catch (error) {
    logBotError(error as Error, { command: 'generate_report' });
    await ctx.api.sendMessage(ctx.chat!.id, '❌ Error al generar reporte');
  }
}

/**
 * Ver detalle de un movimiento específico
 */
export async function handleMovementDetail(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const movementId = data.replace('movement_detail_', '');

    // Buscar el movimiento (empresarial o personal)
    let movement: MovementWithRelations | PersonalMovementWithRelations | null =
      await movementRepository.findById(movementId);
    let isPersonal = false;

    if (!movement && user.role === 'OPERATOR') {
      // Buscar en movimientos personales
      movement = await personalMovementRepository.findById(movementId);
      isPersonal = true;
    }

    if (!movement) {
      await ctx.answerCallbackQuery('❌ Movimiento no encontrado');
      return;
    }

    // Crear mensaje de detalle
    const typeIcon = movement.type === 'EXPENSE' ? '💸' : '💰';
    const typeText = movement.type === 'EXPENSE' ? 'Gasto' : 'Ingreso';
    const amount = `$${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const date = new Date(movement.date).toLocaleDateString('es-MX');

    let detailMessage = `${typeIcon} **Detalle del ${typeText}**\n\n`;
    detailMessage += `📋 **Folio:** ${movement.folio}\n`;
    detailMessage += `💰 **Monto:** ${amount}\n`;
    detailMessage += `📅 **Fecha:** ${date}\n`;
    detailMessage += `📝 **Descripción:** ${movement.description}\n`;

    if (movement.category) {
      detailMessage += `📁 **Categoría:** ${movement.category.name}\n`;
    }

    if (!isPersonal && 'user' in movement) {
      detailMessage += `👤 **Usuario:** ${movement.user.firstName} ${movement.user.lastName || ''}\n`;
    }

    if (movement.vendorName) {
      detailMessage += `🏪 **Proveedor:** ${movement.vendorName}\n`;
    }

    if (movement.invoiceNumber) {
      detailMessage += `🧾 **Factura:** ${movement.invoiceNumber}\n`;
    }

    detailMessage += `\n🏷️ **Tipo:** ${isPersonal ? 'Personal' : 'Empresarial'}`;

    // Crear teclado de acciones
    const keyboard = new (await import('grammy')).InlineKeyboard();

    if (user.role === 'ADMIN' || isPersonal) {
      keyboard
        .text('✏️ Editar', `movement_edit_${movementId}`)
        .text('🗑️ Eliminar', `movement_delete_${movementId}`)
        .row();
    }

    keyboard.text('◀️ Volver a Movimientos', 'main_movements');

    await ctx.editMessageText(detailMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'movement_detail' });
    await ctx.answerCallbackQuery('❌ Error al cargar detalle');
  }
}

/**
 * Manejar paginación de movimientos
 */
export async function handleMovementsPage(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const page = parseInt(data.replace('movements_page_', ''));

    // Obtener filtros aplicados
    const filters = ctx.session.movementFilterState?.isActive
      ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, user.companyId)
      : { companyId: user.companyId };

    const summary = await movementsService.getMovements(user.companyId, user.id, user.role, {
      page,
      limit: 10,
      filters,
    });

    const keyboard = uiService.createMainMovementsKeyboard(
      ctx.session.movementFilterState || filtersService.createInitialFilterState(),
      user.role,
    );

    const message = movementsService.formatMovementMessageWithFilters(
      summary,
      user.company.name,
      user.role,
      user.firstName,
      ctx.session.movementFilterState,
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'movements_page' });
    await ctx.answerCallbackQuery('❌ Error al cambiar página');
  }
}
