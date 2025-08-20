import { Context } from 'grammy';
import { MyContext, RegisterFlowData, AddUserState } from '../../types';
import { InlineKeyboard } from 'grammy';
import {
  movementRepository,
  categoryRepository,
  personalMovementRepository,
  personalCategoryRepository,
  userRepository,
  attachmentRepository,
  Category,
  PersonalCategory,
} from '@financial-bot/database';
import { TelegramPhotoService } from '../../services/telegram-photo.service';

// Lazy loading del servicio de fotos para asegurar que las env vars estén cargadas
let photoService: TelegramPhotoService | null = null;

function getPhotoService(): TelegramPhotoService {
  if (!photoService) {
    photoService = new TelegramPhotoService(); // Nuevas credenciales R2
  }
  return photoService;
}
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

  // Manejar flujo de agregar usuario
  if (ctx.session.addUserState) {
    await handleAddUserInput(ctx);
    return;
  }

  // Manejar flujo de edición de movimientos
  if (ctx.session.editMovementState) {
    await handleEditMovementInput(ctx);
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
    case 'photo':
      await handlePhotoStep(ctx, registerFlow);
      break;
    case 'date':
      await handleDateStep(ctx, registerFlow);
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

      // Filtrar solo empresas aprobadas
      const approvedCompanies = userCompanies.filter(uc => uc.company.status === 'APPROVED');

      if (approvedCompanies.length === 0) {
        await ctx.reply(
          `👤 **Hola ${user.firstName}**\n\n` +
            `⏳ **Empresas pendientes de aprobación**\n\n` +
            `Espera a que tu administrador apruebe el acceso a empresas.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (approvedCompanies.length === 1) {
        // Solo una empresa aprobada, usar esa
        const companyId = approvedCompanies[0].companyId;

        const registerFlow: RegisterFlowData = {
          step: 'amount',
          expenseType: 'COMPANY',
          companyId: companyId,
        };

        ctx.session.conversationData = { registerFlow };

        await ctx.reply(
          `🏢 **Registro de Gasto Empresarial**\n` +
            `**Empresa:** ${approvedCompanies[0].company.name}\n\n` +
            `💰 **Paso 1:** ¿Cuánto gastaste?\n\n` +
            `Escribe solo el monto (ejemplo: 150 o 50.5)`,
          {
            reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
            parse_mode: 'Markdown',
          },
        );
        return;
      } else {
        // Múltiples empresas, mostrar selector
        const companies = approvedCompanies.map(uc => ({
          id: uc.company.id,
          name: uc.company.name,
        }));

        const registerFlow: RegisterFlowData = {
          step: 'expense_type',
        };

        ctx.session.conversationData = { registerFlow };

        await ctx.reply(getExpenseTypeMessage(companies), {
          reply_markup: createExpenseTypeMenu(companies),
          parse_mode: 'Markdown',
        });
        return;
      }
    } catch (error) {
      console.error('Error getting user companies for operator:', error);
      await ctx.reply('❌ Error al verificar empresas. Intenta nuevamente.');
      return;
    }
  }

  // Para administradores, obtener empresas disponibles y mostrar opciones
  try {
    const userCompanies = await userRepository.getUserCompanies(user.id);
    // Filtrar solo empresas aprobadas
    const approvedCompanies = userCompanies.filter(uc => uc.company.status === 'APPROVED');
    const companies = approvedCompanies.map(uc => ({
      id: uc.company.id,
      name: uc.company.name,
    }));

    const registerFlow: RegisterFlowData = {
      step: 'expense_type',
    };

    ctx.session.conversationData = { registerFlow };

    await ctx.reply(getExpenseTypeMessage(companies), {
      reply_markup: createExpenseTypeMenu(companies),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error getting user companies for admin:', error);

    // Fallback al menú sin nombres de empresa
    const registerFlow: RegisterFlowData = {
      step: 'expense_type',
    };

    ctx.session.conversationData = { registerFlow };

    await ctx.reply(getExpenseTypeMessage(), {
      reply_markup: createExpenseTypeMenu(),
      parse_mode: 'Markdown',
    });
  }
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

      // Si no hay relaciones UserCompany pero el usuario tiene companyId, usar esa empresa
      if (userCompanies.length === 0 && user.companyId) {
        // Crear la relación UserCompany que falta
        try {
          await userRepository.addUserToCompany(user.id, user.companyId, user.role);

          // Recargar empresas después de crear la relación
          const updatedUserCompanies = await userRepository.getUserCompanies(user.id);

          if (updatedUserCompanies.length > 0) {
            // Usar la empresa recién vinculada
            registerFlow.companyId = updatedUserCompanies[0].companyId;
            registerFlow.step = 'amount';
            ctx.session.conversationData = { registerFlow };

            await ctx.editMessageText(
              `🏢 **Registro de Gasto Empresarial**\n` +
                `**Empresa:** ${updatedUserCompanies[0].company.name}\n\n` +
                `💰 **Paso 1 de 5 - Monto**\n\n` +
                `¿Cuánto gastaste?\n\n` +
                `💡 Escribe solo el número (ejemplo: 150.50)`,
              {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard().text('❌ Cancelar', 'expense_cancel'),
              },
            );
            return;
          }
        } catch (error) {
          console.error('Error creating UserCompany relation:', error);
        }
      }

      if (userCompanies.length === 0) {
        // Solo si realmente no hay empresas, mostrar el menú de registro
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
    `📝 **Registro de Gasto - Paso 2 de 5**\n\n` +
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
    let categories: (Category | PersonalCategory)[] = [];
    if (registerFlow.expenseType === 'PERSONAL') {
      categories = await personalCategoryRepository.findByUser(user.id);

      // Si no hay categorías personales, crearlas automáticamente
      if (categories.length === 0) {
        try {
          await personalCategoryRepository.createDefaultCategories(user.id);
          categories = await personalCategoryRepository.findByUser(user.id);
        } catch (error) {
          console.error('Error creating default personal categories:', error);
          categories = [];
        }
      }
    } else {
      categories = await categoryRepository.findByCompany(registerFlow.companyId || user.companyId);

      // Si no hay categorías empresariales, puede ser que la empresa sea nueva
      if (categories.length === 0 && user.companyId) {
        try {
          await createDefaultCategoriesForCompany(user.companyId);
          categories = await categoryRepository.findByCompany(user.companyId);
        } catch (error) {
          console.error('Error creating default company categories:', error);
          categories = [];
        }
      }
    }

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
      `📂 **Registro de Gasto - Paso 3 de 5**\n\n` +
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
 * Paso 5: Mostrar solicitud de fotografía
 */
async function showPhotoStep(ctx: Context & MyContext, registerFlow: RegisterFlowData) {
  const message =
    `📸 **Registro de Gasto - Paso 4 de 5**\n\n` +
    `💰 Monto: $${registerFlow.amount} MXN\n` +
    `📝 Descripción: ${registerFlow.description}\n\n` +
    `📷 **Adjuntar fotografía del recibo (opcional)**\n\n` +
    `Puedes enviar una foto de tu ticket o factura para respaldar este gasto, o continuar sin foto.`;

  await ctx.reply(message, {
    reply_markup: new InlineKeyboard()
      .text('⏭️ Continuar sin foto', 'photo_skip')
      .row()
      .text('❌ Cancelar', 'expense_cancel'),
    parse_mode: 'Markdown',
  });
}

/**
 * Paso 5: Manejar entrada de fotografía
 */
async function handlePhotoStep(ctx: Context & MyContext, registerFlow: RegisterFlowData) {
  // Verificar si es una foto
  if (ctx.message?.photo) {
    const user = ctx.session.user;
    if (!user) {
      await ctx.reply('❌ Error de autenticación.');
      return;
    }

    // Mostrar mensaje de procesamiento
    await ctx.reply('📸 **Procesando fotografía...**', { parse_mode: 'Markdown' });

    // Verificar si el servicio de storage está configurado
    if (!getPhotoService().isConfigured()) {
      // Si no está configurado, usar el método anterior (solo file_id)
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      registerFlow.photoFileId = photo.file_id;
      registerFlow.step = 'date';
      ctx.session.conversationData = { registerFlow };

      await ctx.reply(
        '✅ **Foto recibida correctamente**\n\n' +
          'La fotografía ha sido adjuntada temporalmente a tu gasto.\n' +
          '💡 *Configura Cloudflare R2 para almacenamiento permanente.*',
        { parse_mode: 'Markdown' },
      );

      await showDateSelectionStep(ctx, registerFlow);
      return;
    }

    // Intentar subir la foto a Cloudflare R2
    try {
      const companyId =
        registerFlow.expenseType === 'COMPANY'
          ? registerFlow.companyId || user.companyId
          : undefined;

      const uploadResult = await getPhotoService().downloadAndStorePhoto(
        ctx,
        user.id,
        undefined, // movementId se asignará después
        companyId,
      );

      if (uploadResult) {
        // Guardar la información de la foto subida
        registerFlow.photoFileId = uploadResult.key; // Usar la key de R2 en lugar del file_id
        registerFlow.step = 'date';
        ctx.session.conversationData = { registerFlow };

        await ctx.reply(
          '✅ **Fotografía almacenada correctamente**\n\n' +
            'Tu recibo ha sido guardado de forma segura y estará disponible en tus reportes.',
          { parse_mode: 'Markdown' },
        );

        await showDateSelectionStep(ctx, registerFlow);
      } else {
        throw new Error('Error al procesar la fotografía');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);

      // Fallback: usar file_id de Telegram
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      registerFlow.photoFileId = photo.file_id;
      registerFlow.step = 'date';
      ctx.session.conversationData = { registerFlow };

      await ctx.reply(
        '⚠️ **Foto recibida con limitaciones**\n\n' +
          'La fotografía se guardó temporalmente. Para almacenamiento permanente, configura el servicio de storage.',
        { parse_mode: 'Markdown' },
      );

      await showDateSelectionStep(ctx, registerFlow);
    }
  } else {
    // No es una foto, pedir que envíe una foto o omita
    await ctx.reply(
      '📸 **Esperando fotografía**\n\n' +
        'Por favor envía una fotografía del recibo o usa el botón "Continuar sin foto".',
      { parse_mode: 'Markdown' },
    );
  }
}

/**
 * Mostrar paso de confirmación final
 */
export async function showConfirmationStep(
  ctx: Context & MyContext,
  registerFlow: RegisterFlowData,
) {
  try {
    // Obtener nombre de categoría si se seleccionó
    let categoryName = 'Sin categoría';
    if (registerFlow.categoryId) {
      const category = await categoryRepository.findById(registerFlow.categoryId);
      categoryName = category ? `${category.icon || '📂'} ${category.name}` : 'Sin categoría';
    }

    const photoStatus = registerFlow.photoFileId ? '✅ Adjunta' : '❌ Sin fotografía';

    const message =
      `✅ **Confirmación de Gasto - Paso 5 de 5**\n\n` +
      `💰 **Monto:** $${registerFlow.amount} MXN\n` +
      `📝 **Descripción:** ${registerFlow.description}\n` +
      `📂 **Categoría:** ${categoryName}\n` +
      `📸 **Fotografía:** ${photoStatus}\n` +
      `📅 **Fecha:** Hoy\n\n` +
      `¿Todo está correcto?`;

    await ctx.reply(message, {
      reply_markup: new InlineKeyboard()
        .text('✅ Sí, Guardar', 'expense_confirm_save')
        .text('✏️ Editar', 'expense_edit_flow')
        .row()
        .text('❌ Cancelar', 'expense_cancel'),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error showing confirmation:', error);
    await ctx.reply('❌ Error al procesar el gasto. Intenta nuevamente.');
  }
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
    // Actualizar el flujo con la categoría y pasar al paso de foto
    registerFlow.categoryId = categoryId === 'none' ? undefined : categoryId;
    registerFlow.step = 'photo';
    ctx.session.conversationData = { registerFlow };

    await showPhotoStep(ctx, registerFlow);
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
        date: registerFlow.date || new Date(),
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
        date: registerFlow.date || new Date(),
        currency: 'MXN',
      });
    }

    // Crear attachment si hay foto
    if (registerFlow.photoFileId) {
      try {
        // Determinar si es una key de R2 o un file_id de Telegram
        const isR2Key = !registerFlow.photoFileId.includes(':');
        const status = isR2Key ? 'COMPLETED' : 'PENDING';

        await attachmentRepository.create({
          movement: { connect: { id: movement.id } },
          fileUrl: registerFlow.photoFileId,
          fileName: `receipt_${movement.folio}${isR2Key ? '' : '_telegram'}.jpg`,
          fileSize: 0, // Se actualizará si tenemos la información
          mimeType: 'image/jpeg',
          status,
        });
      } catch (photoError) {
        console.error('Error saving photo attachment:', photoError);
        // Continuar aunque falle la foto
      }
    }

    // Limpiar la conversación
    ctx.session.conversationData = {};

    const typeIcon = isPersonal ? '👤' : '🏢';
    const typeText = isPersonal ? 'Personal' : 'Empresarial';
    const photoStatus = registerFlow.photoFileId ? '\n📸 **Fotografía:** Adjunta' : '';

    const message =
      `🎉 **¡Gasto ${typeText} Registrado!**\n\n` +
      `${typeIcon} **Tipo:** ${typeText}\n` +
      `📌 **Folio:** ${movement.folio}\n` +
      `💰 **Monto:** $${registerFlow.amount} MXN\n` +
      `📝 **Descripción:** ${registerFlow.description}${photoStatus}\n\n` +
      `${isPersonal ? 'Gasto registrado en tu cuenta personal.' : 'Gasto registrado exitosamente.'}`;

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

/**
 * Crear categorías por defecto para una empresa
 */
async function createDefaultCategoriesForCompany(companyId: string) {
  const defaultCategories = [
    { name: 'Alimentación', icon: '🍽️', color: '#FF6B6B', order: 1 },
    { name: 'Transporte', icon: '🚗', color: '#4ECDC4', order: 2 },
    { name: 'Oficina', icon: '🏢', color: '#45B7D1', order: 3 },
    { name: 'Marketing', icon: '📢', color: '#96CEB4', order: 4 },
    { name: 'Tecnología', icon: '💻', color: '#FFEAA7', order: 5 },
    { name: 'Servicios', icon: '🔧', color: '#DDA0DD', order: 6 },
    { name: 'Suministros', icon: '📋', color: '#74B9FF', order: 7 },
    { name: 'Capacitación', icon: '🎓', color: '#00B894', order: 8 },
    { name: 'Mantenimiento', icon: '🔧', color: '#FDCB6E', order: 9 },
    { name: 'Otros', icon: '📦', color: '#A8A8A8', order: 10 },
  ];

  for (const category of defaultCategories) {
    await categoryRepository.create({
      company: { connect: { id: companyId } },
      name: category.name,
      icon: category.icon,
      color: category.color,
      order: category.order,
    });
  }
}

/**
 * Paso 5: Manejar selección de fecha (solo texto)
 */
async function handleDateStep(ctx: Context & MyContext, _registerFlow: RegisterFlowData) {
  // Este paso se maneja por callbacks, no por texto
  await ctx.reply(
    '📅 **Esperando selección de fecha**\n\n' +
      'Por favor selecciona una fecha usando los botones de arriba o envía una fecha en formato DD/MM.',
    { parse_mode: 'Markdown' },
  );
}

/**
 * Mostrar paso de selección de fecha
 */
export async function showDateSelectionStep(
  ctx: Context & MyContext,
  registerFlow: RegisterFlowData,
) {
  const today = new Date();
  const dates = [];

  // Generar fechas para los últimos 5 días
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push({
      date,
      label:
        i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : i === 2 ? 'Antier' : `${date.getDate()} de agosto`,
    });
  }

  const keyboard = new InlineKeyboard();

  // Añadir botones de fechas en filas de 2
  for (let i = 0; i < dates.length; i += 2) {
    const date1 = dates[i];
    const date2 = dates[i + 1];

    const dateStr1 = date1.date.toISOString().split('T')[0];
    const dateStr2 = date2?.date.toISOString().split('T')[0];

    if (date2) {
      keyboard
        .text(date1.label, `date_select_${dateStr1}`)
        .text(date2.label, `date_select_${dateStr2}`)
        .row();
    } else {
      keyboard.text(date1.label, `date_select_${dateStr1}`).row();
    }
  }

  keyboard.text('📅 Otra fecha', 'date_select_custom').row().text('❌ Cancelar', 'expense_cancel');

  const message =
    `📅 **Registro de Gasto - Paso 5 de 6**\n\n` +
    `💰 Monto: $${registerFlow.amount} MXN\n` +
    `📝 Descripción: ${registerFlow.description}\n` +
    `📸 Fotografía: ${registerFlow.photoFileId ? '✅ Adjunta' : '❌ Sin foto'}\n\n` +
    `¿En qué fecha fue este gasto?`;

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
}

/**
 * Procesar selección de fecha
 */
export async function processDateSelection(ctx: Context & MyContext, dateString: string) {
  const registerFlow = ctx.session.conversationData?.registerFlow as RegisterFlowData;

  if (!registerFlow) {
    await ctx.reply('❌ Error en el flujo. Intenta nuevamente.');
    return;
  }

  try {
    if (dateString === 'custom') {
      // Solicitar entrada manual de fecha
      registerFlow.step = 'date';
      ctx.session.conversationData = { registerFlow };

      await ctx.editMessageText(
        '📅 **Fecha personalizada**\n\n' +
          'Escribe la fecha en formato DD/MM\n\n' +
          '**Ejemplos:** 17/08, 15/08, 01/08',
        {
          reply_markup: new InlineKeyboard()
            .text('⬅️ Volver a opciones', 'date_back_to_options')
            .row()
            .text('❌ Cancelar', 'expense_cancel'),
          parse_mode: 'Markdown',
        },
      );
      return;
    }

    // Parsear fecha seleccionada
    const selectedDate = new Date(dateString);
    registerFlow.date = selectedDate;
    registerFlow.step = 'final_confirm';
    ctx.session.conversationData = { registerFlow };

    await showFinalConfirmationStep(ctx, registerFlow);
  } catch (error) {
    console.error('Error processing date selection:', error);
    await ctx.reply('❌ Error al procesar la fecha. Intenta nuevamente.');
  }
}

/**
 * Mostrar confirmación final (Paso 6)
 */
export async function showFinalConfirmationStep(
  ctx: Context & MyContext,
  registerFlow: RegisterFlowData,
) {
  try {
    // Obtener nombre de categoría si se seleccionó
    let categoryName = 'Sin categoría';
    if (registerFlow.categoryId) {
      const category = await categoryRepository.findById(registerFlow.categoryId);
      categoryName = category ? `${category.icon || '📂'} ${category.name}` : 'Sin categoría';
    }

    const photoStatus = registerFlow.photoFileId ? '✅ Adjunta' : '❌ Sin fotografía';

    // Formatear fecha
    const dateStr = registerFlow.date
      ? registerFlow.date.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Hoy';

    const message =
      `✅ **Confirmación Final - Paso 6 de 6**\n\n` +
      `💰 **Monto:** $${registerFlow.amount} MXN\n` +
      `📝 **Descripción:** ${registerFlow.description}\n` +
      `📂 **Categoría:** ${categoryName}\n` +
      `📸 **Fotografía:** ${photoStatus}\n` +
      `📅 **Fecha:** ${dateStr}\n\n` +
      `¿Todo está correcto?`;

    await ctx.reply(message, {
      reply_markup: new InlineKeyboard()
        .text('✅ Sí, Guardar Gasto', 'expense_final_save')
        .text('✏️ Editar', 'expense_edit_flow')
        .row()
        .text('❌ Cancelar', 'expense_cancel'),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error showing final confirmation:', error);
    await ctx.reply('❌ Error al procesar el gasto. Intenta nuevamente.');
  }
}

/**
 * Manejar entrada de texto para flujo de agregar usuario
 */
async function handleAddUserInput(ctx: Context & MyContext) {
  const user = ctx.session.user;
  const addUserState = ctx.session.addUserState;

  if (!user || user.role !== 'ADMIN' || !addUserState) {
    delete ctx.session.addUserState;
    await ctx.reply('❌ Error en el flujo de agregar usuario.');
    return;
  }

  const text = ctx.message?.text?.trim();

  if (!text) {
    await ctx.reply('❌ Por favor envía un mensaje de texto.');
    return;
  }

  try {
    switch (addUserState.step) {
      case 'waiting_chat_id':
        await handleChatIdInput(ctx, text, addUserState);
        break;
      case 'waiting_name':
        await handleNameInput(ctx, text, addUserState);
        break;
      case 'selecting_companies':
        // Este paso se maneja por callbacks, no por texto
        await ctx.reply(
          '🏢 **Esperando selección de empresas**\n\n' +
            'Por favor selecciona las empresas usando los botones de arriba.',
          { parse_mode: 'Markdown' },
        );
        break;
      default:
        delete ctx.session.addUserState;
        await ctx.reply('❌ Error en el flujo. Usa /menu para continuar.');
    }
  } catch (error) {
    console.error('Error handling add user input:', error);
    delete ctx.session.addUserState;
    await ctx.reply('❌ Error procesando entrada. Intenta nuevamente.');
  }
}

/**
 * Manejar entrada de Chat ID
 */
async function handleChatIdInput(
  ctx: Context & MyContext,
  text: string,
  addUserState: AddUserState,
) {
  // Validar que sea un número
  const chatId = text.replace(/\D/g, ''); // Remover todo lo que no sea dígito

  if (!chatId || chatId.length < 8) {
    await ctx.reply(
      '❌ **Chat ID inválido**\n\n' +
        'El Chat ID debe ser un número de al menos 8 dígitos.\n\n' +
        '**Ejemplo:** 123456789\n\n' +
        'Envía el Chat ID correcto:',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // Verificar que el usuario no exista ya
  try {
    const existingUser = await userRepository.findByChatId(chatId);
    if (existingUser) {
      await ctx.reply(
        '❌ **Usuario ya existe**\n\n' +
          `El usuario con Chat ID ${chatId} ya está registrado.\n\n` +
          '**Nombre:** ' +
          existingUser.firstName +
          ' ' +
          (existingUser.lastName || '') +
          '\n' +
          '**Empresa:** ' +
          (existingUser.company?.name || 'Sin empresa') +
          '\n\n' +
          'Envía un Chat ID diferente:',
        { parse_mode: 'Markdown' },
      );
      return;
    }
  } catch (error) {
    console.error('Error checking existing user:', error);
  }

  // Guardar Chat ID y pedir nombre
  addUserState.chatId = chatId;
  addUserState.step = 'waiting_name';
  ctx.session.addUserState = addUserState;

  await ctx.reply(
    `✅ **Chat ID válido: ${chatId}**\n\n` +
      '👤 **Ahora envía el nombre completo del usuario:**\n\n' +
      '💡 **Formato:** Nombre Apellido\n' +
      '**Ejemplo:** Juan Pérez\n\n' +
      '📝 Escribe el nombre:',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancelar', 'main_users'),
    },
  );
}

/**
 * Manejar entrada de nombre
 */
async function handleNameInput(ctx: Context & MyContext, text: string, addUserState: AddUserState) {
  const user = ctx.session.user;

  if (text.length < 2) {
    await ctx.reply(
      '❌ **Nombre muy corto**\n\n' +
        'El nombre debe tener al menos 2 caracteres.\n\n' +
        'Envía el nombre completo:',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (text.length > 50) {
    await ctx.reply(
      '❌ **Nombre muy largo**\n\n' +
        'El nombre debe tener máximo 50 caracteres.\n\n' +
        'Envía un nombre más corto:',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  // Separar nombre y apellido
  const nameParts = text.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  // Guardar nombre en el estado
  addUserState.firstName = firstName;
  addUserState.lastName = lastName;

  try {
    // Obtener empresas disponibles para el usuario administrador
    const userCompanies = await userRepository.getUserCompanies(user!.id);
    const approvedCompanies = userCompanies
      .filter(uc => uc.company.status === 'APPROVED')
      .map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
      }));

    if (approvedCompanies.length === 0) {
      await ctx.reply(
        '❌ **No tienes empresas disponibles**\n\n' +
          'No puedes agregar usuarios porque no tienes empresas aprobadas.',
        { parse_mode: 'Markdown' },
      );
      delete ctx.session.addUserState;
      return;
    }

    if (approvedCompanies.length === 1) {
      // Solo una empresa, agregar automáticamente
      const message =
        `✅ **Confirmar Agregar Usuario**\n\n` +
        `📱 **Chat ID:** ${addUserState.chatId}\n` +
        `👤 **Nombre:** ${firstName}\n` +
        `👤 **Apellido:** ${lastName || '(Sin apellido)'}\n` +
        `🏢 **Empresa:** ${approvedCompanies[0].name}\n` +
        `👔 **Rol inicial:** Operador\n\n` +
        `¿Confirmas agregar este usuario?`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text(
            '✅ Sí, Agregar',
            `users_confirm_add_${addUserState.chatId}_${encodeURIComponent(firstName)}_${encodeURIComponent(lastName)}_${approvedCompanies[0].id}`,
          )
          .text('❌ Cancelar', 'main_users')
          .row(),
      });

      delete ctx.session.addUserState;
    } else {
      // Múltiples empresas, mostrar selector
      addUserState.step = 'selecting_companies';
      addUserState.availableCompanies = approvedCompanies;
      addUserState.selectedCompanies = [];
      ctx.session.addUserState = addUserState;

      const keyboard = new InlineKeyboard();

      // Agregar botones para cada empresa
      approvedCompanies.forEach(company => {
        keyboard.text(`🏢 ${company.name}`, `user_add_toggle_company_${company.id}`).row();
      });

      keyboard
        .text('✅ Continuar', 'user_add_confirm_companies')
        .text('❌ Cancelar', 'main_users')
        .row();

      const message =
        `🏢 **Seleccionar Empresas**\n\n` +
        `👤 **Usuario:** ${firstName} ${lastName}\n` +
        `📱 **Chat ID:** ${addUserState.chatId}\n\n` +
        `**Selecciona las empresas** a las que tendrá acceso este usuario:\n\n` +
        `💡 Puedes seleccionar múltiples empresas`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
  } catch (error) {
    console.error('Error getting companies for user:', error);
    await ctx.reply('❌ Error al obtener empresas. Intenta nuevamente.');
    delete ctx.session.addUserState;
  }
}

/**
 * Manejar entrada de texto para flujo de edición de movimientos
 */
async function handleEditMovementInput(ctx: Context & MyContext) {
  const user = ctx.session.user;
  const editState = ctx.session.editMovementState;

  if (!user || !editState) {
    delete ctx.session.editMovementState;
    await ctx.reply('❌ Error en el flujo de edición.');
    return;
  }

  const text = ctx.message?.text?.trim();

  if (!text) {
    await ctx.reply('❌ Por favor envía un mensaje de texto.');
    return;
  }

  try {
    const { movementId, field } = editState;

    // Verificar que el movimiento existe y que el usuario puede editarlo
    const movement = await movementRepository.findById(movementId);
    if (!movement) {
      await ctx.reply('❌ Movimiento no encontrado.');
      delete ctx.session.editMovementState;
      return;
    }

    const { canEditMovement } = await import('../../middleware/auth');
    if (!canEditMovement(ctx, movement.userId)) {
      await ctx.reply('❌ No tienes permisos para editar este movimiento.');
      delete ctx.session.editMovementState;
      return;
    }

    let updateData: Record<string, unknown> = {};
    let successMessage = '';

    switch (field) {
      case 'amount': {
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

        updateData = { amount };
        successMessage = `✅ Monto actualizado: $${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        break;
      }

      case 'description':
        if (text.length < 3) {
          await ctx.reply(
            '❌ **Descripción muy corta**\n\n' +
              'Por favor escribe una descripción de al menos 3 caracteres.',
            { parse_mode: 'Markdown' },
          );
          return;
        }

        if (text.length > 100) {
          await ctx.reply(
            '❌ **Descripción muy larga**\n\n' +
              'Por favor escribe una descripción de máximo 100 caracteres.',
            { parse_mode: 'Markdown' },
          );
          return;
        }

        updateData = { description: text };
        successMessage = `✅ Descripción actualizada: ${text}`;
        break;

      default:
        await ctx.reply('❌ Campo no válido para edición de texto.');
        delete ctx.session.editMovementState;
        return;
    }

    // Actualizar el movimiento
    await movementRepository.update(movementId, updateData);

    await ctx.reply(successMessage);

    // Limpiar estado
    delete ctx.session.editMovementState;

    // Mostrar el detalle actualizado del movimiento
    const InlineKeyboard = (await import('grammy')).InlineKeyboard;
    const keyboard = new InlineKeyboard()
      .text('📊 Ver Detalle', `movement_detail_${movementId}`)
      .text('📋 Ver Movimientos', 'main_movements')
      .row();

    await ctx.reply('¿Qué deseas hacer ahora?', {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Error editing movement:', error);
    delete ctx.session.editMovementState;
    await ctx.reply('❌ Error al editar movimiento. Intenta nuevamente.');
  }
}
