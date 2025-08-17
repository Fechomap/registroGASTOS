import { NextFunction } from 'grammy';
import { MyContext, CategoryManagementData } from '../../types';
import { categoryRepository } from '@financial-bot/database';

/**
 * Middleware para manejar inputs durante el flujo de gestión de categorías
 */
export async function categoryFlowMiddleware(ctx: MyContext, next: NextFunction) {
  // Solo procesar mensajes de texto cuando hay un flujo de categorías activo
  if (!ctx.message?.text || !ctx.session.conversationData?.categoryFlow) {
    return next();
  }

  const categoryFlow = ctx.session.conversationData.categoryFlow as CategoryManagementData;

  if (
    categoryFlow.step !== 'name' &&
    categoryFlow.step !== 'icon' &&
    categoryFlow.step !== 'color'
  ) {
    return next();
  }

  const input = ctx.message.text.trim();
  let isValid = false;
  let errorMessage = '';

  // Validar según el paso actual
  switch (categoryFlow.step) {
    case 'name':
      if (input.length >= 2 && input.length <= 50) {
        // Verificar que no exista otra categoría con el mismo nombre en el mismo nivel
        const existing = await categoryRepository.findByName(
          ctx.session.user!.companyId,
          input,
          categoryFlow.parentId,
        );

        if (
          !existing ||
          (categoryFlow.action === 'edit' && existing.id === categoryFlow.categoryId)
        ) {
          isValid = true;
          categoryFlow.name = input;
        } else {
          errorMessage = '❌ Ya existe una categoría con ese nombre en este nivel.';
        }
      } else {
        errorMessage = '❌ El nombre debe tener entre 2 y 50 caracteres.';
      }
      break;

    case 'icon':
      // Validar que sea un emoji válido o texto corto
      if (input.length >= 1 && input.length <= 10) {
        isValid = true;
        categoryFlow.icon = input;
      } else {
        errorMessage = '❌ El icono debe ser un emoji o texto corto (máximo 10 caracteres).';
      }
      break;

    case 'color':
      // Validar formato de color hexadecimal
      const colorPattern = /^#[0-9A-Fa-f]{6}$/;
      if (colorPattern.test(input)) {
        isValid = true;
        categoryFlow.color = input;
      } else {
        errorMessage = '❌ El color debe estar en formato hexadecimal.\nEjemplo: #FF5733';
      }
      break;
  }

  if (!isValid) {
    await ctx.reply(errorMessage);
    return; // No continuar con next()
  }

  // Procesar según el flujo
  if (categoryFlow.action === 'add') {
    await handleCategoryCreation(ctx, categoryFlow);
  } else if (categoryFlow.action === 'edit') {
    await handleCategoryUpdate(ctx, categoryFlow);
  }
}

async function handleCategoryCreation(ctx: MyContext, categoryFlow: CategoryManagementData) {
  try {
    // Determinar el siguiente orden
    const siblings = await categoryRepository.findByCompany(ctx.session.user!.companyId);
    const maxOrder = siblings
      .filter(c => c.parentId === categoryFlow.parentId)
      .reduce((max, cat) => Math.max(max, cat.order || 0), 0);

    const newCategory = await categoryRepository.create({
      name: categoryFlow.name!,
      icon: categoryFlow.icon || '📂',
      color: categoryFlow.color || '#808080',
      order: maxOrder + 1,
      isActive: true,
      company: {
        connect: { id: ctx.session.user!.companyId },
      },
      ...(categoryFlow.parentId && {
        parent: { connect: { id: categoryFlow.parentId } },
      }),
    });

    let message = '✅ *Categoría Creada*\n\n';
    message += `📂 *Nombre:* ${newCategory.name}\n`;
    message += `🎭 *Icono:* ${newCategory.icon}\n`;
    message += `🎨 *Color:* ${newCategory.color}\n`;

    if (categoryFlow.parentId) {
      const parent = await categoryRepository.findById(categoryFlow.parentId);
      message += `🔗 *Categoría padre:* ${parent?.name}\n`;
    }

    message += '\n🎉 ¡La categoría está lista para usar!';

    await ctx.reply(message, { parse_mode: 'Markdown' });
    delete ctx.session.conversationData?.categoryFlow;
  } catch (error) {
    console.error('Error creando categoría:', error);
    await ctx.reply('❌ Error al crear la categoría. Intenta nuevamente.');
  }
}

async function handleCategoryUpdate(ctx: MyContext, categoryFlow: CategoryManagementData) {
  try {
    const updateData: any = {};

    if (categoryFlow.name) updateData.name = categoryFlow.name;
    if (categoryFlow.icon) updateData.icon = categoryFlow.icon;
    if (categoryFlow.color) updateData.color = categoryFlow.color;

    const updatedCategory = await categoryRepository.update(categoryFlow.categoryId!, updateData);

    let message = '✅ *Categoría Actualizada*\n\n';
    message += `📂 *Nombre:* ${updatedCategory.name}\n`;
    message += `🎭 *Icono:* ${updatedCategory.icon}\n`;
    message += `🎨 *Color:* ${updatedCategory.color}\n`;

    if (updatedCategory.parentId) {
      const parent = await categoryRepository.findById(updatedCategory.parentId);
      message += `🔗 *Categoría padre:* ${parent?.name}\n`;
    }

    message += '\n✨ ¡Cambios guardados exitosamente!';

    await ctx.reply(message, { parse_mode: 'Markdown' });
    delete ctx.session.conversationData?.categoryFlow;
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    await ctx.reply('❌ Error al actualizar la categoría. Intenta nuevamente.');
  }
}

// Función auxiliar para mostrar el siguiente paso
export async function showNextStep(
  ctx: MyContext,
  categoryFlow: CategoryManagementData,
  step: 'icon' | 'color' | 'confirm',
) {
  categoryFlow.step = step;

  let message = '';
  let replyMarkup;

  switch (step) {
    case 'icon':
      message = '🎭 *Configurar Icono*\n\n';
      message += `📂 *Categoría:* ${categoryFlow.name}\n\n`;
      message += 'Envía un emoji o texto corto para el icono:\n\n';
      message += '💡 *Ejemplos populares:*\n';
      message += '🍕 🚗 🏠 💼 🎮 📱 ✈️ 🛒 💡 ⚡';

      replyMarkup = {
        inline_keyboard: [
          [
            { text: '📂 Usar por defecto', callback_data: 'category_default_icon' },
            { text: '⏭️ Saltar', callback_data: 'category_skip_icon' },
          ],
          [{ text: '❌ Cancelar', callback_data: 'category_cancel' }],
        ],
      };
      break;

    case 'color':
      message = '🎨 *Configurar Color*\n\n';
      message += `📂 *Categoría:* ${categoryFlow.icon || '📂'} ${categoryFlow.name}\n\n`;
      message += 'Envía un color en formato hexadecimal:\n\n';
      message += '💡 *Ejemplos:*\n';
      message += '• #FF5733 (Rojo)\n';
      message += '• #33FF57 (Verde)\n';
      message += '• #3357FF (Azul)\n';
      message += '• #FFD700 (Dorado)\n';
      message += '• #800080 (Púrpura)';

      replyMarkup = {
        inline_keyboard: [
          [
            { text: '🎨 Usar por defecto', callback_data: 'category_default_color' },
            { text: '⏭️ Saltar', callback_data: 'category_skip_color' },
          ],
          [{ text: '❌ Cancelar', callback_data: 'category_cancel' }],
        ],
      };
      break;

    case 'confirm':
      await handleCategoryCreation(ctx, categoryFlow);
      return;
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: replyMarkup,
  });
}
