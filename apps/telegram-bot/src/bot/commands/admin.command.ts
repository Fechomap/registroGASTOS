import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import {
  systemAdminRepository,
  companyRepository,
  userRepository,
  categoryRepository,
  Company,
} from '@financial-bot/database';
import { CompanyStatus } from '@financial-bot/database';

/**
 * Comando /admin_companies - Listar empresas pendientes
 * Solo para super admins
 */
export async function adminCompaniesCommand(ctx: CommandContext<MyContext>) {
  const telegramId = ctx.from?.id.toString();

  if (!telegramId) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta.');
    return;
  }

  try {
    // Verificar si es super admin
    const isAdmin = await systemAdminRepository.isSystemAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos para ejecutar este comando.');
      return;
    }

    const pendingCompanies = await companyRepository.findPendingCompanies();

    if (pendingCompanies.length === 0) {
      await ctx.reply('✅ No hay empresas pendientes de aprobación.');
      return;
    }

    let message = '🏢 *Empresas Pendientes de Aprobación*\n\n';

    for (const company of pendingCompanies) {
      const createdDate = company.createdAt.toLocaleDateString('es-MX');
      message += `📋 *ID:* \`${company.id}\`\n`;
      message += `🏢 *Nombre:* ${company.name}\n`;
      message += `📧 *Email:* ${company.email}\n`;
      message += `📅 *Solicitado:* ${createdDate}\n`;
      message += `👤 *Por:* ${company.requestedBy}\n\n`;
      message += `✅ Aprobar: \`/approve_company ${company.id}\`\n`;
      message += `❌ Rechazar: \`/reject_company ${company.id} [razón]\`\n`;
      message += '─────────────────\n\n';
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error en admin_companies:', error);
    await ctx.reply('❌ Error al obtener las empresas pendientes.');
  }
}

/**
 * Comando /approve_company - Aprobar empresa
 * Solo para super admins
 */
export async function approveCompanyCommand(ctx: CommandContext<MyContext>) {
  const telegramId = ctx.from?.id.toString();

  if (!telegramId) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta.');
    return;
  }

  try {
    // Verificar si es super admin
    const isAdmin = await systemAdminRepository.isSystemAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos para ejecutar este comando.');
      return;
    }

    const args = ctx.match?.toString().trim();
    if (!args) {
      await ctx.reply(
        '❌ Debes especificar el ID de la empresa.\n\nUso: `/approve_company [company_id]`',
      );
      return;
    }

    const companyId = args;

    // Verificar que la empresa existe y está pendiente
    const company = await companyRepository.findById(companyId);
    if (!company) {
      await ctx.reply('❌ No se encontró la empresa especificada.');
      return;
    }

    if (company.status !== CompanyStatus.PENDING) {
      await ctx.reply(`❌ La empresa ya ha sido ${company.status.toLowerCase()}.`);
      return;
    }

    // Aprobar la empresa
    const approvedCompany = await companyRepository.approveCompany(companyId, telegramId);

    // Crear usuario admin para la empresa
    if (approvedCompany.requestedBy) {
      // Buscar datos del solicitante en el contexto del bot
      // Por ahora, crear usuario básico que se completará cuando se conecte
      await userRepository.create({
        telegramId: approvedCompany.requestedBy,
        chatId: approvedCompany.requestedBy, // Se actualizará cuando se conecte
        company: { connect: { id: approvedCompany.id } },
        firstName: 'Admin',
        role: 'ADMIN',
      });

      // Crear categorías por defecto
      await createDefaultCategories(approvedCompany.id);
    }

    const successMessage =
      '✅ *¡Empresa Aprobada!*\n\n' +
      `🏢 *Empresa:* ${approvedCompany.name}\n` +
      `📧 *Email:* ${approvedCompany.email}\n` +
      `✅ *Estado:* Aprobada\n` +
      `👤 *Aprobada por:* Super Admin\n\n` +
      '🎉 *La empresa ya puede usar el sistema.*\n' +
      '📧 *Se enviará notificación al solicitante.*';

    await ctx.reply(successMessage, { parse_mode: 'Markdown' });

    // Notificar al solicitante
    await notifyCompanyApproval(ctx, approvedCompany);
  } catch (error) {
    console.error('Error en approve_company:', error);
    await ctx.reply('❌ Error al aprobar la empresa. Intenta nuevamente.');
  }
}

/**
 * Comando /reject_company - Rechazar empresa
 * Solo para super admins
 */
