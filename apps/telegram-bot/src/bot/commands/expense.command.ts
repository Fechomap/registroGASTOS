import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { startExpenseFlow } from '../handlers/conversation.handler';

/**
 * Comando /gasto - Inicia el flujo de registro de gasto
 * Ahora usa un flujo guiado con botones para mejor UX
 */
export async function expenseCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;
  
  if (!user) {
    await ctx.reply('❌ No estás registrado.');
    return;
  }

  // Iniciar el flujo de conversación para registro de gasto
  await startExpenseFlow(ctx);
}