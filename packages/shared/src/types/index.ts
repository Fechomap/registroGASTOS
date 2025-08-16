// Re-export de tipos principales de Prisma
export { UserRole, MovementType, ProcessingStatus } from '@prisma/client';

// Tipos para el contexto del bot
export interface BotContext {
  user?: {
    id: string;
    telegramId: string;
    chatId: string;
    companyId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    role: UserRole;
    isActive: boolean;
  };
  company?: {
    id: string;
    name: string;
    settings: unknown;
  };
}

// Tipos para comandos del bot
export interface CommandData {
  command: string;
  args: string[];
  text?: string;
}

// Tipos para respuestas del bot
export interface BotResponse {
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: unknown;
}

// Tipos para filtros de reportes
export interface ReportFilters {
  companyId: string;
  userId?: string;
  type?: MovementType;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
}

// Tipos para paginación
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos para respuestas de API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos para notificaciones
export interface NotificationData {
  type: 'INSTANT' | 'DAILY_SUMMARY';
  companyId: string;
  recipientId: string;
  content: string;
  metadata?: unknown;
}

// Tipos para IA
export interface AIExtractionResult {
  amount?: number;
  currency?: string;
  description?: string;
  vendorName?: string;
  date?: Date;
  confidence: number;
  metadata?: unknown;
}

export interface VisionProcessingRequest {
  imageUrl: string;
  prompt?: string;
}

export interface VoiceProcessingRequest {
  audioUrl: string;
  language?: string;
}

// Tipos para archivos
export interface FileUpload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

export interface StorageResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
}

// Tipos para errores
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
}

// Enum para comandos del bot
export enum BotCommands {
  START = 'start',
  HELP = 'ayuda',
  PROFILE = 'perfil',
  EXPENSE = 'gasto',
  INCOME = 'ingreso',
  PHOTO = 'foto',
  REGISTER = 'registrar',
  MOVEMENTS = 'movimientos',
  COMPANY_INFO = 'empresa',
  USER_ADD = 'usuario_agregar',
  USER_LIST = 'usuario_lista',
  USER_ROLE = 'usuario_rol',
  USER_DELETE = 'usuario_eliminar',
  EDIT = 'editar',
  DELETE = 'eliminar',
  REPORT = 'reporte',
  CATEGORIES = 'categorias',
}

// Tipos para escenas conversacionales
export interface SceneData {
  step: number;
  data: Record<string, unknown>;
}

export { UserRole, MovementType, ProcessingStatus };