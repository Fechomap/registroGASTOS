import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, UserRole } from '@financial-bot/database';
import { isAdmin } from '../../middleware/auth';
import { formatDate } from '@financial-bot/shared';

/**
 * Comandos de gestión de usuarios (solo admins)
 */

export const userCommands = {
  /**
   * Comando /usuario_agregar - Agregar nuevo usuario a la empresa
   * Uso: /usuario_agregar [chatId] [nombre]
   */
  async addUser(ctx: CommandContext<MyContext>) {
    if (!ctx.session.user) {
      await ctx.reply('❌ Debes estar registrado para usar este comando.');
      return;
    }

    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Solo los administradores pueden agregar usuarios.');
      return;
    }

    const args = ctx.match?.toString().trim().split(' ') || [];
    const [chatId, ...nameParts] = args;
    const name = nameParts.join(' ');

    if (!chatId || !name) {
      await ctx.reply(
        '👥 *Agregar Usuario*\n\n' +
          'Uso: `/usuario_agregar [chatId] [nombre]`\n\n' +
          'Ejemplo: `/usuario_agregar 123456789 Juan Pérez`\n\n' +
          '💡 *Nota:* El chatId es el ID de Telegram del usuario. ' +
          'El usuario debe haber iniciado una conversación con el bot primero.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    try {
      // Verificar si el usuario ya existe
      const existingUser = await userRepository.findByChatId(chatId);
      if (existingUser) {
        if (existingUser.companyId === ctx.session.user.companyId) {
          await ctx.reply(
            `❌ El usuario con chatId *${chatId}* ya pertenece a tu empresa.\n\n` +
              `👤 *Nombre:* ${existingUser.firstName} ${existingUser.lastName || ''}\n` +
              `👔 *Rol:* ${existingUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
              `📊 *Estado:* ${existingUser.isActive ? 'Activo' : 'Inactivo'}`,
            { parse_mode: 'Markdown' },
          );
        } else {
          await ctx.reply('❌ Este usuario ya pertenece a otra empresa.');
        }
        return;
      }

      // Crear nuevo usuario
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ') || null;

      const newUser = await userRepository.create({
        chatId,
        telegramId: chatId, // Usamos el mismo valor
        firstName,
        lastName,
        role: UserRole.OPERATOR, // Por defecto operador
        isActive: true,
        company: {
          connect: { id: ctx.session.user.companyId },
        },
      });

      await ctx.reply(
        `✅ *Usuario Agregado Exitosamente*\n\n` +
          `👤 *Nombre:* ${newUser.firstName} ${newUser.lastName || ''}\n` +
          `🆔 *Chat ID:* ${newUser.chatId}\n` +
          `👔 *Rol:* Operador\n` +
          `📊 *Estado:* Activo\n\n` +
          `💡 El usuario puede usar el bot inmediatamente con /start`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error('Error agregando usuario:', error);
      await ctx.reply('❌ Error al agregar el usuario. Intenta nuevamente.');
    }
  },

  /**
   * Comando /usuario_lista - Listar todos los usuarios de la empresa
   */
  async listUsers(ctx: CommandContext<MyContext>) {
    if (!ctx.session.user) {
      await ctx.reply('❌ Debes estar registrado para usar este comando.');
      return;
    }

    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Solo los administradores pueden ver la lista de usuarios.');
      return;
    }

    try {
      const users = await userRepository.findByCompany(ctx.session.user.companyId);

      if (users.length === 0) {
        await ctx.reply(
          '👥 *Lista de Usuarios*\n\n' +
            '📋 No hay usuarios registrados en la empresa.\n\n' +
            'Usa `/usuario_agregar [chatId] [nombre]` para agregar usuarios.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      let message = `👥 *Lista de Usuarios* (${users.length})\n\n`;

      const activeUsers = users.filter(u => u.isActive);
      const inactiveUsers = users.filter(u => !u.isActive);

      if (activeUsers.length > 0) {
        message += '✅ *Usuarios Activos:*\n';
        activeUsers.forEach((user, index) => {
          const roleIcon = user.role === 'ADMIN' ? '👑' : '👤';
          message +=
            `${index + 1}. ${roleIcon} *${user.firstName} ${user.lastName || ''}*\n` +
            `   🆔 Chat ID: \`${user.chatId}\`\n` +
            `   👔 Rol: ${user.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
            `   📅 Desde: ${formatDate(user.createdAt)}\n\n`;
        });
      }

      if (inactiveUsers.length > 0) {
        message += '❌ *Usuarios Inactivos:*\n';
        inactiveUsers.forEach((user, index) => {
          message +=
            `${index + 1}. 🚫 *${user.firstName} ${user.lastName || ''}*\n` +
            `   🆔 Chat ID: \`${user.chatId}\`\n` +
            `   👔 Rol: ${user.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n\n`;
        });
      }

      message += '\n💡 *Comandos disponibles:*\n';
      message += '• `/usuario_rol [chatId] [admin|operator]` - Cambiar rol\n';
      message += '• `/usuario_eliminar [chatId]` - Eliminar usuario';

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error listando usuarios:', error);
      await ctx.reply('❌ Error al obtener la lista de usuarios.');
    }
  },

  /**
   * Comando /usuario_rol - Cambiar rol de un usuario
   * Uso: /usuario_rol [chatId] [admin|operator]
   */
  async changeRole(ctx: CommandContext<MyContext>) {
    if (!ctx.session.user) {
      await ctx.reply('❌ Debes estar registrado para usar este comando.');
      return;
    }

    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Solo los administradores pueden cambiar roles.');
      return;
    }

    const args = ctx.match?.toString().trim().split(' ') || [];
    const [chatId, newRole] = args;

    if (!chatId || !newRole) {
      await ctx.reply(
        '👔 *Cambiar Rol de Usuario*\n\n' +
          'Uso: `/usuario_rol [chatId] [admin|operator]`\n\n' +
          'Ejemplos:\n' +
          '• `/usuario_rol 123456789 admin` - Hacer administrador\n' +
          '• `/usuario_rol 123456789 operator` - Hacer operador\n\n' +
          'Para ver los chatIds usa: `/usuario_lista`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (!['admin', 'operator'].includes(newRole.toLowerCase())) {
      await ctx.reply('❌ Rol inválido. Usa `admin` o `operator`.');
      return;
    }

    try {
      // Buscar el usuario
      const targetUser = await userRepository.findByChatId(chatId);
      if (!targetUser) {
        await ctx.reply(`❌ No se encontró usuario con chatId: *${chatId}*`, {
          parse_mode: 'Markdown',
        });
        return;
      }

      // Verificar que pertenece a la misma empresa
      if (targetUser.companyId !== ctx.session.user.companyId) {
        await ctx.reply('❌ Este usuario no pertenece a tu empresa.');
        return;
      }

      // Prevenir que se cambie su propio rol
      if (targetUser.id === ctx.session.user.id) {
        await ctx.reply('❌ No puedes cambiar tu propio rol.');
        return;
      }

      const roleEnum = newRole.toLowerCase() === 'admin' ? UserRole.ADMIN : UserRole.OPERATOR;
      const roleName = roleEnum === UserRole.ADMIN ? 'Administrador' : 'Operador';

      // Verificar si ya tiene ese rol
      if (targetUser.role === roleEnum) {
        await ctx.reply(
          `ℹ️ El usuario *${targetUser.firstName} ${targetUser.lastName || ''}* ya es ${roleName}.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Cambiar el rol
      await userRepository.updateRole(targetUser.id, roleEnum);

      await ctx.reply(
        `✅ *Rol Actualizado*\n\n` +
          `👤 *Usuario:* ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
          `🆔 *Chat ID:* ${targetUser.chatId}\n` +
          `👔 *Nuevo Rol:* ${roleName}\n\n` +
          `Los cambios son efectivos inmediatamente.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error('Error cambiando rol:', error);
      await ctx.reply('❌ Error al cambiar el rol del usuario.');
    }
  },

  /**
   * Comando /usuario_eliminar - Eliminar usuario de la empresa
   * Uso: /usuario_eliminar [chatId]
   */
  async deleteUser(ctx: CommandContext<MyContext>) {
    if (!ctx.session.user) {
      await ctx.reply('❌ Debes estar registrado para usar este comando.');
      return;
    }

    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Solo los administradores pueden eliminar usuarios.');
      return;
    }

    const args = ctx.match?.toString().trim().split(' ') || [];
    const chatId = args[0];

    if (!chatId) {
      await ctx.reply(
        '🗑️ *Eliminar Usuario*\n\n' +
          'Uso: `/usuario_eliminar [chatId]`\n\n' +
          'Ejemplo: `/usuario_eliminar 123456789`\n\n' +
          'Para ver los chatIds usa: `/usuario_lista`\n\n' +
          '⚠️ *Advertencia:* Esta acción no se puede deshacer.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    try {
      // Buscar el usuario
      const targetUser = await userRepository.findByChatId(chatId);
      if (!targetUser) {
        await ctx.reply(`❌ No se encontró usuario con chatId: *${chatId}*`, {
          parse_mode: 'Markdown',
        });
        return;
      }

      // Verificar que pertenece a la misma empresa
      if (targetUser.companyId !== ctx.session.user.companyId) {
        await ctx.reply('❌ Este usuario no pertenece a tu empresa.');
        return;
      }

      // Prevenir que se elimine a sí mismo
      if (targetUser.id === ctx.session.user.id) {
        await ctx.reply('❌ No puedes eliminarte a ti mismo.');
        return;
      }

      // Mostrar confirmación
      const confirmationMessage =
        `⚠️ *Confirmar Eliminación*\n\n` +
        `👤 *Usuario:* ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
        `🆔 *Chat ID:* ${targetUser.chatId}\n` +
        `👔 *Rol:* ${targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
        `📅 *Miembro desde:* ${formatDate(targetUser.createdAt)}\n\n` +
        `⚠️ *Esta acción eliminará permanentemente:*\n` +
        `• El acceso del usuario al bot\n` +
        `• Sus datos de perfil\n` +
        `• (Los movimientos creados se mantendrán)\n\n` +
        `¿Estás seguro de eliminar este usuario?`;

      await ctx.reply(confirmationMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗑️ Sí, Eliminar', callback_data: `user_delete_confirm_${targetUser.id}` },
              { text: '❌ Cancelar', callback_data: 'user_delete_cancel' },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Error en eliminación de usuario:', error);
      await ctx.reply('❌ Error al procesar la eliminación.');
    }
  },
};
