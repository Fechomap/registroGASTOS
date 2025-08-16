import { NextFunction } from 'grammy';
import { MyContext, EditFlowData } from '../../types';
import { formatCurrency } from '@financial-bot/shared';

/**
 * Middleware para manejar inputs durante el flujo de edición
 */
export async function editFlowMiddleware(ctx: MyContext, next: NextFunction) {
  // Solo procesar mensajes de texto cuando hay un flujo de edición activo
  if (!ctx.message?.text || !ctx.session.conversationData?.editFlow) {
    return next();
  }

  const editFlow = ctx.session.conversationData.editFlow as EditFlowData;
  
  if (editFlow.step !== 'enter_value') {
    return next();
  }

  const input = ctx.message.text.trim();
  let isValid = false;
  let parsedValue: any;
  let errorMessage = '';

  // Validar según el campo que se está editando
  switch (editFlow.field) {
    case 'amount':
      // Validar formato de número
      const amountMatch = input.replace(',', '.').match(/^\d+(\.\d{1,2})?$/);
      if (amountMatch) {
        parsedValue = parseFloat(input.replace(',', '.'));
        if (parsedValue > 0 && parsedValue <= 9999999.99) {
          isValid = true;
        } else {
          errorMessage = '❌ El monto debe ser mayor a 0 y menor a 10,000,000';
        }
      } else {
        errorMessage = '❌ Formato inválido. Usa números con máximo 2 decimales.\nEjemplo: 150.50';
      }
      break;

    case 'description':
      // Validar descripción
      if (input.length >= 3 && input.length <= 200) {
        parsedValue = input;
        isValid = true;
      } else {
        errorMessage = '❌ La descripción debe tener entre 3 y 200 caracteres.';
      }
      break;

    case 'date':
      // Validar formato de fecha DD/MM/YYYY
      const dateMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Verificar que la fecha sea válida y no futura
        if (date.getDate() == parseInt(day) && 
            date.getMonth() == parseInt(month) - 1 && 
            date.getFullYear() == parseInt(year) &&
            date <= new Date()) {
          parsedValue = date;
          isValid = true;
        } else {
          errorMessage = '❌ Fecha inválida o futura.\nFormato: DD/MM/YYYY';
        }
      } else {
        errorMessage = '❌ Formato de fecha inválido.\nUsa: DD/MM/YYYY\nEjemplo: 15/08/2024';
      }
      break;
  }

  if (!isValid) {
    await ctx.reply(errorMessage);
    return; // No continuar con next()
  }

  // Guardar el valor y pasar a confirmación
  editFlow.newValue = parsedValue;
  editFlow.step = 'confirm';

  // Mostrar confirmación
  await showEditConfirmation(ctx, editFlow);
}

// Función auxiliar para mostrar confirmación (similar a la de callbacks)
async function showEditConfirmation(ctx: MyContext, editFlow: EditFlowData) {
  const { movementRepository } = await import('@financial-bot/database');
  const { formatDate } = await import('@financial-bot/shared');
  
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
    case 'date':
      fieldName = 'Fecha';
      currentValue = formatDate(movement.date);
      newValue = formatDate(editFlow.newValue as Date);
      break;
  }

  const confirmMessage = (
    `✏️ *Confirmar Edición*\n\n` +
    `🏷️ *Folio:* ${movement.folio}\n` +
    `📝 *Campo a editar:* ${fieldName}\n\n` +
    `📋 *Valor actual:* ${currentValue}\n` +
    `✨ *Nuevo valor:* ${newValue}\n\n` +
    `¿Confirmas el cambio?`
  );

  await ctx.reply(confirmMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Confirmar', callback_data: 'edit_confirm_yes' },
          { text: '❌ Cancelar', callback_data: 'edit_confirm_no' }
        ]
      ]
    }
  });
}