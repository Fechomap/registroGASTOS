import { CommandContext } from 'grammy';
import { MyContext } from '../../types';

/**
 * Comando /reporte - Genera reportes (solo admins)
 * TODO: Implementar en la siguiente fase
 */
export async function reportCommand(ctx: CommandContext<MyContext>) {
  await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
}