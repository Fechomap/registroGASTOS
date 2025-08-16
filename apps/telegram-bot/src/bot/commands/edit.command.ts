import { CommandContext } from 'grammy';
import { MyContext, EditFlowData } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { formatCurrency, formatDate } from '@financial-bot/shared';

/**
 * Comando /editar - Edita un movimiento existente
 * Uso: /editar [folio] o /editar para buscar
 */
export async function editCommand(ctx: CommandContext<MyContext>) {
  if (!ctx.session.user) {
    await ctx.reply('❌ Debes estar registrado para usar este comando.');
    return;
  }

  const args = ctx.match?.toString().trim().split(' ') || [];
  const folio = args[0];

  if (!folio) {
    await ctx.reply(
      '📝 *Editar Movimiento*\n\n' +
      'Usa: `/editar [folio]`\n\n' +
      'Ejemplo: `/editar ABC123`\n\n' +
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

    // Verificar permisos: solo el creador o admin puede editar
    if (movement.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
      await ctx.reply('❌ Solo puedes editar tus propios movimientos o ser administrador.');
      return;
    }

    // Mostrar información actual del movimiento
    const currentInfo = (
      `📝 *Editar Movimiento*\n\n` +
      `🏷️ *Folio:* ${movement.folio}\n` +
      `💰 *Monto:* ${formatCurrency(Number(movement.amount))}\n` +
      `📄 *Descripción:* ${movement.description}\n` +
      `📂 *Categoría:* ${movement.category?.name || 'Sin categoría'}\n` +
      `📅 *Fecha:* ${formatDate(movement.date)}\n` +
      `📊 *Tipo:* ${movement.type === 'EXPENSE' ? '💸 Gasto' : '💰 Ingreso'}\n\n` +
      `¿Qué campo deseas editar?`
    );

    // Inicializar flujo de edición
    const editFlow: EditFlowData = {
      step: 'select_field',
      movementId: movement.id
    };

    ctx.session.conversationData = { editFlow };

    await ctx.reply(currentInfo, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💰 Monto', callback_data: 'edit_amount' },
            { text: '📄 Descripción', callback_data: 'edit_description' }
          ],
          [
            { text: '📂 Categoría', callback_data: 'edit_category' },
            { text: '📅 Fecha', callback_data: 'edit_date' }
          ],
          [
            { text: '❌ Cancelar', callback_data: 'edit_cancel' }
          ]
        ]
      }
    });

  } catch (error) {
    console.error('Error en comando editar:', error);
    await ctx.reply('❌ Error al buscar el movimiento.');
  }
}