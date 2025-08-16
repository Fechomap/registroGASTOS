import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { logger } from '../../utils/logger';
import { formatCurrency, formatDate, formatMovementType, LIMITS } from '@financial-bot/shared';

/**
 * Comando /movimientos - Lista los movimientos del usuario
 * Los operadores solo ven sus propios movimientos
 * Los admins pueden ver todos los movimientos o filtrar por usuario
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
    let targetUserId = user.id; // Por defecto, mostrar movimientos propios

    // Parsear argumentos (página opcional)
    if (args) {
      const pageNum = parseInt(args);
      if (!isNaN(pageNum) && pageNum > 0) {
        page = pageNum;
      }
    }

    // Solo los admins pueden ver movimientos de otros usuarios
    if (user.role === 'ADMIN') {
      // TODO: En el futuro implementar filtros por usuario específico
      // Por ahora, los admins ven todos los movimientos de la empresa
      targetUserId = undefined as any; // Ver todos
    }

    // Configuración de paginación
    const limit = LIMITS.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    // Obtener movimientos
    const filters = {
      companyId: user.companyId,
      ...(targetUserId && { userId: targetUserId }),
    };

    const movements = await movementRepository.findMany(filters, {
      skip,
      take: limit,
    });

    const totalCount = await movementRepository.count(filters);
    const totalPages = Math.ceil(totalCount / limit);

    if (movements.length === 0) {
      const message = page === 1 
        ? '📋 No tienes movimientos registrados aún.\n\nUsa /gasto [monto] [descripción] para registrar tu primer gasto.'
        : `📋 No hay movimientos en la página ${page}.`;
      
      await ctx.reply(message);
      return;
    }

    // Construir mensaje
    let message = `📋 <b>Movimientos</b> (Página ${page} de ${totalPages})\n\n`;
    
    if (user.role === 'ADMIN' && !targetUserId) {
      message += `🏢 <b>Empresa:</b> ${user.company.name}\n`;
      message += `📊 <b>Total de movimientos:</b> ${totalCount}\n\n`;
    } else {
      message += `👤 <b>Mis movimientos:</b> ${totalCount}\n\n`;
    }

    // Listar movimientos
    movements.forEach((movement, index) => {
      const typeIcon = movement.type === 'EXPENSE' ? '💸' : '💰';
      const amount = formatCurrency(Number(movement.amount));
      const date = formatDate(movement.date, 'short');
      
      message += 
        `${typeIcon} <b>${movement.folio}</b>\n` +
        `💰 ${amount} MXN\n` +
        `📝 ${movement.description}\n` +
        `📅 ${date}`;
      
      if (user.role === 'ADMIN' && movement.user.id !== user.id) {
        message += ` • ${movement.user.firstName}`;
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
    
    if (user.role === 'ADMIN') {
      message += 
        `• Usa <code>/editar [folio]</code> para editar un movimiento\n` +
        `• Usa <code>/eliminar [folio]</code> para eliminar un movimiento\n`;
    }
    
    message += `• Usa <code>/reporte</code> para generar reportes detallados`;

    await ctx.reply(message, { 
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    // Log de la actividad
    logger.info('Movements listed', {
      userId: user.id,
      page,
      totalCount,
      totalPages,
      isAdmin: user.role === 'ADMIN',
    });

  } catch (error) {
    logger.error('Error in movements command:', error);
    await ctx.reply('❌ Error al obtener los movimientos. Intenta nuevamente.');
  }
}