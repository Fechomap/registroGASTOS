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

    // DEBUG: Verificar estado de filtros
    console.log('🔍 DEBUG Ver Movimientos:');
    console.log('  movementFilterState:', JSON.stringify(ctx.session.movementFilterState, null, 2));

    // Obtener resumen de movimientos con filtros aplicados
    const filters = ctx.session.movementFilterState.isActive
      ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, user.companyId)
      : { companyId: user.companyId };

    console.log('  filters aplicados:', JSON.stringify(filters, null, 2));

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

    // Mensaje fijo del panel de filtros
    const message =
      `🔍 **Panel de Filtros**\n\n` +
      `**Estado actual:** Sin filtros aplicados\n` +
      `• 💰 Gastos e Ingresos\n` +
      `• 📁 Todas las categorías\n` +
      `• 🏢 Empresariales y Personales\n\n` +
      `Toca cualquier filtro para modificarlo:\n\n` +
      `💡 Los filtros se pueden combinar para obtener resultados más precisos.`;

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
 * Mostrar opciones de filtro de período (lista de selección)
 */
export async function handlePeriodSelect(ctx: CallbackQueryContext<MyContext>) {
  try {
    const currentPeriod = ctx.session.movementFilterState?.period?.type;
    const keyboard = uiService.createPeriodSelectionKeyboard(currentPeriod);

    const message =
      `🔍 **Panel de Filtros**\n\n` +
      `**Estado actual:** Sin filtros aplicados\n` +
      `• 💰 Gastos e Ingresos\n` +
      `• 📁 Todas las categorías\n` +
      `• 🏢 Empresariales y Personales\n\n` +
      `Toca cualquier filtro para modificarlo:\n\n` +
      `💡 Los filtros se pueden combinar para obtener resultados más precisos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'period_select' });
    await ctx.answerCallbackQuery('❌ Error al cargar selección de período');
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
    if (periodType === 'custom') {
      await ctx.answerCallbackQuery('💡 Filtro personalizado no implementado aún');
      return;
    }

    ctx.session.movementFilterState = filtersService.applyPeriodFilter(
      ctx.session.movementFilterState,
      periodType,
    );

    // DEBUG: Verificar que el filtro se aplicó correctamente
    console.log('🔍 DEBUG Aplicar Período:');
    console.log('  periodType:', periodType);
    console.log('  nuevo estado:', JSON.stringify(ctx.session.movementFilterState, null, 2));

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
 * Mostrar opciones de filtro de tipo (lista de selección)
 */
export async function handleTypeSelect(ctx: CallbackQueryContext<MyContext>) {
  try {
    const currentType = ctx.session.movementFilterState?.type;
    const keyboard = uiService.createTypeSelectionKeyboard(currentType);

    const message =
      `🔍 **Panel de Filtros**\n\n` +
      `**Estado actual:** Sin filtros aplicados\n` +
      `• 💰 Gastos e Ingresos\n` +
      `• 📁 Todas las categorías\n` +
      `• 🏢 Empresariales y Personales\n\n` +
      `Toca cualquier filtro para modificarlo:\n\n` +
      `💡 Los filtros se pueden combinar para obtener resultados más precisos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'type_select' });
    await ctx.answerCallbackQuery('❌ Error al cargar selección de tipo');
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
 * Mostrar opciones de filtro de categorías (selección múltiple)
 */
