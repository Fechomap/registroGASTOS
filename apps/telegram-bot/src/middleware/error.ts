import { NextFunction } from 'grammy';
import { MyContext } from '../types';
import { logger, logBotError } from '../utils/logger';
import { 
  AppError, 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError,
  isAppError 
} from '@financial-bot/shared';

/**
 * Middleware para manejo centralizado de errores
 */
export async function errorMiddleware(ctx: MyContext, next: NextFunction) {
  try {
    await next();
  } catch (error) {
    await handleBotError(ctx, error);
  }
}

/**
 * Maneja errores específicos del bot
 */
async function handleBotError(ctx: MyContext, error: unknown) {
  const userId = ctx.from?.id?.toString();
  const chatId = ctx.chat?.id?.toString();
  const command = ctx.message?.text?.split(' ')[0];

  // Log del error
  logBotError(
    error instanceof Error ? error : new Error(String(error)),
    {
      userId,
      chatId,
      command,
      update: ctx.update,
    }
  );

  let userMessage = '❌ Ocurrió un error inesperado. Intenta nuevamente.';

  if (isAppError(error)) {
    userMessage = handleAppError(error);
  } else if (error instanceof Error) {
    userMessage = handleGenericError(error);
  }

  // Enviar mensaje de error al usuario
  try {
    await ctx.reply(userMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (replyError) {
    logger.error('Error sending error message to user:', replyError);
  }
}

/**
 * Maneja errores de la aplicación (AppError y subclases)
 */
function handleAppError(error: AppError): string {
  switch (error.constructor) {
    case ValidationError:
      return `❌ Datos inválidos: ${error.message}`;
    
    case UnauthorizedError:
      return '❌ No estás autorizado para realizar esta acción.';
    
    case ForbiddenError:
      return '❌ No tienes permisos para realizar esta acción.';
    
    case NotFoundError:
      return `❌ ${error.message}`;
    
    default:
      return `❌ ${error.message}`;
  }
}

/**
 * Maneja errores genéricos
 */
function handleGenericError(error: Error): string {
  // Errores específicos que podemos manejar
  if (error.message.includes('NETWORK')) {
    return '❌ Error de conexión. Verifica tu internet e intenta nuevamente.';
  }

  if (error.message.includes('TIMEOUT')) {
    return '❌ La operación tardó demasiado. Intenta nuevamente.';
  }

  if (error.message.includes('RATE_LIMIT')) {
    return '❌ Demasiadas solicitudes. Espera un momento e intenta nuevamente.';
  }

  // Error genérico
  return '❌ Ocurrió un error inesperado. Si el problema persiste, contacta al administrador.';
}

/**
 * Helper para crear y lanzar errores de validación
 */
export function throwValidationError(message: string, details?: unknown): never {
  throw new ValidationError(message, details);
}

/**
 * Helper para crear y lanzar errores de autorización
 */
export function throwUnauthorizedError(message?: string): never {
  throw new UnauthorizedError(message);
}

/**
 * Helper para crear y lanzar errores de permisos
 */
export function throwForbiddenError(message?: string): never {
  throw new ForbiddenError(message);
}

/**
 * Helper para crear y lanzar errores de recurso no encontrado
 */
export function throwNotFoundError(message?: string): never {
  throw new NotFoundError(message);
}