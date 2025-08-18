import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { logBotError } from '../../utils/logger';
import {
  createAdminMenu,
  createUsersMenu,
  createReportsMenu,
  createProfileMenu,
} from '../menus/main.menu';
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
        await showMovements(ctx);
        break;
      case 'main_profile':
        await showProfile(ctx);
        break;
      case 'main_help':
        await showHelp(ctx);
        break;
      case 'main_admin':
        await showAdminMenu(ctx);
        break;
      case 'main_reports':
        await showReportsMenu(ctx);
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

      default:
        // Manejar selección de categorías
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

        await ctx.answerCallbackQuery('Opción no reconocida');
    }
  } catch (error) {
    logBotError(error as Error, { command: 'menu_callback' });
    await ctx.answerCallbackQuery('❌ Error al procesar la acción');
  }
}

/**
 * Mostrar movimientos del usuario
 */
async function showMovements(ctx: CallbackQueryContext<MyContext>) {
  // TODO: Implementar vista de movimientos
  await ctx.answerCallbackQuery('🚧 Función en desarrollo');

  const message =
    `📊 **Mis Movimientos**\n\n` +
    `🚧 Esta función está en desarrollo.\n` +
    `Próximamente podrás ver todos tus movimientos aquí.`;

  await ctx.editMessageText(message, {
    reply_markup: {
      inline_keyboard: [[{ text: '◀️ Menú Principal', callback_data: 'main_menu' }]],
    },
    parse_mode: 'Markdown',
  });
}

/**
 * Mostrar perfil del usuario
 */
async function showProfile(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createProfileMenu();
  const message = `👤 **Mi Perfil**\n\n` + `Gestiona tu información personal y configuración:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar ayuda
 */
async function showHelp(ctx: CallbackQueryContext<MyContext>) {
  const message =
    `❓ **Ayuda del Financial Bot**\n\n` +
    `**Comandos principales:**\n` +
    `• \`/menu\` - Menú principal\n` +
    `• \`/gasto [monto] [descripción]\` - Registro rápido\n` +
    `• \`/movimientos\` - Ver movimientos\n` +
    `• \`/perfil\` - Ver perfil\n\n` +
    `**Navegación:**\n` +
    `Usa los botones del menú para navegar fácilmente.\n\n` +
    `**Soporte:**\n` +
    `Contacta a tu administrador para ayuda adicional.`;

  await ctx.editMessageText(message, {
    reply_markup: {
      inline_keyboard: [[{ text: '◀️ Menú Principal', callback_data: 'main_menu' }]],
    },
    parse_mode: 'Markdown',
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de administración
 */
async function showAdminMenu(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createAdminMenu();
  const message = `⚙️ **Panel de Administración**\n\n` + `Gestiona tu empresa y usuarios:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de reportes
 */
async function showReportsMenu(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createReportsMenu();
  const message = `📈 **Generar Reportes**\n\n` + `Selecciona el tipo de reporte que necesitas:`;

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
  const keyboard = createUsersMenu();
  const message = `👥 **Gestión de Usuarios**\n\n` + `Administra los usuarios de tu empresa:`;

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
  // TODO: Implementar menú de categorías
  await ctx.answerCallbackQuery('🚧 Función en desarrollo');

  const message =
    `📋 **Gestión de Categorías**\n\n` +
    `🚧 Esta función está en desarrollo.\n` +
    `Próximamente podrás gestionar categorías aquí.`;

  await ctx.editMessageText(message, {
    reply_markup: {
      inline_keyboard: [[{ text: '◀️ Menú Principal', callback_data: 'main_menu' }]],
    },
    parse_mode: 'Markdown',
  });
}
