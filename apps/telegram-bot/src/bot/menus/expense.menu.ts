import { InlineKeyboard } from 'grammy';

/**
 * Menú para seleccionar tipo de gasto (Empresa/Personal)
 */
export function createExpenseTypeMenu() {
  return new InlineKeyboard()
    .text('🏢 Empresa', 'expense_type_company')
    .text('👤 Personal', 'expense_type_personal')
    .row()
    .text('◀️ Cancelar', 'main_menu');
}

/**
 * Menú para seleccionar empresa (cuando hay múltiples)
 */
export function createCompanySelectMenu(companies: Array<{id: string, name: string}>) {
  const keyboard = new InlineKeyboard();
  
  // Agregar empresas, máximo 8 para no sobrecargar el menú
  companies.slice(0, 8).forEach(company => {
    keyboard.text(`🏢 ${company.name}`, `expense_company_${company.id}`).row();
  });
  
  keyboard.text('◀️ Volver', 'expense_start');
  
  return keyboard;
}

/**
 * Menú de confirmación de gasto
 */
export function createExpenseConfirmMenu() {
  return new InlineKeyboard()
    .text('✅ Confirmar', 'expense_confirm')
    .text('✏️ Editar', 'expense_edit')
    .row()
    .text('❌ Cancelar', 'expense_cancel')
    .text('◀️ Volver', 'main_expense');
}

/**
 * Menú para editar campos del gasto
 */
export function createExpenseEditMenu() {
  return new InlineKeyboard()
    .text('💰 Monto', 'expense_edit_amount')
    .text('📝 Descripción', 'expense_edit_description')
    .row()
    .text('📂 Categoría', 'expense_edit_category')
    .text('📅 Fecha', 'expense_edit_date')
    .row()
    .text('🏪 Lugar', 'expense_edit_vendor')
    .text('🧾 Factura', 'expense_edit_invoice')
    .row()
    .text('◀️ Volver', 'expense_confirm');
}

/**
 * Menú de categorías para gastos
 */
export function createCategoriesMenu(categories: any[]) {
  const keyboard = new InlineKeyboard();
  
  // Agregar categorías en filas de 2
  for (let i = 0; i < categories.length; i += 2) {
    const category1 = categories[i];
    const category2 = categories[i + 1];
    
    if (category2) {
      keyboard.text(
        `${category1.icon || '📂'} ${category1.name}`,
        `category_select_${category1.id}`
      ).text(
        `${category2.icon || '📂'} ${category2.name}`,
        `category_select_${category2.id}`
      ).row();
    } else {
      keyboard.text(
        `${category1.icon || '📂'} ${category1.name}`,
        `category_select_${category1.id}`
      ).row();
    }
  }
  
  keyboard
    .text('➕ Nueva Categoría', 'category_new')
    .text('❌ Sin Categoría', 'category_none')
    .row()
    .text('◀️ Volver', 'expense_edit');
    
  return keyboard;
}

/**
 * Mensaje de resumen del gasto
 */
export function getExpenseSummaryMessage(expense: any) {
  return `💰 **Resumen del Gasto**\n\n` +
    `💵 **Monto:** $${expense.amount} MXN\n` +
    `📝 **Descripción:** ${expense.description}\n` +
    `📂 **Categoría:** ${expense.category || 'Sin categoría'}\n` +
    `📅 **Fecha:** ${expense.date}\n` +
    `🏪 **Lugar:** ${expense.vendor || 'No especificado'}\n` +
    `🧾 **Factura:** ${expense.invoice || 'No especificado'}\n\n` +
    `¿Todo está correcto?`;
}

/**
 * Mensaje para selección de tipo de gasto
 */
export function getExpenseTypeMessage() {
  return `💰 **Registrar Nuevo Gasto**\n\n` +
    `¿Dónde deseas registrar el gasto?\n\n` +
    `🏢 **Empresa:** Gasto empresarial visible para administradores\n` +
    `👤 **Personal:** Gasto privado solo visible para ti`;
}

/**
 * Mensaje para selección de empresa
 */
export function getCompanySelectMessage(companies: Array<{id: string, name: string}>) {
  return `🏢 **Seleccionar Empresa**\n\n` +
    `¿En qué empresa registrarás el gasto?\n` +
    `📊 **Empresas disponibles:** ${companies.length}`;
}

/**
 * Mensaje de éxito al registrar gasto
 */
export function getExpenseSuccessMessage(folio: string, amount: number, isPersonal: boolean = false) {
  const typeIcon = isPersonal ? '👤' : '🏢';
  const typeText = isPersonal ? 'Personal' : 'Empresarial';
  
  return `✅ **¡Gasto ${typeText} Registrado!**\n\n` +
    `${typeIcon} **Tipo:** ${typeText}\n` +
    `📌 **Folio:** ${folio}\n` +
    `💰 **Monto:** $${amount} MXN\n\n` +
    `${isPersonal ? 'Gasto registrado en tu cuenta personal.' : 'El administrador ha sido notificado.'}`;
}