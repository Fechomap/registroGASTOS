import { MovementType } from '../types';

/**
 * Formatea un monto de dinero
 */
export function formatCurrency(amount: number | string, currency = 'MXN'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '$ 0.00';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Formatea una fecha
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'time' = 'short',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Mexico_City',
  };

  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
  }

  return new Intl.DateTimeFormat('es-MX', options).format(dateObj);
}

/**
 * Formatea un tipo de movimiento
 */
export function formatMovementType(type: MovementType): string {
  switch (type) {
    case MovementType.EXPENSE:
      return '💸 Gasto';
    case MovementType.INCOME:
      return '💰 Ingreso';
    default:
      return '❓ Desconocido';
  }
}

/**
 * Formatea un rol de usuario
 */
export function formatUserRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '👨‍💼 Administrador';
    case 'OPERATOR':
      return '👤 Operador';
    default:
      return '❓ Desconocido';
  }
}

/**
 * Formatea un número de teléfono
 */
export function formatPhone(phone: string): string {
  // Eliminar caracteres no numéricos excepto el +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Si empieza con +52 (México)
  if (cleaned.startsWith('+52')) {
    const number = cleaned.slice(3);
    if (number.length === 10) {
      return `+52 ${number.slice(0, 2)} ${number.slice(2, 6)} ${number.slice(6)}`;
    }
  }

  // Si es un número de 10 dígitos sin código de país
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return phone; // Retornar original si no coincide con patrones
}

/**
 * Trunca un texto a una longitud específica
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Genera un resumen de período de fechas
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = formatDate(startDate, 'short');
  const end = formatDate(endDate, 'short');

  if (start === end) {
    return start;
  }

  return `${start} - ${end}`;
}

/**
 * Formatea un tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  if (bytes === 0) {
    return '0 Bytes';
  }

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(2)} ${sizes[i]}`;
}

/**
 * Genera un mensaje de estado para procesamiento
 */
export function formatProcessingStatus(status: string): string {
  switch (status) {
    case 'PENDING':
      return '⏳ Pendiente';
    case 'PROCESSING':
      return '🔄 Procesando';
    case 'COMPLETED':
      return '✅ Completado';
    case 'FAILED':
      return '❌ Fallido';
    default:
      return '❓ Desconocido';
  }
}

/**
 * Escapa caracteres especiales para Markdown
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Formatea un mensaje de error para el usuario
 */
export function formatError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  return `❌ ${message}`;
}

/**
 * Formatea un mensaje de éxito
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Formatea información de usuario
 */
export function formatUserInfo(user: {
  firstName: string;
  lastName?: string | null;
  username?: string | null;
}): string {
  let name = user.firstName;

  if (user.lastName) {
    name += ` ${user.lastName}`;
  }

  if (user.username) {
    name += ` (@${user.username})`;
  }

  return name;
}
