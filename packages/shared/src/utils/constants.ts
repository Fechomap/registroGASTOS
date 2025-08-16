// Comandos del bot
export const BOT_COMMANDS = {
  // Comandos generales
  START: 'start',
  HELP: 'ayuda',
  PROFILE: 'perfil',
  MOVEMENTS: 'movimientos',

  // Comandos de registro
  EXPENSE: 'gasto',
  INCOME: 'ingreso',
  PHOTO: 'foto',
  REGISTER: 'registrar',

  // Comandos administrativos
  COMPANY_INFO: 'empresa',
  USER_ADD: 'usuario_agregar',
  USER_LIST: 'usuario_lista',
  USER_ROLE: 'usuario_rol',
  USER_DELETE: 'usuario_eliminar',
  EDIT: 'editar',
  DELETE: 'eliminar',
  REPORT: 'reporte',
  CATEGORIES: 'categorias',
} as const;

// Mensajes del bot
export const BOT_MESSAGES = {
  WELCOME: '🎉 ¡Bienvenido al Sistema Financiero!',
  NOT_REGISTERED: '❌ No estás registrado. Contacta a tu administrador.',
  UNAUTHORIZED: '❌ No tienes permisos para realizar esta acción.',
  INVALID_COMMAND: '❌ Comando inválido. Usa /ayuda para ver los comandos disponibles.',
  ERROR_GENERIC: '❌ Ocurrió un error. Intenta nuevamente.',
  SUCCESS_GENERIC: '✅ Operación completada exitosamente.',

  // Comandos específicos
  EXPENSE_CREATED: '✅ Gasto registrado exitosamente',
  INCOME_CREATED: '✅ Ingreso registrado exitosamente',
  MOVEMENT_UPDATED: '✅ Movimiento actualizado exitosamente',
  MOVEMENT_DELETED: '✅ Movimiento eliminado exitosamente',
  USER_CREATED: '✅ Usuario agregado exitosamente',
  USER_UPDATED: '✅ Usuario actualizado exitosamente',
  USER_DELETED: '✅ Usuario eliminado exitosamente',
  CATEGORY_CREATED: '✅ Categoría creada exitosamente',
  CATEGORY_UPDATED: '✅ Categoría actualizada exitosamente',
  CATEGORY_DELETED: '✅ Categoría eliminada exitosamente',

  // Procesamiento de IA
  AI_PROCESSING: '🔄 Procesando imagen con IA...',
  AI_SUCCESS: '✅ Datos extraídos exitosamente',
  AI_FAILED: '❌ No se pudieron extraer datos de la imagen',
  AI_CONFIRM: '📋 Confirma los datos extraídos:',
} as const;

// Emojis
export const EMOJIS = {
  MONEY: '💰',
  EXPENSE: '💸',
  INCOME: '💰',
  CAMERA: '📷',
  DOCUMENT: '📄',
  USER: '👤',
  ADMIN: '👨‍💼',
  COMPANY: '🏢',
  CATEGORY: '📁',
  REPORT: '📊',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '🔄',
  CLOCK: '⏰',
  CALENDAR: '📅',
  PENCIL: '✏️',
  TRASH: '🗑️',
  PLUS: '➕',
  MINUS: '➖',
  LIST: '📋',
  SEARCH: '🔍',
  FILTER: '🔽',
  EXPORT: '📤',
} as const;

// Límites del sistema
export const LIMITS = {
  MAX_MOVEMENT_AMOUNT: 999999.99,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_COMPANY_NAME_LENGTH: 100,
  MAX_USER_NAME_LENGTH: 50,
  MAX_CATEGORY_NAME_LENGTH: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_USERS_PER_COMPANY: 100,
  MAX_MOVEMENTS_PER_DAY: 1000,
  MAX_CATEGORIES_PER_COMPANY: 100,

  // Paginación
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Tipos de archivo permitidos
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png'],
  DOCUMENTS: ['application/pdf'],
  ALL: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
} as const;

// Configuración de fechas
export const DATE_CONFIG = {
  TIMEZONE: 'America/Mexico_City',
  LOCALE: 'es-MX',
  FORMATS: {
    SHORT: 'dd/MM/yyyy',
    LONG: 'EEEE, d MMMM yyyy',
    TIME: 'HH:mm',
    DATETIME: 'dd/MM/yyyy HH:mm',
  },
} as const;

// Monedas soportadas
export const CURRENCIES = {
  MXN: {
    code: 'MXN',
    symbol: '$',
    name: 'Peso Mexicano',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Americano',
    decimals: 2,
  },
} as const;

// Configuración de reportes
export const REPORT_CONFIG = {
  MAX_ROWS_EXCEL: 50000,
  MAX_ROWS_PDF: 1000,
  DEFAULT_FONT_SIZE: 12,
  EXCEL_SHEET_NAMES: {
    MOVEMENTS: 'Movimientos',
    SUMMARY: 'Resumen',
    CATEGORIES: 'Categorías',
  },
} as const;

// Configuración de Redis (sesiones)
export const REDIS_CONFIG = {
  SESSION_TTL: 3600, // 1 hora
  CACHE_TTL: 300, // 5 minutos
  PREFIX: 'financial-bot:',
  KEYS: {
    SESSION: 'session:',
    USER_CACHE: 'user:',
    COMPANY_CACHE: 'company:',
    RATE_LIMIT: 'rate_limit:',
  },
} as const;

// Configuración de notificaciones
export const NOTIFICATION_CONFIG = {
  DAILY_REPORT_HOUR: 18, // 6 PM
  INSTANT_DELAY: 1000, // 1 segundo
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 segundos
} as const;

// Niveles de log
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// Códigos de error
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;
