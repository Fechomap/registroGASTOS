import { NextFunction } from 'grammy';
import { MyContext } from '../../types';
import { permissionsService, Permission } from '@financial-bot/database';

/**
 * Configuración de permisos requeridos por comando
 */
interface CommandPermissions {
  command: string;
  permission: Permission;
  requiresCompany?: boolean; // Si requiere especificar una empresa
  bypassForSuperAdmin?: boolean; // Si los super admins pueden omitir este permiso
}

/**
 * Mapeo de comandos a permisos requeridos
 */
const COMMAND_PERMISSIONS: CommandPermissions[] = [
  // Comandos de movimientos
  {
    command: '/editar',
    permission: Permission.EDIT_MOVEMENTS,
    requiresCompany: true,
    bypassForSuperAdmin: true,
  },
  {
    command: '/eliminar',
    permission: Permission.EDIT_MOVEMENTS,
    requiresCompany: true,
    bypassForSuperAdmin: true,
  },
  {
    command: '/gasto',
    permission: Permission.EDIT_MOVEMENTS,
    requiresCompany: true,
    bypassForSuperAdmin: true,
  },
  {
    command: '/ingreso',
    permission: Permission.EDIT_MOVEMENTS,
    requiresCompany: true,
    bypassForSuperAdmin: true,
  },
  // Comandos de reportes
  {
    command: '/reporte',
    permission: Permission.GENERATE_REPORTS,
    requiresCompany: false, // Los reportes pueden ser multi-empresa
    bypassForSuperAdmin: true,
  },
  // Comandos de gestión de usuarios (solo admins con permisos)
  {
    command: '/usuario_agregar',
    permission: Permission.MANAGE_USERS,
    requiresCompany: true,
    bypassForSuperAdmin: true,
  },
  {
    command: '/usuario_lista',
    permission: Permission.MANAGE_USERS,
    requiresCompany: true,
    bypassForSuperAdmin: true,
  },
  // Comandos de permisos (solo Super Admin)
  {
    command: '/permisos',
    permission: Permission.MANAGE_USERS,
    requiresCompany: false,
    bypassForSuperAdmin: false, // Los Super Admins DEBEN tener este permiso
  },
  {
    command: '/permisos_usuario',
    permission: Permission.MANAGE_USERS,
    requiresCompany: false,
    bypassForSuperAdmin: false,
  },
  {
    command: '/permisos_empresa',
    permission: Permission.MANAGE_USERS,
    requiresCompany: false,
    bypassForSuperAdmin: false,
  },
];

/**
 * Comandos que NO requieren verificación de permisos
 */
const BYPASS_COMMANDS = [
  '/start',
  '/menu',
  '/ayuda',
  '/help',
  '/register_company',
  '/setup_super_admin',
  '/admin_companies',
  '/approve_company',
  '/reject_company',
  '/movimientos', // Solo lectura, verificado internamente
  '/setup', // Registro de empresa
  '/configurar',
];

/**
 * Middleware para verificar permisos granulares antes de ejecutar comandos
 */
