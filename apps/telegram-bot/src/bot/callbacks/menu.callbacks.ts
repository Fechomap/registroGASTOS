import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, companyRepository } from '@financial-bot/database';
import { 
  createMainMenu, 
  getMainMenuMessage, 
  createAdminMenu, 
  createUsersMenu, 
  createReportsMenu, 
  createProfileMenu 
} from '../menus/main.menu';
import { createExpenseMethodMenu } from '../menus/expense.menu';
import { confirmExpense, saveExpense } from '../handlers/conversation.handler';

/**
 * Handler principal para todos los callbacks del menú
 */
export async function handleMenuCallback(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  
  try {
    switch (data) {
      case 'main_menu':
        await showMainMenu(ctx);
        break;
      case 'main_expense':
        await showExpenseMenu(ctx);
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
        await showMainMenu(ctx);
        break;
      
      // Callbacks de expense
      case 'expense_manual':
        await handleExpenseManual(ctx);
        break;
      case 'expense_wizard':
        await handleExpenseWizard(ctx);
        break;
      case 'expense_photo':
        await handleExpensePhoto(ctx);
        break;
      case 'expense_voice':
        await handleExpenseVoice(ctx);
        break;
      case 'expense_confirm':
        await handleExpenseConfirm(ctx);
        break;
      case 'expense_edit':
        await handleExpenseEdit(ctx);
        break;
      case 'expense_cancel':
        await handleExpenseCancel(ctx);
        break;
      case 'expense_confirm_save':
        await handleExpenseConfirmSave(ctx);
        break;
        
      default:
        // Manejar selección de categorías
        if (data?.startsWith('category_select_')) {
          await handleCategorySelection(ctx);
          return;
        }
        await ctx.answerCallbackQuery('Opción no reconocida');
    }
  } catch (error) {
    console.error('Error en menu callback:', error);
    await ctx.answerCallbackQuery('❌ Error al procesar la acción');
  }
}

/**
 * Mostrar menú principal
 */
async function showMainMenu(ctx: CallbackQueryContext<MyContext>) {
  const telegramId = ctx.from?.id.toString();
  
  if (!telegramId) {
    await ctx.answerCallbackQuery('❌ Error de identificación');
    return;
  }

  const user = await userRepository.findByTelegramId(telegramId);
  if (!user) {
    await ctx.answerCallbackQuery('❌ Usuario no encontrado');
    return;
  }

  const company = await companyRepository.findById(user.companyId);
  if (!company) {
    await ctx.answerCallbackQuery('❌ Empresa no encontrada');
    return;
  }

  const keyboard = createMainMenu(user.role);
  const message = getMainMenuMessage(user.firstName, user.role, company.name);

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Registrar gasto - DIRECTAMENTE conversacional
 */
async function showExpenseMenu(ctx: CallbackQueryContext<MyContext>) {
  // Inicializar el flujo de registro INMEDIATAMENTE
  ctx.session.conversationData = {
    registerFlow: {
      step: 'amount',
      type: 'EXPENSE'
    }
  };

  const message = `💰 **Registro de Gasto - Paso 1 de 4**\n\n` +
    `¿Cuánto gastaste?\n\n` +
    `💡 Escribe solo el número (ejemplo: 150)`;

  await ctx.editMessageText(message, {
    reply_markup: { 
      inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'expense_cancel' }]] 
    },
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar movimientos del usuario
 */
async function showMovements(ctx: CallbackQueryContext<MyContext>) {
  // TODO: Implementar vista de movimientos
  await ctx.answerCallbackQuery('🚧 Función en desarrollo');
  
  const message = `📊 **Mis Movimientos**\n\n` +
    `🚧 Esta función está en desarrollo.\n` +
    `Próximamente podrás ver todos tus movimientos aquí.`;

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: [[{ text: '◀️ Menú Principal', callback_data: 'main_menu' }]] },
    parse_mode: 'Markdown'
  });
}

/**
 * Mostrar perfil del usuario
 */
