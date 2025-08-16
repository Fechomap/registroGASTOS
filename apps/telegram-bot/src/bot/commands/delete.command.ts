import { CommandContext } from 'grammy';
import { MyContext } from '../../types';

/**
 * Comando /eliminar - Elimina un movimiento existente (solo admins)
 * TODO: Implementar en la siguiente fase
 */
export async function deleteCommand(ctx: CommandContext<MyContext>) {
  await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
}