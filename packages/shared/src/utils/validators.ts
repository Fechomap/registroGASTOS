import { z } from 'zod';
import { UserRole, MovementType } from '../types';

// Validadores básicos
export const positiveNumber = z.number().positive('Debe ser un número positivo');
export const nonEmptyString = z.string().min(1, 'Este campo es requerido');
export const telegramId = z.string().regex(/^\d+$/, 'ID de Telegram inválido');
export const currency = z.string().length(3, 'Código de moneda debe tener 3 caracteres');

// Validador para montos
export const amountSchema = z.object({
  amount: positiveNumber.max(999999.99, 'Monto máximo excedido'),
  currency: currency.default('MXN'),
});

// Validador para crear empresa
export const createCompanySchema = z.object({
  name: nonEmptyString.max(100, 'Nombre muy largo'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Teléfono inválido'),
  settings: z.object({}).optional(),
});

// Validador para crear usuario
export const createUserSchema = z.object({
  telegramId: telegramId,
  chatId: nonEmptyString,
  companyId: nonEmptyString,
  firstName: nonEmptyString.max(50, 'Nombre muy largo'),
  lastName: z.string().max(50, 'Apellido muy largo').optional(),
  username: z.string().max(50, 'Username muy largo').optional(),
  role: z.nativeEnum(UserRole).default(UserRole.OPERATOR),
});

// Validador para actualizar usuario
export const updateUserSchema = createUserSchema.partial().omit({
  telegramId: true,
  companyId: true,
});

// Validador para crear movimiento
export const createMovementSchema = z.object({
  companyId: nonEmptyString,
  userId: nonEmptyString,
  type: z.nativeEnum(MovementType),
  amount: positiveNumber,
  currency: currency.default('MXN'),
  date: z.date(),
  categoryId: z.string().optional(),
  description: nonEmptyString.max(500, 'Descripción muy larga'),
  vendorName: z.string().max(100, 'Nombre del proveedor muy largo').optional(),
  invoiceNumber: z.string().max(50, 'Número de factura muy largo').optional(),
  metadata: z.object({}).optional(),
});

// Validador para actualizar movimiento
export const updateMovementSchema = createMovementSchema.partial().omit({
  companyId: true,
  userId: true,
});

// Validador para crear categoría
export const createCategorySchema = z.object({
  companyId: nonEmptyString,
  name: nonEmptyString.max(50, 'Nombre muy largo'),
  icon: z.string().max(10, 'Ícono muy largo').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color hex inválido').optional(),
  parentId: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

// Validador para filtros de movimientos
export const movementFiltersSchema = z.object({
  companyId: nonEmptyString,
  userId: z.string().optional(),
  type: z.nativeEnum(MovementType).optional(),
  categoryId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  amountFrom: z.number().min(0).optional(),
  amountTo: z.number().min(0).optional(),
});

// Validador para paginación
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Validador para comandos del bot
export const expenseCommandSchema = z.object({
  amount: positiveNumber,
  description: nonEmptyString.max(500),
});

export const incomeCommandSchema = expenseCommandSchema;

// Validador para datos de IA
export const aiExtractionSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  vendorName: z.string().optional(),
  date: z.date().optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.object({}).optional(),
});

// Validador para archivos
export const fileUploadSchema = z.object({
  filename: nonEmptyString,
  mimetype: z.string().regex(/^(image|application)\/(jpeg|jpg|png|pdf)$/, 'Tipo de archivo no permitido'),
  size: z.number().max(10 * 1024 * 1024, 'Archivo muy grande (máximo 10MB)'),
});

// Validador para configuración de empresa
export const companySettingsSchema = z.object({
  currency: currency.default('MXN'),
  timezone: z.string().default('America/Mexico_City'),
  notifications: z.object({
    instant: z.boolean().default(true),
    daily: z.boolean().default(true),
    email: z.boolean().default(false),
  }).default({}),
  limits: z.object({
    maxUsers: z.number().int().min(1).max(100).default(10),
    maxMovementsPerDay: z.number().int().min(1).max(1000).default(100),
  }).default({}),
});

// Función helper para validar datos
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Datos inválidos: ${message}`);
    }
    throw error;
  }
}

// Función helper para validación parcial
export function validatePartialData<T extends Record<string, any>>(
  schema: z.ZodObject<any>, 
  data: unknown
): Partial<T> {
  try {
    return schema.partial().parse(data) as Partial<T>;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Datos inválidos: ${message}`);
    }
    throw error;
  }
}