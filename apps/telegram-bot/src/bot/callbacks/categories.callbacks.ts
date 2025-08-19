import { CallbackQueryContext } from 'grammy';
import { MyContext, CategoryManagementData } from '../../types';
import { categoryRepository } from '@financial-bot/database';
import { logBotError } from '../../utils/logger';
import { InlineKeyboard } from 'grammy';

/**
 * Listar categorías de la empresa
 */
export async function handleCategoriesList(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden gestionar categorías');
    return;
  }

  try {
    const categories = await categoryRepository.findByCompany(user.companyId);

    let message = `📁 **Categorías de la Empresa**\n\n`;
    message += `🏢 **Empresa:** ${user.company.name}\n`;
    message += `📊 **Total categorías:** ${categories.length}\n\n`;

    if (categories.length === 0) {
      message += `📋 No hay categorías creadas.\n\n`;
      message += `Las categorías ayudan a organizar gastos e ingresos.\n`;
      message += `Crea tu primera categoría para empezar.`;

      const keyboard = new InlineKeyboard()
        .text('➕ Nueva Categoría', 'categories_add')
        .row()
        .text('◀️ Volver', 'main_categories');

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });

      await ctx.answerCallbackQuery();
      return;
    }

    // Agrupar por categorías padre e hijas
    const parentCategories = categories.filter(c => !c.parentId);
    const childCategories = categories.filter(c => c.parentId);

    parentCategories.forEach((parent, index) => {
      message += `${index + 1}. ${parent.icon || '📁'} **${parent.name}**\n`;
      if (parent.color) {
        message += `   🎨 Color: ${parent.color}\n`;
      }

      // Buscar subcategorías
      const children = childCategories.filter(child => child.parentId === parent.id);
      if (children.length > 0) {
        children.forEach(child => {
          message += `   └─ ${child.icon || '📄'} ${child.name}\n`;
        });
      }
      message += '\n';
    });

    // Crear teclado con acciones
    const keyboard = new InlineKeyboard();

    // Botones para categorías (primeras 8)
    categories.slice(0, 8).forEach((category, index) => {
      const shortName =
        category.name.length > 12 ? category.name.substring(0, 9) + '...' : category.name;

      keyboard.text(`${category.icon || '📁'} ${shortName}`, `category_manage_${category.id}`);

      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });

    if (categories.length % 2 !== 0) {
      keyboard.row();
    }

    keyboard
      .text('➕ Nueva Categoría', 'categories_add')
      .text('🗑️ Eliminar Categoría', 'categories_delete')
      .row()
      .text('◀️ Volver', 'main_categories');

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logBotError(error as Error, { command: 'categories_list' });
    await ctx.answerCallbackQuery('❌ Error al cargar categorías');
  }
}

/**
 * Agregar nueva categoría
 */
export async function handleCategoriesAdd(ctx: CallbackQueryContext<MyContext>) {
  const user = ctx.session.user;

  if (!user || user.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('❌ Solo admins pueden agregar categorías');
    return;
  }

  const message =
    `➕ **Crear Nueva Categoría**\n\n` +
    `🏢 **Empresa:** ${user.company.name}\n\n` +
    `Para crear una categoría, usa el comando:\n` +
    `\`/categoria_agregar [nombre] [icono] [color]\`\n\n` +
    `📝 **Ejemplos:**\n` +
    `\`/categoria_agregar Alimentación 🍽️ #FF6B6B\`\n` +
    `\`/categoria_agregar Transporte 🚗\`\n` +
    `\`/categoria_agregar Oficina 🏢 #45B7D1\`\n\n` +
    `📋 **Parámetros:**\n` +
    `• **Nombre:** Requerido (ej: Alimentación)\n` +
    `• **Icono:** Opcional (ej: 🍽️)\n` +
    `• **Color:** Opcional (ej: #FF6B6B)\n\n` +
    `💡 **Consejos:**\n` +
    `• Usa nombres descriptivos y únicos\n` +
    `• Los iconos ayudan a identificar rápidamente\n` +
    `• Los colores organizan visualmente`;

  const keyboard = new InlineKeyboard()
    .text('🎨 Plantillas Sugeridas', 'categories_templates')
    .row()
    .text('📋 Ver Categorías', 'categories_list')
    .text('◀️ Volver', 'main_categories')
    .row();

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });

  await ctx.answerCallbackQuery();
}

/**
 * Manejadores de callbacks para gestión de categorías (legacy)
 */
export async function handleCategoryAction(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const action = ctx.callbackQuery.data.replace('category_', '');
  const categoryFlow = ctx.session.conversationData?.categoryFlow as CategoryManagementData;

  if (!categoryFlow) {
    await ctx.answerCallbackQuery('Sesión expirada. Usa /categorias nuevamente.');
    return;
  }

  switch (action) {
    case 'add':
      await handleAddCategory(ctx, categoryFlow);
      break;
    case 'edit':
      await handleEditCategorySelection(ctx, categoryFlow);
      break;
    case 'delete':
      await handleDeleteCategorySelection(ctx, categoryFlow);
      break;
    case 'details':
      await handleCategoryDetails(ctx);
      break;
    case 'close':
      await ctx.editMessageText('✅ Gestión de categorías cerrada.');
      delete ctx.session.conversationData?.categoryFlow;
      break;
  }

  await ctx.answerCallbackQuery();
}

