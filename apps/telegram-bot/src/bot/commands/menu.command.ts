import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository, companyRepository } from '@financial-bot/database';
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
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Buscar empresa
    const company = await companyRepository.findById(user.companyId);
    
    if (!company) {
      await ctx.reply('❌ Error al cargar información de la empresa.');
      return;
    }

    // Verificar si la empresa está aprobada
    const isApproved = await companyRepository.isCompanyApproved(user.companyId);
    
    if (!isApproved) {
      await ctx.reply(
        `🏢 **Estado de Empresa: ${company.status}**\n\n` +
        '⏳ Tu empresa está pendiente de aprobación.\n\n' +
        'Recibirás una notificación cuando sea aprobada.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Crear menú principal
    const keyboard = createMainMenu(user.role);
    const message = getMainMenuMessage(
      user.firstName,
      user.role,
      company.name
    );

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
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
        { parse_mode: 'Markdown' }
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