import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Configurar formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Configurar transportes
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction 
      ? logFormat
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
  }),
];

// En producción, agregar archivo de logs
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    })
  );
}

// Crear logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Función helper para loggear errores del bot
export function logBotError(error: Error, context?: {
  userId?: string;
  chatId?: string;
  command?: string;
  update?: unknown;
}) {
  logger.error('Bot Error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });
}

// Función helper para loggear actividad del usuario
export function logUserActivity(action: string, context: {
  userId?: string;
  chatId?: string;
  username?: string;
  data?: unknown;
}) {
  logger.info('User Activity', {
    action,
    ...context,
  });
}

// Función helper para loggear métricas
export function logMetrics(metric: string, value: number, tags?: Record<string, string>) {
  logger.info('Metrics', {
    metric,
    value,
    tags,
    timestamp: new Date().toISOString(),
  });
}