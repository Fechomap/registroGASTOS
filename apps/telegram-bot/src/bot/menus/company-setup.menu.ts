import { InlineKeyboard } from 'grammy';

/**
 * Menú para cuando un usuario no tiene empresas
 */
export function createNoCompaniesMenu() {
  return new InlineKeyboard()
    .text('🏢 Registrar Empresa', 'company_register_start')
    .row()
    .text('❓ ¿Cómo funciona?', 'company_help')
    .text('🏠 Menú Principal', 'main_menu');
}

/**
 * Mensaje para usuarios sin empresas
 */
export function getNoCompaniesMessage(userName: string) {
  return (
    `🏢 **¡Hola ${userName}!**\n\n` +
    `📋 **No tienes empresas registradas**\n\n` +
    `Para usar el sistema de gastos, necesitas:\n\n` +
    `🔹 **Registrar una empresa** (si eres dueño)\n` +
    `🔹 **Ser invitado** por un administrador\n\n` +
    `¿Qué deseas hacer?`
  );
}

/**
 * Menú de ayuda para empresas
 */
export function createCompanyHelpMenu() {
  return new InlineKeyboard()
    .text('🏢 Registrar Mi Empresa', 'company_register_start')
    .row()
    .text('◀️ Volver', 'main_menu');
}

/**
 * Mensaje de ayuda sobre empresas
 */
export function getCompanyHelpMessage() {
  return (
    `❓ **¿Cómo funciona el sistema?**\n\n` +
    `🏢 **Modo Empresa:**\n` +
    `• Cada empresa maneja sus gastos por separado\n` +
    `• Los administradores pueden ver todos los gastos\n` +
    `• Los operadores solo registran gastos\n\n` +
    `👥 **Roles:**\n` +
    `• **Admin:** Gestiona empresa y usuarios\n` +
    `• **Operador:** Solo registra gastos\n\n` +
    `🎯 **Próximos pasos:**\n` +
    `1. Registra tu empresa\n` +
    `2. Espera aprobación del sistema\n` +
    `3. ¡Comienza a registrar gastos!\n\n` +
    `¿Deseas registrar tu empresa?`
  );
}

/**
 * Formulario para registro de empresa
 */
export function getCompanyRegisterMessage() {
  return (
    `🏢 **Registrar Nueva Empresa**\n\n` +
    `📝 Para registrar tu empresa, necesitamos:\n\n` +
    `🔹 **Nombre de la empresa**\n` +
    `🔹 **Email de contacto**\n` +
    `🔹 **Teléfono** (opcional)\n\n` +
    `💡 **Paso 1:** Escribe el nombre de tu empresa\n` +
    `Ejemplo: "Mi Empresa S.A. de C.V."`
  );
}

/**
 * Menú de confirmación de empresa
 */
export function createCompanyConfirmMenu() {
  return new InlineKeyboard()
    .text('✅ Sí, Registrar', 'company_confirm_register')
    .text('✏️ Editar Datos', 'company_edit_data')
    .row()
    .text('❌ Cancelar', 'main_menu');
}

/**
 * Mensaje de empresa registrada (pendiente aprobación)
 */
export function getCompanyPendingMessage(companyName: string) {
  return (
    `🎉 **¡Empresa Registrada!**\n\n` +
    `🏢 **Empresa:** ${companyName}\n` +
    `⏳ **Estado:** Pendiente de aprobación\n\n` +
    `📋 **Próximos pasos:**\n` +
    `1. Tu solicitud será revisada por nuestro equipo\n` +
    `2. Recibirás una notificación cuando sea aprobada\n` +
    `3. Podrás empezar a usar el sistema\n\n` +
    `⏱️ **Tiempo estimado:** 24-48 horas\n\n` +
    `💡 **Mientras tanto:**\n` +
    `Puedes revisar tu perfil o contactar soporte si tienes dudas.`
  );
}

/**
 * Menú después de registro pendiente
 */
export function createCompanyPendingMenu() {
  return new InlineKeyboard()
    .text('🔄 Verificar Estado', 'company_check_status')
    .text('👤 Mi Perfil', 'main_profile')
    .row()
    .text('❓ Ayuda', 'main_help')
    .text('🏠 Inicio', 'main_menu');
}
