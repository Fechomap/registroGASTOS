/**
 * Exportaciones centralizadas para todas las conversaciones del bot
 */

// Conversación principal de gastos
export { 
  handleConversationMessage,
  startExpenseFlow,
  processExpenseTypeSelection,
  processCompanySelection,
  confirmExpense,
  saveExpense
} from '../handlers/conversation.handler';

// Tipos de datos para conversaciones
export type { RegisterFlowData } from '../../types';