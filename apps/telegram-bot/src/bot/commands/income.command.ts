import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { movementRepository } from '@financial-bot/database';
import { logger } from '../../utils/logger';
import { formatCurrency, validateData, incomeCommandSchema } from '@financial-bot/shared';

/**
 * Comando /ingreso - Registra un nuevo ingreso (solo admins)
 * Formatos aceptados:
 * - /ingreso 5000 Venta de producto
 * - /ingreso 2500.50 Consultoría
 */
export async function incomeCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;

  if (!user) {
    await ctx.reply('❌ No estás registrado.');
    return;
  }

  // Verificar que sea administrador
  if (user.role !== 'ADMIN') {
    await ctx.reply('❌ Solo los administradores pueden registrar ingresos.');
    return;
  }

  try {
    const args = ctx.match?.toString().trim();

    if (!args) {
      await ctx.reply(
        '📝 <b>Uso del comando /ingreso:</b>\n\n' +
          '<code>/ingreso [monto] [descripción]</code>\n\n' +
          '<b>Ejemplos:</b>\n' +
          '• <code>/ingreso 5000 Venta de producto A</code>\n' +
          '• <code>/ingreso 2500.50 Consultoría mes enero</code>\n' +
          '• <code>/ingreso 15000 Pago de cliente ABC</code>\n\n' +
          '💡 El monto debe ser en pesos mexicanos (MXN)',
        { parse_mode: 'HTML' },
      );
      return;
    }

    // Parsear argumentos
    const parts = args.split(' ');
    const amountStr = parts[0];
    const description = parts.slice(1).join(' ');

    if (!description) {
      await ctx.reply(
        '❌ Debes incluir una descripción para el ingreso.\n\n' +
          'Ejemplo: <code>/ingreso 5000 Venta de producto</code>',
        { parse_mode: 'HTML' },
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
    const validData = validateData(incomeCommandSchema, {
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
      type: 'INCOME',
      amount: validData.amount,
      currency: 'MXN',
      date: new Date(),
      description: validData.description,
    });

    // Mensaje de confirmación
    const confirmationMessage =
      '✅ <b>Ingreso registrado exitosamente</b>\n\n' +
      `📌 <b>Folio:</b> <code>${movement.folio}</code>\n` +
      `💰 <b>Monto:</b> ${formatCurrency(Number(movement.amount))} MXN\n` +
      `📝 <b>Descripción:</b> ${movement.description}\n` +
      `📅 <b>Fecha:</b> ${new Date().toLocaleDateString('es-MX')}\n` +
      `👤 <b>Registrado por:</b> ${user.firstName}`;

    await ctx.reply(confirmationMessage, { parse_mode: 'HTML' });

    // Log de la actividad
    logger.info('Income created', {
      userId: user.id,
      movementId: movement.id,
      folio: movement.folio,
      amount: Number(movement.amount),
      description: movement.description,
    });
  } catch (error) {
    logger.error('Error in income command:', error);

    if (error instanceof Error && error.message.includes('Datos inválidos')) {
      await ctx.reply(`❌ ${error.message}`);
    } else {
      await ctx.reply('❌ Error al registrar el ingreso. Intenta nuevamente.');
    }
  }
}
