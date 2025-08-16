import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { formatCurrency, formatDate } from '@financial-bot/shared';

/**
 * Comando /eliminar - Elimina un movimiento existente
 * Uso: /eliminar [folio]
 */
export async function deleteCommand(ctx: CommandContext<MyContext>) {
  if (!ctx.session.user) {
    await ctx.reply('❌ Debes estar registrado para usar este comando.');
    return;
  }

  const args = ctx.match?.toString().trim().split(' ') || [];
  const folio = args[0];

  if (!folio) {
    await ctx.reply(
      '🗑️ *Eliminar Movimiento*\n\n' +
      'Usa: `/eliminar [folio]`\n\n' +
      'Ejemplo: `/eliminar ABC123`\n\n' +
      'Para ver tus folios usa: `/movimientos`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    // Buscar el movimiento
    const movement = await movementRepository.findByFolioAndCompany(
      folio.toUpperCase(),
      ctx.session.user.companyId
    );

    if (!movement) {
      await ctx.reply(
        `❌ No se encontró el movimiento con folio: *${folio.toUpperCase()}*`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Verificar permisos: solo el creador o admin puede eliminar
    if (movement.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
      await ctx.reply('❌ Solo puedes eliminar tus propios movimientos o ser administrador.');
      return;
    }

    // Mostrar información del movimiento a eliminar
    const confirmationMessage = (
      `⚠️ *Confirmar Eliminación*\n\n` +
      `🏷️ *Folio:* ${movement.folio}\n` +
      `💰 *Monto:* ${formatCurrency(Number(movement.amount))}\n` +
      `📄 *Descripción:* ${movement.description}\n` +
      `📂 *Categoría:* ${movement.category?.name || 'Sin categoría'}\n` +
      `📅 *Fecha:* ${formatDate(movement.date)}\n` +
      `📊 *Tipo:* ${movement.type === 'EXPENSE' ? '💸 Gasto' : '💰 Ingreso'}\n\n` +
      `⚠️ *Esta acción no se puede deshacer*\n` +
      `¿Estás seguro de eliminar este movimiento?`
    );

    await ctx.reply(confirmationMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❌ Sí, Eliminar', callback_data: `delete_confirm_${movement.id}` },
            { text: '🚫 Cancelar', callback_data: 'delete_cancel' }
          ]
        ]
      }
    });

  } catch (error) {
    console.error('Error en comando eliminar:', error);
    await ctx.reply('❌ Error al buscar el movimiento.');
  }
}