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
  permissionsService,
  companyRepository,
  categoryRepository,
} from '@financial-bot/database';
import { logBotError } from '../../utils/logger';
import { PeriodFilter, MovementTypeFilter, ScopeFilter } from '../../types/filter.types';
import { canEditMovement } from '../../middleware/auth';

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
    const message = await movementsService.formatMovementMessageWithFilters(
      summary,
      user.company.name,
      user.role,
      user.firstName,
      user.id,
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

    // Verificar si es Super Admin
    const isSuperAdmin = await permissionsService.isSuperAdmin(user.telegramId);

    let allMovements: MovementWithRelations[] = [];
    let companyNameForReport = user.company.name;

    if (isSuperAdmin) {
      // Super Admin: obtener movimientos de TODAS las empresas
      const allCompanies = await companyRepository.findApprovedCompanies();
      companyNameForReport = 'TODAS LAS EMPRESAS';

      for (const company of allCompanies) {
        const companyFilters = ctx.session.movementFilterState?.isActive
          ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, company.id)
          : { companyId: company.id };

        const companyMovements = await movementRepository.findMany(companyFilters);
        allMovements = [...allMovements, ...companyMovements];
      }
    } else {
      // Usuario normal: solo su empresa
      const filters = ctx.session.movementFilterState?.isActive
        ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, user.companyId)
        : { companyId: user.companyId };

      allMovements = await movementRepository.findMany(filters);
    }

    // Crear filtros para el reporte (sin companyId específico para Super Admin)
    const reportFilters =
      isSuperAdmin && !ctx.session.movementFilterState?.isActive
        ? { companyId: '' } // Filtro vacío para Super Admin
        : ctx.session.movementFilterState?.isActive
          ? filtersService.convertToMovementFilters(ctx.session.movementFilterState, user.companyId)
          : { companyId: user.companyId };

    // Generar Excel
    const excelBuffer = await movementsService.generateExcelReport(
      companyNameForReport,
      allMovements,
      reportFilters,
    );

    // Generar PDF
    const pdfBuffer = await movementsService.generatePDFReport(
      companyNameForReport,
      allMovements,
      reportFilters,
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

    const message = await movementsService.formatMovementMessageWithFilters(
      summary,
      user.company.name,
      user.role,
      user.firstName,
      user.id,
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

/**
 * ========================================
 * SISTEMA CRUD PARA GESTIÓN DE GASTOS
 * ========================================
 */

/**
 * Editar un movimiento - Mostrar opciones de edición
 */
export async function handleMovementEdit(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const movementId = data.replace('movement_edit_', '');

    // Buscar el movimiento
    const movement = await movementRepository.findById(movementId);
    if (!movement) {
      await ctx.answerCallbackQuery('❌ Movimiento no encontrado');
      return;
    }

    // Verificar permisos
    if (!canEditMovement(ctx, movement.userId)) {
      await ctx.answerCallbackQuery('❌ No tienes permisos para editar este movimiento');
      return;
    }

    const message =
      `✏️ **Editar Movimiento**\n\n` +
      `📌 **Folio:** ${movement.folio}\n` +
      `💰 **Monto actual:** $${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `📝 **Descripción actual:** ${movement.description}\n` +
      `📅 **Fecha actual:** ${new Date(movement.date).toLocaleDateString('es-MX')}\n\n` +
      `**¿Qué deseas editar?**`;

    const keyboard = new (await import('grammy')).InlineKeyboard()
      .text('💰 Monto', `movement_edit_field_amount_${movementId}`)
      .text('📝 Descripción', `movement_edit_field_description_${movementId}`)
      .row()
      .text('📁 Categoría', `movement_edit_field_category_${movementId}`)
      .text('📅 Fecha', `movement_edit_field_date_${movementId}`)
      .row()
      .text('◀️ Volver', `movement_detail_${movementId}`);

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'movement_edit' });
    await ctx.answerCallbackQuery('❌ Error al cargar opciones de edición');
  }
}

/**
 * Editar campo específico de un movimiento
 */
export async function handleMovementEditField(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const parts = data.replace('movement_edit_field_', '').split('_');
    const field = parts[0];
    const movementId = parts[1];

    // Verificar que el movimiento existe y que el usuario puede editarlo
    const movement = await movementRepository.findById(movementId);
    if (!movement) {
      await ctx.answerCallbackQuery('❌ Movimiento no encontrado');
      return;
    }

    if (!canEditMovement(ctx, movement.userId)) {
      await ctx.answerCallbackQuery('❌ No tienes permisos para editar este movimiento');
      return;
    }

    // Configurar estado de edición
    ctx.session.editMovementState = {
      movementId,
      field: field as 'amount' | 'description' | 'category' | 'date',
      currentValue: getCurrentFieldValue(movement, field),
    };

    let message = '';
    const keyboard = new (await import('grammy')).InlineKeyboard();

    switch (field) {
      case 'amount':
        message =
          `💰 **Editar Monto**\n\n` +
          `📌 Folio: ${movement.folio}\n` +
          `💰 **Monto actual:** $${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
          `**Envía el nuevo monto:**\n` +
          `💡 Ejemplo: 150.50 o 1250`;

        keyboard.text('❌ Cancelar', `movement_edit_${movementId}`);
        break;

      case 'description':
        message =
          `📝 **Editar Descripción**\n\n` +
          `📌 Folio: ${movement.folio}\n` +
          `📝 **Descripción actual:** ${movement.description}\n\n` +
          `**Envía la nueva descripción:**\n` +
          `💡 Máximo 100 caracteres`;

        keyboard.text('❌ Cancelar', `movement_edit_${movementId}`);
        break;

      case 'category': {
        // Mostrar lista de categorías
        const categories = await categoryRepository.findByCompany(movement.companyId);

        message =
          `📁 **Editar Categoría**\n\n` +
          `📌 Folio: ${movement.folio}\n` +
          `📁 **Categoría actual:** ${movement.category?.name || 'Sin categoría'}\n\n` +
          `**Selecciona nueva categoría:**`;

        categories.forEach(category => {
          keyboard
            .text(
              `${category.icon || '📂'} ${category.name}`,
              `movement_update_category_${movementId}_${category.id}`,
            )
            .row();
        });

        keyboard
          .text('❌ Sin categoría', `movement_update_category_${movementId}_none`)
          .row()
          .text('◀️ Cancelar', `movement_edit_${movementId}`);
        break;
      }

      case 'date': {
        // Generar opciones de fecha
        const today = new Date();
        const dates = [];

        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          dates.push({
            date,
            label: i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : `${date.getDate()}/${date.getMonth() + 1}`,
          });
        }

        message =
          `📅 **Editar Fecha**\n\n` +
          `📌 Folio: ${movement.folio}\n` +
          `📅 **Fecha actual:** ${new Date(movement.date).toLocaleDateString('es-MX')}\n\n` +
          `**Selecciona nueva fecha:**`;

        dates.forEach(({ date, label }) => {
          const dateStr = date.toISOString().split('T')[0];
          keyboard.text(label, `movement_update_date_${movementId}_${dateStr}`).row();
        });

        keyboard
          .text('📅 Otra fecha', `movement_edit_date_custom_${movementId}`)
          .row()
          .text('◀️ Cancelar', `movement_edit_${movementId}`);
        break;
      }

      default:
        await ctx.answerCallbackQuery('❌ Campo no válido');
        return;
    }

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'movement_edit_field' });
    await ctx.answerCallbackQuery('❌ Error al editar campo');
  }
}

