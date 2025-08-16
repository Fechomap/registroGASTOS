import { CommandContext } from 'grammy';
import { MyContext } from '../../types';

/**
 * Comandos de gestión de usuarios (solo admins)
 * TODO: Implementar en la siguiente fase
 */

export const userCommands = {
  async addUser(ctx: CommandContext<MyContext>) {
    await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
  },

  async listUsers(ctx: CommandContext<MyContext>) {
    await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
  },

  async changeRole(ctx: CommandContext<MyContext>) {
    await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
  },

  async deleteUser(ctx: CommandContext<MyContext>) {
    await ctx.reply('🚧 Comando en desarrollo. Próximamente disponible.');
  },
};