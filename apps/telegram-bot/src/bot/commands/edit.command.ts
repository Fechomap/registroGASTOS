import { CommandContext } from 'grammy';
import { MyContext } from '../../types';

/**
 * Comando /editar - Edita un movimiento existente (solo admins)
 * TODO: Implementar en la siguiente fase
 */
export async function editCommand(ctx: CommandContext<MyContext>) {
  await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
}