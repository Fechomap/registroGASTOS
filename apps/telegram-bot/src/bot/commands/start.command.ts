import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository } from '@financial-bot/database';
import { logger } from '../../utils/logger';
import { BOT_MESSAGES, formatUserInfo } from '@financial-bot/shared';

/**
 * Comando /start - Punto de entrada principal del bot
 */
export async function startCommand(ctx: CommandContext<MyContext>) {
  const telegramId = ctx.from!.id.toString();
  const chatId = ctx.chat.id.toString();
  const userInfo = ctx.from!;

  try {
    // Buscar si el usuario ya está registrado
    const user = await userRepository.findByTelegramId(telegramId);

    if (user) {
      // Usuario existente
      if (!user.isActive) {
        await ctx.reply(
          '❌ Tu cuenta está desactivada.\n' + 'Contacta a tu administrador para reactivarla.',
        );
        return;
      }

      // Verificar que el chatId coincida y actualizarlo si es necesario
      if (user.chatId !== chatId) {
        await userRepository.update(user.id, { chatId });
        logger.info('ChatId updated for user', { userId: user.id, newChatId: chatId });
      }

      // Guardar usuario en sesión
      ctx.session.user = user;

      const welcomeMessage =
        `${BOT_MESSAGES.WELCOME}\n\n` +
        `👋 Hola ${formatUserInfo(user)}!\n\n` +
        `🏢 Empresa: ${user.company.name}\n` +
        `👤 Rol: ${user.role === 'ADMIN' ? '👨‍💼 Administrador' : '👤 Operador'}\n\n` +
        `🚀 Usa /ayuda para ver todos los comandos disponibles.`;

      await ctx.reply(welcomeMessage, { parse_mode: 'HTML' });

      logger.info('User started bot', {
        userId: user.id,
        telegramId: user.telegramId,
        role: user.role,
        companyId: user.companyId,
      });
    } else {
      // Usuario nuevo - necesita ser registrado por un admin
      const instructions =
        '👋 ¡Bienvenido al Sistema Financiero!\n\n' +
        '📝 Para usar este bot, necesitas ser registrado por un administrador de tu empresa.\n\n' +
        '📋 <b>Instrucciones para el administrador:</b>\n' +
        '1. Tu Chat ID es: <code>' +
        chatId +
        '</code>\n' +
        '2. Comparte este Chat ID con tu administrador\n' +
        '3. El administrador debe usar el comando:\n' +
        '   <code>/usuario_agregar ' +
        chatId +
        ' Tu Nombre</code>\n\n' +
        '💡 <b>¿Cómo obtener tu Chat ID?</b>\n' +
        'También puedes obtenerlo enviando un mensaje a @userinfobot\n\n' +
        '❓ Si tienes dudas, contacta a tu administrador.';

      await ctx.reply(instructions, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });

      logger.info('New user attempted to start bot', {
        telegramId,
        chatId,
        username: userInfo.username,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name,
      });
    }
  } catch (error) {
    logger.error('Error in start command:', error);
    await ctx.reply(BOT_MESSAGES.ERROR_GENERIC);
  }
}
