import { NextFunction } from 'grammy';
import { MyContext } from '../types';
import { userRepository } from '@financial-bot/database';
import { logger } from '../utils/logger';
import { BOT_MESSAGES } from '@financial-bot/shared';

/**
 * Middleware de autenticación que verifica si el usuario está registrado
 */
export async function authMiddleware(ctx: MyContext, next: NextFunction) {
  // Comandos que no requieren autenticación
  const publicCommands = [
    '/start',
    '/setup_super_admin',
    '/register_company',
    '/help',
    '/ayuda',
    '/admin_companies',
    '/approve_company',
    '/reject_company',
  ];
  const command = ctx.message?.text?.split(' ')[0];

  if (command && publicCommands.includes(command)) {
    return next();
  }

  try {
    const telegramId = ctx.from?.id?.toString();
    const chatId = ctx.chat?.id?.toString();

    if (!telegramId || !chatId) {
      return;
    }

    // Verificar si ya tenemos el usuario en sesión
    if (ctx.session.user) {
      return next();
    }

    // Buscar usuario en la base de datos
    const user = await userRepository.findByTelegramId(telegramId);

    if (!user) {
      await ctx.reply(BOT_MESSAGES.NOT_REGISTERED);
      return;
    }

    if (!user.isActive) {
      await ctx.reply('❌ Tu cuenta está desactivada. Contacta a tu administrador.');
      return;
    }

    // Verificar que el chatId coincida
    if (user.chatId !== chatId) {
      logger.warn('ChatId mismatch', {
        userId: user.id,
        expectedChatId: user.chatId,
        actualChatId: chatId,
      });
      await ctx.reply('❌ Error de autenticación. Contacta a tu administrador.');
      return;
    }

    // Guardar usuario en la sesión
    ctx.session.user = user;

    logger.info('User authenticated', {
      userId: user.id,
      telegramId: user.telegramId,
      chatId: user.chatId,
      role: user.role,
    });

    return next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    await ctx.reply(BOT_MESSAGES.ERROR_GENERIC);
  }
}

/**
 * Middleware que requiere rol de administrador
 */
export function requireAdmin(ctx: MyContext, next: NextFunction) {
  if (!ctx.session.user) {
    ctx.reply(BOT_MESSAGES.NOT_REGISTERED);
    return;
  }

  if (ctx.session.user.role !== 'ADMIN') {
    ctx.reply(BOT_MESSAGES.UNAUTHORIZED);
    return;
  }

  return next();
}

/**
 * Helper para verificar si el usuario es admin
 */
export function isAdmin(ctx: MyContext): boolean {
  return ctx.session.user?.role === 'ADMIN';
}

/**
 * Helper para verificar si el usuario puede editar un movimiento
 */
export function canEditMovement(ctx: MyContext, movementUserId: string): boolean {
  const user = ctx.session.user;
  if (!user) return false;

  // Admin puede editar cualquier movimiento
  if (user.role === 'ADMIN') return true;

  // Operador solo puede ver sus propios movimientos (no editar)
  return false;
}

/**
 * Helper para verificar si el usuario puede ver un movimiento
 */
export function canViewMovement(ctx: MyContext, movementUserId: string): boolean {
  const user = ctx.session.user;
  if (!user) return false;

  // Admin puede ver cualquier movimiento
  if (user.role === 'ADMIN') return true;

  // Operador solo puede ver sus propios movimientos
  return user.id === movementUserId;
}
