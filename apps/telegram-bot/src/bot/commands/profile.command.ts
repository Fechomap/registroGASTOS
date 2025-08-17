import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { formatUserInfo, formatCurrency, formatDate } from '@financial-bot/shared';

/**
 * Comando /perfil - Muestra información del usuario y estadísticas
 */
export async function profileCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.reply('❌ No estás registrado.');
    return;
  }

  try {
    // Obtener estadísticas del usuario
    const stats = await getUserStats(user.id, user.companyId);

    let profileMessage =
      '👤 <b>Mi Perfil</b>\n\n' +
      `📝 <b>Información personal:</b>\n` +
      `• Nombre: ${formatUserInfo(user)}\n` +
      `• Rol: ${user.role === 'ADMIN' ? '👨‍💼 Administrador' : '👤 Operador'}\n` +
      `• Miembro desde: ${formatDate(user.createdAt, 'long')}\n\n` +
      `🏢 <b>Empresa:</b>\n` +
      `• ${user.company.name}\n\n` +
      `📊 <b>Mis estadísticas:</b>\n` +
      `• Total de movimientos: ${stats.totalMovements}\n` +
      `• Gastos registrados: ${stats.totalExpenses}\n` +
      `• Monto total en gastos: ${formatCurrency(stats.totalExpenseAmount)}\n`;

    if (user.role === 'ADMIN') {
      profileMessage +=
        `• Ingresos registrados: ${stats.totalIncomes}\n` +
        `• Monto total en ingresos: ${formatCurrency(stats.totalIncomeAmount)}\n`;
    }

    profileMessage +=
      `\n📅 <b>Este mes:</b>\n` +
      `• Movimientos: ${stats.thisMonthMovements}\n` +
      `• Gastos: ${formatCurrency(stats.thisMonthExpenses)}\n`;

    if (user.role === 'ADMIN') {
      profileMessage += `• Ingresos: ${formatCurrency(stats.thisMonthIncomes)}\n`;
    }

    if (stats.lastMovementDate) {
      profileMessage +=
        `\n🕐 <b>Último movimiento:</b>\n` + `${formatDate(stats.lastMovementDate, 'long')}`;
    }

    await ctx.reply(profileMessage, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error in profile command:', error);
    await ctx.reply('❌ Error al obtener información del perfil.');
  }
}

/**
 * Obtiene estadísticas del usuario
 */
async function getUserStats(userId: string, companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Todos los movimientos del usuario
  const allMovements = await movementRepository.findMany({
    companyId,
    userId,
  });

  // Movimientos de este mes
  const thisMonthMovements = await movementRepository.findMany({
    companyId,
    userId,
    dateFrom: startOfMonth,
    dateTo: endOfMonth,
  });

  // Calcular estadísticas
  const totalMovements = allMovements.length;
  const totalExpenses = allMovements.filter(m => m.type === 'EXPENSE').length;
  const totalIncomes = allMovements.filter(m => m.type === 'INCOME').length;

  const totalExpenseAmount = allMovements
    .filter(m => m.type === 'EXPENSE')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const totalIncomeAmount = allMovements
    .filter(m => m.type === 'INCOME')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const thisMonthExpenses = thisMonthMovements
    .filter(m => m.type === 'EXPENSE')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const thisMonthIncomes = thisMonthMovements
    .filter(m => m.type === 'INCOME')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const lastMovementDate = allMovements.length > 0 ? allMovements[0].date : null;

  return {
    totalMovements,
    totalExpenses,
    totalIncomes,
    totalExpenseAmount,
    totalIncomeAmount,
    thisMonthMovements: thisMonthMovements.length,
    thisMonthExpenses,
    thisMonthIncomes,
    lastMovementDate,
  };
}
