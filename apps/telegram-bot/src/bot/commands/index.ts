import { Bot } from 'grammy';
import { MyContext } from '../../types';
// import { startCommand } from './start.command'; // Reemplazado por newStartCommand
import { helpCommand } from './help.command';
import { profileCommand } from './profile.command';
import { expenseCommand } from './expense.command';
import { incomeCommand } from './income.command';
import { movementsCommand } from './movements.command';
import { companyCommand } from './company.command';
import { userCommands } from './user.commands';
import { editCommand } from './edit.command';
import { deleteCommand } from './delete.command';
import { categoriesCommand } from './categories.command';
import { registerCompanyCommand } from './setup.command';
import {
  adminCompaniesCommand,
  approveCompanyCommand,
  rejectCompanyCommand,
} from './admin.command';
import { setupSuperAdminCommand } from './setup-admin.command';
import { permissionsCommands } from './permissions.command';
import { menuCommand, startCommand as newStartCommand } from './menu.command';
import { handleMenuCallback } from '../callbacks/menu.callbacks';
import { handleConversationMessage } from '../handlers/conversation.handler';
import { editFlowMiddleware } from '../middleware/edit-flow.middleware';
import { companyApprovalMiddleware } from '../middleware/company-approval.middleware';
import { permissionsMiddleware } from '../middleware/permissions.middleware';
import {
  handleEditFieldSelection,
  handleEditCategorySelection,
  handleEditConfirmation,
  handleEditCancel,
  handleEditBack,
} from '../callbacks/edit.callbacks';
import { handleDeleteConfirmation, handleDeleteCancel } from '../callbacks/delete.callbacks';
import { handleUserDeleteConfirmation, handleUserDeleteCancel } from '../callbacks/user.callbacks';
import { handleAssignCategory } from '../callbacks/assign-category.callbacks';
import { categoryFlowMiddleware } from '../middleware/category-flow.middleware';
import {
  handleCategoryAction,
  handleCategoryParentSelection,
  handleCategoryEdit,
  handleCategoryDelete,
  handleCategoryConfirmDelete,
  handleCategoryCancel,
  handleCategoryBack,
} from '../callbacks/categories.callbacks';
import {
  handleShowReportsPanel,
  handlePeriodFilter,
  handleTypeFilter,
  handleScopeFilter,
  handleCategoryFilter,
  handleCategorySelection,
  handleUserFilter,
  handleUserSelection,
  handleClearFilters,
  handleGenerateReports,
} from '../callbacks/reports.callbacks';

/**
 * Configurar todos los comandos del bot
 */
