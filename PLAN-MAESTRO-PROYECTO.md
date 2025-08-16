# 📋 DOCUMENTACIÓN MAESTRA DEFINITIVA - SISTEMA FINANCIAL BOT

## 📑 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelos de Base de Datos](#modelos-de-base-de-datos)
4. [Sistema de Permisos y Roles](#sistema-de-permisos-y-roles)
5. [Funcionalidades del Bot](#funcionalidades-del-bot)
6. [Sistema de Reportes](#sistema-de-reportes)
7. [Roadmap de Desarrollo](#roadmap-de-desarrollo)
8. [Configuración del Proyecto](#configuración-del-proyecto)
9. [CI/CD y DevOps](#cicd-y-devops)
10. [Guías de Implementación](#guías-de-implementación)

---

# 🎯 RESUMEN EJECUTIVO

## Visión del Proyecto

Sistema de gestión financiera empresarial operado completamente a través de Telegram, diseñado para permitir que múltiples usuarios de una empresa registren gastos de manera autónoma, con control administrativo centralizado y capacidades de procesamiento inteligente mediante IA.

## Características Principales

- **Multi-usuario por empresa**: Administrador + múltiples operadores
- **Gestión 100% desde Telegram**: Sin necesidad de interfaces web para operación diaria
- **Procesamiento con IA**: Extracción automática desde fotos de tickets/facturas
- **Control administrativo total**: CRUD completo para administradores
- **Reportería avanzada**: Exportación a PDF y Excel con filtros combinables
- **Notificaciones inteligentes**: En tiempo real + resúmenes diarios
- **Registro por voz** (Post-MVP): Usando Whisper de OpenAI

## Stack Tecnológico Definitivo

```yaml
Core:
  - Runtime: Node.js 20 LTS
  - Language: TypeScript 5.x
  - Package Manager: pnpm 8.x
  - Monorepo: Turborepo
  - Linting: ESLint + Prettier

Bot:
  - Framework: grammY 1.21+
  - Session Storage: Redis
  - Deployment: Railway (Nixpacks)

Database:
  - Primary: PostgreSQL 15 (Railway native)
  - ORM: Prisma 5.x
  - Backups: Railway automated

Storage:
  - Provider: Cloudflare R2 (S3-compatible)
  - Types: Images (tickets/facturas)
  - No storage limits

AI Processing:
  - Vision: OpenAI GPT-4 Vision
  - Voice (Future): Whisper API
  - Fallback: Manual input

DevOps:
  - CI/CD: GitHub Actions
  - Monitoring: Sentry
  - Logging: Winston
```

---

# 🏗️ ARQUITECTURA DEL SISTEMA

## Estructura Monorepo

```
financial-bot/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Linting, testing, build
│   │   ├── deploy.yml          # Deploy to Railway
│   │   └── scheduled.yml       # Daily reports
│   └── CODEOWNERS
├── apps/
│   └── telegram-bot/
│       ├── src/
│       │   ├── bot/
│       │   │   ├── commands/   # Comandos del bot
│       │   │   ├── scenes/     # Flujos conversacionales
│       │   │   ├── handlers/   # Event handlers
│       │   │   └── middleware/ # Auth, logging, etc
│       │   ├── services/       # Lógica de negocio
│       │   ├── utils/
│       │   └── index.ts
│       ├── tests/
│       ├── .env.example
│       └── package.json
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── entities/       # Modelos de dominio
│   │   │   ├── usecases/       # Casos de uso
│   │   │   ├── validators/     # Validaciones Zod
│   │   │   └── constants/
│   │   └── package.json
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── repositories/
│   │   │   └── client.ts
│   │   └── package.json
│   ├── ai-processor/
│   │   ├── src/
│   │   │   ├── vision/         # GPT-4 Vision
│   │   │   ├── voice/          # Whisper (futuro)
│   │   │   └── extractors/
│   │   └── package.json
│   ├── storage/
│   │   ├── src/
│   │   │   ├── cloudflare/     # R2 integration
│   │   │   └── validators/
│   │   └── package.json
│   ├── reports/
│   │   ├── src/
│   │   │   ├── generators/     # PDF y Excel
│   │   │   ├── templates/
│   │   │   └── filters/
│   │   └── package.json
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── errors/
│       └── package.json
├── scripts/
│   ├── setup.sh                # Initial setup
│   ├── seed.ts                 # Seed database
│   └── test-bot.ts            # Test commands
├── docs/
│   ├── API.md
│   ├── COMMANDS.md
│   └── DEPLOYMENT.md
├── .eslintrc.js
├── .prettierrc
├── .nvmrc
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## Flujo de Datos

```mermaid
graph TD
    A[Usuario Telegram] -->|Comando/Foto/Audio| B[Bot Handler]
    B --> C{Tipo Input}
    
    C -->|Comando| D[Command Processor]
    C -->|Foto| E[AI Vision Processor]
    C -->|Audio| F[Whisper Processor]
    
    D --> G[Business Logic]
    E --> G
    F --> G
    
    G --> H[(PostgreSQL)]
    G --> I[Cloudflare R2]
    
    G --> J{Notificaciones}
    J -->|Instantánea| K[Admin Notification]
    J -->|Programada| L[Daily Report]
    
    G --> M[Report Generator]
    M --> N[PDF/Excel Export]
```

---

# 💾 MODELOS DE BASE DE DATOS

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  OPERATOR
}

enum MovementType {
  INCOME
  EXPENSE
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model Company {
  id            String         @id @default(cuid())
  name          String
  email         String
  phone         String
  settings      Json           @default("{}")
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  users         User[]
  categories    Category[]
  movements     Movement[]
  notifications Notification[]
  
  @@index([isActive])
}

model User {
  id            String         @id @default(cuid())
  telegramId    String         @unique
  chatId        String         @unique
  companyId     String
  firstName     String
  lastName      String?
  username      String?
  role          UserRole       @default(OPERATOR)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  company       Company        @relation(fields: [companyId], references: [id])
  movements     Movement[]
  auditLogs     AuditLog[]
  
  @@index([companyId])
  @@index([telegramId])
}

model Category {
  id            String         @id @default(cuid())
  companyId     String
  name          String
  icon          String?
  color         String?
  parentId      String?
  order         Int            @default(0)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  company       Company        @relation(fields: [companyId], references: [id])
  parent        Category?      @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children      Category[]     @relation("CategoryHierarchy")
  movements     Movement[]
  
  @@unique([companyId, name, parentId])
  @@index([companyId])
}

model Movement {
  id            String         @id @default(cuid())
  companyId     String
  userId        String
  folio         String         @unique
  type          MovementType
  amount        Decimal        @db.Decimal(12, 2)
  currency      String         @default("MXN")
  date          DateTime
  categoryId    String?
  description   String
  vendorName    String?
  invoiceNumber String?
  metadata      Json           @default("{}")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  company       Company        @relation(fields: [companyId], references: [id])
  user          User           @relation(fields: [userId], references: [id])
  category      Category?      @relation(fields: [categoryId], references: [id])
  attachments   Attachment[]
  auditLogs     AuditLog[]
  
  @@index([companyId, date])
  @@index([companyId, userId])
  @@index([folio])
}

model Attachment {
  id            String         @id @default(cuid())
  movementId    String
  fileUrl       String
  fileName      String
  fileSize      Int
  mimeType      String
  status        ProcessingStatus @default(PENDING)
  aiData        Json?
  processedAt   DateTime?
  createdAt     DateTime       @default(now())
  
  movement      Movement       @relation(fields: [movementId], references: [id], onDelete: Cascade)
  
  @@index([movementId])
}

model AuditLog {
  id            String         @id @default(cuid())
  companyId     String
  userId        String
  action        String         // CREATE, UPDATE, DELETE
  entityType    String         // Movement, Category, User
  entityId      String
  oldData       Json?
  newData       Json?
  metadata      Json?
  createdAt     DateTime       @default(now())
  
  user          User           @relation(fields: [userId], references: [id])
  
  @@index([companyId, createdAt])
  @@index([entityType, entityId])
}

model Notification {
  id            String         @id @default(cuid())
  companyId     String
  type          String         // INSTANT, DAILY_SUMMARY
  recipientId   String
  content       String
  sentAt        DateTime?
  metadata      Json?
  createdAt     DateTime       @default(now())
  
  company       Company        @relation(fields: [companyId], references: [id])
  
  @@index([companyId, type])
}
```

---

# 🔐 SISTEMA DE PERMISOS Y ROLES

## Definición de Roles

### Administrador (ADMIN)
- **Crear**: Gastos e ingresos propios
- **Leer**: TODOS los movimientos de la empresa
- **Editar**: CUALQUIER movimiento
- **Eliminar**: CUALQUIER movimiento
- **Gestionar**: Usuarios (alta/baja/cambio de rol)
- **Gestionar**: Categorías
- **Reportes**: Acceso completo con trazabilidad
- **Notificaciones**: Recibe todas las notificaciones

### Operador (OPERATOR)
- **Crear**: SOLO gastos propios
- **Leer**: SOLO sus propios movimientos
- **Editar**: NO permitido
- **Eliminar**: NO permitido
- **Gestionar**: NO permitido
- **Reportes**: Solo sus propios movimientos
- **Notificaciones**: Solo confirmaciones propias

## Flujo de Alta de Usuarios

```mermaid
sequenceDiagram
    participant A as Admin
    participant B as Bot
    participant O as Operador
    participant DB as Database

    A->>B: /empresa crear "Mi Empresa"
    B->>DB: Crear empresa
    B->>A: ✅ Empresa creada

    A->>O: Solicita Chat ID
    O->>O: Obtiene Chat ID con @userinfobot
    O->>A: Envía Chat ID: 123456789

    A->>B: /usuario agregar 123456789 "Juan Pérez"
    B->>DB: Registrar usuario como OPERATOR
    B->>A: ✅ Usuario agregado
    B->>O: 🎉 Bienvenido a Mi Empresa
```

---

# 🤖 FUNCIONALIDADES DEL BOT

## Comandos por Rol

### Comandos Generales (Todos)
```
/start              - Iniciar bot
/ayuda              - Ver comandos disponibles
/perfil             - Ver datos personales
/movimientos        - Ver movimientos propios
```

### Comandos de Registro (Operadores y Admin)
```
/gasto [monto] [descripción]    - Registro rápido
/ingreso [monto] [descripción]  - Registro rápido (solo admin)
/foto                           - Capturar ticket con IA
/registrar                      - Flujo paso a paso
```

### Comandos Administrativos (Solo Admin)
```
/empresa info                   - Ver información de empresa
/usuario agregar [chatId] [nombre] - Agregar operador
/usuario lista                  - Ver todos los usuarios
/usuario rol [chatId] [admin|operator] - Cambiar rol
/usuario eliminar [chatId]     - Eliminar usuario
/editar [folio]                - Editar cualquier movimiento
/eliminar [folio]              - Eliminar cualquier movimiento
/reporte                       - Generar reportes
/categorias                    - Gestionar categorías
```

## Flujo de Registro con IA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant B as Bot
    participant CF as Cloudflare R2
    participant AI as OpenAI Vision
    participant DB as Database

    U->>B: /foto o envía imagen
    B->>B: Valida formato (JPG/PNG/PDF)
    B->>CF: Upload temporal
    CF-->>B: URL firmada
    B->>AI: Procesar imagen
    AI-->>B: Datos extraídos
    B->>U: 📋 Resumen editable
    Note over U,B: Monto: $150.00<br/>Lugar: Oxxo<br/>Fecha: Hoy
    U->>B: ✅ Confirmar
    B->>CF: Mover a permanente
    B->>DB: Guardar movimiento
    B->>U: ✅ Gasto #F-0001 registrado
    B->>Admin: 📢 Nuevo gasto de Juan
```

## Sistema CRUD desde Telegram

### Edición (Solo Admin)
```
Admin: /editar F-0001
Bot: 📝 Editando Folio F-0001
     Monto: $150.00
     Descripción: Comida
     Categoría: Alimentación
     
     ¿Qué deseas editar?
     1️⃣ Monto
     2️⃣ Descripción
     3️⃣ Categoría
     4️⃣ Fecha
     ❌ Cancelar

Admin: 1️⃣
Bot: Ingresa el nuevo monto:
Admin: 180.50
Bot: ✅ Monto actualizado
```

---

# 📊 SISTEMA DE REPORTES

## Tipos de Reportes Disponibles

### Filtros Combinables
- **Por período**: Fecha específica o rango
- **Por usuario**: Uno o todos
- **Por categoría**: Una o todas
- **Por tipo**: Gastos, ingresos o ambos

### Ejemplos de Reportes
```
1. Todos los gastos de enero 2025
2. Gastos de Juan Pérez del 15-31 enero
3. Gastos de categoría "Combustible" de toda la empresa
4. Comparativo ingresos vs gastos mensual
5. Top 10 gastos más altos del mes
```

## Formato Excel
- Encabezados con formato y filtros automáticos
- Columnas auto-ajustadas
- Totales y subtotales
- Hoja de resumen + detalle
- Gráficas básicas incluidas

## Formato PDF
- Logo de empresa (si existe)
- Resumen ejecutivo
- Tabla detallada con totales
- Pie de página con fecha de generación
- Formato A4 horizontal para tablas grandes

---

# 📅 ROADMAP DE DESARROLLO

## FASE 1: MVP CORE (4 Semanas)

### Sprint 1-2: Fundación (2 semanas)
- [x] Setup monorepo con Turborepo
- [x] Configurar ESLint + Prettier
- [x] Setup PostgreSQL en Railway
- [x] Modelos Prisma + migraciones
- [x] Bot básico con comandos esenciales
- [x] Sistema de roles (Admin/Operator)
- [x] CRUD básico de movimientos

### Sprint 3-4: Funcionalidades Core (2 semanas)
- [x] Alta de empresas y usuarios
- [x] Registro manual de gastos
- [x] Sistema de permisos completo
- [x] Edición/eliminación para admin
- [x] Listado con paginación
- [x] Notificaciones instantáneas
- [x] Generación de folios únicos

## FASE 2: INTELIGENCIA ARTIFICIAL (3 Semanas)

### Sprint 5-6: Procesamiento IA
- [ ] Integración Cloudflare R2
- [ ] Integración OpenAI Vision
- [ ] Extracción de datos desde imágenes
- [ ] Flujo de confirmación/edición
- [ ] Manejo de errores y reintentos

### Sprint 7: Optimización IA
- [ ] Cache de resultados similares
- [ ] Mejora de prompts
- [ ] Validación de datos extraídos
- [ ] Métricas de precisión

## FASE 3: REPORTES Y EXPORTACIÓN (2 Semanas)

### Sprint 8-9: Sistema de Reportes
- [ ] Motor de filtros combinables
- [ ] Generación de Excel con formato
- [ ] Generación de PDF profesional
- [ ] Almacenamiento temporal de reportes
- [ ] Envío directo por Telegram

## FASE 4: FEATURES AVANZADOS (Post-MVP)

### Registro por Voz (Whisper)
- [ ] Integración Whisper API
- [ ] Procesamiento de comandos de voz
- [ ] Extracción de parámetros
- [ ] Confirmación y guardado

### Dashboard Web
- [ ] Portal de administración
- [ ] Visualización de métricas
- [ ] Gestión avanzada
- [ ] API REST para integraciones

---

# ⚙️ CONFIGURACIÓN DEL PROYECTO

## Setup Inicial

```bash
# Clonar repositorio
git clone https://github.com/tuorg/financial-bot.git
cd financial-bot

# Instalar pnpm
npm install -g pnpm@8

# Instalar dependencias
pnpm install

# Configurar environment
cp .env.example .env.local
```

## Variables de Entorno

```env
# Bot Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
TELEGRAM_WEBHOOK_SECRET=webhook_secret_key

# Database (Railway)
DATABASE_URL=postgresql://user:pass@host:5432/financial_bot

# Redis (Railway)
REDIS_URL=redis://default:pass@host:6379

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=financial-bot-storage
R2_ACCOUNT_ID=your_account_id

# AI Services
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=32-char-key

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# Feature Flags
ENABLE_VOICE_REGISTRATION=false
ENABLE_WEB_DASHBOARD=false
```

## Configuración ESLint

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  env: {
    node: true,
    jest: true,
  },
};
```

## Configuración Prettier

```javascript
// .prettierrc
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

# 🚀 CI/CD Y DEVOPS

## GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Lint
        run: pnpm run lint
        
      - name: Type check
        run: pnpm run typecheck
        
      - name: Format check
        run: pnpm run format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run tests
        run: pnpm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    needs: [quality, test]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Railway
        run: npm install -g @railway/cli
        
      - name: Deploy
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Railway Configuration

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install --frozen-lockfile && pnpm run build"

[deploy]
startCommand = "pnpm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "always"

[[services]]
name = "telegram-bot"
```

## Scripts de Deployment

```json
// package.json scripts
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "start:prod": "node apps/telegram-bot/dist/index.js",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:ci": "turbo run test:ci",
    "db:migrate": "turbo run db:migrate",
    "db:seed": "turbo run db:seed"
  }
}
```

---

# 📝 GUÍAS DE IMPLEMENTACIÓN

## Estructura de Comandos

```typescript
// apps/telegram-bot/src/bot/commands/expense.command.ts
import { CommandContext } from 'grammy';
import { MyContext } from '../types';
import { expenseService } from '@/services/expense.service';

export async function expenseCommand(ctx: CommandContext<MyContext>) {
  const userId = ctx.from!.id.toString();
  const user = await ctx.db.user.findUnique({
    where: { telegramId: userId },
    include: { company: true }
  });

  if (!user) {
    return ctx.reply('❌ No estás registrado. Contacta a tu administrador.');
  }

  // Parse command: /gasto 150.50 Comida en restaurante
  const text = ctx.match;
  const match = text.match(/^(\d+(?:\.\d{2})?)(?:\s+(.+))?$/);

  if (!match) {
    // Iniciar flujo conversacional
    return ctx.scene.enter('expense-wizard');
  }

  const [, amount, description] = match;

  try {
    const movement = await expenseService.create({
      companyId: user.companyId,
      userId: user.id,
      type: 'EXPENSE',
      amount: parseFloat(amount),
      description: description || 'Gasto sin descripción',
      date: new Date(),
    });

    await ctx.reply(
      `✅ Gasto registrado\n` +
      `📌 Folio: ${movement.folio}\n` +
      `💰 Monto: $${amount} MXN\n` +
      `📝 ${description || 'Sin descripción'}`
    );

    // Notificar al admin
    await notificationService.notifyExpense(movement);
  } catch (error) {
    await ctx.reply('❌ Error al registrar el gasto. Intenta nuevamente.');
  }
}
```

## Servicio de Notificaciones

```typescript
// packages/core/src/services/notification.service.ts
export class NotificationService {
  constructor(
    private bot: Bot<MyContext>,
    private db: PrismaClient
  ) {}

  async notifyExpense(movement: Movement) {
    const admins = await this.db.user.findMany({
      where: {
        companyId: movement.companyId,
        role: 'ADMIN',
        isActive: true,
      },
    });

    const user = await this.db.user.findUnique({
      where: { id: movement.userId },
    });

    const message = 
      `📢 Nuevo gasto registrado\n` +
      `👤 Usuario: ${user?.firstName} ${user?.lastName || ''}\n` +
      `💰 Monto: $${movement.amount} MXN\n` +
      `📝 ${movement.description}\n` +
      `📌 Folio: ${movement.folio}`;

    for (const admin of admins) {
      try {
        await this.bot.api.sendMessage(admin.chatId, message);
      } catch (error) {
        console.error(`Failed to notify admin ${admin.id}:`, error);
      }
    }
  }

  async sendDailySummary() {
    const companies = await this.db.company.findMany({
      where: { isActive: true },
    });

    for (const company of companies) {
      const summary = await this.generateDailySummary(company.id);
      const admins = await this.getCompanyAdmins(company.id);

      for (const admin of admins) {
        await this.bot.api.sendMessage(admin.chatId, summary);
      }
    }
  }

  private async generateDailySummary(companyId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const movements = await this.db.movement.findMany({
      where: {
        companyId,
        createdAt: { gte: today },
      },
      include: {
        user: true,
        category: true,
      },
    });

    const totalExpenses = movements
      .filter(m => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalIncomes = movements
      .filter(m => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    let summary = `📊 Resumen diario - ${today.toLocaleDateString('es-MX')}\n\n`;
    summary += `💰 Total gastos: $${totalExpenses.toFixed(2)} MXN\n`;
    summary += `💵 Total ingresos: $${totalIncomes.toFixed(2)} MXN\n`;
    summary += `📈 Balance: $${(totalIncomes - totalExpenses).toFixed(2)} MXN\n\n`;

    if (movements.length > 0) {
      summary += `📋 Detalle de movimientos:\n`;
      movements.forEach(m => {
        summary += `• ${m.user.firstName}: $${m.amount} - ${m.description}\n`;
      });
    }

    return summary;
  }
}
```

## Generador de Reportes

```typescript
// packages/reports/src/generators/excel.generator.ts
import ExcelJS from 'exceljs';

export class ExcelReportGenerator {
  async generateMovementsReport(
    movements: Movement[],
    filters: ReportFilters
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Movimientos');

    // Configurar columnas
    sheet.columns = [
      { header: 'Folio', key: 'folio', width: 15 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Tipo', key: 'type', width: 10 },
      { header: 'Usuario', key: 'user', width: 20 },
      { header: 'Categoría', key: 'category', width: 15 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Monto', key: 'amount', width: 15 },
    ];

    // Estilo de encabezados
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Agregar datos
    movements.forEach(movement => {
      sheet.addRow({
        folio: movement.folio,
        date: movement.date.toLocaleDateString('es-MX'),
        type: movement.type === 'EXPENSE' ? 'Gasto' : 'Ingreso',
        user: `${movement.user.firstName} ${movement.user.lastName || ''}`,
        category: movement.category?.name || 'Sin categoría',
        description: movement.description,
        amount: Number(movement.amount),
      });
    });

    // Formato de moneda
    sheet.getColumn('amount').numFmt = '$#,##0.00';

    // Agregar filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'G1',
    };

    // Agregar totales
    const lastRow = sheet.lastRow!.number + 2;
    sheet.getCell(`F${lastRow}`).value = 'TOTAL:';
    sheet.getCell(`F${lastRow}`).font = { bold: true };
    sheet.getCell(`G${lastRow}`).value = {
      formula: `SUM(G2:G${lastRow - 2})`,
    };

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
```

---

# 🎉 CONCLUSIÓN

Este documento representa la especificación técnica completa y definitiva del Sistema Financial Bot. Todas las decisiones están alineadas con los requerimientos específicos:

✅ **Sin Docker** - Deploy directo en Railway con Nixpacks  
✅ **Multi-usuario** - Sistema de roles Admin/Operator  
✅ **CRUD completo** - Desde Telegram para administradores  
✅ **Notificaciones** - Instantáneas + resumen diario  
✅ **Reportes robustos** - PDF y Excel con filtros  
✅ **Best practices** - ESLint + Prettier desde el inicio  
✅ **IA integrada** - GPT-4 Vision para procesamiento  
✅ **Preparado para escalar** - Arquitectura modular  

## Próximos Pasos

1. **Crear repositorio** en GitHub
2. **Setup inicial** del monorepo
3. **Configurar Railway** y PostgreSQL
4. **Implementar comandos básicos** del bot
5. **Testing con usuarios reales**

---

**Versión**: 2.0.0  
**Fecha**: Enero 2025  
**Estado**: Aprobado para desarrollo