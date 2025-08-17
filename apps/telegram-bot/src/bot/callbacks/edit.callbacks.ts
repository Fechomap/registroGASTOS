import { CallbackQueryContext } from 'grammy';
import { MyContext, EditFlowData } from '../../types';
import { movementRepository, categoryRepository } from '@financial-bot/database';
import { formatCurrency, formatDate } from '@financial-bot/shared';

/**
 * Manejadores de callbacks para el flujo de edición
 */

export async function handleEditFieldSelection(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const field = ctx.callbackQuery.data.replace('edit_', '') as
    | 'amount'
    | 'description'
    | 'category'
    | 'date';
  const editFlow = ctx.session.conversationData?.editFlow as EditFlowData;

  if (!editFlow) {
    await ctx.answerCallbackQuery('Sesión expirada. Intenta nuevamente.');
    return;
  }

  editFlow.step = 'enter_value';
  editFlow.field = field;

  let promptMessage = '';
  let replyMarkup;

  switch (field) {
    case 'amount':
      promptMessage = '💰 *Editar Monto*\n\nIngresa el nuevo monto:\nEjemplo: 150.50';
      break;

    case 'description':
      promptMessage = '📄 *Editar Descripción*\n\nIngresa la nueva descripción:';
      break;

    case 'category':
      // Obtener categorías disponibles
      const categories = await categoryRepository.findByCompany(ctx.session.user.companyId);

      promptMessage = '📂 *Editar Categoría*\n\nSelecciona la nueva categoría:';
      replyMarkup = {
        inline_keyboard: [
          ...categories.map(cat => [
            { text: `${cat.icon || '📂'} ${cat.name}`, callback_data: `edit_category_${cat.id}` },
          ]),
          [{ text: '🚫 Sin categoría', callback_data: 'edit_category_none' }],
          [{ text: '⬅️ Volver', callback_data: 'edit_back' }],
        ],
      };
      break;

    case 'date':
      promptMessage =
        '📅 *Editar Fecha*\n\nIngresa la nueva fecha:\nFormato: DD/MM/YYYY\nEjemplo: 15/08/2024';
      break;
  }

  await ctx.editMessageText(promptMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyMarkup || {
      inline_keyboard: [[{ text: '⬅️ Volver', callback_data: 'edit_back' }]],
    },
  });

  await ctx.answerCallbackQuery();
}

export async function handleEditCategorySelection(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const editFlow = ctx.session.conversationData?.editFlow as EditFlowData;
  if (!editFlow) return;

  const categoryId = ctx.callbackQuery.data.replace('edit_category_', '');
  editFlow.newValue = categoryId === 'none' ? null : categoryId;
  editFlow.step = 'confirm';

  await showEditConfirmation(ctx, editFlow);
  await ctx.answerCallbackQuery();
}

export async function handleEditConfirmation(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const editFlow = ctx.session.conversationData?.editFlow as EditFlowData;
  if (!editFlow) return;

  if (ctx.callbackQuery.data === 'edit_confirm_yes') {
    await executeEdit(ctx, editFlow);
  } else {
    await ctx.editMessageText('✅ Edición cancelada.');
    delete ctx.session.conversationData?.editFlow;
  }

  await ctx.answerCallbackQuery();
}

export async function handleEditCancel(ctx: CallbackQueryContext<MyContext>) {
  await ctx.editMessageText('✅ Edición cancelada.');
  delete ctx.session.conversationData?.editFlow;
  await ctx.answerCallbackQuery();
}

