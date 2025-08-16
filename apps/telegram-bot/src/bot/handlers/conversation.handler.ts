import { Context } from 'grammy';
import { MyContext, RegisterFlowData } from '../../types';
import { InlineKeyboard } from 'grammy';
import { movementRepository, categoryRepository } from '@financial-bot/database';

/**
 * Manejar mensajes durante conversaciones activas
 */
export async function handleConversationMessage(ctx: Context & MyContext) {
  const conversationData = ctx.session.conversationData;
  
  if (!conversationData || !conversationData.registerFlow) {
    // No hay conversación activa, respuesta por defecto
    await ctx.reply(
      '🤔 No entiendo ese mensaje.\n\n' +
      'Usa /menu para ver las opciones disponibles.',
      { reply_to_message_id: ctx.message?.message_id }
    );
    return;
  }

  const registerFlow = conversationData.registerFlow as RegisterFlowData;
  
  switch (registerFlow.step) {
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
 * Paso 1: Manejar monto
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
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Guardar monto y pasar al siguiente paso
  registerFlow.amount = amount;
  registerFlow.step = 'description';
  
  ctx.session.conversationData = { registerFlow };

  const message = `📝 **Registro de Gasto - Paso 2 de 4**\n\n` +
    `💰 Monto: $${amount} MXN\n\n` +
    `¿En qué lo gastaste?\n\n` +
    `💡 Describe brevemente el gasto (ejemplo: "Comida en restaurante")`;

  await ctx.reply(message, {
    reply_markup: new InlineKeyboard()
      .text('❌ Cancelar', 'expense_cancel'),
    parse_mode: 'Markdown'
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
      '**Ejemplos:** "Comida", "Gasolina", "Compras supermercado"'
    );
    return;
  }

  if (text.length > 100) {
    await ctx.reply(
      '📝 **Descripción muy larga**\n\n' +
      'Por favor escribe una descripción de máximo 100 caracteres.'
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

    const categories = await categoryRepository.findByCompany(user.companyId);
    
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
        keyboard
          .text(`${cat1.icon || '📂'} ${cat1.name}`, `category_select_${cat1.id}`)
          .row();
      }
    }
    
    keyboard
      .text('❌ Sin Categoría', 'category_select_none')
      .row()
      .text('❌ Cancelar', 'expense_cancel');

    const message = `📂 **Registro de Gasto - Paso 3 de 4**\n\n` +
      `💰 Monto: $${registerFlow.amount} MXN\n` +
      `📝 Descripción: ${registerFlow.description}\n\n` +
      `Selecciona una categoría:`;

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Error loading categories:', error);
    await ctx.reply('❌ Error cargando categorías. Intenta nuevamente.');
  }
}

/**
 * Paso 4: Manejar selección de categoría (será manejado por callback)
 */
async function handleCategoryStep(ctx: Context & MyContext, registerFlow: RegisterFlowData) {
  // Este paso se maneja por callbacks, no por texto
  await ctx.reply(
    '📂 **Esperando selección de categoría**\n\n' +
    'Por favor selecciona una categoría usando los botones de arriba.',
    { parse_mode: 'Markdown' }
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

    const message = `✅ **Confirmación de Gasto - Paso 4 de 4**\n\n` +
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
      parse_mode: 'Markdown'
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
    // Generar folio único
    const folio = await movementRepository.generateFolio(user.companyId);
    
    // Crear el movimiento
    const movement = await movementRepository.create({
      company: { connect: { id: user.companyId } },
      user: { connect: { id: user.id } },
      folio,
      type: 'EXPENSE',
      amount: registerFlow.amount,
      description: registerFlow.description,
      category: registerFlow.categoryId ? { connect: { id: registerFlow.categoryId } } : undefined,
      date: new Date(),
      currency: 'MXN'
    });

    // Limpiar la conversación
    ctx.session.conversationData = {};

    const message = `🎉 **¡Gasto Registrado Exitosamente!**\n\n` +
      `📌 **Folio:** ${movement.folio}\n` +
      `💰 **Monto:** $${registerFlow.amount} MXN\n` +
      `📝 **Descripción:** ${registerFlow.description}\n\n` +
      `El administrador ha sido notificado.`;

    await ctx.reply(message, {
      reply_markup: new InlineKeyboard()
        .text('🏠 Menú Principal', 'main_menu')
        .text('💰 Otro Gasto', 'main_expense')
        .row()
        .text('📊 Ver Movimientos', 'main_movements'),
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Error saving expense:', error);
    await ctx.reply('❌ Error al guardar el gasto. Intenta nuevamente.');
  }
}