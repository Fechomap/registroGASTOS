import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import {
  startExpenseFlow,
  processExpenseTypeSelection,
  processCompanySelection,
  confirmExpense,
  saveExpense,
  processDateSelection,
  showDateSelectionStep,
} from '../handlers/conversation.handler';
import { createMainMenu, getMainMenuMessage } from '../menus/main.menu';

/**
 * Callback para iniciar registro de gasto desde menú principal
 */
export async function handleMainExpenseCallback(ctx: CallbackQueryContext<MyContext>) {
  await startExpenseFlow(ctx);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para reiniciar flujo de gasto
 */
export async function handleExpenseStartCallback(ctx: CallbackQueryContext<MyContext>) {
  await startExpenseFlow(ctx);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para selección de tipo de gasto (empresa/personal)
 */
export async function handleExpenseTypeCallback(ctx: CallbackQueryContext<MyContext>) {
  const callbackData = ctx.callbackQuery.data;

  if (callbackData === 'expense_type_company') {
    await processExpenseTypeSelection(ctx, 'COMPANY');
  } else if (callbackData === 'expense_type_personal') {
    await processExpenseTypeSelection(ctx, 'PERSONAL');
  }

  await ctx.answerCallbackQuery();
}

/**
 * Callback para selección de empresa
 */
export async function handleExpenseCompanyCallback(ctx: CallbackQueryContext<MyContext>) {
  const callbackData = ctx.callbackQuery.data;
  const companyId = callbackData?.replace('expense_company_', '');

  if (!companyId) {
    await ctx.answerCallbackQuery('❌ Error en la selección de empresa');
    return;
  }

  await processCompanySelection(ctx, companyId);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para selección de categoría en el flujo
 */
export async function handleCategorySelectCallback(ctx: CallbackQueryContext<MyContext>) {
  const callbackData = ctx.callbackQuery.data;
  let categoryId: string | undefined;

  if (callbackData === 'category_select_none') {
    categoryId = undefined;
  } else {
    categoryId = callbackData?.replace('category_select_', '');
  }

  await confirmExpense(ctx, categoryId);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para omitir fotografía
 */
export async function handlePhotoSkipCallback(ctx: CallbackQueryContext<MyContext>) {
  const registerFlow = ctx.session.conversationData?.registerFlow;

  if (!registerFlow) {
    await ctx.answerCallbackQuery('❌ Error en el flujo');
    return;
  }

  // Continuar sin foto
  registerFlow.step = 'date';
  ctx.session.conversationData = { registerFlow };

  const { showDateSelectionStep } = await import('../handlers/conversation.handler');
  await showDateSelectionStep(ctx, registerFlow);
  await ctx.answerCallbackQuery('📸 Continuando sin fotografía');
}

/**
 * Callback para confirmar y guardar el gasto
 */
export async function handleExpenseConfirmSaveCallback(ctx: CallbackQueryContext<MyContext>) {
  await saveExpense(ctx);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para guardar el gasto final (nuevo paso 6)
 */
export async function handleExpenseFinalSaveCallback(ctx: CallbackQueryContext<MyContext>) {
  await saveExpense(ctx);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para cancelar el flujo de gasto
 */
export async function handleExpenseCancelCallback(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  // Limpiar la conversación
  ctx.session.conversationData = {};

  // Volver al menú principal
  const message = getMainMenuMessage(user.firstName, user.role, user.company.name);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: createMainMenu(user.role),
  });

  await ctx.answerCallbackQuery('❌ Registro de gasto cancelado');
}

/**
 * Callback para ir al menú principal
 */
export async function handleMainMenuCallback(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  // Limpiar cualquier conversación activa
  ctx.session.conversationData = {};

  const message = getMainMenuMessage(user.firstName, user.role, user.company.name);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: createMainMenu(user.role),
  });

  await ctx.answerCallbackQuery();
}

/**
 * Callback para selección de fecha
 */
export async function handleDateSelectCallback(ctx: CallbackQueryContext<MyContext>) {
  const callbackData = ctx.callbackQuery.data;

  if (!callbackData?.startsWith('date_select_')) {
    await ctx.answerCallbackQuery('❌ Error en la selección de fecha');
    return;
  }

  const dateString = callbackData.replace('date_select_', '');
  await processDateSelection(ctx, dateString);
  await ctx.answerCallbackQuery();
}

/**
 * Callback para volver a opciones de fecha
 */
export async function handleDateBackToOptionsCallback(ctx: CallbackQueryContext<MyContext>) {
  const registerFlow = ctx.session.conversationData?.registerFlow;

  if (!registerFlow) {
    await ctx.answerCallbackQuery('❌ Error en el flujo');
    return;
  }

  await showDateSelectionStep(ctx, registerFlow);
  await ctx.answerCallbackQuery('⬅️ Volviendo a opciones de fecha');
}