async function showProfile(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createProfileMenu();
  const message = `👤 **Mi Perfil**\n\n` +
    `Gestiona tu información personal y configuración:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar ayuda
 */
async function showHelp(ctx: CallbackQueryContext<MyContext>) {
  const message = `❓ **Ayuda del Financial Bot**\n\n` +
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
    reply_markup: { inline_keyboard: [[{ text: '◀️ Menú Principal', callback_data: 'main_menu' }]] },
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de administración
 */
async function showAdminMenu(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createAdminMenu();
  const message = `⚙️ **Panel de Administración**\n\n` +
    `Gestiona tu empresa y usuarios:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de reportes
 */
async function showReportsMenu(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createReportsMenu();
  const message = `📈 **Generar Reportes**\n\n` +
    `Selecciona el tipo de reporte que necesitas:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de usuarios
 */
async function showUsersMenu(ctx: CallbackQueryContext<MyContext>) {
  const keyboard = createUsersMenu();
  const message = `👥 **Gestión de Usuarios**\n\n` +
    `Administra los usuarios de tu empresa:`;

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery();
}

/**
 * Mostrar menú de categorías
 */
async function showCategoriesMenu(ctx: CallbackQueryContext<MyContext>) {
  // TODO: Implementar menú de categorías
  await ctx.answerCallbackQuery('🚧 Función en desarrollo');
  
  const message = `📋 **Gestión de Categorías**\n\n` +
    `🚧 Esta función está en desarrollo.\n` +
    `Próximamente podrás gestionar categorías aquí.`;

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: [[{ text: '◀️ Menú Principal', callback_data: 'main_menu' }]] },
    parse_mode: 'Markdown'
  });
}

/**
 * Handlers de expense callbacks
 */

/**
 * Funciones legacy eliminadas - Ya no hay menú de métodos
 * Todo va directo al wizard conversacional
 */
async function handleExpenseManual(ctx: CallbackQueryContext<MyContext>) {
  // Redirigir al flujo principal
  await showExpenseMenu(ctx);
}

async function handleExpenseWizard(ctx: CallbackQueryContext<MyContext>) {
  // Redirigir al flujo principal
  await showExpenseMenu(ctx);
}

/**
 * Registro desde foto
 */
async function handleExpensePhoto(ctx: CallbackQueryContext<MyContext>) {
  const message = `📷 **Registro Desde Foto**\n\n` +
    `🚧 Esta función estará disponible en la **Fase 2**.\n\n` +
    `**Funcionalidades futuras:**\n` +
    `• Sube foto del ticket/factura\n` +
    `• IA extrae automáticamente:\n` +
    `  - Monto\n` +
    `  - Fecha\n` +
    `  - Establecimiento\n` +
    `  - Número de factura\n` +
    `• Confirmas y listo\n\n` +
    `Mientras tanto, usa **Registro Manual**.`;

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: [[{ text: '◀️ Volver', callback_data: 'main_expense' }]] },
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery('🚧 Función en desarrollo - Fase 2');
}

/**
 * Registro por voz
 */
async function handleExpenseVoice(ctx: CallbackQueryContext<MyContext>) {
  const message = `🎤 **Registro Por Voz**\n\n` +
    `🚧 Esta función estará disponible en la **Fase 4**.\n\n` +
    `**Funcionalidades futuras:**\n` +
    `• Graba mensaje de voz\n` +
    `• IA transcribe y extrae:\n` +
    `  - "Gasté 150 pesos en comida"\n` +
    `  - Monto: $150\n` +
    `  - Descripción: comida\n` +
    `• Confirmas y listo\n\n` +
    `Mientras tanto, usa **Registro Manual**.`;

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: [[{ text: '◀️ Volver', callback_data: 'main_expense' }]] },
    parse_mode: 'Markdown'
  });
  await ctx.answerCallbackQuery('🚧 Función en desarrollo - Fase 4');
}

/**
 * Confirmar gasto
 */
async function handleExpenseConfirm(ctx: CallbackQueryContext<MyContext>) {
  await ctx.answerCallbackQuery('🚧 Función en desarrollo');
  
  const message = `✅ **Confirmar Gasto**\n\n` +
    `🚧 Esta función está en desarrollo.\n` +
    `Se implementará junto con el wizard paso a paso.`;

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: [[{ text: '◀️ Volver', callback_data: 'main_expense' }]] },
    parse_mode: 'Markdown'
  });
}

/**
 * Editar gasto
 */
async function handleExpenseEdit(ctx: CallbackQueryContext<MyContext>) {
  await ctx.answerCallbackQuery('🚧 Función en desarrollo');
  
  const message = `✏️ **Editar Gasto**\n\n` +
    `🚧 Esta función está en desarrollo.\n` +
    `Se implementará junto con el wizard paso a paso.`;

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: [[{ text: '◀️ Volver', callback_data: 'main_expense' }]] },
    parse_mode: 'Markdown'
  });
}

/**
 * Cancelar gasto
 */
async function handleExpenseCancel(ctx: CallbackQueryContext<MyContext>) {
  // Limpiar conversación
  ctx.session.conversationData = {};
  
  await ctx.answerCallbackQuery('❌ Gasto cancelado');
  
  // Volver al menú principal
  await showMainMenu(ctx);
}

/**
 * Manejar selección de categoría
 */
async function handleCategorySelection(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  
  if (!data) return;
  
  const categoryId = data.replace('category_select_', '');
  
  await ctx.answerCallbackQuery();
  await confirmExpense(ctx, categoryId);
}

/**
 * Confirmar y guardar gasto
 */
async function handleExpenseConfirmSave(ctx: CallbackQueryContext<MyContext>) {
  await ctx.answerCallbackQuery();
  await saveExpense(ctx);
}