export async function handleEditBack(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user) return;

  const editFlow = ctx.session.conversationData?.editFlow as EditFlowData;
  if (!editFlow) return;

  // Volver a mostrar opciones de campo
  editFlow.step = 'select_field';
  editFlow.field = undefined;
  editFlow.newValue = undefined;

  const movement = await movementRepository.findById(editFlow.movementId);
  if (!movement) return;

  const currentInfo =
    `📝 *Editar Movimiento*\n\n` +
    `🏷️ *Folio:* ${movement.folio}\n` +
    `💰 *Monto:* ${formatCurrency(Number(movement.amount))}\n` +
    `📄 *Descripción:* ${movement.description}\n` +
    `📂 *Categoría:* ${movement.category?.name || 'Sin categoría'}\n` +
    `📅 *Fecha:* ${formatDate(movement.date)}\n` +
    `📊 *Tipo:* ${movement.type === 'EXPENSE' ? '💸 Gasto' : '💰 Ingreso'}\n\n` +
    `¿Qué campo deseas editar?`;

  await ctx.editMessageText(currentInfo, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💰 Monto', callback_data: 'edit_amount' },
          { text: '📄 Descripción', callback_data: 'edit_description' },
        ],
        [
          { text: '📂 Categoría', callback_data: 'edit_category' },
          { text: '📅 Fecha', callback_data: 'edit_date' },
        ],
        [{ text: '❌ Cancelar', callback_data: 'edit_cancel' }],
      ],
    },
  });

  await ctx.answerCallbackQuery();
}

// Función auxiliar para mostrar confirmación
async function showEditConfirmation(ctx: CallbackQueryContext<MyContext>, editFlow: EditFlowData) {
  const movement = await movementRepository.findById(editFlow.movementId);
  if (!movement) return;

  let fieldName = '';
  let currentValue = '';
  let newValue = '';

  switch (editFlow.field) {
    case 'amount':
      fieldName = 'Monto';
      currentValue = formatCurrency(Number(movement.amount));
      newValue = formatCurrency(editFlow.newValue as number);
      break;
    case 'description':
      fieldName = 'Descripción';
      currentValue = movement.description;
      newValue = editFlow.newValue as string;
      break;
    case 'category':
      fieldName = 'Categoría';
      currentValue = movement.category?.name || 'Sin categoría';
      if (editFlow.newValue) {
        const newCategory = await categoryRepository.findById(editFlow.newValue as string);
        newValue = newCategory?.name || 'Categoría no encontrada';
      } else {
        newValue = 'Sin categoría';
      }
      break;
    case 'date':
      fieldName = 'Fecha';
      currentValue = formatDate(movement.date);
      newValue = formatDate(editFlow.newValue as Date);
      break;
  }

  const confirmMessage =
    `✏️ *Confirmar Edición*\n\n` +
    `🏷️ *Folio:* ${movement.folio}\n` +
    `📝 *Campo a editar:* ${fieldName}\n\n` +
    `📋 *Valor actual:* ${currentValue}\n` +
    `✨ *Nuevo valor:* ${newValue}\n\n` +
    `¿Confirmas el cambio?`;

  await ctx.editMessageText(confirmMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Confirmar', callback_data: 'edit_confirm_yes' },
          { text: '❌ Cancelar', callback_data: 'edit_confirm_no' },
        ],
      ],
    },
  });
}

// Función auxiliar para ejecutar la edición
async function executeEdit(ctx: CallbackQueryContext<MyContext>, editFlow: EditFlowData) {
  try {
    const updateData: any = {};

    switch (editFlow.field) {
      case 'amount':
        updateData.amount = editFlow.newValue;
        break;
      case 'description':
        updateData.description = editFlow.newValue;
        break;
      case 'category':
        updateData.categoryId = editFlow.newValue;
        break;
      case 'date':
        updateData.date = editFlow.newValue;
        break;
    }

    await movementRepository.update(editFlow.movementId, updateData);

    const movement = await movementRepository.findById(editFlow.movementId);

    const successMessage =
      `✅ *Movimiento Editado*\n\n` +
      `🏷️ *Folio:* ${movement?.folio}\n` +
      `💰 *Monto:* ${formatCurrency(Number(movement?.amount || 0))}\n` +
      `📄 *Descripción:* ${movement?.description}\n` +
      `📂 *Categoría:* ${movement?.category?.name || 'Sin categoría'}\n` +
      `📅 *Fecha:* ${formatDate(movement?.date || new Date())}\n\n` +
      `¡Cambios guardados exitosamente!`;

    await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });
    delete ctx.session.conversationData?.editFlow;
  } catch (error) {
    console.error('Error ejecutando edición:', error);
    await ctx.editMessageText('❌ Error al guardar los cambios. Intenta nuevamente.');
  }
}
