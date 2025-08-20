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

  // Inicializar estado de agregar usuario
  ctx.session.addUserState = {
    step: 'waiting_chat_id',
    companyId: user.companyId,
  };

  const message =
    `➕ **Agregar Nuevo Usuario**\n\n` +
    `🏢 **Empresa:** ${user.company.name}\n\n` +
    `📱 **Por favor, envía el Chat ID del usuario que deseas agregar.**\n\n` +
    `💡 **¿Cómo obtener el Chat ID?**\n` +
    `• El usuario debe buscar @userinfobot en Telegram\n` +
    `• Enviar /start al bot\n` +
    `• El bot responderá con su Chat ID\n\n` +
    `📝 **Envía el Chat ID (solo números):**`;

  const keyboard = new InlineKeyboard()
    .text('❓ Ayuda con Chat ID', 'users_help_chatid')
    .row()
    .text('❌ Cancelar', 'main_users')
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
 * Gestionar usuario específico (callback wrapper)
 */
export async function handleUserManage(ctx: CallbackQueryContext<MyContext>) {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  const userId = data.replace('user_manage_', '');
  await handleUserManageInternal(ctx, userId);
  await ctx.answerCallbackQuery();
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

/**
 * Activar usuario
 */
export async function handleUserActivate(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_activate_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    if (targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no pertenece a tu empresa');
      return;
    }

    if (targetUser.isActive) {
      await ctx.answerCallbackQuery('❌ El usuario ya está activo');
      return;
    }

    await userRepository.activate(userId);

    await ctx.answerCallbackQuery('✅ Usuario activado correctamente');

    // Regresar a la vista del usuario
    await handleUserManageInternal(ctx, userId);
  } catch (error) {
    logBotError(error as Error, { command: 'user_activate' });
    await ctx.answerCallbackQuery('❌ Error al activar usuario');
  }
}

/**
 * Desactivar usuario
 */
export async function handleUserDeactivate(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_deactivate_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    if (targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no pertenece a tu empresa');
      return;
    }

    if (targetUser.id === user.id) {
      await ctx.answerCallbackQuery('❌ No puedes desactivarte a ti mismo');
      return;
    }

    if (!targetUser.isActive) {
      await ctx.answerCallbackQuery('❌ El usuario ya está desactivado');
      return;
    }

    await userRepository.deactivate(userId);

    await ctx.answerCallbackQuery('✅ Usuario desactivado correctamente');

    // Regresar a la vista del usuario
    await handleUserManageInternal(ctx, userId);
  } catch (error) {
    logBotError(error as Error, { command: 'user_deactivate' });
    await ctx.answerCallbackQuery('❌ Error al desactivar usuario');
  }
}

/**
 * Eliminar usuario desde menú principal
 */
export async function handleUsersDelete(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden eliminar usuarios');
    return;
  }

  try {
    const users = await userRepository.findByCompany(user.companyId);
    const otherUsers = users.filter(u => u.id !== user.id);

    if (otherUsers.length === 0) {
      const message =
        `🗑️ **Eliminar Usuario**\n\n` +
        `No hay otros usuarios para eliminar.\n\n` +
        `Agrega usuarios primero para poder gestionarlos.`;

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

    let message = `🗑️ **Eliminar Usuario**\n\n`;
    message += `Selecciona el usuario que deseas eliminar:\n\n`;

    const keyboard = new InlineKeyboard();

    otherUsers.forEach((targetUser, index) => {
      const statusIcon = targetUser.isActive ? '✅' : '🚫';
      const roleIcon = targetUser.role === 'ADMIN' ? '👑' : '👤';
      const userName = `${targetUser.firstName} ${targetUser.lastName || ''}`.trim();

      keyboard.text(
        `${statusIcon} ${roleIcon} ${userName}`,
        `user_delete_confirm_${targetUser.id}`,
      );

      if ((index + 1) % 1 === 0) {
        keyboard.row();
      }
    });

    keyboard.text('◀️ Volver', 'main_users');

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'users_delete' });
    await ctx.answerCallbackQuery('❌ Error al cargar usuarios');
  }
}

/**
 * Ver movimientos de un usuario
 */
