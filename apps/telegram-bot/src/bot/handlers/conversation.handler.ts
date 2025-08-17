import { Context } from 'grammy';
import { MyContext, RegisterFlowData } from '../../types';
import { InlineKeyboard } from 'grammy';
import {
  movementRepository,
  categoryRepository,
  personalMovementRepository,
  personalCategoryRepository,
  userRepository,
} from '@financial-bot/database';
import {
  createExpenseTypeMenu,
  getExpenseTypeMessage,
  createCompanySelectMenu,
  getCompanySelectMessage,
} from '../menus/expense.menu';

/**
 * Manejar mensajes durante conversaciones activas
 */
export async function handleConversationMessage(ctx: Context & MyContext) {
  const conversationData = ctx.session.conversationData;

  // Manejar registro de empresa
  if (conversationData?.companyRegistration) {
    const { handleCompanyRegistrationInput } = await import('./company-setup.handler');
    await handleCompanyRegistrationInput(ctx);
    return;
  }

  if (!conversationData || !conversationData.registerFlow) {
    // No hay conversación activa, respuesta por defecto
    await ctx.reply(
      '🤔 No entiendo ese mensaje.\n\n' + 'Usa /menu para ver las opciones disponibles.',
      { reply_to_message_id: ctx.message?.message_id },
    );
    return;
  }

  const registerFlow = conversationData.registerFlow as RegisterFlowData;

  switch (registerFlow.step) {
    case 'expense_type':
      await handleExpenseTypeStep(ctx);
      break;
    case 'company_select':
      await handleCompanySelectStep(ctx);
      break;
    case 'amount':
      await handleAmountStep(ctx, registerFlow);
      break;
    case 'description':
      await handleDescriptionStep(ctx, registerFlow);
      break;
    case 'category':
      await handleCategoryStep(ctx, registerFlow);
      break;
    default:
      await ctx.reply('❌ Error en el flujo de conversación. Usa /menu para reiniciar.');
  }
}

/**
 * Iniciar flujo de registro de gasto
 */
export async function startExpenseFlow(ctx: Context & MyContext) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.reply('❌ Error de autenticación.');
    return;
  }

  // Para operadores, verificar que tengan empresa
  if (user.role === 'OPERATOR') {
    // Verificar que el operador tenga acceso a empresas
    try {
      const userCompanies = await userRepository.getUserCompanies(user.id);

      if (userCompanies.length === 0) {
        await ctx.reply(
          `👤 **Hola ${user.firstName}**\n\n` +
            `❌ **No tienes acceso a ninguna empresa**\n\n` +
            `Como operador, necesitas que un administrador te invite a una empresa.\n\n` +
            `💡 **Contacta a tu administrador** para obtener acceso.`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('👤 Mi Perfil', 'main_profile')
              .text('❓ Ayuda', 'main_help'),
          },
        );
        return;
      }

      // Si tiene una empresa, usar esa
      const companyId = userCompanies[0].companyId;

      const registerFlow: RegisterFlowData = {
        step: 'amount',
        expenseType: 'COMPANY',
        companyId: companyId,
      };

      ctx.session.conversationData = { registerFlow };

      await ctx.reply(
        `🏢 **Registro de Gasto Empresarial**\n` +
          `**Empresa:** ${userCompanies[0].company.name}\n\n` +
          `💰 **Paso 1:** ¿Cuánto gastaste?\n\n` +
          `Escribe solo el monto (ejemplo: 150 o 50.5)`,
        {
          reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
          parse_mode: 'Markdown',
        },
      );
      return;
    } catch (error) {
      console.error('Error getting user companies for operator:', error);
      await ctx.reply('❌ Error al verificar empresas. Intenta nuevamente.');
      return;
    }
  }

  // Para administradores, mostrar opciones de tipo de gasto
  const registerFlow: RegisterFlowData = {
    step: 'expense_type',
  };

  ctx.session.conversationData = { registerFlow };

  await ctx.reply(getExpenseTypeMessage(), {
    reply_markup: createExpenseTypeMenu(),
    parse_mode: 'Markdown',
  });
}

/**
 * Manejar selección de tipo de gasto (solo se llama si hay texto en este paso)
 */
async function handleExpenseTypeStep(ctx: Context & MyContext) {
  await ctx.reply(
    '💰 **Esperando selección de tipo**\n\n' +
      'Por favor selecciona una opción usando los botones de arriba.',
    { parse_mode: 'Markdown' },
  );
}

/**
 * Manejar selección de empresa (solo se llama si hay texto en este paso)
 */
