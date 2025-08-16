# 🚀 Guía de Configuración - Sistema Financial Bot

## 📋 Requisitos Previos

- **Node.js** 20 LTS
- **pnpm** 8+  
- **PostgreSQL** 15+ (local o Railway)
- **Git**

## 🔧 Variables de Entorno Necesarias

### 1. **Bot de Telegram** (OBLIGATORIO)

```bash
# 🤖 Obtener token del bot
# 1. Envía mensaje a @BotFather en Telegram
# 2. Usa comando /newbot
# 3. Sigue las instrucciones
# 4. Copia el token que te dé

TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 2. **Base de Datos** (OBLIGATORIO)

#### Opción A: PostgreSQL Local
```bash
# Instalar PostgreSQL localmente
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

DATABASE_URL=postgresql://usuario:password@localhost:5432/financial_bot
```

#### Opción B: Railway (Recomendado)
```bash
# 1. Ve a railway.app
# 2. Conecta tu GitHub
# 3. Crea nuevo proyecto
# 4. Agrega PostgreSQL
# 5. Copia la DATABASE_URL

DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### 3. **Variables de Desarrollo**

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

### 4. **Variables Opcionales** (Para después)

```bash
# Redis (para sesiones distribuidas)
REDIS_URL=redis://localhost:6379

# Seguridad
JWT_SECRET=tu-secreto-super-seguro-aqui
ENCRYPTION_KEY=clave-de-exactamente-32-chars!!

# Webhook (solo producción)
WEBHOOK_URL=https://tu-dominio.com/webhook
TELEGRAM_WEBHOOK_SECRET=secreto-webhook

# IA (Fase 2)
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Storage (Fase 2)
R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_BUCKET_NAME=financial-bot-storage
R2_ACCOUNT_ID=tu-account-id
```

## 🚀 Pasos de Configuración

### Paso 1: Clonar e Instalar
```bash
git clone https://github.com/Fechomap/registroGASTOS.git
cd registroGASTOS
pnpm install
```

### Paso 2: Configurar Variables
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus valores
nano .env  # o tu editor favorito
```

### Paso 3: Configurar Base de Datos
```bash
# Generar cliente Prisma
pnpm run --filter=@financial-bot/database db:generate

# Ejecutar migraciones
pnpm run --filter=@financial-bot/database db:migrate:dev

# Cargar datos de ejemplo
pnpm run --filter=@financial-bot/database db:seed
```

### Paso 4: Primera Compilación
```bash
# Verificar que todo compile
pnpm run build

# Verificar linting
pnpm run lint

# Verificar tipos
pnpm run typecheck
```

### Paso 5: Ejecutar en Desarrollo
```bash
# Iniciar bot en modo desarrollo
pnpm run dev
```

## 🧪 Verificación de Configuración

### ✅ **Checklist de Verificación:**

- [ ] **Node.js 20** instalado (`node --version`)
- [ ] **pnpm 8+** instalado (`pnpm --version`)
- [ ] **Token del bot** obtenido de @BotFather
- [ ] **Base de datos** configurada (local o Railway)
- [ ] **Variables de entorno** en archivo `.env`
- [ ] **Dependencias** instaladas (`pnpm install`)
- [ ] **Prisma** generado (`pnpm run db:generate`)
- [ ] **Migraciones** ejecutadas (`pnpm run db:migrate:dev`)
- [ ] **Compilación** exitosa (`pnpm run build`)
- [ ] **Tests** pasando (`pnpm run test`)

### 🔍 **Comandos de Diagnóstico:**

```bash
# Verificar configuración de Prisma
pnpm run --filter=@financial-bot/database db:studio

# Ver logs del bot
pnpm run --filter=@financial-bot/telegram-bot dev

# Verificar conexión a DB
pnpm run --filter=@financial-bot/database db:push
```

## 🐛 Solución de Problemas

### Error: "Cannot find module '@financial-bot/...'"
```bash
# Regenerar enlaces de workspace
pnpm install
pnpm run build
```

### Error: "Prisma Client not found"
```bash
pnpm run --filter=@financial-bot/database db:generate
```

### Error: "Database connection failed"
```bash
# Verificar DATABASE_URL en .env
# Verificar que la DB esté corriendo
# Para Railway: verificar que la URL sea correcta
```

### Error: "Bot token is invalid"
```bash
# Verificar TELEGRAM_BOT_TOKEN en .env
# Generar nuevo token con @BotFather si es necesario
```

## 📞 **¿Listo para Continuar?**

Una vez que tengas:
1. ✅ **Variables configuradas**
2. ✅ **Primera compilación exitosa**  
3. ✅ **Bot respondiendo en Telegram**

Podemos proceder con **Fase 1B** - implementación de comandos administrativos.

---

**💡 Nota:** Este archivo se actualiza conforme avance el proyecto.