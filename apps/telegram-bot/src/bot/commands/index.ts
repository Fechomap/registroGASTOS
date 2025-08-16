import { Bot } from 'grammy';
import { MyContext } from '../../types';
import { startCommand } from './start.command';
import { helpCommand } from './help.command';
import { profileCommand } from './profile.command';
import { expenseCommand } from './expense.command';
import { incomeCommand } from './income.command';
import { movementsCommand } from './movements.command';
import { companyCommand } from './company.command';
import { userCommands } from './user.commands';
import { reportCommand } from './report.command';
import { editCommand } from './edit.command';
import { deleteCommand } from './delete.command';

/**
 * Configurar todos los comandos del bot
 */
export function setupCommands(bot: Bot<MyContext>) {
  // Comandos básicos (disponibles para todos)
  bot.command('start', startCommand);
  bot.command('ayuda', helpCommand);
  bot.command('help', helpCommand); // Alias en inglés
  
  // Comandos que requieren autenticación
  bot.command('perfil', profileCommand);
  bot.command('profile', profileCommand); // Alias en inglés
  
  // Comandos de registro
  bot.command('gasto', expenseCommand);
  bot.command('expense', expenseCommand); // Alias en inglés
  bot.command('ingreso', incomeCommand);
  bot.command('income', incomeCommand); // Alias en inglés
  
  // Comandos de consulta
  bot.command('movimientos', movementsCommand);
  bot.command('movements', movementsCommand); // Alias en inglés
  
  // Comandos administrativos
  bot.command('empresa', companyCommand);
  bot.command('company', companyCommand); // Alias en inglés
  
  // Comandos de gestión de usuarios (solo admin)
  bot.command('usuario_agregar', userCommands.addUser);
  bot.command('usuario_lista', userCommands.listUsers);
  bot.command('usuario_rol', userCommands.changeRole);
  bot.command('usuario_eliminar', userCommands.deleteUser);
  
  // Comandos de edición (solo admin)
  bot.command('editar', editCommand);
  bot.command('edit', editCommand); // Alias en inglés
  bot.command('eliminar', deleteCommand);
  bot.command('delete', deleteCommand); // Alias en inglés
  
  // Comandos de reportes
  bot.command('reporte', reportCommand);
  bot.command('report', reportCommand); // Alias en inglés

  // Manejar mensajes de texto que no son comandos
  bot.on('message:text', async (ctx) => {
    // Si no es un comando, sugerir usar /ayuda
    if (!ctx.message.text.startsWith('/')) {
      await ctx.reply(
        '🤔 No entiendo ese mensaje. Usa /ayuda para ver los comandos disponibles.',
        { reply_to_message_id: ctx.message.message_id }
      );
    }
  });

  // Manejar fotos (para procesamiento con IA)
  bot.on('message:photo', async (ctx) => {
    await ctx.reply(
      '📷 Imagen recibida. En la próxima versión podrás procesar tickets automáticamente con IA.\n\n' +
      'Por ahora, usa /gasto [monto] [descripción] para registrar gastos manualmente.'
    );
  });

  // Manejar documentos
  bot.on('message:document', async (ctx) => {
    await ctx.reply(
      '📄 Documento recibido. En la próxima versión podrás procesar facturas automáticamente.\n\n' +
      'Por ahora, usa /gasto [monto] [descripción] para registrar gastos manualmente.'
    );
  });
}