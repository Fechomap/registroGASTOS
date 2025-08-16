import { CommandContext } from 'grammy';
import { MyContext } from '../../types';
import { isAdmin } from '../../middleware/auth';

/**
 * Comando /ayuda - Muestra la lista de comandos disponibles
 */
export async function helpCommand(ctx: CommandContext<MyContext>) {
  const user = ctx.session.user;
  
  if (!user) {
    await ctx.reply(
      '❌ Necesitas estar registrado para ver los comandos.\n' +
      'Usa /start para comenzar.'
    );
    return;
  }

  const isUserAdmin = isAdmin(ctx);

  let helpMessage = 
    '📚 <b>Comandos disponibles:</b>\n\n' +
    
    '🔧 <b>Comandos básicos:</b>\n' +
    '/start - Iniciar bot\n' +
    '/ayuda - Ver esta ayuda\n' +
    '/perfil - Ver información personal\n' +
    '/movimientos - Ver tus movimientos\n\n' +
    
    '💰 <b>Registro de movimientos:</b>\n' +
    '/gasto [monto] [descripción] - Registrar gasto\n' +
    '   Ejemplo: /gasto 150.50 Comida en restaurante\n';

  if (isUserAdmin) {
    helpMessage += 
      '/ingreso [monto] [descripción] - Registrar ingreso\n' +
      '   Ejemplo: /ingreso 5000 Venta de producto\n';
  }

  helpMessage +=
    '\n📷 <b>Próximamente:</b>\n' +
    '• Enviar foto de ticket para procesamiento automático\n' +
    '• Registro por comando de voz\n';

  if (isUserAdmin) {
    helpMessage += 
      '\n👨‍💼 <b>Comandos de administrador:</b>\n' +
      '/empresa - Información de la empresa\n' +
      '/usuario_agregar [chatId] [nombre] - Agregar usuario\n' +
      '/usuario_lista - Ver todos los usuarios\n' +
      '/usuario_rol [chatId] [admin|operator] - Cambiar rol\n' +
      '/usuario_eliminar [chatId] - Eliminar usuario\n' +
      '/editar [folio] - Editar movimiento\n' +
      '/eliminar [folio] - Eliminar movimiento\n' +
      '/reporte - Generar reportes\n\n' +
      
      '📊 <b>Reportes disponibles:</b>\n' +
      '• Movimientos por período\n' +
      '• Resúmenes por usuario\n' +
      '• Exportación a Excel y PDF\n';
  }

  helpMessage += 
    '\n💡 <b>Consejos:</b>\n' +
    '• Todos los montos deben estar en pesos mexicanos (MXN)\n' +
    '• Los folios se generan automáticamente\n' +
    '• Los administradores reciben notificaciones de nuevos gastos\n';

  if (isUserAdmin) {
    helpMessage += 
      '• Solo los administradores pueden editar y eliminar movimientos\n' +
      '• Los operadores solo pueden ver sus propios movimientos\n';
  }

  helpMessage += 
    '\n❓ ¿Necesitas ayuda? Contacta a tu administrador.';

  await ctx.reply(helpMessage, { 
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}