/**
 * Actualizar categoría de un movimiento
 */
export async function handleMovementUpdateCategory(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const parts = data.replace('movement_update_category_', '').split('_');
    const movementId = parts[0];
    const categoryId = parts[1] === 'none' ? null : parts[1];

    // Verificar movimiento y permisos
    const movement = await movementRepository.findById(movementId);
    if (!movement || !canEditMovement(ctx, movement.userId)) {
      await ctx.answerCallbackQuery('❌ No tienes permisos');
      return;
    }

    // Actualizar movimiento
    await movementRepository.update(movementId, {
      category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
    });

    const categoryName = categoryId
      ? (await categoryRepository.findById(categoryId))?.name || 'Categoría'
      : 'Sin categoría';

    await ctx.answerCallbackQuery(`✅ Categoría actualizada: ${categoryName}`);

    // Volver al detalle del movimiento
    await redirectToMovementDetail(ctx, movementId);
  } catch (error) {
    logBotError(error as Error, { command: 'movement_update_category' });
    await ctx.answerCallbackQuery('❌ Error al actualizar categoría');
  }
}

/**
 * Actualizar fecha de un movimiento
 */
export async function handleMovementUpdateDate(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const parts = data.replace('movement_update_date_', '').split('_');
    const movementId = parts[0];
    const dateStr = parts[1];

    // Verificar movimiento y permisos
    const movement = await movementRepository.findById(movementId);
    if (!movement || !canEditMovement(ctx, movement.userId)) {
      await ctx.answerCallbackQuery('❌ No tienes permisos');
      return;
    }

    const newDate = new Date(dateStr);

    // Actualizar movimiento
    await movementRepository.update(movementId, {
      date: newDate,
    });

    await ctx.answerCallbackQuery(`✅ Fecha actualizada: ${newDate.toLocaleDateString('es-MX')}`);

    // Volver al detalle del movimiento
    await redirectToMovementDetail(ctx, movementId);
  } catch (error) {
    logBotError(error as Error, { command: 'movement_update_date' });
    await ctx.answerCallbackQuery('❌ Error al actualizar fecha');
  }
}