async function handleCompanySelectStep(ctx: Context & MyContext) {
  await ctx.reply(
    '🏢 **Esperando selección de empresa**\n\n' +
      'Por favor selecciona una empresa usando los botones de arriba.',
    { parse_mode: 'Markdown' },
  );
}

/**
 * Procesar selección de tipo de gasto (llamado desde callback)
 */
export async function processExpenseTypeSelection(
  ctx: Context & MyContext,
  expenseType: 'COMPANY' | 'PERSONAL',
) {
  const registerFlow = ctx.session.conversationData?.registerFlow as RegisterFlowData;

  if (!registerFlow) {
    await ctx.reply('❌ Error en el flujo. Intenta nuevamente.');
    return;
  }

  registerFlow.expenseType = expenseType;

  if (expenseType === 'PERSONAL') {
    // Gasto personal, ir directo a monto
    registerFlow.step = 'amount';
    ctx.session.conversationData = { registerFlow };

    await ctx.editMessageText(
      `👤 **Registro de Gasto Personal**\n\n` +
        `💰 **Paso 1:** ¿Cuánto gastaste?\n\n` +
        `Escribe solo el monto (ejemplo: 150 o 50.5)`,
      {
        reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
        parse_mode: 'Markdown',
      },
    );
  } else {
    // Gasto de empresa, verificar si hay múltiples empresas
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ Error de autenticación.');
      return;
    }

    try {
      const userCompanies = await userRepository.getUserCompanies(user.id);

      if (userCompanies.length === 0) {
        // Mostrar menú para registrar empresa
        const { createNoCompaniesMenu, getNoCompaniesMessage } = await import(
          '../menus/company-setup.menu'
        );

        await ctx.editMessageText(getNoCompaniesMessage(user.firstName), {
          parse_mode: 'Markdown',
          reply_markup: createNoCompaniesMenu(),
        });
        return;
      }

      if (userCompanies.length === 1) {
        // Solo una empresa, ir directo a monto
        registerFlow.companyId = userCompanies[0].companyId;
        registerFlow.step = 'amount';
        ctx.session.conversationData = { registerFlow };

        await ctx.editMessageText(
          `🏢 **Registro de Gasto Empresarial**\n` +
            `**Empresa:** ${userCompanies[0].company.name}\n\n` +
            `💰 **Paso 1:** ¿Cuánto gastaste?\n\n` +
            `Escribe solo el monto (ejemplo: 150 o 50.5)`,
          {
            reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
            parse_mode: 'Markdown',
          },
        );
      } else {
        // Múltiples empresas, mostrar selector
        registerFlow.step = 'company_select';
        ctx.session.conversationData = { registerFlow };

        interface UserCompany {
          companyId: string;
          company: { name: string };
        }
        const companies = userCompanies.map((uc: UserCompany) => ({
          id: uc.companyId,
          name: uc.company.name,
        }));

        await ctx.editMessageText(getCompanySelectMessage(companies), {
          reply_markup: createCompanySelectMenu(companies),
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      console.error('Error getting user companies:', error);
      await ctx.reply('❌ Error al obtener empresas. Intenta nuevamente.');
    }
  }
}

/**
 * Procesar selección de empresa (llamado desde callback)
 */
export async function processCompanySelection(ctx: Context & MyContext, companyId: string) {
  const registerFlow = ctx.session.conversationData?.registerFlow as RegisterFlowData;

  if (!registerFlow) {
    await ctx.reply('❌ Error en el flujo. Intenta nuevamente.');
    return;
  }

  try {
    // Verificar que el usuario tenga acceso a esta empresa
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ Error de autenticación.');
      return;
    }

    const userCompanies = await userRepository.getUserCompanies(user.id);
    interface UserCompany {
      companyId: string;
      company: { name: string };
    }
    const selectedCompany = userCompanies.find((uc: UserCompany) => uc.companyId === companyId);

    if (!selectedCompany) {
      await ctx.answerCallbackQuery('❌ No tienes acceso a esta empresa');
      return;
    }

    registerFlow.companyId = companyId;
    registerFlow.step = 'amount';
    ctx.session.conversationData = { registerFlow };

    await ctx.editMessageText(
      `🏢 **Registro de Gasto Empresarial**\n` +
        `**Empresa:** ${selectedCompany.company.name}\n\n` +
        `💰 **Paso 1:** ¿Cuánto gastaste?\n\n` +
        `Escribe solo el monto (ejemplo: 150 o 50.5)`,
      {
        reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
        parse_mode: 'Markdown',
      },
    );
  } catch (error) {
    console.error('Error processing company selection:', error);
    await ctx.reply('❌ Error al seleccionar empresa. Intenta nuevamente.');
  }
}

/**
 * Manejar monto
 */
async function handleAmountStep(ctx: Context & MyContext, registerFlow: RegisterFlowData) {
  const text = ctx.message?.text;

  if (!text) {
    await ctx.reply('💰 Por favor, escribe solo el número del monto.');
    return;
  }

  const amount = parseFloat(text.replace(/[^0-9.-]/g, ''));

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply(
      '❌ **Monto inválido**\n\n' +
        'Por favor escribe un número válido mayor a 0.\n\n' +
        '**Ejemplos válidos:** 150, 50.5, 1200',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // Guardar monto y pasar al siguiente paso
  registerFlow.amount = amount;
  registerFlow.step = 'description';

  ctx.session.conversationData = { registerFlow };

  const message =
    `📝 **Registro de Gasto - Paso 2 de 4**\n\n` +
    `💰 Monto: $${amount} MXN\n\n` +
    `¿En qué lo gastaste?\n\n` +
    `💡 Describe brevemente el gasto (ejemplo: "Comida en restaurante")`;

  await ctx.reply(message, {
    reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
    parse_mode: 'Markdown',
  });
}

/**
 * Paso 2: Manejar descripción
 */
async function handleDescriptionStep(ctx: Context & MyContext, registerFlow: RegisterFlowData) {
  const text = ctx.message?.text;

  if (!text || text.trim().length < 3) {
    await ctx.reply(
      '📝 **Descripción muy corta**\n\n' +
        'Por favor escribe una descripción de al menos 3 caracteres.\n\n' +
        '**Ejemplos:** "Comida", "Gasolina", "Compras supermercado"',
    );
    return;
  }

  if (text.length > 100) {
    await ctx.reply(
      '📝 **Descripción muy larga**\n\n' +
        'Por favor escribe una descripción de máximo 100 caracteres.',
    );
    return;
  }

  // Guardar descripción y pasar al siguiente paso
  registerFlow.description = text.trim();
  registerFlow.step = 'category';

  ctx.session.conversationData = { registerFlow };

  await showCategorySelection(ctx, registerFlow);
}

/**
 * Paso 3: Mostrar selección de categorías
 */
async function showCategorySelection(ctx: Context & MyContext, registerFlow: RegisterFlowData) {
  try {
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ Error de autenticación.');
      return;
    }

    // Obtener categorías según el tipo de gasto
    const categories =
      registerFlow.expenseType === 'PERSONAL'
        ? await personalCategoryRepository.findByUser(user.id)
        : await categoryRepository.findByCompany(registerFlow.companyId || user.companyId);

    const keyboard = new InlineKeyboard();

    // Agregar categorías en filas de 2
    for (let i = 0; i < categories.length; i += 2) {
      const cat1 = categories[i];
      const cat2 = categories[i + 1];

      if (cat2) {
        keyboard
          .text(`${cat1.icon || '📂'} ${cat1.name}`, `category_select_${cat1.id}`)
          .text(`${cat2.icon || '📂'} ${cat2.name}`, `category_select_${cat2.id}`)
          .row();
      } else {
        keyboard.text(`${cat1.icon || '📂'} ${cat1.name}`, `category_select_${cat1.id}`).row();
      }
    }

    keyboard
      .text('❌ Sin Categoría', 'category_select_none')
      .row()
      .text('❌ Cancelar', 'expense_cancel');

    const message =
      `📂 **Registro de Gasto - Paso 3 de 4**\n\n` +
      `💰 Monto: $${registerFlow.amount} MXN\n` +
      `📝 Descripción: ${registerFlow.description}\n\n` +
      `Selecciona una categoría:`;

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    await ctx.reply('❌ Error cargando categorías. Intenta nuevamente.');
  }
}

/**
 * Paso 4: Manejar selección de categoría (será manejado por callback)
 */
async function handleCategoryStep(ctx: Context & MyContext, _registerFlow: RegisterFlowData) {
  // Este paso se maneja por callbacks, no por texto
  await ctx.reply(
    '📂 **Esperando selección de categoría**\n\n' +
      'Por favor selecciona una categoría usando los botones de arriba.',
    { parse_mode: 'Markdown' },
  );
}

/**
 * Confirmar y guardar el gasto
 */
export async function confirmExpense(ctx: Context & MyContext, categoryId?: string) {
  const registerFlow = ctx.session.conversationData?.registerFlow as RegisterFlowData;

  if (!registerFlow || !registerFlow.amount || !registerFlow.description) {
    await ctx.reply('❌ Error en los datos del gasto. Intenta nuevamente con /menu.');
    return;
  }

  const user = ctx.session.user;
  if (!user) {
    await ctx.reply('❌ Error de autenticación.');
    return;
  }

  try {
    // Obtener nombre de categoría si se seleccionó
    let categoryName = 'Sin categoría';
    if (categoryId && categoryId !== 'none') {
      const category = await categoryRepository.findById(categoryId);
      categoryName = category ? `${category.icon || '📂'} ${category.name}` : 'Sin categoría';
    }

    const message =
      `✅ **Confirmación de Gasto - Paso 4 de 4**\n\n` +
      `💰 **Monto:** $${registerFlow.amount} MXN\n` +
      `📝 **Descripción:** ${registerFlow.description}\n` +
      `📂 **Categoría:** ${categoryName}\n` +
      `📅 **Fecha:** Hoy\n\n` +
      `¿Todo está correcto?`;

    // Actualizar el flujo con la categoría
    registerFlow.categoryId = categoryId === 'none' ? undefined : categoryId;
    registerFlow.step = 'confirm';
    ctx.session.conversationData = { registerFlow };

    await ctx.reply(message, {
      reply_markup: new InlineKeyboard()
        .text('✅ Sí, Guardar', 'expense_confirm_save')
        .text('✏️ Editar', 'expense_edit_flow')
        .row()
        .text('❌ Cancelar', 'expense_cancel'),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error confirming expense:', error);
    await ctx.reply('❌ Error al procesar el gasto. Intenta nuevamente.');
  }
}

/**
 * Guardar el gasto finalmente
 */
export async function saveExpense(ctx: Context & MyContext) {
  const registerFlow = ctx.session.conversationData?.registerFlow as RegisterFlowData;

  if (!registerFlow || !registerFlow.amount || !registerFlow.description) {
    await ctx.reply('❌ Error en los datos del gasto.');
    return;
  }

  const user = ctx.session.user;
  if (!user) {
    await ctx.reply('❌ Error de autenticación.');
    return;
  }

  try {
    let movement: { folio: string; amount: unknown; id: string };
    let folio: string;
    const isPersonal = registerFlow.expenseType === 'PERSONAL';

    if (isPersonal) {
      // Crear gasto personal
      folio = await personalMovementRepository.generateFolio(user.id);

      movement = await personalMovementRepository.create({
        user: { connect: { id: user.id } },
        folio,
        type: 'EXPENSE',
        amount: registerFlow.amount,
        description: registerFlow.description,
        category: registerFlow.categoryId
          ? { connect: { id: registerFlow.categoryId } }
          : undefined,
        date: new Date(),
        currency: 'MXN',
      });
    } else {
      // Crear gasto de empresa
      const companyId = registerFlow.companyId || user.companyId;
      folio = await movementRepository.generateFolio(companyId);

      movement = await movementRepository.create({
        company: { connect: { id: companyId } },
        user: { connect: { id: user.id } },
        folio,
        type: 'EXPENSE',
        amount: registerFlow.amount,
        description: registerFlow.description,
        category: registerFlow.categoryId
          ? { connect: { id: registerFlow.categoryId } }
          : undefined,
        date: new Date(),
        currency: 'MXN',
      });
    }

    // Limpiar la conversación
    ctx.session.conversationData = {};

    const typeIcon = isPersonal ? '👤' : '🏢';
    const typeText = isPersonal ? 'Personal' : 'Empresarial';

    const message =
      `🎉 **¡Gasto ${typeText} Registrado!**\n\n` +
      `${typeIcon} **Tipo:** ${typeText}\n` +
      `📌 **Folio:** ${movement.folio}\n` +
      `💰 **Monto:** $${registerFlow.amount} MXN\n` +
      `📝 **Descripción:** ${registerFlow.description}\n\n` +
      `${isPersonal ? 'Gasto registrado en tu cuenta personal.' : 'El administrador ha sido notificado.'}`;

    await ctx.reply(message, {
      reply_markup: new InlineKeyboard()
        .text('🏠 Menú Principal', 'main_menu')
        .text('💰 Otro Gasto', 'main_expense')
        .row()
        .text('📊 Ver Movimientos', 'main_movements'),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error saving expense:', error);
    await ctx.reply('❌ Error al guardar el gasto. Intenta nuevamente.');
  }
}
