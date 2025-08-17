# 🤖 Financial Bot Multi-Tenant

Sistema de gestión financiera empresarial **multi-tenant SaaS** operado completamente a través de Telegram con menús interactivos y sistema de aprobación de empresas.

## 🎯 Características Principales

- **🏢 Multi-Tenant**: Múltiples empresas independientes en una instalación
- **🤖 Telegram Native**: Interfaz 100% en Telegram con menús interactivos
- **👑 Sistema de Roles**: Super Admin → Company Admin → Operators
- **💰 Gestión Financiera**: Registro, edición y reportes de gastos/ingresos
- **🔐 Seguridad**: Aislamiento total entre empresas y roles
- **⚡ UX Moderna**: Navegación con botones, sin comandos complejos

## 🚀 Inicio Rápido

### Para Usuarios (Telegram)

1. **Buscar el bot**: [@tu_financial_bot](https://t.me/tu_bot)
2. **Registrar empresa**: `/register_company "Mi Empresa" admin@empresa.com`
3. **Esperar aprobación**: Super admin aprueba tu empresa
4. **Usar el sistema**: `/menu` para acceso completo con botones

### Para Desarrolladores

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/financial-bot.git
cd financial-bot

# 2. Instalar dependencies
pnpm install

# 3. Setup base de datos
cp .env.example .env
# Configurar DATABASE_URL y TELEGRAM_BOT_TOKEN

# 4. Migrations y seed
pnpm run db:migrate
pnpm run db:seed

# 5. Iniciar desarrollo
pnpm run dev
```

## 📚 Documentación

| Documento                                   | Descripción                        |
| ------------------------------------------- | ---------------------------------- |
| **[📋 COMANDOS](docs/COMANDOS.md)**         | Lista completa de comandos por rol |
| **[🏗️ ARQUITECTURA](docs/ARQUITECTURA.md)** | Arquitectura técnica y decisiones  |
| **[🚀 DEPLOYMENT](docs/DEPLOYMENT.md)**     | Guía de deployment en Railway      |
| **[📋 PENDIENTES](docs/PENDIENTES.md)**     | Tareas críticas pendientes         |

## 🛠️ Stack Tecnológico

```yaml
Runtime: Node.js 20 + TypeScript 5
Bot: grammY con menús interactivos
Database: PostgreSQL + Prisma ORM
Architecture: Turborepo monorepo
Deployment: Railway con Docker
```

## 👥 Roles y Permisos

### 🔴 Super Admin (Sistema Global)

- ✅ Aprobar/rechazar empresas
- ✅ Gestionar super administradores
- ❌ No ve datos específicos de empresas

### 🟢 Company Admin (Por Empresa)

- ✅ CRUD completo de movimientos (todos los usuarios)
- ✅ Gestión de usuarios de su empresa
- ✅ Gestión de categorías
- ✅ Reportes de su empresa
- ❌ No ve datos de otras empresas

### 🟡 Operator (Por Empresa)

- ✅ Registrar sus propios gastos
- ✅ Ver sus propios movimientos
- ✅ Ver su perfil
- ❌ No puede editar/eliminar
- ❌ No ve datos de otros usuarios

## 🎮 Flujo de Usuario

### 1. Primer Uso (Super Admin)

```
/setup_super_admin → Convertirse en super admin del sistema
```

### 2. Registro de Empresa

```
/register_company "Mi Empresa SA" admin@empresa.com
→ Estado: PENDING → Super admin aprueba → Estado: APPROVED
```

### 3. Uso Diario (Sin comandos complejos!)

```
/menu → [Botones interactivos]
↓
[💰 Registrar Gasto] → [📋 Paso a Paso]
↓
Bot: "¿Cuánto gastaste?" → Usuario: "150"
Bot: "¿En qué?" → Usuario: "Comida"
Bot: [🍽️ Alimentación] → Usuario: [Clic]
Bot: [✅ Confirmar] → ✅ Gasto F-0001 registrado
```

## 📊 Estado del Proyecto

### ✅ Completado (85% del MVP)

- Multi-tenant architecture
- Sistema de roles y permisos
- Menús interactivos con botones
- CRUD completo de movimientos
- Gestión de usuarios y categorías
- Deployment automatizado

### 🚧 En Progreso

- Callbacks de menús pendientes
- Notificaciones instantáneas
- Testing completo del sistema

### ⏳ Roadmap Futuro

- **Fase 2**: Procesamiento IA de imágenes (OCR)
- **Fase 3**: Reportes PDF/Excel avanzados
- **Fase 4**: Registro por voz y features enterprise

## 🔧 Comandos de Desarrollo

```bash
# Desarrollo
pnpm run dev              # Iniciar bot en desarrollo
pnpm run dev:bot          # Solo el bot
pnpm run build            # Build completo

# Base de datos
pnpm run db:migrate       # Aplicar migrations
pnpm run db:seed          # Seed inicial
pnpm run db:studio        # Prisma Studio

# Calidad de código
pnpm run lint             # ESLint
pnpm run typecheck        # TypeScript check
pnpm run format           # Prettier
```

## 🚀 Deployment

### Railway (Recomendado)

```bash
# Login y setup
railway login
railway link

# Deploy
railway up
```

Ver [guía completa de deployment](docs/DEPLOYMENT.md) para configuración detallada.

## 🏗️ Estructura del Proyecto

```
financial-bot/
├── apps/
│   └── telegram-bot/     # 🤖 Bot principal
├── packages/
│   ├── core/            # 📦 Business logic
│   ├── database/        # 💾 Prisma + repositories
│   ├── shared/          # 🔧 Utilities
│   ├── ai-processor/    # 🧠 IA (Fase 2)
│   ├── storage/         # 📁 Storage (Fase 2)
│   └── reports/         # 📊 Reports (Fase 3)
├── docs/                # 📚 Documentación
└── scripts/             # 🔧 Deployment scripts
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crear feature branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Add: nueva funcionalidad'`
4. Push branch: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 📞 Soporte

- **Documentación**: Ver `/docs` para guías detalladas
- **Issues**: Crear issue en GitHub para bugs/features
- **Telegram**: [@tu_soporte_bot](https://t.me/tu_soporte_bot)

---

**Estado**: ✅ MVP Multi-Tenant listo para producción  
**Versión**: 3.0.0  
**Última actualización**: 16 de Enero 2025
