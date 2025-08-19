import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, UserRole } from '@financial-bot/database';
import { formatDate } from '@financial-bot/shared';
import { logBotError } from '../../utils/logger';
import { InlineKeyboard } from 'grammy';

/**
 * Listar usuarios de la empresa
 */
export async function handleUsersList(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden ver usuarios');
    return;
  }

  try {
    const users = await userRepository.findByCompany(user.companyId);

    if (users.length === 0) {
      const message =
        `👥 **Lista de Usuarios**\n\n` +
        `📋 No hay usuarios registrados en la empresa.\n\n` +
        `Usa "Agregar Usuario" para invitar usuarios.`;

      const keyboard = new InlineKeyboard()
        .text('➕ Agregar Usuario', 'users_add')
        .row()
        .text('◀️ Volver', 'main_users');

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });

      await ctx.answerCallbackQuery();
      return;
    }

    const activeUsers = users.filter(u => u.isActive);
    const inactiveUsers = users.filter(u => !u.isActive);

    let message = `👥 **Lista de Usuarios** (${users.length})\n\n`;
    message += `🏢 **Empresa:** ${user.company.name}\n\n`;

    if (activeUsers.length > 0) {
      message += `✅ **Usuarios Activos** (${activeUsers.length}):\n`;
      activeUsers.forEach((companyUser, index) => {
        const roleIcon = companyUser.role === 'ADMIN' ? '👑' : '👤';
        message += `${index + 1}. ${roleIcon} **${companyUser.firstName} ${companyUser.lastName || ''}**\n`;
        message += `   👔 ${companyUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n`;
        message += `   📅 Desde: ${formatDate(companyUser.createdAt)}\n\n`;
      });
    }

    if (inactiveUsers.length > 0) {
      message += `❌ **Usuarios Inactivos** (${inactiveUsers.length}):\n`;
      inactiveUsers.forEach((companyUser, index) => {
        message += `${index + 1}. 🚫 **${companyUser.firstName} ${companyUser.lastName || ''}**\n`;
        message += `   👔 ${companyUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n\n`;
      });
    }

    // Crear teclado con acciones para usuarios (primeros 8)
    const keyboard = new InlineKeyboard();

    activeUsers.slice(0, 8).forEach((companyUser, index) => {
      const shortName =
        companyUser.firstName.length > 12
          ? companyUser.firstName.substring(0, 9) + '...'
          : companyUser.firstName;

      keyboard.text(`👤 ${shortName}`, `user_manage_${companyUser.id}`);

      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });

    if (activeUsers.length % 2 !== 0) {
      keyboard.row();
    }

    keyboard
      .text('➕ Agregar Usuario', 'users_add')
      .text('🔄 Cambiar Roles', 'users_roles')
      .row()
      .text('◀️ Volver', 'main_users');

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'users_list' });
    await ctx.answerCallbackQuery('❌ Error al cargar usuarios');
  }
}

/**
 * Mostrar formulario para agregar usuario
 */
export async function handleUsersAdd(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden agregar usuarios');
    return;
  }

  const message =
    `➕ **Agregar Nuevo Usuario**\n\n` +
    `🏢 **Empresa:** ${user.company.name}\n\n` +
    `Para agregar un usuario, necesitas su **Chat ID** de Telegram.\n\n` +
    `📝 **Pasos:**\n` +
    `1. El usuario debe iniciar conversación con el bot\n` +
    `2. El usuario debe enviarte su Chat ID\n` +
    `3. Usa el comando: \`/usuario_agregar [chatId] [nombre]\`\n\n` +
    `💡 **Ejemplo:**\n` +
    `\`/usuario_agregar 123456789 Juan Pérez\`\n\n` +
    `📋 **Nota:** El usuario tendrá rol de Operador por defecto.`;

  const keyboard = new InlineKeyboard()
    .text('❓ ¿Cómo obtener Chat ID?', 'users_help_chatid')
    .row()
    .text('📋 Ver Usuarios', 'users_list')
    .text('◀️ Volver', 'main_users')
    .row();

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });

  await ctx.answerCallbackQuery();
}

/**
 * Mostrar ayuda para obtener Chat ID
 */