export function setupCommands(bot: Bot<MyContext>) {
  // Middleware para manejar flujos
  bot.use(companyApprovalMiddleware);
  bot.use(permissionsMiddleware); // Verificación de permisos granulares
  bot.use(editFlowMiddleware);
  bot.use(categoryFlowMiddleware);

  // Callbacks para edición
  bot.callbackQuery(/^edit_/, async ctx => {
    const data = ctx.callbackQuery.data;

    if (data === 'edit_cancel') {
      await handleEditCancel(ctx);
    } else if (data === 'edit_back') {
      await handleEditBack(ctx);
    } else if (data === 'edit_confirm_yes' || data === 'edit_confirm_no') {
      await handleEditConfirmation(ctx);
    } else if (data.startsWith('edit_category_')) {
      await handleEditCategorySelection(ctx);
    } else if (['edit_amount', 'edit_description', 'edit_category', 'edit_date'].includes(data)) {
      await handleEditFieldSelection(ctx);
    }
  });

  // Callbacks para eliminación
  bot.callbackQuery(/^delete_/, async ctx => {
    const data = ctx.callbackQuery.data;

    if (data === 'delete_cancel') {
      await handleDeleteCancel(ctx);
    } else if (data.startsWith('delete_confirm_')) {
      await handleDeleteConfirmation(ctx);
    }
  });

  // Callbacks para gestión de usuarios
  bot.callbackQuery(/^user_delete_/, async ctx => {
    const data = ctx.callbackQuery.data;

    if (data === 'user_delete_cancel') {
      await handleUserDeleteCancel(ctx);
    } else if (data.startsWith('user_delete_confirm_')) {
      await handleUserDeleteConfirmation(ctx);
    }
  });

  // Callbacks para gestión de categorías
  bot.callbackQuery(/^category_/, async ctx => {
    const data = ctx.callbackQuery.data;

    // Manejar selección de categorías en el flujo de registro
    if (data?.startsWith('category_select_')) {
      await handleMenuCallback(ctx);
      return;
    }

    if (
      [
        'category_add',
        'category_edit',
        'category_delete',
        'category_details',
        'category_close',
      ].includes(data)
    ) {
      await handleCategoryAction(ctx);
    } else if (data.startsWith('category_parent_')) {
      await handleCategoryParentSelection(ctx);
    } else if (data.startsWith('category_edit_')) {
      await handleCategoryEdit(ctx);
    } else if (data.startsWith('category_delete_')) {
      await handleCategoryDelete(ctx);
    } else if (data.startsWith('category_confirm_delete_')) {
      await handleCategoryConfirmDelete(ctx);
    } else if (data === 'category_cancel') {
      await handleCategoryCancel(ctx);
    } else if (data === 'category_back') {
      await handleCategoryBack(ctx);
    }
  });

  // Callbacks para asignación de categorías
  bot.callbackQuery(/^assign_category_/, async ctx => {
    await handleAssignCategory(ctx);
  });

  // Callbacks para reportes
  bot.callbackQuery(/^reports_/, async ctx => {
    const data = ctx.callbackQuery.data;

    if (data === 'reports_show_panel') {
      await handleShowReportsPanel(ctx);
    } else if (data === 'reports_filter_period') {
      await handlePeriodFilter(ctx);
    } else if (data === 'reports_filter_type') {
      await handleTypeFilter(ctx);
    } else if (data === 'reports_filter_scope') {
      await handleScopeFilter(ctx);
    } else if (data === 'reports_filter_category') {
      await handleCategoryFilter(ctx);
    } else if (data?.startsWith('reports_category_')) {
      await handleCategorySelection(ctx);
    } else if (data === 'reports_filter_user') {
      await handleUserFilter(ctx);
    } else if (data?.startsWith('reports_user_')) {
      await handleUserSelection(ctx);
    } else if (data === 'reports_clear_filters') {
      await handleClearFilters(ctx);
    } else if (data === 'reports_generate') {
      await handleGenerateReports(ctx);
    }
  });

  // Callbacks para menús principales
  bot.callbackQuery(
    /^main_|^admin_|^users_|^categories_|^movements_|^movement_|^user_|^user_add_toggle_company_|^user_add_confirm_companies|^category_manage_|^profile_|^expense_|^category_select_|^date_select_|^photo_skip$|^date_back_to_options$/,
    async ctx => {
      await handleMenuCallback(ctx);
    },
  );

  // Comandos básicos (disponibles para todos)
  bot.command('start', newStartCommand); // Nuevo comando start con menú
  bot.command('menu', menuCommand); // Comando principal del menú
  bot.command('register_company', registerCompanyCommand); // Registro de empresa
  bot.command('setup_super_admin', setupSuperAdminCommand); // Configurar primer super admin
  bot.command('ayuda', helpCommand);
  bot.command('help', helpCommand); // Alias en inglés

  // Comandos de super admin
  bot.command('admin_companies', adminCompaniesCommand);
  bot.command('approve_company', approveCompanyCommand);
  bot.command('reject_company', rejectCompanyCommand);

  // Comandos que requieren autenticación
  bot.command('perfil', profileCommand);
  bot.command('profile', profileCommand); // Alias en inglés

  // Comandos de registro
  bot.command('gasto', expenseCommand);
  bot.command('expense', expenseCommand); // Alias en inglés
  bot.command('ingreso', incomeCommand);
  bot.command('income', incomeCommand); // Alias en inglés

  // Comandos de consulta
  bot.command('movimientos', movementsCommand);
  bot.command('movements', movementsCommand); // Alias en inglés

  // Comandos administrativos
  bot.command('empresa', companyCommand);
  bot.command('company', companyCommand); // Alias en inglés

  // Comandos de gestión de usuarios (solo admin)
  bot.command('usuario_agregar', userCommands.addUser);
  bot.command('usuario_lista', userCommands.listUsers);
  bot.command('usuario_rol', userCommands.changeRole);
  bot.command('usuario_eliminar', userCommands.deleteUser);

  // Comandos de edición (solo admin)
  bot.command('editar', editCommand);
  bot.command('edit', editCommand); // Alias en inglés
  bot.command('eliminar', deleteCommand);
  bot.command('delete', deleteCommand); // Alias en inglés

  // Comandos de categorías (solo admin)
  bot.command('categorias', categoriesCommand);
  bot.command('categories', categoriesCommand); // Alias en inglés

  // Comandos de permisos (solo super admin)
  bot.command('permisos', permissionsCommands.showPermissionsPanel);
  bot.command('permisos_usuario', permissionsCommands.manageUserPermissions);
  bot.command('permisos_empresa', permissionsCommands.showCompanyPermissions);

  // Manejar mensajes de texto que no son comandos
  bot.on('message:text', async ctx => {
    // Si no es un comando, verificar si está en una conversación
    if (!ctx.message.text.startsWith('/')) {
      await handleConversationMessage(ctx);
    }
  });

  // Manejar fotos (para el flujo de gastos o información general)
  bot.on('message:photo', async ctx => {
    // Verificar si el usuario está en el flujo de registro de gastos (paso de foto)
    const conversationData = ctx.session?.conversationData;
    if (conversationData?.registerFlow?.step === 'photo') {
      // El usuario está en el flujo de gastos, procesarlo con el handler de conversación
      await handleConversationMessage(ctx);
    } else {
      // No está en ningún flujo específico, mostrar mensaje informativo
      await ctx.reply(
        '📷 **Foto recibida**\n\n' +
          '💡 Para incluir fotos en tus gastos:\n' +
          '1. Usa el menú para registrar un gasto\n' +
          '2. En el paso de fotografía, envía tu ticket o recibo\n\n' +
          '🚀 También puedes usar: `/gasto [monto] [descripción]`',
        { parse_mode: 'Markdown' },
      );
    }
  });

  // Manejar documentos
  bot.on('message:document', async ctx => {
    await ctx.reply(
      '📄 Documento recibido. En la próxima versión podrás procesar facturas automáticamente.\n\n' +
        'Por ahora, usa /gasto [monto] [descripción] para registrar gastos manualmente.',
    );
  });
}
