/**
 * Exportaciones centralizadas para todos los menús del bot
 */

// Menú principal
export {
  createMainMenu,
  getMainMenuMessage,
  createAdminMenu,
  createUsersMenu,
  createReportsMenu,
  createProfileMenu
} from './main.menu';

// Menús de gastos
export {
  createExpenseTypeMenu,
  createCompanySelectMenu,
  createExpenseConfirmMenu,
  createExpenseEditMenu,
  createCategoriesMenu,
  getExpenseTypeMessage,
  getCompanySelectMessage,
  getExpenseSummaryMessage,
  getExpenseSuccessMessage
} from './expense.menu';