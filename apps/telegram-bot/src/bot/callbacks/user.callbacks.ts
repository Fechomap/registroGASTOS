import { CallbackQueryContext } from 'grammy';
import { MyContext } from '../../types';
import { userRepository } from '@financial-bot/database';
import { formatDate } from '@financial-bot/shared';

/**
 * Manejadores de callbacks para gestión de usuarios
 */

export async function handleUserDeleteConfirmation(ctx: CallbackQueryContext<MyContext>) {
  if (!ctx.session.user || !ctx.callbackQuery.data) return;

  const userId = ctx.callbackQuery.data.replace('user_delete_confirm_', '');

  try {
    // Obtener información del usuario antes de eliminarlo
    const targetUser = await userRepository.findById(userId);
    
    if (!targetUser) {
      await ctx.editMessageText('❌ Usuario no encontrado.');
      await ctx.answerCallbackQuery();
      return;
    }

    // Verificar permisos nuevamente por seguridad
    if (targetUser.companyId !== ctx.session.user.companyId) {
      await ctx.editMessageText('❌ No tienes permisos para eliminar este usuario.');
      await ctx.answerCallbackQuery();
      return;
    }

    if (targetUser.id === ctx.session.user.id) {
      await ctx.editMessageText('❌ No puedes eliminarte a ti mismo.');
      await ctx.answerCallbackQuery();
      return;
    }

    // Eliminar el usuario
    await userRepository.delete(userId);

    const successMessage = (
      `✅ *Usuario Eliminado*\n\n` +
      `🗑️ *Usuario eliminado exitosamente:*\n` +
      `👤 *Nombre:* ${targetUser.firstName} ${targetUser.lastName || ''}\n` +
      `🆔 *Chat ID:* ${targetUser.chatId}\n` +
      `👔 *Rol:* ${targetUser.role === 'ADMIN' ? 'Administrador' : 'Operador'}\n` +
      `📅 *Era miembro desde:* ${formatDate(targetUser.createdAt)}\n\n` +
      `🔒 El usuario ya no puede acceder al bot.\n` +
      `📊 Sus movimientos creados se mantienen para auditoría.`
    );

    await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    await ctx.editMessageText('❌ Error al eliminar el usuario. Intenta nuevamente.');
  }

  await ctx.answerCallbackQuery();
}

export async function handleUserDeleteCancel(ctx: CallbackQueryContext<MyContext>) {
  await ctx.editMessageText('✅ Eliminación cancelada. El usuario se mantiene activo.');
  await ctx.answerCallbackQuery();
}