export async function handleUsersHelpChatId(ctx: CallbackQueryContext<MyContext>) {
  const message =
    `❓ **Cómo obtener el Chat ID**\n\n` +
    `📱 **Opción 1: Bot @userinfobot**\n` +
    `1. Buscar @userinfobot en Telegram\n` +
    `2. Enviar /start al bot\n` +
    `3. El bot responderá con el Chat ID\n\n` +
    `📱 **Opción 2: Bot de información**\n` +
    `1. Buscar @chatid_echo_bot\n` +
    `2. Enviar cualquier mensaje\n` +
    `3. El bot responderá con el Chat ID\n\n` +
    `🔍 **El Chat ID se ve así:**\n` +
    `\`123456789\` (números sin espacios)\n\n` +
    `⚠️ **Importante:**\n` +
    `El usuario debe haber iniciado conversación con este bot antes.`;

  const keyboard = new InlineKeyboard().text('◀️ Volver a Agregar', 'users_add');

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });

  await ctx.answerCallbackQuery();
}

/**
 * Gestionar usuario específico
 */
export async function handleUserManage(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_manage_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser || targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    const roleText = targetUser.role === 'ADMIN' ? '👑 Administrador' : '👤 Operador';
    const statusText = targetUser.isActive ? '✅ Activo' : '❌ Inactivo';

    const message =
      `👤 **Gestionar Usuario**\n\n` +
      `**Información:**\n` +
      `👤 **Nombre:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Rol:** ${roleText}\n` +
      `📊 **Estado:** ${statusText}\n` +
      `📅 **Miembro desde:** ${formatDate(targetUser.createdAt)}\n` +
      `🆔 **Chat ID:** \`${targetUser.chatId}\`\n\n` +
      `**¿Qué deseas hacer?**`;

    const keyboard = new InlineKeyboard();

    // Opciones según el estado del usuario
    if (targetUser.id !== user.id) {
      // No puede gestionarse a sí mismo
      if (targetUser.isActive) {
        keyboard
          .text('🔄 Cambiar Rol', `user_change_role_${targetUser.id}`)
          .text('🚫 Desactivar', `user_deactivate_${targetUser.id}`)
          .row();
      } else {
        keyboard.text('✅ Reactivar', `user_activate_${targetUser.id}`).row();
      }

      keyboard.text('🗑️ Eliminar', `user_delete_confirm_${targetUser.id}`).row();
    } else {
      keyboard.text('ℹ️ No puedes gestionarte a ti mismo', 'user_self_error').row();
    }

    keyboard
      .text('📊 Ver Movimientos', `user_movements_${targetUser.id}`)
      .row()
      .text('◀️ Volver a Lista', 'users_list');

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'user_manage' });
    await ctx.answerCallbackQuery('❌ Error al cargar usuario');
  }
}

/**
 * Cambiar rol de usuario
 */
export async function handleUserChangeRole(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_change_role_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser || targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    const newRole = targetUser.role === 'ADMIN' ? UserRole.OPERATOR : UserRole.ADMIN;
    const newRoleText = newRole === UserRole.ADMIN ? 'Administrador' : 'Operador';
    const currentRoleText = targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador';

    const message =
      `🔄 **Cambiar Rol de Usuario**\n\n` +
      `👤 **Usuario:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Rol Actual:** ${currentRoleText}\n` +
      `🔄 **Nuevo Rol:** ${newRoleText}\n\n` +
      `⚠️ **Confirma el cambio de rol:**\n` +
      `Esta acción cambiará los permisos del usuario inmediatamente.`;

    const keyboard = new InlineKeyboard()
      .text(`✅ Cambiar a ${newRoleText}`, `user_role_confirm_${userId}_${newRole}`)
      .text('❌ Cancelar', `user_manage_${userId}`)
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'user_change_role' });
    await ctx.answerCallbackQuery('❌ Error al cambiar rol');
  }
}

/**
 * Confirmar cambio de rol
 */
export async function handleUserRoleConfirm(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const parts = data.replace('user_role_confirm_', '').split('_');
    const userId = parts[0];
    const newRole = parts[1] as UserRole;

    const targetUser = await userRepository.findById(userId);

    if (!targetUser || targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    // Cambiar el rol
    await userRepository.updateRole(targetUser.id, newRole);

    const newRoleText = newRole === UserRole.ADMIN ? 'Administrador' : 'Operador';

    const message =
      `✅ **Rol Actualizado**\n\n` +
      `👤 **Usuario:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Nuevo Rol:** ${newRoleText}\n\n` +
      `Los cambios son efectivos inmediatamente.`;

    const keyboard = new InlineKeyboard()
      .text('👤 Gestionar Usuario', `user_manage_${userId}`)
      .text('📋 Ver Lista', 'users_list')
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery(`✅ Rol cambiado a ${newRoleText}`);
  } catch (error) {
    logBotError(error as Error, { command: 'user_role_confirm' });
    await ctx.answerCallbackQuery('❌ Error al confirmar cambio de rol');
  }
}

