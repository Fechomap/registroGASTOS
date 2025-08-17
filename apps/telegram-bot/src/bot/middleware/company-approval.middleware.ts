import { NextFunction } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, companyRepository } from '@financial-bot/database';

/**
 * Middleware para verificar que la empresa del usuario esté aprobada
 * Solo aplica para comandos que requieren empresa activa
 */
export async function companyApprovalMiddleware(ctx: MyContext, next: NextFunction) {
  // Comandos que NO requieren empresa aprobada
  const allowedCommands = [
    '/start',
    '/menu',
    '/register_company',
    '/setup_super_admin',
    '/ayuda',
    '/help',
    '/admin_companies',
    '/approve_company',
    '/reject_company',
  ];

  // Si es un comando permitido, continuar
  const messageText = ctx.message?.text || ctx.callbackQuery?.message?.text || '';
  const isAllowedCommand = allowedCommands.some(cmd => messageText.startsWith(cmd));

  if (isAllowedCommand) {
    await next();
    return;
  }

  // Para otros comandos, verificar empresa
  const telegramId = ctx.from?.id.toString();

  if (!telegramId) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta.');
    return;
  }

  try {
    // Buscar usuario
    const user = await userRepository.findByTelegramId(telegramId);

    if (!user) {
      await ctx.reply(
        '❌ *No estás registrado en el sistema*\n\n' +
          '🏢 Para usar el bot, tu empresa debe estar registrada y aprobada.\n\n' +
          '📝 Usa `/register_company [nombre] [email]` para solicitar el registro de tu empresa.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Verificar que la empresa esté aprobada
    const isApproved = await companyRepository.isCompanyApproved(user.companyId);

    if (!isApproved) {
      // Buscar la empresa entre todas para obtener el status completo
      const allCompanies = await companyRepository.findPendingCompanies();
      const approvedCompanies = await companyRepository.findApprovedCompanies();
      const allCompaniesList = [...allCompanies, ...approvedCompanies];
      const company = allCompaniesList.find(c => c.id === user.companyId);
      let statusMessage = '';

      switch (company?.status) {
        case 'PENDING':
          statusMessage =
            '⏳ Tu empresa está pendiente de aprobación por un administrador del sistema.';
          break;
        case 'REJECTED':
          statusMessage = '❌ Tu empresa fue rechazada. Contacta al administrador del sistema.';
          break;
        case 'SUSPENDED':
          statusMessage = '🚫 Tu empresa está suspendida. Contacta al administrador del sistema.';
          break;
        default:
          statusMessage = '❌ Tu empresa no está aprobada para usar el sistema.';
      }

      await ctx.reply(
        `🏢 *Estado de Empresa: ${company?.status || 'DESCONOCIDO'}*\n\n` +
          statusMessage +
          '\n\n' +
          '📧 *Recibirás una notificación cuando el estado cambie.*',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Si llegamos aquí, la empresa está aprobada
    await next();
  } catch (error) {
    console.error('Error en middleware de aprobación:', error);
    await ctx.reply('❌ Error al verificar el estado de tu empresa. Intenta nuevamente.');
  }
}