export async function handleUserMovements(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    const userId = data.replace('user_movements_', '');
    const targetUser = await userRepository.findById(userId);

    if (!targetUser) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    if (targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no pertenece a tu empresa');
      return;
    }

    // Por ahora, mostrar mensaje informativo
    const message =
      `📊 **Movimientos de Usuario**\n\n` +
      `👤 **Usuario:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Rol:** ${targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n\n` +
      `📋 Esta funcionalidad mostrará todos los movimientos\n` +
      `creados por este usuario.\n\n` +
      `🔄 **Funcionalidad en desarrollo...**`;

    const keyboard = new InlineKeyboard()
      .text('◀️ Volver al Usuario', `user_manage_${userId}`)
      .row();

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery('📊 Funcionalidad en desarrollo');
  } catch (error) {
    logBotError(error as Error, { command: 'user_movements' });
    await ctx.answerCallbackQuery('❌ Error al cargar movimientos');
  }
}

/**
 * Helper para manejar usuario específico (usado por activate/deactivate)
 */
/**
 * Confirmar y crear nuevo usuario
 */
export async function handleUsersConfirmAdd(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;
  const data = ctx.callbackQuery.data;

  if (!user || user.role !== 'ADMIN' || !data) return;

  try {
    // Parsear datos del callback
    const parts = data.replace('users_confirm_add_', '').split('_');
    const chatId = parts[0];
    const firstName = decodeURIComponent(parts[1]);
    const lastName = decodeURIComponent(parts[2]);

    // Verificar nuevamente que el usuario no exista
    const existingUser = await userRepository.findByChatId(chatId);
    if (existingUser) {
      await ctx.answerCallbackQuery('❌ El usuario ya existe');
      return;
    }

    // Crear el usuario
    const newUser = await userRepository.create({
      telegramId: chatId,
      chatId,
      firstName,
      lastName: lastName === 'undefined' ? null : lastName,
      role: 'OPERATOR',
      isActive: true,
      company: { connect: { id: user.companyId } },
    });

    const message =
      `✅ **¡Usuario agregado exitosamente!**\n\n` +
      `👤 **Nombre:** ${firstName} ${lastName || ''}\n` +
      `📱 **Chat ID:** ${chatId}\n` +
      `🏢 **Empresa:** ${user.company.name}\n` +
      `👔 **Rol:** Operador\n\n` +
      `🔔 El usuario puede ahora usar el bot enviando /start`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('👤 Gestionar Usuario', `user_manage_${newUser.id}`)
        .text('📋 Ver Lista', 'users_list')
        .row()
        .text('➕ Agregar Otro', 'users_add')
        .text('◀️ Menú Usuarios', 'main_users')
        .row(),
    });

    await ctx.answerCallbackQuery('✅ Usuario agregado correctamente');
  } catch (error) {
    logBotError(error as Error, { command: 'users_confirm_add' });
    await ctx.answerCallbackQuery('❌ Error al agregar usuario');
  }
}

/**
 * Helper para manejar usuario específico (usado por activate/deactivate)
 */
async function handleUserManageInternal(ctx: CallbackQueryContext<MyContext>, userId: string) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') return;

  try {
    const targetUser = await userRepository.findById(userId);

    if (!targetUser) {
      await ctx.answerCallbackQuery('❌ Usuario no encontrado');
      return;
    }

    if (targetUser.companyId !== user.companyId) {
      await ctx.answerCallbackQuery('❌ Usuario no pertenece a tu empresa');
      return;
    }

    const statusIcon = targetUser.isActive ? '✅' : '🚫';
    const roleIcon = targetUser.role === 'ADMIN' ? '👑' : '👤';

    const message =
      `${statusIcon} **Gestión de Usuario**\n\n` +
      `${roleIcon} **Nombre:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `👔 **Rol:** ${targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
      `📱 **Chat ID:** \`${targetUser.chatId}\`\n` +
      `📅 **Miembro desde:** ${formatDate(targetUser.createdAt)}\n` +
      `🔄 **Última actividad:** ${formatDate(targetUser.updatedAt)}\n` +
      `📊 **Estado:** ${targetUser.isActive ? 'Activo' : 'Desactivado'}\n\n` +
      `Selecciona una acción:`;

    const keyboard = new InlineKeyboard();

    if (targetUser.id !== user.id) {
      if (targetUser.isActive) {
        keyboard
          .text('🔄 Cambiar Rol', `user_change_role_${targetUser.id}`)
          .text('🚫 Desactivar', `user_deactivate_${targetUser.id}`)
          .row();
      } else {
        keyboard.text('✅ Reactivar', `user_activate_${targetUser.id}`).row();
      }

      keyboard.text('🗑️ Eliminar', `user_delete_confirm_${targetUser.id}`).row();
    }

    keyboard
      .text('📊 Ver Movimientos', `user_movements_${targetUser.id}`)
      .row()
      .text('◀️ Volver a Lista', 'users_list');

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logBotError(error as Error, { command: 'user_manage' });
  }
}
