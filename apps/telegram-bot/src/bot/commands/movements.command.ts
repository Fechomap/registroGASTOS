import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import {
  movementRepository,
  permissionsService,
  Permission,
  MovementWithRelations,
} from '@financial-bot/database';
import { logger } from '../../utils/logger';
import { formatCurrency, formatDate, LIMITS } from '@financial-bot/shared';

/**
 * Comando /movimientos - Lista los movimientos del usuario con permisos multi-empresa
 * Respeta permisos granulares por empresa
 */
export async function movementsCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.reply('❌ No estás registrado.');
    return;
  }

  try {
    const args = ctx.match?.toString().trim();
    let page = 1;
    let selectedCompanyId: string | undefined;

    // Parsear argumentos: [página] [empresa] opcional
    if (args) {
      const parts = args.split(' ');
      const pageNum = parseInt(parts[0]);
      if (!isNaN(pageNum) && pageNum > 0) {
        page = pageNum;
      }
      if (parts[1]) {
        selectedCompanyId = parts[1];
      }
    }

    // Obtener empresas accesibles para el usuario
    const accessibleCompanies = await permissionsService.getUserAccessibleCompanies(user.id);

    if (accessibleCompanies.length === 0) {
      await ctx.reply('❌ No tienes acceso a ninguna empresa.');
      return;
    }

    // Determinar qué empresas consultar
    let companiesToQuery = accessibleCompanies;
    if (selectedCompanyId) {
      if (accessibleCompanies.includes(selectedCompanyId)) {
        companiesToQuery = [selectedCompanyId];
      } else {
        await ctx.reply('❌ No tienes acceso a esa empresa.');
        return;
      }
    }

    // Verificar alcance de reportes del usuario
    const reportScope = await permissionsService.getUserReportScope(user.id);

    // Configuración de paginación
    const limit = LIMITS.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    // Obtener movimientos según permisos
    let allMovements: MovementWithRelations[] = [];
    let totalCount = 0;

    for (const companyId of companiesToQuery) {
      // Verificar permisos específicos para esta empresa
      const canView = await permissionsService.hasPermission(
        user.id,
        companyId,
        Permission.VIEW_MOVEMENTS,
      );

      if (!canView.hasPermission) {
        continue; // Saltar empresas sin permisos
      }

      const filters: { companyId: string; userId?: string } = { companyId };

      // Si no es Super Admin y no tiene permisos de reporte, solo ve sus movimientos
      if (reportScope === 'own') {
        filters.userId = user.id;
      }

      const companyMovements = await movementRepository.findMany(filters, {
        skip: 0, // Obtenemos todos para luego paginar el resultado completo
        take: 1000, // Límite razonable por empresa
      });

      allMovements = [...allMovements, ...companyMovements];
    }

    // Ordenar por fecha (más recientes primero) y paginar
    allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    totalCount = allMovements.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedMovements = allMovements.slice(skip, skip + limit);

    if (paginatedMovements.length === 0) {
      const message =
        page === 1
          ? '📋 No tienes movimientos registrados aún.\n\nUsa /gasto [monto] [descripción] para registrar tu primer gasto.'
          : `📋 No hay movimientos en la página ${page}.`;

      await ctx.reply(message);
      return;
    }

    // Construir mensaje
    let message = `📋 <b>Movimientos Multi-empresa</b> (Página ${page} de ${totalPages})\n\n`;

    // Información de alcance
    message += `👤 <b>Usuario:</b> ${user.firstName}\n`;
    message += `🔐 <b>Alcance:</b> ${reportScope === 'all' ? 'Super Admin' : reportScope === 'company' ? 'Multi-empresa' : 'Personal'}\n`;
    message += `🏢 <b>Empresas consultadas:</b> ${companiesToQuery.length}/${accessibleCompanies.length}\n`;
    message += `📊 <b>Total de movimientos:</b> ${totalCount}\n\n`;

    // Listar movimientos
    paginatedMovements.forEach((movement, _index) => {
      const typeIcon = movement.type === 'EXPENSE' ? '💸' : '💰';
      const amount = formatCurrency(Number(movement.amount));
      const date = formatDate(movement.date, 'short');

      message +=
        `${typeIcon} <b>${movement.folio}</b>\n` +
        `💰 ${amount} MXN\n` +
        `📝 ${movement.description}\n` +
        `📅 ${date}`;

      // Mostrar usuario si no es el usuario actual
      if (movement.user.id !== user.id) {
        message += ` • ${movement.user.firstName}`;
      }

      // Mostrar empresa si hay múltiples empresas
      if (companiesToQuery.length > 1 && movement.company) {
        message += ` • ${movement.company.name}`;
      }

      if (movement.category) {
        message += `\n📁 ${movement.category.name}`;
      }

      message += '\n\n';
    });

    // Información de paginación
    if (totalPages > 1) {
      message += `📄 <b>Navegación:</b>\n`;

      if (page > 1) {
        message += `• Página anterior: <code>/movimientos ${page - 1}</code>\n`;
      }

      if (page < totalPages) {
        message += `• Página siguiente: <code>/movimientos ${page + 1}</code>\n`;
      }

      message += `• Total de páginas: ${totalPages}\n`;
    }

    message += `\n💡 <b>Consejos:</b>\n`;
    message += `• Usa <code>/movimientos [página] [empresa]</code> para filtrar\n`;

    // Mostrar comandos según permisos
    if (reportScope !== 'own') {
      message += `• Usa <code>/editar [folio]</code> para editar un movimiento\n`;
      message += `• Usa <code>/eliminar [folio]</code> para eliminar un movimiento\n`;
    }

    message += `• Usa <code>/reporte</code> para generar reportes detallados`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    // Log de la actividad
    logger.info('Multi-company movements listed', {
      userId: user.id,
      page,
      totalCount,
      totalPages,
      reportScope,
      companiesQueried: companiesToQuery.length,
      accessibleCompanies: accessibleCompanies.length,
    });
  } catch (error) {
    logger.error('Error in movements command:', error);
    await ctx.reply('❌ Error al obtener los movimientos. Intenta nuevamente.');
  }
}
