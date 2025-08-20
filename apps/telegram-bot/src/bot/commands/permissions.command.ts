import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import {
  userRepository,
  companyRepository,
  permissionsService,
  CompanyPermissions,
  Permission,
} from '@financial-bot/database';
import { InlineKeyboard } from 'grammy';

/**
 * Comandos de gestión de permisos (solo Super Admin)
 */

export const permissionsCommands = {
  /**
   * Comando /permisos - Mostrar panel de gestión de permisos
   */
  async showPermissionsPanel(ctx: CommandContext<MyContext>) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) {
      await ctx.reply('❌ Error obteniendo información de usuario.');
      return;
    }

    // Verificar que sea Super Admin
    if (!(await permissionsService.isSuperAdmin(telegramId))) {
      await ctx.reply('❌ Solo los Super Administradores pueden gestionar permisos.');
      return;
    }

    const keyboard = new InlineKeyboard()
      .text('👥 Gestionar Usuarios', 'permissions_manage_users')
      .text('🏢 Ver por Empresa', 'permissions_by_company')
      .row()
      .text('📊 Resumen Global', 'permissions_summary')
      .text('❓ Ayuda', 'permissions_help')
      .row()
      .text('◀️ Menú Principal', 'main_menu');

    await ctx.reply(
      `🔐 **Panel de Gestión de Permisos**\n\n` +
        `👑 **Super Administrador**\n\n` +
        `Desde aquí puedes:\n` +
        `• Asignar permisos específicos a usuarios\n` +
        `• Ver permisos por empresa\n` +
        `• Gestionar accesos granulares\n\n` +
        `Selecciona una opción:`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    );
  },

  /**
   * Comando /permisos_usuario [telegramId] [empresa] [permiso] [on/off]
   */
  async manageUserPermissions(ctx: CommandContext<MyContext>) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) {
      await ctx.reply('❌ Error obteniendo información de usuario.');
      return;
    }

    // Verificar que sea Super Admin
    if (!(await permissionsService.isSuperAdmin(telegramId))) {
      await ctx.reply('❌ Solo los Super Administradores pueden gestionar permisos.');
      return;
    }

    const args = ctx.match?.toString().trim().split(' ') || [];

    if (args.length < 4) {
      await ctx.reply(
        `🔐 **Gestionar Permisos de Usuario**\n\n` +
          `**Uso:** \`/permisos_usuario [telegramId] [empresa] [permiso] [on/off]\`\n\n` +
          `**Permisos disponibles:**\n` +
          `• \`canView\` - Ver movimientos\n` +
          `• \`canEdit\` - Editar/crear movimientos\n` +
          `• \`canReport\` - Generar reportes\n` +
          `• \`canManageUsers\` - Gestionar usuarios\n\n` +
          `**Ejemplo:**\n` +
          `\`/permisos_usuario 123456789 ARK canReport on\`\n\n` +
          `📋 Para ver empresas usa: \`/empresas\`\n` +
          `👥 Para ver usuarios usa: \`/permisos\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const [targetTelegramId, companyName, permission, action] = args;

    try {
      // Buscar usuario objetivo
      const targetUser = await userRepository.findByTelegramId(targetTelegramId);
      if (!targetUser) {
        await ctx.reply(`❌ Usuario con Telegram ID ${targetTelegramId} no encontrado.`);
        return;
      }

      // Buscar empresa por nombre
      const companies = await companyRepository.findByName(companyName);
      if (companies.length === 0) {
        await ctx.reply(`❌ Empresa "${companyName}" no encontrada.`);
        return;
      }
      const company = companies[0];

      // Validar permiso
      if (!Object.values(Permission).includes(permission as Permission)) {
        await ctx.reply(
          `❌ Permiso "${permission}" no válido.\n\n` +
            `Permisos válidos: \`canView\`, \`canEdit\`, \`canReport\`, \`canManageUsers\``,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Validar acción
      if (!['on', 'off'].includes(action.toLowerCase())) {
        await ctx.reply('❌ Acción debe ser "on" o "off".');
        return;
      }

      const enable = action.toLowerCase() === 'on';

      // Obtener permisos actuales
      const currentPermissions = await permissionsService.getUserCompanyPermissions(
        targetUser.id,
        company.id,
      );

      if (!currentPermissions) {
        await ctx.reply(
          `❌ El usuario no pertenece a la empresa "${companyName}".\n\n` +
            `Agrégalo primero con: \`/usuario_agregar ${targetUser.chatId} ${targetUser.firstName}\``,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Actualizar permiso específico
      const updatedPermissions: Partial<CompanyPermissions> = {
        [permission]: enable,
      };

      const success = await permissionsService.updateUserCompanyPermissions(
        ctx.session.user!.id,
        targetUser.id,
        company.id,
        updatedPermissions,
      );

      if (success) {
        const actionText = enable ? 'activado' : 'desactivado';
        const permissionText =
          {
            canView: 'Ver movimientos',
            canEdit: 'Editar movimientos',
            canReport: 'Generar reportes',
            canManageUsers: 'Gestionar usuarios',
          }[permission] || permission;

        await ctx.reply(
          `✅ **Permiso actualizado**\n\n` +
            `👤 **Usuario:** ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
            `🏢 **Empresa:** ${company.name}\n` +
            `🔐 **Permiso:** ${permissionText}\n` +
            `📊 **Estado:** ${actionText}\n\n` +
            `Los cambios son efectivos inmediatamente.`,
          { parse_mode: 'Markdown' },
        );
      } else {
        await ctx.reply('❌ Error actualizando permisos. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error managing user permissions:', error);
      await ctx.reply('❌ Error procesando comando de permisos.');
    }
  },

  /**
   * Comando /permisos_empresa [empresa] - Ver permisos de todos los usuarios en una empresa
   */
  async showCompanyPermissions(ctx: CommandContext<MyContext>) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) {
      await ctx.reply('❌ Error obteniendo información de usuario.');
      return;
    }

    // Verificar que sea Super Admin
    if (!(await permissionsService.isSuperAdmin(telegramId))) {
      await ctx.reply('❌ Solo los Super Administradores pueden ver permisos.');
      return;
    }

    const args = ctx.match?.toString().trim();
    if (!args) {
      await ctx.reply(
        `🏢 **Ver Permisos por Empresa**\n\n` +
          `**Uso:** \`/permisos_empresa [nombre_empresa]\`\n\n` +
          `**Ejemplo:** \`/permisos_empresa ARK\`\n\n` +
          `📋 Para ver empresas disponibles usa: \`/empresas\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    try {
      // Buscar empresa
      const companies = await companyRepository.findByName(args);
      if (companies.length === 0) {
        await ctx.reply(`❌ Empresa "${args}" no encontrada.`);
        return;
      }
      const company = companies[0];

      // Obtener usuarios de la empresa
      const users = await userRepository.findByCompany(company.id);

      if (users.length === 0) {
        await ctx.reply(
          `🏢 **${company.name}**\n\n` + `📋 No hay usuarios registrados en esta empresa.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      let message = `🏢 **Permisos - ${company.name}**\n\n`;

      for (const user of users) {
        const permissions = await permissionsService.getUserCompanyPermissions(user.id, company.id);

        const isSuperAdmin = await permissionsService.isSuperAdmin(user.telegramId);

        message += `👤 **${user.firstName} ${user.lastName || ''}**\n`;
        if (isSuperAdmin) {
          message += `👑 Super Admin (Todos los permisos)\n`;
        } else if (permissions) {
          message += `👔 Rol: ${user.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n`;
          message += `📊 Ver: ${permissions.canView ? '✅' : '❌'} | `;
          message += `Editar: ${permissions.canEdit ? '✅' : '❌'} | `;
          message += `Reportes: ${permissions.canReport ? '✅' : '❌'} | `;
          message += `Usuarios: ${permissions.canManageUsers ? '✅' : '❌'}\n`;
        }
        message += '\n';
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error showing company permissions:', error);
      await ctx.reply('❌ Error obteniendo permisos de la empresa.');
    }
  },
};
