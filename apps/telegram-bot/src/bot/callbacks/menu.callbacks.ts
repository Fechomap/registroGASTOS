import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { logBotError } from '../../utils/logger';
import { createUsersMenu, createCategoriesMenu, createProfileMenu } from '../menus/main.menu';
import {
  handleMainExpenseCallback,
  handleExpenseStartCallback,
  handleExpenseTypeCallback,
  handleExpenseCompanyCallback,
  handleCategorySelectCallback,
  handleExpenseConfirmSaveCallback,
  handleExpenseFinalSaveCallback,
  handleExpenseCancelCallback,
  handleMainMenuCallback,
  handlePhotoSkipCallback,
  handleDateSelectCallback,
  handleDateBackToOptionsCallback,
} from './expense.callbacks';
import {
  handleCompanyHelp,
  handleCompanyRegisterStart,
  handleCompanyCheck,
  handleCompanyConfirmRegister,
  handleCompanySkipPhone,
} from '../handlers/company-setup.handler';
// import { handleShowReportsPanel } from './reports.callbacks';
import {
  handleShowMovements,
  handleShowFiltersMain,
  handleShowPeriodFilter,
  handleApplyPeriodFilter,
  handleShowTypeFilter,
  handleApplyTypeFilter,
  handleShowCategoriesFilter,
  handleToggleCategory,
  handleShowScopeFilter,
  handleApplyScopeFilter,
  handleApplyFilters,
  handleClearAllFilters,
  handleGenerateReport,
  handleMovementDetail,
  // handleMovementsPage, // Ya no se usa - removido el resumen de movimientos
} from './movements.callbacks';
import {
  handleUsersList,
  handleUsersAdd,
  handleUsersHelpChatId,
  handleUserManage,
  handleUserChangeRole,
  handleUserRoleConfirm,
  handleUserDeleteConfirm,
  handleUserDeleteFinal,
  handleUsersRoles,
} from './users.callbacks';
import { handleCategoriesList, handleCategoriesAdd } from './categories.callbacks';

/**
 * Handler principal para todos los callbacks del menú
 */
