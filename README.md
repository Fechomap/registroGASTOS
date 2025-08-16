# 💰 Sistema Financial Bot

Sistema de gestión financiera empresarial operado completamente a través de Telegram, diseñado para permitir que múltiples usuarios de una empresa registren gastos de manera autónoma, con control administrativo centralizado y capacidades de procesamiento inteligente mediante IA.

## 🚀 Estado Actual

✅ **FASE 1A COMPLETADA** - Fundación del proyecto y bot básico funcional

### Funcionalidades Implementadas

- 🏗️ **Monorepo** configurado con Turborepo
- 💾 **Base de datos** PostgreSQL con Prisma
- 🤖 **Bot de Telegram** con comandos básicos
- 👥 **Sistema de roles** (Admin/Operador)
- 💸 **Registro de gastos** rápido
- 💰 **Registro de ingresos** (solo admin)
- 📋 **Lista de movimientos** con paginación
- 🏢 **Información de empresa**

### Comandos Disponibles

#### Para todos los usuarios:
- `/start` - Iniciar bot
- `/ayuda` - Ver comandos disponibles
- `/perfil` - Ver información personal
- `/gasto [monto] [descripción]` - Registrar gasto
- `/movimientos` - Ver movimientos

#### Solo administradores:
- `/ingreso [monto] [descripción]` - Registrar ingreso
- `/empresa` - Ver información de empresa
- 🚧 Comandos adicionales en desarrollo

## 🛠️ Tecnologías

- **Runtime:** Node.js 20 LTS + TypeScript
- **Bot:** grammY framework
- **Base de datos:** PostgreSQL + Prisma ORM
- **Monorepo:** Turborepo + pnpm
- **Deploy:** Railway (planificado)

## 📋 Próximos Pasos

Ver [ROADMAP-ACTUAL.md](./ROADMAP-ACTUAL.md) para el plan detallado de desarrollo.

### Fase 1B (Próxima):
- [ ] Gestión completa de usuarios
- [ ] Edición/eliminación de movimientos
- [ ] Sistema de categorías
- [ ] Flujos conversacionales

### Fase 2:
- [ ] Procesamiento con IA (GPT-4 Vision)
- [ ] Storage con Cloudflare R2
- [ ] Registro por fotos de tickets

### Fase 3:
- [ ] Sistema de reportes PDF/Excel
- [ ] Notificaciones avanzadas

## 🚀 Desarrollo

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones de base de datos
pnpm db:migrate

# Ejecutar seed de datos
pnpm db:seed

# Iniciar desarrollo
pnpm dev
```

## 📄 Documentación

- [Plan Maestro del Proyecto](./PLAN-MAESTRO-PROYECTO.md)
- [Roadmap Actual](./ROADMAP-ACTUAL.md)

## 📞 Contacto

Desarrollado para gestión financiera empresarial eficiente.

---

🎯 **Objetivo:** Simplificar el registro y seguimiento de gastos empresariales mediante Telegram con IA integrada.