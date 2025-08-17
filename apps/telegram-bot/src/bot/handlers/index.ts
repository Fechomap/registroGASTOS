/**
 * Exportaciones centralizadas para todos los handlers del bot
 */

// Handler principal de conversaciones
export {
  handleConversationMessage,
  startExpenseFlow,
  processExpenseTypeSelection,
  processCompanySelection,
  confirmExpense,
  saveExpense,
} from './conversation.handler';

// Handler para cambio de modo (archivo legacy - ya no usado)
// export * from './mode-switch.handler';