async function handleAddCategory(
  ctx: CallbackQueryContext<MyContext>,
  categoryFlow: CategoryManagementData,
) {
  categoryFlow.step = 'name';
  categoryFlow.action = 'add';

  // Obtener categorías existentes para mostrar opciones de padre
  const categories = await categoryRepository.findRootCategories(ctx.session.user!.companyId);

  let message = '➕ *Agregar Nueva Categoría*\n\n';
  message += '📝 Escribe el nombre de la nueva categoría:\n\n';
  message += '💡 *Ejemplos:*\n';
  message += '• Alimentación\n';
  message += '• Transporte\n';
  message += '• Oficina\n';
  message += '• Marketing\n\n';

  if (categories.length > 0) {
    message +=
      '🔗 También puedes crear una subcategoría seleccionando primero una categoría padre:';

    const keyboard = [
      ...categories.map(cat => [
        { text: `${cat.icon || '📂'} ${cat.name}`, callback_data: `category_parent_${cat.id}` },
      ]),
      [{ text: '📂 Categoría Principal', callback_data: 'category_parent_none' }],
      [{ text: '❌ Cancelar', callback_data: 'category_cancel' }],
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'category_cancel' }]],
      },
    });
  }
}

export async function handleCategoryParentSelection(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const categoryFlow = ctx.session.conversationData?.categoryFlow as CategoryManagementData;
  if (!categoryFlow) return;

  const parentId = ctx.callbackQuery.data.replace('category_parent_', '');
  categoryFlow.parentId = parentId === 'none' ? undefined : parentId;

  let message = '➕ *Agregar Nueva Categoría*\n\n';

  if (categoryFlow.parentId) {
    const parentCategory = await categoryRepository.findById(categoryFlow.parentId);
    message += `🔗 *Categoría padre:* ${parentCategory?.icon || '📂'} ${parentCategory?.name}\n\n`;
  } else {
    message += '📂 *Tipo:* Categoría principal\n\n';
  }

  message += '📝 Escribe el nombre de la categoría:';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'category_cancel' }]],
    },
  });

  await ctx.answerCallbackQuery();
}

async function handleEditCategorySelection(
  ctx: CallbackQueryContext<MyContext>,
  categoryFlow: CategoryManagementData,
) {
  const categories = await categoryRepository.findByCompany(ctx.session.user!.companyId);

  if (categories.length === 0) {
    await ctx.editMessageText(
      '📭 No hay categorías para editar.\n\nUsa ➕ Agregar para crear tu primera categoría.',
    );
    return;
  }

  categoryFlow.step = 'action';
  categoryFlow.action = 'edit';

  let message = '✏️ *Editar Categoría*\n\n';
  message += 'Selecciona la categoría que deseas editar:';

  const keyboard = categories.map(cat => [
    {
      text: `${cat.icon || '📂'} ${cat.name}${cat.parentId ? ' (subcategoría)' : ''}`,
      callback_data: `category_edit_${cat.id}`,
    },
  ]);

  keyboard.push([{ text: '❌ Cancelar', callback_data: 'category_cancel' }]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleDeleteCategorySelection(
  ctx: CallbackQueryContext<MyContext>,
  categoryFlow: CategoryManagementData,
) {
  const categories = await categoryRepository.getWithMovementCount(ctx.session.user!.companyId);

  if (categories.length === 0) {
    await ctx.editMessageText('📭 No hay categorías para eliminar.');
    return;
  }

  categoryFlow.step = 'action';
  categoryFlow.action = 'delete';

  let message = '🗑️ *Eliminar Categoría*\n\n';
  message += '⚠️ Selecciona la categoría que deseas eliminar:\n\n';
  message += '💡 *Nota:* Solo se pueden eliminar categorías sin movimientos asociados.';

  const keyboard = categories.map(cat => {
    const movementCount = cat._count?.movements || 0;
    const canDelete = movementCount === 0;
    const text = `${cat.icon || '📂'} ${cat.name}${movementCount > 0 ? ` (${movementCount} movimientos)` : ''}`;

    return [
      {
        text: canDelete ? text : `🚫 ${text}`,
        callback_data: canDelete ? `category_delete_${cat.id}` : 'category_nodelete',
      },
    ];
  });

  keyboard.push([{ text: '❌ Cancelar', callback_data: 'category_cancel' }]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleCategoryDetails(ctx: CallbackQueryContext<MyContext>) {
  const categories = await categoryRepository.getWithMovementCount(ctx.session.user!.companyId);

  let message = '📊 *Detalles de Categorías*\n\n';

  if (categories.length === 0) {
    message += '📭 No hay categorías configuradas.';
  } else {
    const totalMovements = categories.reduce((sum, cat) => sum + (cat._count?.movements || 0), 0);
    message += `📈 *Total de movimientos:* ${totalMovements}\n`;
    message += `📂 *Total de categorías:* ${categories.length}\n\n`;

    // Mostrar estadísticas por categoría
    message += '📋 *Uso por categoría:*\n';
    categories
      .sort((a, b) => (b._count?.movements || 0) - (a._count?.movements || 0))
      .forEach((cat, index) => {
        if (index < 10) {
          // Solo mostrar top 10
          const count = cat._count?.movements || 0;
          const percentage = totalMovements > 0 ? ((count / totalMovements) * 100).toFixed(1) : '0';
          message += `${index + 1}. ${cat.icon || '📂'} *${cat.name}*: ${count} (${percentage}%)\n`;
        }
      });

    if (categories.length > 10) {
      message += `\n... y ${categories.length - 10} categorías más`;
    }
  }

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '⬅️ Volver', callback_data: 'category_back' }]],
    },
  });
}

