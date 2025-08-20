import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository } from '@financial-bot/database';
import { createMainMenu, getMainMenuMessage } from '../menus/main.menu';

/**
 * Comando /menu - Mostrar menú principal interactivo
 */
export async function menuCommand(ctx: CommandContext<MyContext>) {
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
        '❌ **No estás registrado en el sistema**\n\n' +
          'Para usar el bot, tu empresa debe estar registrada y aprobada.\n\n' +
          'Usa `/register_company [nombre] [email]` para solicitar el registro.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Obtener todas las empresas del usuario
    const userCompanies = await userRepository.getUserCompanies(user.id);

    if (userCompanies.length === 0) {
      await ctx.reply(
        '❌ **No tienes empresas asociadas**\n\n' +
          'Solicita el registro de una empresa usando `/register_company [nombre] [email]`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Verificar si tiene al menos una empresa aprobada
    const approvedCompanies = userCompanies.filter(uc => uc.company.status === 'APPROVED');

    if (approvedCompanies.length === 0) {
      const pendingCompanies = userCompanies.filter(uc => uc.company.status === 'PENDING');
      const pendingNames = pendingCompanies.map(uc => uc.company.name).join(', ');

      await ctx.reply(
        `⏳ **Empresas pendientes de aprobación**\n\n` +
          `📋 Empresas: ${pendingNames}\n\n` +
          'Recibirás una notificación cuando sean aprobadas.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Crear menú principal
    const keyboard = createMainMenu(user.role);
    const companyNames = approvedCompanies.map(uc => uc.company.name).join(', ');
    const message = getMainMenuMessage(user.firstName, user.role, companyNames);

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error en comando menu:', error);
    await ctx.reply('❌ Error al cargar el menú. Intenta nuevamente.');
  }
}

/**
 * Comando /start mejorado - Redirige al menú
 */
export async function startCommand(ctx: CommandContext<MyContext>) {
  const telegramId = ctx.from?.id.toString();

  if (!telegramId) {
    await ctx.reply('❌ No se pudo obtener información de tu cuenta.');
    return;
  }

  try {
    // Verificar si es super admin
    const isSystemAdmin = await userRepository.findByTelegramId(telegramId);

    if (!isSystemAdmin) {
      // Usuario nuevo
      await ctx.reply(
        '🤖 **¡Bienvenido al Financial Bot!**\n\n' +
          '🏢 **Sistema de Gestión Financiera Empresarial**\n\n' +
          '**Primeros pasos:**\n' +
          '1️⃣ Si eres el primer usuario, usa `/setup_super_admin`\n' +
          '2️⃣ Si ya hay un super admin, usa `/register_company`\n' +
          '3️⃣ Una vez aprobado, usa `/menu` para empezar\n\n' +
          '❓ Usa `/ayuda` para ver todos los comandos disponibles.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Usuario existente - mostrar menú
    await menuCommand(ctx);
  } catch (error) {
    console.error('Error en comando start:', error);
    await ctx.reply('❌ Error al inicializar. Intenta nuevamente.');
  }
}
