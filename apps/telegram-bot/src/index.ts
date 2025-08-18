import { Bot, session } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { hydrate } from '@grammyjs/hydrate';
import { createClient } from 'redis';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Solo cargar dotenv en desarrollo - Railway inyecta variables automáticamente
if (process.env.NODE_ENV !== 'production') {
  try {
    const envPath = path.resolve(__dirname, '../../../', '.env');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      logger.warn('Error loading .env file:', result.error);
    }
  } catch (error) {
    logger.info('dotenv not available - using environment variables');
  }
}
import { MyContext, SessionData } from './types';
import { authMiddleware } from './middleware/auth';
import { errorMiddleware } from './middleware/error';
import { loggingMiddleware } from './middleware/logging';
import { setupCommands } from './bot/commands';
import { setupScenes } from './bot/scenes';

// Configuración del bot
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const REDIS_URL = process.env.REDIS_URL;

if (!BOT_TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN es requerido');
  process.exit(1);
}

// Crear instancia del bot
const bot = new Bot<MyContext>(BOT_TOKEN);

// Configurar cliente Redis para sesiones (opcional)
let redisClient: ReturnType<typeof createClient> | null = null;
if (REDIS_URL) {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err: Error) => {
      logger.error('Redis error:', err);
    });
    redisClient.connect();
    logger.info('✅ Redis conectado para sesiones');
  } catch (error) {
    logger.warn('⚠️ No se pudo conectar a Redis, usando sesiones en memoria');
  }
}

// Configurar middleware
bot.use(hydrate());

// Sesiones
bot.use(
  session({
    initial: (): SessionData => ({ user: undefined, conversationData: {} }),
    // Usar Redis si está disponible, sino memoria
    storage: redisClient ? undefined : undefined, // TODO: Implementar RedisAdapter
  }),
);

// Conversaciones
bot.use(conversations());

// Middleware personalizado
bot.use(loggingMiddleware);
bot.use(errorMiddleware);
bot.use(authMiddleware);

// Configurar comandos y escenas
setupCommands(bot);
setupScenes(bot);

// Manejo de errores no capturados
bot.catch(err => {
  logger.error('Error no capturado en el bot:', err);
});

// Función para iniciar el bot
async function startBot() {
  try {
    // Configurar webhook o polling según el entorno
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      const webhookUrl = process.env.WEBHOOK_URL;
      await bot.api.setWebhook(webhookUrl, {
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      });
      logger.info(`✅ Webhook configurado: ${webhookUrl}`);
    } else {
      // Modo polling para desarrollo
      await bot.api.deleteWebhook();
      bot.start({
        onStart: botInfo => {
          logger.info(`✅ Bot iniciado: @${botInfo.username}`);
        },
      });
    }
  } catch (error) {
    logger.error('❌ Error al iniciar el bot:', error);
    process.exit(1);
  }
}

// Manejo de señales del sistema
process.once('SIGINT', async () => {
  logger.info('📴 Deteniendo bot...');
  await bot.stop();
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('📴 Deteniendo bot...');
  await bot.stop();
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

// Iniciar el bot
startBot().catch(error => {
  logger.error('❌ Error fatal:', error);
  process.exit(1);
});

export { bot };
