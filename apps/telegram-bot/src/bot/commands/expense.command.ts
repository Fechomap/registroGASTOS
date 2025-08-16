import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { logger } from '../../utils/logger';
import { formatCurrency, validateData, expenseCommandSchema } from '@financial-bot/shared';

/**
 * Comando /gasto - Registra un nuevo gasto
 * Formatos aceptados:
 * - /gasto 150.50 Comida en restaurante
 * - /gasto 1500 Gasolina
 */
export async function expenseCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;
  
  if (!user) {
    await ctx.reply('❌ No estás registrado.');
    return;
  }

  try {
    const args = ctx.match?.toString().trim();
    
    if (!args) {
      await ctx.reply(
        '📝 <b>Uso del comando /gasto:</b>\n\n' +
        '<code>/gasto [monto] [descripción]</code>\n\n' +
        '<b>Ejemplos:</b>\n' +
        '• <code>/gasto 150.50 Comida en restaurante</code>\n' +
        '• <code>/gasto 500 Gasolina</code>\n' +
        '• <code>/gasto 85.75 Papelería para oficina</code>\n\n' +
        '💡 El monto debe ser en pesos mexicanos (MXN)',
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Parsear argumentos: primer número es el monto, el resto es la descripción
    const parts = args.split(' ');
    const amountStr = parts[0];
    const description = parts.slice(1).join(' ');

    if (!description) {
      await ctx.reply(
        '❌ Debes incluir una descripción para el gasto.\n\n' +
        'Ejemplo: <code>/gasto 150.50 Comida en restaurante</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Validar monto
    const amount = parseFloat(amountStr.replace(',', '.'));
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ El monto debe ser un número positivo válido.');
      return;
    }

    // Validar datos con Zod
    const validData = validateData(expenseCommandSchema, {
      amount,
      description,
    });

    // Generar folio único
    const folio = await movementRepository.generateFolio(user.companyId);

    // Crear el movimiento
    const movement = await movementRepository.create({
      company: { connect: { id: user.companyId } },
      user: { connect: { id: user.id } },
      folio,
      type: 'EXPENSE',
      amount: validData.amount,
      currency: 'MXN',
      date: new Date(),
      description: validData.description,
    });

    // Mensaje de confirmación
    const confirmationMessage = 
      '✅ <b>Gasto registrado exitosamente</b>\n\n' +
      `📌 <b>Folio:</b> <code>${movement.folio}</code>\n` +
      `💸 <b>Monto:</b> ${formatCurrency(Number(movement.amount))} MXN\n` +
      `📝 <b>Descripción:</b> ${movement.description}\n` +
      `📅 <b>Fecha:</b> ${new Date().toLocaleDateString('es-MX')}\n` +
      `👤 <b>Registrado por:</b> ${user.firstName}`;

    await ctx.reply(confirmationMessage, { parse_mode: 'HTML' });

    // Log de la actividad
    logger.info('Expense created', {
      userId: user.id,
      movementId: movement.id,
      folio: movement.folio,
      amount: Number(movement.amount),
      description: movement.description,
    });

    // TODO: Enviar notificación a administradores
    // await notificationService.notifyExpense(movement);

  } catch (error) {
    logger.error('Error in expense command:', error);
    
    if (error instanceof Error && error.message.includes('Datos inválidos')) {
      await ctx.reply(`❌ ${error.message}`);
    } else {
      await ctx.reply('❌ Error al registrar el gasto. Intenta nuevamente.');
    }
  }
}