export async function handleMenuCallback(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;

  try {
    switch (data) {
      case 'main_menu':
        await handleMainMenuCallback(ctx);
        break;
      case 'main_expense':
        await handleMainExpenseCallback(ctx);
        break;
      case 'main_movements':
        await handleShowMovements(ctx);
        break;
      case 'main_profile':
        await showProfile(ctx);
        break;
      case 'main_users':
        await showUsersMenu(ctx);
        break;
      case 'main_categories':
        await showCategoriesMenu(ctx);
        break;
      case 'main_refresh':
        await handleMainMenuCallback(ctx);
        break;

      // Nuevos callbacks de expense
      case 'expense_start':
        await handleExpenseStartCallback(ctx);
        break;
      case 'expense_type_company':
      case 'expense_type_personal':
        await handleExpenseTypeCallback(ctx);
        break;
      case 'expense_cancel':
        await handleExpenseCancelCallback(ctx);
        break;
      case 'expense_confirm_save':
        await handleExpenseConfirmSaveCallback(ctx);
        break;
      case 'expense_final_save':
        await handleExpenseFinalSaveCallback(ctx);
        break;
      case 'photo_skip':
        await handlePhotoSkipCallback(ctx);
        break;
      case 'date_back_to_options':
        await handleDateBackToOptionsCallback(ctx);
        break;

      // Callbacks de empresa
      case 'company_help':
        await handleCompanyHelp(ctx);
        break;
      case 'company_register_start':
        await handleCompanyRegisterStart(ctx);
        break;
      case 'company_check':
      case 'company_check_status':
        await handleCompanyCheck(ctx);
        break;
      case 'company_confirm_register':
        await handleCompanyConfirmRegister(ctx);
        break;
      case 'company_skip_phone':
        await handleCompanySkipPhone(ctx);
        break;

      // Callbacks de gestión de usuarios
      case 'users_list':
        await handleUsersList(ctx);
        break;
      case 'users_add':
        await handleUsersAdd(ctx);
        break;
      case 'users_help_chatid':
        await handleUsersHelpChatId(ctx);
        break;
      case 'users_roles':
        await handleUsersRoles(ctx);
        break;

      // Callbacks de gestión de categorías
      case 'categories_list':
        await handleCategoriesList(ctx);
        break;
      case 'categories_add':
        await handleCategoriesAdd(ctx);
        break;

      default:
        // Manejar callbacks de usuarios específicos
        if (data?.startsWith('user_manage_')) {
          await handleUserManage(ctx);
          return;
        }

        if (data?.startsWith('user_change_role_')) {
          await handleUserChangeRole(ctx);
          return;
        }

        if (data?.startsWith('user_role_confirm_')) {
          await handleUserRoleConfirm(ctx);
          return;
        }

        if (data?.startsWith('user_delete_confirm_')) {
          await handleUserDeleteConfirm(ctx);
          return;
        }

        if (data?.startsWith('user_delete_final_')) {
          await handleUserDeleteFinal(ctx);
          return;
        }

        // Manejar selección de categorías (expense flow)
        if (data?.startsWith('category_select_')) {
          await handleCategorySelectCallback(ctx);
          return;
        }

        // Manejar selección de empresa
        if (data?.startsWith('expense_company_')) {
          await handleExpenseCompanyCallback(ctx);
          return;
        }

        // Manejar selección de fecha
        if (data?.startsWith('date_select_')) {
          await handleDateSelectCallback(ctx);
          return;
        }

        // Manejar callbacks de filtros de movimientos
        if (data?.startsWith('movements_filters_main')) {
          await handleShowFiltersMain(ctx);
          return;
        }

        if (data?.startsWith('movements_filter_period')) {
          await handleShowPeriodFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_period_')) {
          await handleApplyPeriodFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_filter_type')) {
          await handleShowTypeFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_type_')) {
          await handleApplyTypeFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_filter_categories')) {
          await handleShowCategoriesFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_category_toggle_')) {
          await handleToggleCategory(ctx);
          return;
        }

        if (data?.startsWith('movements_filter_scope')) {
          await handleShowScopeFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_scope_')) {
          await handleApplyScopeFilter(ctx);
          return;
        }

        if (data?.startsWith('movements_apply_filters')) {
          await handleApplyFilters(ctx);
          return;
        }

        if (
          data?.startsWith('movements_clear_filters') ||
          data?.startsWith('movements_clear_all_filters')
        ) {
          await handleClearAllFilters(ctx);
          return;
        }

        if (data?.startsWith('movements_generate_report')) {
          await handleGenerateReport(ctx);
          return;
        }

        if (data?.startsWith('movement_detail_')) {
          await handleMovementDetail(ctx);
          return;
        }

        // Paginación removida - ya no mostramos movimientos individuales

        await ctx.answerCallbackQuery('Opción no reconocida');
    }
  } catch (error) {
    logBotError(error as Error, { command: 'menu_callback' });
    await ctx.answerCallbackQuery('❌ Error al procesar la acción');
  }
}

/**
 * Mostrar Mi Cuenta (perfil + configuración + ayuda)
 */
async function showProfile(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  const keyboard = createProfileMenu();
  const message =
    `⚙️ **Mi Cuenta**\n\n` +
    `👤 **Usuario:** ${user.firstName} ${user.lastName || ''}\n` +
    `👔 **Rol:** ${user.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
    `🏢 **Empresa:** ${user.company.name}\n\n` +
    `Gestiona tu información personal, configuración y obtén ayuda:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de usuarios
 */
async function showUsersMenu(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden gestionar usuarios');
    return;
  }

  const keyboard = createUsersMenu();
  const message =
    `👥 **Gestión de Usuarios**\n\n` +
    `🏢 **Empresa:** ${user.company.name}\n\n` +
    `Administra los usuarios de tu empresa:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de categorías
 */
async function showCategoriesMenu(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden gestionar categorías');
    return;
  }

  const keyboard = createCategoriesMenu();
  const message =
    `📁 **Gestión de Categorías**\n\n` +
    `🏢 **Empresa:** ${user.company.name}\n\n` +
    `Gestiona las categorías de gastos e ingresos:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
  await ctx.answerCallbackQuery();
}
