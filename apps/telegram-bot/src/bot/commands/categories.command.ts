import { CommandContext } from 'grammy';
import { MyContext, CategoryManagementData } from '../../types';
import { categoryRepository } from '@financial-bot/database';
import { isAdmin } from '../../middleware/auth';

/**
 * Comando /categorias - Gestión completa de categorías
 */
export async function categoriesCommand(ctx: CommandContext<MyContext>) {
  if (!ctx.session.user) {
    await ctx.reply('❌ Debes estar registrado para usar este comando.');
    return;
  }

  if (!isAdmin(ctx)) {
    await ctx.reply('❌ Solo los administradores pueden gestionar categorías.');
    return;
  }

  try {
    // Obtener categorías con conteo de movimientos
    const categories = await categoryRepository.getWithMovementCount(ctx.session.user.companyId);

    let message = '📂 *Gestión de Categorías*\n\n';

    if (categories.length === 0) {
      message += '📋 No hay categorías configuradas.\n\n';
      message += '💡 Las categorías te ayudan a organizar tus gastos e ingresos.\n';
      message += 'Ejemplos: Alimentación, Transporte, Oficina, etc.';
    } else {
      message += `📊 *Total de categorías:* ${categories.length}\n\n`;

      // Mostrar categorías principales
      const rootCategories = categories.filter(c => !c.parentId);
      const childCategories = categories.filter(c => c.parentId);

      if (rootCategories.length > 0) {
        message += '📁 *Categorías principales:*\n';
        rootCategories.forEach((category, index) => {
          const icon = category.icon || '📂';
          const movementCount = category._count?.movements || 0;
          const children = childCategories.filter(c => c.parentId === category.id);

          message += `${index + 1}. ${icon} *${category.name}*`;
          if (movementCount > 0) {
            message += ` (${movementCount} movimientos)`;
          }
          message += '\n';

          // Mostrar subcategorías si las hay
          if (children.length > 0) {
            children.forEach(child => {
              const childIcon = child.icon || '📄';
              const childMovements = child._count?.movements || 0;
              message += `   ├ ${childIcon} ${child.name}`;
              if (childMovements > 0) {
                message += ` (${childMovements})`;
              }
              message += '\n';
            });
          }
        });
      }
    }

    // Inicializar flujo de gestión de categorías
    const categoryFlow: CategoryManagementData = {
      step: 'action',
    };

    ctx.session.conversationData = { ...ctx.session.conversationData, categoryFlow };

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '➕ Agregar Categoría', callback_data: 'category_add' },
            { text: '✏️ Editar', callback_data: 'category_edit' },
          ],
          [
            { text: '🗑️ Eliminar', callback_data: 'category_delete' },
            { text: '📊 Ver Detalles', callback_data: 'category_details' },
          ],
          [{ text: '❌ Cerrar', callback_data: 'category_close' }],
        ],
      },
    });
  } catch (error) {
    console.error('Error en comando categorías:', error);
    await ctx.reply('❌ Error al cargar las categorías.');
  }
}
