import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { companyRepository, userRepository } from '@financial-bot/database';
import { logger } from '../../utils/logger';
import {
  createNoCompaniesMenu,
  getNoCompaniesMessage,
  createCompanyHelpMenu,
  getCompanyHelpMessage,
  getCompanyRegisterMessage,
  createCompanyConfirmMenu,
  getCompanyPendingMessage,
  createCompanyPendingMenu,
} from '../menus/company-setup.menu';
import { createMainMenu, getMainMenuMessage } from '../menus/main.menu';

/**
 * Estado para registro de empresa
 */
interface CompanyRegistrationData {
  step: 'name' | 'email' | 'phone' | 'confirm';
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Mostrar ayuda sobre empresas
 */
export async function handleCompanyHelp(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  await ctx.editMessageText(getCompanyHelpMessage(), {
    parse_mode: 'Markdown',
    reply_markup: createCompanyHelpMenu(),
  });

  await ctx.answerCallbackQuery();
}

/**
 * Iniciar registro de empresa
 */
export async function handleCompanyRegisterStart(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  // Verificar si ya tiene una empresa pendiente
  try {
    const existingRequest = await companyRepository.findPendingByUser(user.telegramId);

    if (existingRequest) {
      await ctx.editMessageText(
        `⏳ **Ya tienes una solicitud pendiente**\n\n` +
          `🏢 **Empresa:** ${existingRequest.name}\n` +
          `📧 **Email:** ${existingRequest.email}\n` +
          `📅 **Solicitada:** ${existingRequest.createdAt.toLocaleDateString('es-MX')}\n\n` +
          `💡 Tu solicitud está siendo revisada por nuestro equipo.`,
        {
          parse_mode: 'Markdown',
          reply_markup: createCompanyPendingMenu(),
        },
      );
      await ctx.answerCallbackQuery('Ya tienes una solicitud pendiente');
      return;
    }
  } catch (error) {
    console.error('Error checking existing company request:', error);
  }

  // Iniciar flujo de registro
  const registrationData: CompanyRegistrationData = {
    step: 'name',
  };

  ctx.session.conversationData = { companyRegistration: registrationData };

  await ctx.editMessageText(getCompanyRegisterMessage(), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'main_menu' }]],
    },
  });

  await ctx.answerCallbackQuery();
}

/**
 * Verificar estado de empresas del usuario
 */
export async function handleCompanyCheck(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.answerCallbackQuery('❌ Error de autenticación');
    return;
  }

  try {
    // Verificar empresas aprobadas
    const userCompanies = await userRepository.getUserCompanies(user.id);

    if (userCompanies.length > 0) {
      // Tiene empresas, ir al menú principal
      const company = userCompanies[0].company;

      await ctx.editMessageText(getMainMenuMessage(user.firstName, user.role, company.name), {
        parse_mode: 'Markdown',
        reply_markup: createMainMenu(user.role),
      });
      await ctx.answerCallbackQuery('✅ Empresas encontradas');
      return;
    }

    // Verificar si tiene solicitudes pendientes
    const pendingRequest = await companyRepository.findPendingByUser(user.telegramId);

    if (pendingRequest) {
      await ctx.editMessageText(getCompanyPendingMessage(pendingRequest.name), {
        parse_mode: 'Markdown',
        reply_markup: createCompanyPendingMenu(),
      });
      await ctx.answerCallbackQuery('Solicitud pendiente encontrada');
      return;
    }

    // No tiene empresas ni solicitudes
    await ctx.editMessageText(getNoCompaniesMessage(user.firstName), {
      parse_mode: 'Markdown',
      reply_markup: createNoCompaniesMenu(),
    });

    await ctx.answerCallbackQuery('No se encontraron empresas');
  } catch (error) {
    console.error('Error checking companies:', error);
    await ctx.answerCallbackQuery('❌ Error al verificar empresas');
  }
}

/**
 * Manejar input de texto durante registro de empresa
 */
export async function handleCompanyRegistrationInput(ctx: MyContext) {
  const registrationData = ctx.session.conversationData
    ?.companyRegistration as CompanyRegistrationData;

  if (!registrationData) {
    return; // No hay flujo de registro activo
  }

  const text = ctx.message?.text;
  const user = ctx.session.user;

  if (!text || !user) {
    await ctx.reply('❌ Error en el registro. Intenta nuevamente.');
    return;
  }

  try {
    switch (registrationData.step) {
      case 'name':
        await handleCompanyNameInput(ctx, registrationData, text);
        break;
      case 'email':
        await handleCompanyEmailInput(ctx, registrationData, text);
        break;
      case 'phone':
        await handleCompanyPhoneInput(ctx, registrationData, text);
        break;
      default:
        await ctx.reply('❌ Error en el flujo de registro.');
    }
  } catch (error) {
    console.error('Error in company registration input:', error);
    await ctx.reply('❌ Error al procesar el registro. Intenta nuevamente.');
  }
}

/**
 * Manejar entrada del nombre de empresa
 */
