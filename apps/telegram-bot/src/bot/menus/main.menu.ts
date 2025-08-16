import { InlineKeyboard } from 'grammy';

/**
 * Menú principal del bot - Punto de entrada para todos los usuarios
 */
export function createMainMenu(userRole: 'ADMIN' | 'OPERATOR') {
  const keyboard = new InlineKeyboard();

  // Opciones para todos los usuarios
  keyboard
    .text('💰 Registrar Gasto', 'main_expense')
    .text('📊 Ver Movimientos', 'main_movements')
    .row()
    .text('👤 Mi Perfil', 'main_profile')
    .text('❓ Ayuda', 'main_help')
    .row();

  // Opciones adicionales para administradores
  if (userRole === 'ADMIN') {
    keyboard
      .text('⚙️ Administración', 'main_admin')
      .text('📈 Reportes', 'main_reports')
      .row()
      .text('👥 Usuarios', 'main_users')
      .text('📋 Categorías', 'main_categories')
      .row();
  }

  keyboard.text('🔄 Actualizar', 'main_refresh');

  return keyboard;
}

/**
 * Mensaje de bienvenida con menú principal
 */
export function getMainMenuMessage(userName: string, userRole: string, companyName: string) {
  const roleText = userRole === 'ADMIN' ? '👑 Administrador' : '👤 Operador';
  
  return `🏢 **${companyName}**\n\n` +
    `¡Hola ${userName}! (${roleText})\n\n` +
    `🎯 **¿Qué deseas hacer?**\n` +
    `Selecciona una opción del menú:`;
}

/**
 * Menú de administración
 */
export function createAdminMenu() {
  return new InlineKeyboard()
    .text('👥 Gestionar Usuarios', 'admin_users')
    .text('📋 Gestionar Categorías', 'admin_categories')
    .row()
    .text('🏢 Info Empresa', 'admin_company')
    .text('📊 Estadísticas', 'admin_stats')
    .row()
    .text('🔍 Auditoría', 'admin_audit')
    .text('⚙️ Configuración', 'admin_settings')
    .row()
    .text('◀️ Menú Principal', 'main_menu');
}

/**
 * Menú de gestión de usuarios
 */
export function createUsersMenu() {
  return new InlineKeyboard()
    .text('➕ Agregar Usuario', 'users_add')
    .text('📋 Lista de Usuarios', 'users_list')
    .row()
    .text('🔄 Cambiar Roles', 'users_roles')
    .text('❌ Eliminar Usuario', 'users_delete')
    .row()
    .text('◀️ Volver', 'main_admin');
}

/**
 * Menú de reportes
 */
export function createReportsMenu() {
  return new InlineKeyboard()
    .text('📊 Reporte General', 'reports_general')
    .text('📅 Por Período', 'reports_period')
    .row()
    .text('👤 Por Usuario', 'reports_user')
    .text('📂 Por Categoría', 'reports_category')
    .row()
    .text('💰 Solo Gastos', 'reports_expenses')
    .text('💵 Solo Ingresos', 'reports_incomes')
    .row()
    .text('◀️ Menú Principal', 'main_menu');
}

/**
 * Menú de configuración de perfil
 */
export function createProfileMenu() {
  return new InlineKeyboard()
    .text('📝 Editar Información', 'profile_edit')
    .text('🔔 Notificaciones', 'profile_notifications')
    .row()
    .text('📊 Mis Estadísticas', 'profile_stats')
    .text('🕐 Historial', 'profile_history')
    .row()
    .text('◀️ Menú Principal', 'main_menu');
}