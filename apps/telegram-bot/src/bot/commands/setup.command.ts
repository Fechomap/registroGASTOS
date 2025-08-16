import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, companyRepository, systemAdminRepository } from '@financial-bot/database';
import { UserRole } from '@financial-bot/database';

/**
 * Comando /register_company - Solicitar registro de nueva empresa
 * Crea una empresa en estado PENDING para aprobación del super admin
 */
export async function registerCompanyCommand(ctx: CommandContext<MyContext>) {
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
    // Verificar si este usuario ya está registrado
    const existingUser = await userRepository.findByTelegramId(telegramId);
    if (existingUser) {
      await ctx.reply('✅ Ya tienes una cuenta registrada. Usa /ayuda para ver los comandos disponibles.');
      return;
    }

    const args = ctx.match?.toString().trim().split(' ') || [];
    if (args.length < 2) {
      await ctx.reply(
        '🏢 *Solicitar Registro de Empresa*\n\n' +
        'Solicita el registro de tu empresa al sistema.\n\n' +
        'Uso: `/register_company [nombre_empresa] [email_empresa]`\n\n' +
        'Ejemplo: `/register_company "Mi Empresa SA" admin@miempresa.com`\n\n' +
        '⏳ Tu solicitud será revisada por un administrador del sistema.\n' +
        '📧 Recibirás una notificación cuando sea aprobada o rechazada.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const companyName = args.slice(0, -1).join(' ').replace(/"/g, '');
    const companyEmail = args[args.length - 1];

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      await ctx.reply('❌ El email de la empresa no es válido.');
      return;
    }

    // Crear la empresa en estado PENDING
    const company = await companyRepository.create({
      name: companyName,
      email: companyEmail,
      phone: '+52 55 0000 0000', // Teléfono por defecto
      requestedBy: telegramId,
      settings: {
        currency: 'MXN',
        timezone: 'America/Mexico_City',
        notifications: {
          instant: true,
          daily: true,
        },
      },
    });

    // NO crear usuario aún - la empresa está pendiente de aprobación
    // El usuario se creará cuando la empresa sea aprobada

    // Notificar a super admins sobre nueva solicitud
    await notifySystemAdmins(ctx, company);

    const successMessage = (
      '📋 *¡Solicitud Enviada!*\n\n' +
      `🏢 *Empresa:* ${company.name}\n` +
      `📧 *Email:* ${company.email}\n` +
      `👤 *Solicitante:* ${firstName} ${lastName || ''}\n` +
      `📊 *Estado:* ⏳ Pendiente de aprobación\n\n` +
      '⏳ *¿Qué sigue?*\n' +
      '• Tu solicitud será revisada por un administrador del sistema\n' +
      '• Recibirás una notificación cuando sea aprobada o rechazada\n' +
      '• Una vez aprobada, podrás usar todos los comandos del bot\n\n' +
      '📧 *Mantente atento a las notificaciones en este chat.*'
    );

    await ctx.reply(successMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error en comando setup:', error);
    await ctx.reply('❌ Error al configurar la empresa. Intenta nuevamente.');
  }
}

/**
 * Notificar a todos los super admins sobre nueva solicitud
 */
async function notifySystemAdmins(ctx: CommandContext<MyContext>, company: any) {
  try {
    const systemAdmins = await systemAdminRepository.findAll();
    
    if (systemAdmins.length === 0) {
      console.warn('No hay super admins configurados para notificar');
      return;
    }

    const message = (
      '🔔 *Nueva Solicitud de Empresa*\n\n' +
      `🏢 *Empresa:* ${company.name}\n` +
      `📧 *Email:* ${company.email}\n` +
      `👤 *Solicitante:* ${company.requestedBy}\n` +
      `📅 *Fecha:* ${company.createdAt.toLocaleDateString('es-MX')}\n\n` +
      `📋 *ID:* \`${company.id}\`\n\n` +
      '⚡ *Acciones Disponibles:*\n' +
      `✅ \`/approve_company ${company.id}\`\n` +
      `❌ \`/reject_company ${company.id} [razón]\`\n` +
      `📋 \`/admin_companies\` - Ver todas las pendientes`
    );

    for (const admin of systemAdmins) {
      try {
        await ctx.api.sendMessage(admin.chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Error notificando a super admin ${admin.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error notificando a super admins:', error);
  }
}