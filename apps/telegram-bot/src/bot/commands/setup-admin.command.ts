import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { systemAdminRepository } from '@financial-bot/database';

/**
 * Comando especial /setup_super_admin - Solo funciona si no hay super admins
 * Permite configurar el primer super admin del sistema
 */
export async function setupSuperAdminCommand(ctx: CommandContext<MyContext>) {
  const telegramId = ctx.from?.id.toString();
  const chatId = ctx.chat?.id.toString();
  const firstName = ctx.from?.first_name;
  const lastName = ctx.from?.last_name;
  const username = ctx.from?.username;

  if (!telegramId || !chatId || !firstName) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta de Telegram.');
    return;
  }

  try {
    // Verificar si ya existen super admins
    const existingAdmins = await systemAdminRepository.findAll();
    
    if (existingAdmins.length > 0) {
      await ctx.reply(
        '❌ *Ya existe un super administrador configurado*\n\n' +
        '🔒 Por seguridad, este comando solo funciona cuando no hay super admins en el sistema.\n\n' +
        'Si necesitas cambios en los permisos, contacta al super admin existente.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Crear el primer super admin
    const superAdmin = await systemAdminRepository.create({
      telegramId,
      chatId,
      firstName,
      lastName,
      username,
    });

    const successMessage = (
      '🎉 *¡Super Administrador Configurado!*\n\n' +
      `👤 *Nombre:* ${firstName} ${lastName || ''}\n` +
      `📱 *Username:* @${username || 'sin username'}\n` +
      `🆔 *Telegram ID:* \`${telegramId}\`\n\n` +
      '🔐 *Permisos Otorgados:*\n' +
      '• Aprobar/rechazar empresas\n' +
      '• Ver empresas pendientes\n' +
      '• Gestionar el sistema multi-tenant\n\n' +
      '⚡ *Comandos Disponibles:*\n' +
      '• `/admin_companies` - Ver empresas pendientes\n' +
      '• `/approve_company [id]` - Aprobar empresa\n' +
      '• `/reject_company [id] [razón]` - Rechazar empresa\n\n' +
      '🚀 *El sistema está listo para recibir solicitudes de empresas.*'
    );

    await ctx.reply(successMessage, { parse_mode: 'Markdown' });

    // Log para auditoria
    console.log(`✅ Super admin configurado: ${firstName} (${telegramId})`);

  } catch (error) {
    console.error('Error configurando super admin:', error);
    await ctx.reply('❌ Error al configurar super administrador. Intenta nuevamente.');
  }
}