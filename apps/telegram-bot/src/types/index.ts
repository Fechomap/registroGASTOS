import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';
import { HydrateFlavor } from '@grammyjs/hydrate';
import { User, Company, UserWithCompany } from '@financial-bot/database';

// Datos de sesión 
export interface SessionData {
  user?: UserWithCompany;
  conversationData?: {
    registerFlow?: RegisterFlowData;
    companyRegistration?: CompanyRegistrationData;
    [key: string]: unknown;
  };
}

// Datos para registro de empresa
export interface CompanyRegistrationData {
  step: 'name' | 'email' | 'phone' | 'confirm';
  name?: string;
  email?: string;
  phone?: string;
}

// Contexto personalizado del bot
export type MyContext = Context & 
  SessionFlavor<SessionData> & 
  ConversationFlavor &
  HydrateFlavor<Context>;

// Datos para comandos rápidos
export interface QuickExpenseData {
  amount: number;
  description: string;
}

export interface QuickIncomeData {
  amount: number;
  description: string;
}

// Datos para el flujo de registro paso a paso
export interface RegisterFlowData {
  step: 'expense_type' | 'company_select' | 'amount' | 'description' | 'category' | 'confirm';
  expenseType?: 'COMPANY' | 'PERSONAL'; // Nuevo campo para tipo de gasto
  companyId?: string; // Empresa seleccionada (solo para gastos de empresa)
  amount?: number;
  description?: string;
  categoryId?: string;
  date?: Date;
  attachments?: string[];
}

// Datos para el flujo de edición
export interface EditFlowData {
  step: 'select_field' | 'enter_value' | 'confirm';
  movementId: string;
  field?: 'amount' | 'description' | 'category' | 'date';
  newValue?: unknown;
}

// Datos para gestión de usuarios
export interface UserManagementData {
  step: 'action' | 'chat_id' | 'name' | 'role' | 'confirm';
  action?: 'add' | 'edit' | 'delete' | 'list';
  chatId?: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'OPERATOR';
}

// Datos para categorías
export interface CategoryManagementData {
  step: 'action' | 'name' | 'icon' | 'color' | 'parent' | 'confirm' | 'select_field';
  action?: 'add' | 'edit' | 'delete' | 'list';
  categoryId?: string;
  name?: string;
  icon?: string;
  color?: string;
  parentId?: string;
}

// Datos para reportes
export interface ReportFlowData {
  step: 'type' | 'filters' | 'format' | 'generate';
  type?: 'movements' | 'summary' | 'categories';
  format?: 'excel' | 'pdf';
  filters?: {
    userId?: string;
    categoryId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    movementType?: 'EXPENSE' | 'INCOME';
  };
}

// Estado de conversaciones
export type ConversationState = 
  | RegisterFlowData
  | EditFlowData
  | UserManagementData
  | CategoryManagementData
  | ReportFlowData;

// Middleware de autenticación
export interface AuthMiddleware {
  requireAuth: boolean;
  requireRole?: 'ADMIN' | 'OPERATOR';
}

// Configuración del bot
export interface BotConfig {
  token: string;
  webhookSecret?: string;
  redisUrl?: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Respuesta de comando
export interface CommandResponse {
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: unknown;
  disableWebPagePreview?: boolean;
}

// Error del bot
export interface BotError extends Error {
  code?: string;
  userId?: string;
  chatId?: string;
  command?: string;
}

// Datos para gestión de modo y compañías
export interface CompanyModeData {
  step: 'select_mode' | 'select_company' | 'confirm';
  mode?: 'COMPANY' | 'PERSONAL';
  companyId?: string;
}

export { User, Company };