/**
 * Eliminar un movimiento - Mostrar confirmación
 */
export async function handleMovementDelete(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const movementId = data.replace('movement_delete_', '');

    // Buscar el movimiento
    const movement = await movementRepository.findById(movementId);
    if (!movement) {
      await ctx.answerCallbackQuery('❌ Movimiento no encontrado');
      return;
    }

    // Verificar permisos
    if (!canEditMovement(ctx, movement.userId)) {
      await ctx.answerCallbackQuery('❌ No tienes permisos para eliminar este movimiento');
      return;
    }

    const message =
      `🗑️ **Confirmar Eliminación**\n\n` +
      `📌 **Folio:** ${movement.folio}\n` +
      `💰 **Monto:** $${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `📝 **Descripción:** ${movement.description}\n` +
      `📅 **Fecha:** ${new Date(movement.date).toLocaleDateString('es-MX')}\n\n` +
      `⚠️ **Esta acción no se puede deshacer.**\n\n` +
      `¿Estás seguro de eliminar este movimiento?`;

    const keyboard = new (await import('grammy')).InlineKeyboard()
      .text('🗑️ Sí, Eliminar', `movement_delete_confirm_${movementId}`)
      .text('❌ Cancelar', `movement_detail_${movementId}`)
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'movement_delete' });
    await ctx.answerCallbackQuery('❌ Error al cargar confirmación');
  }
}

/**
 * Confirmar eliminación de movimiento
 */
export async function handleMovementDeleteConfirm(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const movementId = data.replace('movement_delete_confirm_', '');

    // Verificar movimiento y permisos
    const movement = await movementRepository.findById(movementId);
    if (!movement || !canEditMovement(ctx, movement.userId)) {
      await ctx.answerCallbackQuery('❌ No tienes permisos');
      return;
    }

    // Eliminar el movimiento
    await movementRepository.delete(movementId);

    const message =
      `✅ **Movimiento Eliminado**\n\n` +
      `📌 **Folio eliminado:** ${movement.folio}\n` +
      `💰 **Monto:** $${Number(movement.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `📝 **Descripción:** ${movement.description}\n\n` +
      `El movimiento ha sido eliminado permanentemente.`;

    const keyboard = new (await import('grammy')).InlineKeyboard()
      .text('📊 Ver Movimientos', 'main_movements')
      .text('🏠 Menú Principal', 'main_menu')
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery('✅ Movimiento eliminado');
  } catch (error) {
    logBotError(error as Error, { command: 'movement_delete_confirm' });
    await ctx.answerCallbackQuery('❌ Error al eliminar movimiento');
  }
}

/**
 * Helper: Obtener valor actual de un campo
 */
function getCurrentFieldValue(movement: MovementWithRelations, field: string): unknown {
  switch (field) {
    case 'amount':
      return Number(movement.amount);
    case 'description':
      return movement.description;
    case 'category':
      return movement.categoryId;
    case 'date':
      return movement.date;
    default:
      return null;
  }
}

/**
 * Helper: Redirigir al detalle del movimiento
 */
async function redirectToMovementDetail(ctx: CallbackQueryContext<MyContext>, movementId: string) {
  // Re-llamar a la función original de detalle
  const originalData = ctx.callbackQuery.data;
  ctx.callbackQuery = { ...ctx.callbackQuery, data: `movement_detail_${movementId}` };
  await handleMovementDetail(ctx);
  ctx.callbackQuery = { ...ctx.callbackQuery, data: originalData };
}