/**
 * Eliminar usuario (confirmación)
 */
export async function handleUserDeleteConfirm(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_delete_confirm_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser || targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    if (targetUser.id === user.id) {
      await ctx.answerCallbackQuery('❌ No puedes eliminarte a ti mismo');
      return;
    }

    const message =
      `⚠️ **Confirmar Eliminación**\n\n` +
      `👤 **Usuario:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Rol:** ${targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
      `📅 **Miembro desde:** ${formatDate(targetUser.createdAt)}\n\n` +
      `⚠️ **Esta acción eliminará:**\n` +
      `• El acceso del usuario al bot\n` +
      `• Sus datos de perfil\n` +
      `• Sus categorías personales\n\n` +
      `📊 **Se mantendrán:**\n` +
      `• Los movimientos creados (para auditoría)\n\n` +
      `🚨 **Esta acción NO se puede deshacer**`;

    const keyboard = new InlineKeyboard()
      .text('🗑️ Sí, Eliminar', `user_delete_final_${userId}`)
      .text('❌ Cancelar', `user_manage_${userId}`)
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'user_delete_confirm' });
    await ctx.answerCallbackQuery('❌ Error al cargar confirmación');
  }
}

/**
 * Eliminar usuario (final)
 */
export async function handleUserDeleteFinal(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_delete_final_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser || targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    if (targetUser.id === user.id) {
      await ctx.answerCallbackQuery('❌ No puedes eliminarte a ti mismo');
      return;
    }

    // Eliminar el usuario
    await userRepository.delete(targetUser.id);

    const message =
      `✅ **Usuario Eliminado**\n\n` +
      `🗑️ **Usuario eliminado exitosamente:**\n` +
      `👤 **Nombre:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Rol:** ${targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
      `📅 **Era miembro desde:** ${formatDate(targetUser.createdAt)}\n\n` +
      `🔒 El usuario ya no puede acceder al bot.\n` +
      `📊 Sus movimientos se mantienen para auditoría.`;

    const keyboard = new InlineKeyboard()
      .text('📋 Ver Lista', 'users_list')
      .text('◀️ Menú Usuarios', 'main_users')
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery('✅ Usuario eliminado');
  } catch (error) {
    logBotError(error as Error, { command: 'user_delete_final' });
    await ctx.answerCallbackQuery('❌ Error al eliminar usuario');
  }
}

/**
 * Mostrar menú de cambio de roles rápido
 */
export async function handleUsersRoles(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden cambiar roles');
    return;
  }

  try {
    const users = await userRepository.findByCompany(user.companyId);
    const otherUsers = users.filter(u => u.id !== user.id && u.isActive);

    if (otherUsers.length === 0) {
      const message =
        `🔄 **Cambiar Roles**\n\n` +
        `No hay otros usuarios activos para gestionar.\n\n` +
        `Agrega usuarios primero para poder cambiar sus roles.`;

      const keyboard = new InlineKeyboard()
        .text('➕ Agregar Usuario', 'users_add')
        .text('◀️ Volver', 'main_users')
        .row();

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });

      await ctx.answerCallbackQuery();
      return;
    }

    let message = `🔄 **Cambiar Roles**\n\n`;
    message += `🏢 **Empresa:** ${user.company.name}\n`;
    message += `👤 **Usuarios disponibles:** ${otherUsers.length}\n\n`;
    message += `Selecciona un usuario para cambiar su rol:`;

    const keyboard = new InlineKeyboard();

    otherUsers.slice(0, 10).forEach((targetUser, index) => {
      const roleIcon = targetUser.role === 'ADMIN' ? '👑' : '👤';
      const shortName =
        targetUser.firstName.length > 15
          ? targetUser.firstName.substring(0, 12) + '...'
          : targetUser.firstName;

      keyboard.text(`${roleIcon} ${shortName}`, `user_change_role_${targetUser.id}`);

      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });

    if (otherUsers.length % 2 !== 0) {
      keyboard.row();
    }

    keyboard.text('◀️ Volver', 'main_users');

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'users_roles' });
    await ctx.answerCallbackQuery('❌ Error al cargar usuarios');
  }
}
