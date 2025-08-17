import { NextFunction } from 'grammy';
import { MyContext } from '../types';
import { logger, logUserActivity } from '../utils/logger';

/**
 * Middleware para logging de actividad del bot
 */
export async function loggingMiddleware(ctx: MyContext, next: NextFunction) {
  const startTime = Date.now();

  // Extraer información del contexto
  const userId = ctx.from?.id?.toString();
  const chatId = ctx.chat?.id?.toString();
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  const messageText = ctx.message?.text;
  const updateType = getUpdateType(ctx);

  // Log de la request entrante
  logger.debug('Incoming update', {
    updateType,
    userId,
    chatId,
    username,
    messageText: messageText?.substring(0, 100), // Truncar mensajes largos
  });

  try {
    await next();

    // Log de actividad exitosa
    const duration = Date.now() - startTime;

    if (messageText?.startsWith('/')) {
      const command = messageText.split(' ')[0];
      logUserActivity('command_executed', {
        userId,
        chatId,
        username,
        data: {
          command,
          duration,
          success: true,
        },
      });
    }

    logger.debug('Update processed successfully', {
      updateType,
      userId,
      duration,
    });
  } catch (error) {
    // Log de error (el error middleware se encargará del manejo)
    const duration = Date.now() - startTime;

    logger.warn('Update processing failed', {
      updateType,
      userId,
      chatId,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-lanzar el error para que lo maneje el error middleware
    throw error;
  }
}

/**
 * Determina el tipo de update
 */
function getUpdateType(ctx: MyContext): string {
  if (ctx.message) {
    if (ctx.message.text) return 'text_message';
    if (ctx.message.photo) return 'photo_message';
    if (ctx.message.document) return 'document_message';
    if (ctx.message.voice) return 'voice_message';
    return 'other_message';
  }

  if (ctx.callbackQuery) return 'callback_query';
  if (ctx.inlineQuery) return 'inline_query';

  return 'unknown';
}

/**
 * Helper para loggear comandos específicos con datos adicionales
 */
export function logCommand(ctx: MyContext, command: string, data?: Record<string, unknown>) {
  logUserActivity('command_started', {
    userId: ctx.from?.id?.toString(),
    chatId: ctx.chat?.id?.toString(),
    username: ctx.from?.username,
    data: {
      command,
      ...data,
    },
  });
}

/**
 * Helper para loggear métricas de performance
 */
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>,
) {
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata,
  });
}