export async function permissionsMiddleware(ctx: MyContext, next: NextFunction) {
  const messageText = ctx.message?.text || ctx.callbackQuery?.data || '';
  const command = extractCommand(messageText);

  // Si es un comando que no requiere verificación, continuar
  if (BYPASS_COMMANDS.includes(command)) {
    await next();
    return;
  }

  // Buscar configuración de permisos para este comando
  const commandConfig = COMMAND_PERMISSIONS.find(config => command.startsWith(config.command));

  // Si no hay configuración específica, permitir el comando
  if (!commandConfig) {
    await next();
    return;
  }

  const telegramId = ctx.from?.id.toString();
  if (!telegramId) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta.');
    return;
  }

  try {
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ No estás registrado en el sistema.');
      return;
    }

    // Verificar si es Super Admin
    const isSuperAdmin = await permissionsService.isSuperAdmin(user.telegramId);

    if (isSuperAdmin && commandConfig.bypassForSuperAdmin) {
      // Super Admin puede ejecutar el comando sin verificación adicional
      await next();
      return;
    }

    // Para comandos que requieren empresa específica
    if (commandConfig.requiresCompany) {
      // Obtener empresas accesibles para el usuario
      const accessibleCompanies = await permissionsService.getUserAccessibleCompanies(user.id);

      if (accessibleCompanies.length === 0) {
        await ctx.reply(
          '❌ **Sin acceso a empresas**\n\n' +
            'No tienes permisos para acceder a ninguna empresa.\n\n' +
            'Contacta a un administrador para que te asigne permisos.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Verificar permisos en al menos una empresa
      let hasPermissionInAnyCompany = false;
      const companiesWithPermission: string[] = [];

      for (const companyId of accessibleCompanies) {
        const permissionCheck = await permissionsService.hasPermission(
          user.id,
          companyId,
          commandConfig.permission,
        );

        if (permissionCheck.hasPermission) {
          hasPermissionInAnyCompany = true;
          companiesWithPermission.push(companyId);
        }
      }

      if (!hasPermissionInAnyCompany) {
        const permissionNames = {
          [Permission.VIEW_MOVEMENTS]: 'ver movimientos',
          [Permission.EDIT_MOVEMENTS]: 'editar movimientos',
          [Permission.GENERATE_REPORTS]: 'generar reportes',
          [Permission.MANAGE_USERS]: 'gestionar usuarios',
        };

        await ctx.reply(
          `❌ **Permisos insuficientes**\n\n` +
            `Para usar \`${command}\` necesitas permiso para **${permissionNames[commandConfig.permission]}**.\n\n` +
            `📊 **Tu acceso actual:**\n` +
            `• Empresas accesibles: ${accessibleCompanies.length}\n` +
            `• Empresas con este permiso: ${companiesWithPermission.length}\n\n` +
            `🔐 Contacta a un administrador para solicitar los permisos necesarios.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Agregar información de empresas con permisos al contexto
      ctx.session.companiesWithPermission = companiesWithPermission;
    } else {
      // Para comandos que no requieren empresa específica (como /permisos)
      // Solo verificar que sea Super Admin para comandos de gestión global
      if (!isSuperAdmin) {
        await ctx.reply(
          '❌ **Acceso restringido**\n\n' +
            'Este comando requiere privilegios de Super Administrador.\n\n' +
            '👑 Solo los Super Admins pueden ejecutar comandos de gestión global.',
          { parse_mode: 'Markdown' },
        );
        return;
      }
    }

    // Si llegamos aquí, el usuario tiene los permisos necesarios
    await next();
  } catch (error) {
    console.error('Error en middleware de permisos:', error);
    await ctx.reply('❌ Error al verificar permisos. Intenta nuevamente.');
  }
}

/**
 * Extrae el comando principal del texto del mensaje
 */
function extractCommand(text: string): string {
  if (!text) return '';

  const parts = text.trim().split(' ');
  return parts[0] || '';
}

/**
 * Middleware específico para verificar permisos de edición en una empresa
 */
export async function requireEditPermissions(companyId: string) {
  return async (ctx: MyContext, next: NextFunction) => {
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ No estás registrado en el sistema.');
      return;
    }

    const isSuperAdmin = await permissionsService.isSuperAdmin(user.telegramId);
    if (isSuperAdmin) {
      await next();
      return;
    }

    const permissionCheck = await permissionsService.hasPermission(
      user.id,
      companyId,
      Permission.EDIT_MOVEMENTS,
    );

    if (!permissionCheck.hasPermission) {
      await ctx.reply(
        '❌ **Sin permisos de edición**\n\n' +
          'No tienes permisos para editar movimientos en esta empresa.\n\n' +
          `📋 **Razón:** ${permissionCheck.reason}`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    await next();
  };
}

/**
 * Middleware específico para verificar permisos de reportes
 */
export async function requireReportPermissions() {
  return async (ctx: MyContext, next: NextFunction) => {
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ No estás registrado en el sistema.');
      return;
    }

    const reportScope = await permissionsService.getUserReportScope(user.id);

    // Todos los usuarios pueden generar al menos reportes personales
    if (reportScope === 'own' || reportScope === 'company' || reportScope === 'all') {
      await next();
      return;
    }

    await ctx.reply(
      '❌ **Sin permisos de reportes**\n\n' +
        'No tienes permisos para generar reportes en el sistema.',
      { parse_mode: 'Markdown' },
    );
  };
}
