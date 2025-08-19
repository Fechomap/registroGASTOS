import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { MovementsService } from '../../services/movements.service';
import { MovementFilterBuilder } from '@financial-bot/reports';
import { 
  movementRepository, 
  personalMovementRepository,
  categoryRepository,
  personalCategoryRepository,
  userRepository,
  MovementWithRelations
} from '@financial-bot/database';
import { logBotError } from '../../utils/logger';

const movementsService = new MovementsService();

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
    // Obtener resumen de movimientos
    const summary = await movementsService.getMovements(
      user.companyId,
      user.id,
      user.role,
      { page: 1, limit: 10 }
    );

    // Crear teclado interactivo
    const keyboard = movementsService.createMovementsKeyboard(summary, user.role);

    // Formatear mensaje
    const message = movementsService.formatMovementMessage(
      summary,
      user.company.name,
      user.role,
      user.firstName
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
 * Manejar paginación de movimientos
 */
export async function handleMovementsPage(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const page = parseInt(data.replace('movements_page_', ''));
    
    // Obtener filtros de la sesión si existen
    const filters = ctx.session.movementFilters || { companyId: user.companyId };

    const summary = await movementsService.getMovements(
      user.companyId,
      user.id,
      user.role,
      { page, limit: 10, filters }
    );

    const keyboard = movementsService.createMovementsKeyboard(summary, user.role, filters);
    const message = movementsService.formatMovementMessage(
      summary,
      user.company.name,
      user.role,
      user.firstName
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
 * Filtrar por fecha
 */
export async function handleDateFilter(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = movementsService.createDateFilterKeyboard();
  
  const message = `📅 **Filtrar por Fecha**\n\n` +
    `Selecciona el período que deseas consultar:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });

  await ctx.answerCallbackQuery();
}

/**
 * Aplicar filtro de fecha específico
 */
export async function handleDateFilterApply(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const filterType = data.replace('movements_date_', '');
    const filterBuilder = movementsService.createFilterBuilder(user.companyId);

    switch (filterType) {
      case 'today':
        filterBuilder.today();
        break;
      case 'week':
        filterBuilder.thisWeek();
        break;
      case 'month':
        filterBuilder.thisMonth();
        break;
      case 'custom':
        // TODO: Implementar selector de fecha personalizado
        await ctx.answerCallbackQuery('🚧 Fecha personalizada próximamente');
        return;
    }

    const filters = filterBuilder.build();
    
    // Guardar filtros en la sesión
    ctx.session.movementFilters = filters;

    // Obtener movimientos con filtros
    const summary = await movementsService.getMovements(
      user.companyId,
      user.id,
      user.role,
      { page: 1, limit: 10, filters }
    );

    const keyboard = movementsService.createMovementsKeyboard(summary, user.role, filters);
    const message = movementsService.formatMovementMessage(
      summary,
      user.company.name,
      user.role,
      user.firstName
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery(`✅ Filtro aplicado: ${filterType}`);
  } catch (error) {
    logBotError(error as Error, { command: 'date_filter_apply' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtro');
  }
}

/**
 * Filtrar por categoría
 */
export async function handleCategoryFilter(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) return;

  try {
    // Obtener categorías empresariales y personales
    const companyCategories = await categoryRepository.findByCompany(user.companyId);
    const personalCategories = await personalCategoryRepository.findByUser(user.id);

    if (companyCategories.length === 0 && personalCategories.length === 0) {
      await ctx.answerCallbackQuery('No hay categorías disponibles');
      return;
    }

    const keyboard = new (await import('grammy')).InlineKeyboard();

    // Agregar categorías empresariales
    if (companyCategories.length > 0) {
      companyCategories.slice(0, 10).forEach(category => {
        keyboard.text(
          `🏢 ${category.icon || '📁'} ${category.name}`,
          `movements_category_${category.id}`
        ).row();
      });
    }

    // Agregar categorías personales
    if (personalCategories.length > 0 && user.role === 'OPERATOR') {
      personalCategories.slice(0, 5).forEach(category => {
        keyboard.text(
          `👤 ${category.icon || '📁'} ${category.name}`,
          `movements_personal_category_${category.id}`
        ).row();
      });
    }

    keyboard.text('📊 Todas las categorías', 'movements_category_all').row();
    keyboard.text('◀️ Volver', 'main_movements');

    const message = `📁 **Filtrar por Categoría**\n\n` +
      `Selecciona la categoría que deseas consultar:`;

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
 * Aplicar filtro de categoría
 */
export async function handleCategoryFilterApply(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || !data) return;

  try {
    const filterBuilder = movementsService.createFilterBuilder(user.companyId);

    if (data === 'movements_category_all') {
      // Remover filtro de categoría
      delete ctx.session.movementFilters?.categoryId;
    } else {
      const categoryId = data.replace('movements_category_', '').replace('movements_personal_category_', '');
      filterBuilder.byCategory(categoryId);
    }

    const filters = ctx.session.movementFilters || filterBuilder.build();
    if (data !== 'movements_category_all') {
      const categoryId = data.replace('movements_category_', '').replace('movements_personal_category_', '');
      filters.categoryId = categoryId;
    }

    ctx.session.movementFilters = filters;

    const summary = await movementsService.getMovements(
      user.companyId,
      user.id,
      user.role,
      { page: 1, limit: 10, filters }
    );

    const keyboard = movementsService.createMovementsKeyboard(summary, user.role, filters);
    const message = movementsService.formatMovementMessage(
      summary,
      user.company.name,
      user.role,
      user.firstName
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery('✅ Filtro de categoría aplicado');
  } catch (error) {
    logBotError(error as Error, { command: 'category_filter_apply' });
    await ctx.answerCallbackQuery('❌ Error al aplicar filtro');
  }
}

/**
 * Filtrar por usuario (solo admins)
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
      await ctx.answerCallbackQuery('No hay usuarios en la empresa');
      return;
    }

    const keyboard = new (await import('grammy')).InlineKeyboard();

    users.slice(0, 10).forEach(companyUser => {
      keyboard.text(
        `👤 ${companyUser.firstName} ${companyUser.lastName || ''}`,
        `movements_user_${companyUser.id}`
      ).row();
    });

    keyboard.text('👥 Todos los usuarios', 'movements_user_all').row();
    keyboard.text('◀️ Volver', 'main_movements');

    const message = `👤 **Filtrar por Usuario**\n\n` +
      `Selecciona el usuario que deseas consultar:`;

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
 * Exportar a Excel
 */
export async function handleExportExcel(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) return;

  try {
    await ctx.answerCallbackQuery('⏳ Generando reporte Excel...');

    // Obtener todos los movimientos con filtros aplicados
    const filters = ctx.session.movementFilters || { companyId: user.companyId };
    const allMovements = await movementRepository.findMany(filters);

    // Generar Excel
    const excelBuffer = await movementsService.generateExcelReport(
      user.company.name,
      allMovements,
      filters
    );

    // Enviar archivo
    await ctx.api.sendDocument(ctx.chat!.id, new (await import('grammy')).InputFile(excelBuffer, 'movimientos.xlsx'), {
      caption: `📊 **Reporte de Movimientos**\n\nEmpresa: ${user.company.name}\nMovimientos: ${allMovements.length}\nGenerado: ${new Date().toLocaleDateString('es-MX')}`,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    logBotError(error as Error, { command: 'export_excel' });
    await ctx.api.sendMessage(ctx.chat!.id, '❌ Error al generar reporte Excel');
  }
}

/**
 * Exportar a PDF
 */
export async function handleExportPDF(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) return;

  try {
    await ctx.answerCallbackQuery('⏳ Generando reporte PDF...');

    // Obtener todos los movimientos con filtros aplicados
    const filters = ctx.session.movementFilters || { companyId: user.companyId };
    const allMovements = await movementRepository.findMany(filters);

    // Generar PDF
    const pdfBuffer = await movementsService.generatePDFReport(
      user.company.name,
      allMovements,
      filters
    );

    // Enviar archivo
    await ctx.api.sendDocument(ctx.chat!.id, new (await import('grammy')).InputFile(pdfBuffer, 'movimientos.pdf'), {
      caption: `📄 **Reporte de Movimientos**\n\nEmpresa: ${user.company.name}\nMovimientos: ${allMovements.length}\nGenerado: ${new Date().toLocaleDateString('es-MX')}`,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    logBotError(error as Error, { command: 'export_pdf' });
    await ctx.api.sendMessage(ctx.chat!.id, '❌ Error al generar reporte PDF');
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
    let movement: MovementWithRelations | any = await movementRepository.findById(movementId);
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
 * Limpiar filtros
 */
export async function handleClearFilters(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) return;

  try {
    // Limpiar filtros de la sesión
    delete ctx.session.movementFilters;

    // Recargar movimientos sin filtros
    await handleShowMovements(ctx);
    
    await ctx.answerCallbackQuery('✅ Filtros limpiados');
  } catch (error) {
    logBotError(error as Error, { command: 'clear_filters' });
    await ctx.answerCallbackQuery('❌ Error al limpiar filtros');
  }
}