import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, movementRepository } from '@financial-bot/database';
import { requireAdmin } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { formatCurrency, formatDate, formatPhone } from '@financial-bot/shared';

/**
 * Comando /empresa - Muestra información de la empresa (solo admins)
 */
export async function companyCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;
  
  if (!user) {
    await ctx.reply('❌ No estás registrado.');
    return;
  }

  // Verificar que sea administrador
  if (user.role !== 'ADMIN') {
    await ctx.reply('❌ Solo los administradores pueden ver información de la empresa.');
    return;
  }

  try {
    // Obtener estadísticas de la empresa
    const [users, stats] = await Promise.all([
      userRepository.findByCompany(user.companyId),
      getCompanyStats(user.companyId)
    ]);

    const company = user.company;
    const activeUsers = users.filter(u => u.isActive);
    const admins = activeUsers.filter(u => u.role === 'ADMIN');
    const operators = activeUsers.filter(u => u.role === 'OPERATOR');

    let message = 
      `🏢 <b>Información de la Empresa</b>\n\n` +
      
      `📋 <b>Datos básicos:</b>\n` +
      `• Nombre: ${company.name}\n` +
      `• Email: ${company.email}\n` +
      `• Teléfono: ${formatPhone(company.phone)}\n` +
      `• Creada: ${formatDate(company.createdAt, 'long')}\n\n` +
      
      `👥 <b>Usuarios:</b>\n` +
      `• Total activos: ${activeUsers.length}\n` +
      `• Administradores: ${admins.length}\n` +
      `• Operadores: ${operators.length}\n\n` +
      
      `📊 <b>Estadísticas generales:</b>\n` +
      `• Total de movimientos: ${stats.totalMovements}\n` +
      `• Total de gastos: ${formatCurrency(stats.totalExpenses)}\n` +
      `• Total de ingresos: ${formatCurrency(stats.totalIncomes)}\n` +
      `• Balance general: ${formatCurrency(stats.balance)}\n\n` +
      
      `📅 <b>Este mes:</b>\n` +
      `• Movimientos: ${stats.thisMonthMovements}\n` +
      `• Gastos: ${formatCurrency(stats.thisMonthExpenses)}\n` +
      `• Ingresos: ${formatCurrency(stats.thisMonthIncomes)}\n` +
      `• Balance del mes: ${formatCurrency(stats.thisMonthBalance)}\n\n`;

    // Mostrar administradores
    if (admins.length > 0) {
      message += `👨‍💼 <b>Administradores:</b>\n`;
      admins.forEach(admin => {
        message += `• ${admin.firstName}`;
        if (admin.lastName) message += ` ${admin.lastName}`;
        if (admin.username) message += ` (@${admin.username})`;
        message += '\n';
      });
      message += '\n';
    }

    // Mostrar top operadores (solo nombres)
    if (operators.length > 0) {
      message += `👤 <b>Operadores activos:</b> ${operators.length}\n`;
      
      if (operators.length <= 5) {
        operators.forEach(operator => {
          message += `• ${operator.firstName}`;
          if (operator.lastName) message += ` ${operator.lastName}`;
          message += '\n';
        });
      } else {
        message += `• ${operators.slice(0, 3).map(o => o.firstName).join(', ')} y ${operators.length - 3} más\n`;
      }
      message += '\n';
    }

    message += 
      `💡 <b>Comandos útiles:</b>\n` +
      `• <code>/usuario_lista</code> - Ver todos los usuarios\n` +
      `• <code>/reporte</code> - Generar reportes\n` +
      `• <code>/usuario_agregar</code> - Agregar nuevo usuario`;

    await ctx.reply(message, { 
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    // Log de la actividad
    logger.info('Company info viewed', {
      userId: user.id,
      companyId: user.companyId,
      totalUsers: activeUsers.length,
      totalMovements: stats.totalMovements,
    });

  } catch (error) {
    logger.error('Error in company command:', error);
    await ctx.reply('❌ Error al obtener información de la empresa.');
  }
}

/**
 * Obtiene estadísticas de la empresa
 */
async function getCompanyStats(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Todos los movimientos de la empresa
  const allMovements = await movementRepository.findMany({ companyId });

  // Movimientos de este mes
  const thisMonthMovements = await movementRepository.findMany({
    companyId,
    dateFrom: startOfMonth,
    dateTo: endOfMonth,
  });

  // Calcular totales generales
  const totalExpenses = allMovements
    .filter(m => m.type === 'EXPENSE')
    .reduce((sum, m) => sum + Number(m.amount), 0);
    
  const totalIncomes = allMovements
    .filter(m => m.type === 'INCOME')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  // Calcular totales del mes
  const thisMonthExpenses = thisMonthMovements
    .filter(m => m.type === 'EXPENSE')
    .reduce((sum, m) => sum + Number(m.amount), 0);
    
  const thisMonthIncomes = thisMonthMovements
    .filter(m => m.type === 'INCOME')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  return {
    totalMovements: allMovements.length,
    totalExpenses,
    totalIncomes,
    balance: totalIncomes - totalExpenses,
    thisMonthMovements: thisMonthMovements.length,
    thisMonthExpenses,
    thisMonthIncomes,
    thisMonthBalance: thisMonthIncomes - thisMonthExpenses,
  };
}