export async function handleCategoriesSelect(ctx: CallbackQueryContext<MyContext>) {
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
      `🔍 **Panel de Filtros**\n\n` +
      `**Estado actual:** Sin filtros aplicados\n` +
      `• 💰 Gastos e Ingresos\n` +
      `• 📁 Todas las categorías\n` +
      `• 🏢 Empresariales y Personales\n\n` +
      `Toca cualquier filtro para modificarlo:\n\n` +
      `💡 Los filtros se pueden combinar para obtener resultados más precisos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'categories_select' });
    await ctx.answerCallbackQuery('❌ Error al cargar selección de categorías');
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
    await handleCategoriesSelect(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'toggle_category' });
    await ctx.answerCallbackQuery('❌ Error al seleccionar categoría');
  }
}

/**
 * Aplicar filtro de categorías desde el panel
 */
export async function handleApplyCategoriesFilter(ctx: CallbackQueryContext<MyContext>) {
  try {
    const categories = ctx.session.movementFilterState?.categories || [];

    await ctx.answerCallbackQuery(
      `✅ Categorías aplicadas: ${categories.length} seleccionada${categories.length !== 1 ? 's' : ''}`,
    );

    // Regresar al panel de filtros
    await handleShowFiltersMain(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'apply_categories_filter' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtro de categorías');
  }
}

/**
 * Toggle seleccionar/deseleccionar todas las categorías
 */
export async function handleToggleAllCategories(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    // Obtener categorías disponibles
    const availableCategories = await filtersService.getAvailableCategories(
      user.id,
      user.companyId,
      user.role,
    );

    // Inicializar filtros si no existen
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
    }

    const currentCategories = ctx.session.movementFilterState.categories || [];
    const allCategoryIds = availableCategories.map(c => c.id);

    // Verificar si todas están seleccionadas
    const allSelected =
      allCategoryIds.length > 0 && allCategoryIds.every(id => currentCategories.includes(id));

    let newCategories: string[];
    if (allSelected) {
      // Deseleccionar todas
      newCategories = [];
      await ctx.answerCallbackQuery('✅ Todas las categorías deseleccionadas');
    } else {
      // Seleccionar todas
      newCategories = allCategoryIds;
      await ctx.answerCallbackQuery(`✅ ${newCategories.length} categorías seleccionadas`);
    }

    // Aplicar nuevo filtro de categorías
    ctx.session.movementFilterState = filtersService.applyCategoriesFilter(
      ctx.session.movementFilterState,
      newCategories,
    );

    // Actualizar vista de categorías
    await handleCategoriesSelect(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'toggle_all_categories' });
    await ctx.answerCallbackQuery('❌ Error al seleccionar categorías');
  }
}

/**
 * Limpiar filtro de categorías
 */
export async function handleClearCategoriesFilter(ctx: CallbackQueryContext<MyContext>) {
  try {
    // Inicializar filtros si no existen
    if (!ctx.session.movementFilterState) {
      ctx.session.movementFilterState = filtersService.createInitialFilterState();
    }

    // Aplicar filtro vacío de categorías
    ctx.session.movementFilterState = filtersService.applyCategoriesFilter(
      ctx.session.movementFilterState,
      [],
    );

    await ctx.answerCallbackQuery('✅ Filtro de categorías limpiado');

    // Actualizar vista de categorías
    await handleCategoriesSelect(ctx);
  } catch (error) {
    logBotError(error as Error, { command: 'clear_categories_filter' });
    await ctx.answerCallbackQuery('❌ Error al limpiar filtro de categorías');
  }
}

/**
 * Mostrar opciones de filtro de alcance (selección directa - solo admins)
 */
export async function handleScopeSelect(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden usar este filtro');
    return;
  }

  try {
    const currentScope = ctx.session.movementFilterState?.scope;
    const keyboard = uiService.createScopeSelectionKeyboard(currentScope);

    const message =
      `🔍 **Panel de Filtros**\n\n` +
      `**Estado actual:** Sin filtros aplicados\n` +
      `• 💰 Gastos e Ingresos\n` +
      `• 📁 Todas las categorías\n` +
      `• 🏢 Empresariales y Personales\n\n` +
      `Toca cualquier filtro para modificarlo:\n\n` +
      `💡 Los filtros se pueden combinar para obtener resultados más precisos.`;

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'scope_select' });
    await ctx.answerCallbackQuery('❌ Error al cargar selección de alcance');
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
 * Limpiar todos los filtros (sin restricciones)
 */
export async function handleClearAllFilters(ctx: CallbackQueryContext<MyContext>) {
  try {
    // Limpiar completamente los filtros (sin restricciones)
    ctx.session.movementFilterState = filtersService.clearAllFilters();

    await ctx.answerCallbackQuery('✅ Todos los filtros han sido limpiados');

    // Regresar al panel de filtros para mostrar el estado limpio
    await handleShowFiltersMain(ctx);
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
