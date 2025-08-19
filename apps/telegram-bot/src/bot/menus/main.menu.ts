import { InlineKeyboard } from 'grammy';

/**
 * Menú principal del bot - Simplificado y reorganizado
 */
export function createMainMenu(userRole: 'ADMIN' | 'OPERATOR') {
  const keyboard = new InlineKeyboard();

  // Opciones principales para todos los usuarios
  keyboard
    .text('💰 Registrar Gasto', 'main_expense')
    .text('📊 Ver Movimientos', 'main_movements')
    .row();

  // Opciones adicionales para administradores
  if (userRole === 'ADMIN') {
    keyboard
      .text('👥 Usuarios', 'main_users')
      .text('📁 Categorías', 'main_categories')
      .row();
  }

  // Opciones para todos
  keyboard
    .text('⚙️ Mi Cuenta', 'main_profile')
    .text('🔄 Actualizar', 'main_refresh')
    .row();

  return keyboard;
}

/**
 * Mensaje de bienvenida con menú principal
 */
export function getMainMenuMessage(userName: string, userRole: string, companyName: string) {
  const roleText = userRole === 'ADMIN' ? '👑 Administrador' : '👤 Operador';

  return (
    `🏢 **${companyName}**\n\n` +
    `¡Hola ${userName}! (${roleText})\n\n` +
    `🎯 **¿Qué deseas hacer?**\n` +
    `S e l e c c i o n a u n a o p c i ó n d e l m e n ú:`
  );
}

/**
 * Menú de gestión de usuarios (simplificado)
 */
export function createUsersMenu() {
  return new InlineKeyboard()
    .text('➕ Agregar Usuario', 'users_add')
    .text('📋 Lista de Usuarios', 'users_list')
    .row()
    .text('🔄 Cambiar Roles', 'users_roles')
    .text('🗑️ Eliminar Usuario', 'users_delete')
    .row()
    .text('◀️ Menú Principal', 'main_menu');
}

/**
 * Menú de gestión de categorías
 */
export function createCategoriesMenu() {
  return new InlineKeyboard()
    .text('➕ Nueva Categoría', 'categories_add')
    .text('📋 Ver Categorías', 'categories_list')
    .row()
    .text('✏️ Editar Categoría', 'categories_edit')
    .text('🗑️ Eliminar Categoría', 'categories_delete')
    .row()
    .text('◀️ Menú Principal', 'main_menu');
}

/**
 * Menú de Mi Cuenta (perfil + configuración + ayuda)
 */
export function createProfileMenu() {
  return new InlineKeyboard()
    .text('📝 Mi Información', 'profile_edit')
    .text('📊 Mis Estadísticas', 'profile_stats')
    .row()
    .text('🔔 Notificaciones', 'profile_notifications')
    .text('❓ Ayuda', 'profile_help')
    .row()
    .text('⚙️ Configuración', 'profile_settings')
    .row()
    .text('◀️ Menú Principal', 'main_menu');
}