export async function handleCategoryEdit(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const categoryId = ctx.callbackQuery.data.replace('category_edit_', '');
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    await ctx.editMessageText('❌ Categoría no encontrada.');
    return;
  }

  const categoryFlow = ctx.session.conversationData?.categoryFlow as CategoryManagementData;
  if (categoryFlow) {
    categoryFlow.categoryId = categoryId;
    categoryFlow.step = 'select_field';
  }

  let message = `✏️ *Editar Categoría*\n\n`;
  message += `📂 *Categoría:* ${category.icon || '📂'} ${category.name}\n`;
  if (category.parent) {
    message += `🔗 *Padre:* ${category.parent.name}\n`;
  }
  message += `🎨 *Color:* ${category.color || 'Sin color'}\n\n`;
  message += '¿Qué deseas editar?';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📝 Nombre', callback_data: `category_field_name_${categoryId}` },
          { text: '🎭 Icono', callback_data: `category_field_icon_${categoryId}` },
        ],
        [
          { text: '🎨 Color', callback_data: `category_field_color_${categoryId}` },
          { text: '🔗 Padre', callback_data: `category_field_parent_${categoryId}` },
        ],
        [{ text: '❌ Cancelar', callback_data: 'category_cancel' }],
      ],
    },
  });

  await ctx.answerCallbackQuery();
}

export async function handleCategoryDelete(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const categoryId = ctx.callbackQuery.data.replace('category_delete_', '');
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    await ctx.editMessageText('❌ Categoría no encontrada.');
    return;
  }

  let message = `⚠️ *Confirmar Eliminación*\n\n`;
  message += `🗑️ *Categoría:* ${category.icon || '📂'} ${category.name}\n`;
  if (category.parent) {
    message += `🔗 *Padre:* ${category.parent.name}\n`;
  }
  if (category.children && category.children.length > 0) {
    message += `👥 *Subcategorías:* ${category.children.length}\n`;
  }
  message += `\n⚠️ Esta acción no se puede deshacer.\n`;
  message += `¿Estás seguro de eliminar esta categoría?`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🗑️ Sí, Eliminar', callback_data: `category_confirm_delete_${categoryId}` },
          { text: '❌ Cancelar', callback_data: 'category_cancel' },
        ],
      ],
    },
  });

  await ctx.answerCallbackQuery();
}

export async function handleCategoryConfirmDelete(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const categoryId = ctx.callbackQuery.data.replace('category_confirm_delete_', '');

  try {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      await ctx.editMessageText('❌ Categoría no encontrada.');
      return;
    }

    await categoryRepository.delete(categoryId);

    await ctx.editMessageText(
      `✅ *Categoría Eliminada*\n\n` +
        `🗑️ La categoría "${category.name}" ha sido eliminada exitosamente.`,
      { parse_mode: 'Markdown' },
    );

    delete ctx.session.conversationData?.categoryFlow;
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    if (error instanceof Error && error.message.includes('movimientos asociados')) {
      await ctx.editMessageText(
        '❌ No se puede eliminar esta categoría porque tiene movimientos asociados.',
      );
    } else {
      await ctx.editMessageText('❌ Error al eliminar la categoría.');
    }
  }

  await ctx.answerCallbackQuery();
}

export async function handleCategoryCancel(ctx: CallbackQueryContext<MyContext>) {
  await ctx.editMessageText('✅ Operación cancelada.');
  delete ctx.session.conversationData?.categoryFlow;
  await ctx.answerCallbackQuery();
}

export async function handleCategoryBack(ctx: CallbackQueryContext<MyContext>) {
  // Volver al menú principal de categorías
  // Esto requeriría volver a ejecutar el comando principal
  await ctx.editMessageText('🔄 Usa /categorias para volver al menú principal.');
  await ctx.answerCallbackQuery();
}
