import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { formatCurrency, formatDate } from '@financial-bot/shared';

/**
 * Manejadores de callbacks para eliminación de movimientos
 */

export async function handleDeleteConfirmation(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const movementId = ctx.callbackQuery.data.replace('delete_confirm_', '');

  try {
    // Obtener información del movimiento antes de eliminarlo
    const movement = await movementRepository.findById(movementId);

    if (!movement) {
      await ctx.editMessageText('❌ Movimiento no encontrado.');
      await ctx.answerCallbackQuery();
      return;
    }

    // Verificar permisos nuevamente por seguridad
    if (movement.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
      await ctx.editMessageText('❌ No tienes permisos para eliminar este movimiento.');
      await ctx.answerCallbackQuery();
      return;
    }

    // Eliminar el movimiento
    await movementRepository.delete(movementId);

    const successMessage =
      `✅ *Movimiento Eliminado*\n\n` +
      `🏷️ *Folio:* ${movement.folio}\n` +
      `💰 *Monto:* ${formatCurrency(Number(movement.amount))}\n` +
      `📄 *Descripción:* ${movement.description}\n` +
      `📂 *Categoría:* ${movement.category?.name || 'Sin categoría'}\n` +
      `📅 *Fecha:* ${formatDate(movement.date)}\n` +
      `📊 *Tipo:* ${movement.type === 'EXPENSE' ? '💸 Gasto' : '💰 Ingreso'}\n\n` +
      `🗑️ El movimiento ha sido eliminado permanentemente.`;

    await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error eliminando movimiento:', error);
    await ctx.editMessageText('❌ Error al eliminar el movimiento. Intenta nuevamente.');
  }

  await ctx.answerCallbackQuery();
}

export async function handleDeleteCancel(ctx: CallbackQueryContext<MyContext>) {
  await ctx.editMessageText('✅ Eliminación cancelada. El movimiento se mantiene intacto.');
  await ctx.answerCallbackQuery();
}