async function handleCompanyNameInput(
  ctx: MyContext,
  registrationData: CompanyRegistrationData,
  name: string,
) {
  if (name.length < 3) {
    await ctx.reply(
      '❌ **Nombre muy corto**\n\n' +
        'El nombre de la empresa debe tener al menos 3 caracteres.\n\n' +
        'Intenta nuevamente:',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (name.length > 100) {
    await ctx.reply(
      '❌ **Nombre muy largo**\n\n' +
        'El nombre de la empresa debe tener máximo 100 caracteres.\n\n' +
        'Intenta nuevamente:',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  registrationData.name = name.trim();
  registrationData.step = 'email';
  ctx.session.conversationData = { companyRegistration: registrationData };

  await ctx.reply(
    `✅ **Nombre guardado:** ${name}\n\n` +
      `📧 **Paso 2:** Escribe el email de contacto\n\n` +
      `Ejemplo: contacto@miempresa.com`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'main_menu' }]],
      },
    },
  );
}

/**
 * Manejar entrada del email
 */
async function handleCompanyEmailInput(
  ctx: MyContext,
  registrationData: CompanyRegistrationData,
  email: string,
) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    await ctx.reply(
      '❌ **Email inválido**\n\n' +
        'Por favor escribe un email válido.\n\n' +
        'Ejemplo: contacto@miempresa.com',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  registrationData.email = email.trim().toLowerCase();
  registrationData.step = 'phone';
  ctx.session.conversationData = { companyRegistration: registrationData };

  await ctx.reply(
    `✅ **Email guardado:** ${email}\n\n` +
      `📱 **Paso 3:** Escribe el teléfono de contacto\n\n` +
      `Ejemplo: +52 55 1234 5678\n` +
      `💡 *O escribe "omitir" para saltarlo*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏭️ Omitir Teléfono', callback_data: 'company_skip_phone' }],
          [{ text: '❌ Cancelar', callback_data: 'main_menu' }],
        ],
      },
    },
  );
}

/**
 * Manejar entrada del teléfono
 */
async function handleCompanyPhoneInput(
  ctx: MyContext,
  registrationData: CompanyRegistrationData,
  phone: string,
) {
  if (phone.toLowerCase() === 'omitir') {
    registrationData.phone = '';
  } else {
    if (phone.length < 10) {
      await ctx.reply(
        '❌ **Teléfono muy corto**\n\n' +
          'El teléfono debe tener al menos 10 dígitos.\n\n' +
          'Intenta nuevamente o escribe "omitir":',
        { parse_mode: 'Markdown' },
      );
      return;
    }
    registrationData.phone = phone.trim();
  }

  registrationData.step = 'confirm';
  ctx.session.conversationData = { companyRegistration: registrationData };

  await showCompanyConfirmation(ctx, registrationData);
}

/**
 * Mostrar confirmación de datos
 */
async function showCompanyConfirmation(ctx: MyContext, registrationData: CompanyRegistrationData) {
  const message =
    `📋 **Confirmar Datos de la Empresa**\n\n` +
    `🏢 **Nombre:** ${registrationData.name}\n` +
    `📧 **Email:** ${registrationData.email}\n` +
    `📱 **Teléfono:** ${registrationData.phone || 'No especificado'}\n\n` +
    `¿Los datos son correctos?`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: createCompanyConfirmMenu(),
  });
}

/**
 * Confirmar registro de empresa
 */
export async function handleCompanyConfirmRegister(ctx: CallbackQueryContext<MyContext>) {
  const registrationData = ctx.session.conversationData
    ?.companyRegistration as CompanyRegistrationData;
  const user = ctx.session.user;

  if (!registrationData || !user) {
    await ctx.answerCallbackQuery('❌ Error en el registro');
    return;
  }

  try {
    // Crear la empresa con estado PENDING
    const company = await companyRepository.create({
      name: registrationData.name!,
      email: registrationData.email!,
      phone: registrationData.phone || '',
      status: 'PENDING',
      requestedBy: user.telegramId,
    });

    // Limpiar datos de registro
    ctx.session.conversationData = {};

    await ctx.editMessageText(getCompanyPendingMessage(company.name), {
      parse_mode: 'Markdown',
      reply_markup: createCompanyPendingMenu(),
    });

    await ctx.answerCallbackQuery('✅ Empresa registrada exitosamente');

    // Log para auditoria
    logger.info('Company registration request created', {
      userId: user.id,
      companyId: company.id,
      companyName: company.name,
      requestedBy: user.telegramId,
    });
  } catch (error) {
    console.error('Error creating company:', error);
    await ctx.answerCallbackQuery('❌ Error al registrar empresa');
    await ctx.reply('❌ Error al registrar la empresa. Intenta nuevamente.');
  }
}

/**
 * Omitir teléfono en registro
 */
export async function handleCompanySkipPhone(ctx: CallbackQueryContext<MyContext>) {
  const registrationData = ctx.session.conversationData
    ?.companyRegistration as CompanyRegistrationData;

  if (!registrationData) {
    await ctx.answerCallbackQuery('❌ Error en el registro');
    return;
  }

  registrationData.phone = '';
  registrationData.step = 'confirm';
  ctx.session.conversationData = { companyRegistration: registrationData };

  await showCompanyConfirmation(ctx, registrationData);
  await ctx.answerCallbackQuery('Teléfono omitido');
}
