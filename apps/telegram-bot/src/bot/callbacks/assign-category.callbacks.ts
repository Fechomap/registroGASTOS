import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository, categoryRepository } from '@financial-bot/database';
import { formatCurrency } from '@financial-bot/shared';

/**
 * Callback para asignar categoría después de crear un gasto
 */
export async function handleAssignCategory(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  if (ctx.callbackQuery.data === 'assign_category_skip') {
    await ctx.editMessageText('✅ Gasto registrado sin categoría.');
    await ctx.answerCallbackQuery();
    return;
  }

  const parts = ctx.callbackQuery.data.replace('assign_category_', '').split('_');
  const movementId = parts[0];
  const categoryId = parts[1];

  try {
    // Buscar el movimiento
    const movement = await movementRepository.findById(movementId);
    if (!movement) {
      await ctx.editMessageText('❌ Movimiento no encontrado.');
      await ctx.answerCallbackQuery();
      return;
    }

    // Verificar permisos
    if (movement.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
      await ctx.editMessageText('❌ No tienes permisos para modificar este movimiento.');
      await ctx.answerCallbackQuery();
      return;
    }

    let categoryName = 'Sin categoría';
    let categoryIcon = '📂';

    if (categoryId !== 'none') {
      // Buscar la categoría seleccionada
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        await ctx.editMessageText('❌ Categoría no encontrada.');
        await ctx.answerCallbackQuery();
        return;
      }

      // Actualizar el movimiento con la categoría
      await movementRepository.update(movementId, {
        category: { connect: { id: category.id } }
      });

      categoryName = category.name;
      categoryIcon = category.icon || '📂';
    } else {
      // Remover categoría (establecer como null)
      await movementRepository.update(movementId, {
        category: { disconnect: true }
      });
    }

    // Mensaje de confirmación actualizado
    const updatedMessage = 
      '✅ <b>Gasto registrado y categorizado</b>\n\n' +
      `📌 <b>Folio:</b> <code>${movement.folio}</code>\n` +
      `💸 <b>Monto:</b> ${formatCurrency(Number(movement.amount))} MXN\n` +
      `📝 <b>Descripción:</b> ${movement.description}\n` +
      `📅 <b>Fecha:</b> ${new Date(movement.date).toLocaleDateString('es-MX')}\n` +
      `👤 <b>Registrado por:</b> ${movement.user?.firstName || ctx.session.user.firstName}\n` +
      `📂 <b>Categoría:</b> ${categoryIcon} ${categoryName}`;

    await ctx.editMessageText(updatedMessage, { parse_mode: 'HTML' });

  } catch (error) {
    console.error('Error asignando categoría:', error);
    await ctx.editMessageText('❌ Error al asignar la categoría.');
  }

  await ctx.answerCallbackQuery();
}