export async function rejectCompanyCommand(ctx: CommandContext<MyContext>) {
  const telegramId = ctx.from?.id.toString();

  if (!telegramId) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta.');
    return;
  }

  try {
    // Verificar si es super admin
    const isAdmin = await systemAdminRepository.isSystemAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos para ejecutar este comando.');
      return;
    }

    const args = ctx.match?.toString().trim().split(' ');
    if (!args || args.length < 2) {
      await ctx.reply(
        '❌ Debes especificar el ID de la empresa y la razón del rechazo.\n\n' +
          'Uso: `/reject_company [company_id] [razón del rechazo]`\n\n' +
          'Ejemplo: `/reject_company abc123 Información incompleta`',
      );
      return;
    }

    const companyId = args[0];
    const rejectionReason = args.slice(1).join(' ');

    // Verificar que la empresa existe y está pendiente
    const company = await companyRepository.findById(companyId);
    if (!company) {
      await ctx.reply('❌ No se encontró la empresa especificada.');
      return;
    }

    if (company.status !== CompanyStatus.PENDING) {
      await ctx.reply(`❌ La empresa ya ha sido ${company.status.toLowerCase()}.`);
      return;
    }

    // Rechazar la empresa
    const rejectedCompany = await companyRepository.rejectCompany(companyId, rejectionReason);

    const successMessage =
      '❌ *Empresa Rechazada*\n\n' +
      `🏢 *Empresa:* ${rejectedCompany.name}\n` +
      `📧 *Email:* ${rejectedCompany.email}\n` +
      `❌ *Estado:* Rechazada\n` +
      `📝 *Razón:* ${rejectionReason}\n\n` +
      '📧 *Se enviará notificación al solicitante.*';

    await ctx.reply(successMessage, { parse_mode: 'Markdown' });

    // Notificar al solicitante
    await notifyCompanyRejection(ctx, rejectedCompany, rejectionReason);
  } catch (error) {
    console.error('Error en reject_company:', error);
    await ctx.reply('❌ Error al rechazar la empresa. Intenta nuevamente.');
  }
}

/**
 * Crear categorías por defecto para una empresa aprobada
 */
async function createDefaultCategories(companyId: string) {
  const defaultCategories = [
    { name: 'Alimentación', icon: '🍽️', color: '#FF6B6B' },
    { name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
    { name: 'Oficina', icon: '🏢', color: '#45B7D1' },
    { name: 'Marketing', icon: '📢', color: '#96CEB4' },
    { name: 'Tecnología', icon: '💻', color: '#FFEAA7' },
    { name: 'Servicios', icon: '🔧', color: '#DDA0DD' },
    { name: 'Otros', icon: '📦', color: '#A8A8A8' },
  ];

  for (const category of defaultCategories) {
    await categoryRepository.create({
      company: { connect: { id: companyId } },
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
  }
}

/**
 * Notificar aprobación de empresa
 */
async function notifyCompanyApproval(ctx: CommandContext<MyContext>, company: Company) {
  if (!company.requestedBy) return;

  try {
    const message =
      '🎉 *¡Tu empresa ha sido aprobada!*\n\n' +
      `🏢 *Empresa:* ${company.name}\n` +
      `✅ *Estado:* Aprobada\n\n` +
      '🚀 *¡Ya puedes usar el sistema!*\n' +
      '• Usa `/ayuda` para ver todos los comandos disponibles\n' +
      '• Empieza registrando gastos con `/gasto`\n' +
      '• Configura categorías con `/categorias`\n\n' +
      '¡Bienvenido al sistema de gestión financiera!';

    await ctx.api.sendMessage(company.requestedBy, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error notificando aprobación:', error);
  }
}

/**
 * Notificar rechazo de empresa
 */
async function notifyCompanyRejection(
  ctx: CommandContext<MyContext>,
  company: Company,
  reason: string,
) {
  if (!company.requestedBy) return;

  try {
    const message =
      '❌ *Tu solicitud de empresa ha sido rechazada*\n\n' +
      `🏢 *Empresa:* ${company.name}\n` +
      `📝 *Razón:* ${reason}\n\n` +
      '💡 *¿Qué puedes hacer?*\n' +
      '• Revisa la información proporcionada\n' +
      '• Corrige los datos necesarios\n' +
      '• Solicita un nuevo registro con `/register_company`\n\n' +
      'Si tienes dudas, contacta al administrador del sistema.';

    await ctx.api.sendMessage(company.requestedBy, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error notificando rechazo:', error);
  }
}
