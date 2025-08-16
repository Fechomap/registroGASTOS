# 🚀 DEPLOYMENT GUIDE - Financial Bot

**Última actualización**: 16 de Enero 2025  
**Estado**: Configuración optimizada para Railway

---

## 📋 INFORMACIÓN DE PRODUCCIÓN

```env
# Bot de Producción
TELEGRAM_BOT_TOKEN=${{ TELEGRAM_BOT_TOKEN }}

# Base de Datos (Railway PostgreSQL)  
DATABASE_URL=${{ Postgres.DATABASE_URL }}

# Proyecto Railway
Proyecto: GASTOS-SAAS
Servicio: registroGASTOS
URL: https://registrogastos.railway.app
```

---

## ⚡ DEPLOYMENT RÁPIDO

### 1. Pre-requisitos
```bash
# 1. Railway CLI instalado
npm install -g @railway/cli

# 2. Login a Railway
railway login

# 3. Verificar proyecto
railway list
```

### 2. Deploy Directo
```bash
# 1. Clonar/actualizar repo
git pull origin main

# 2. Link proyecto (si no está linkeado)
railway link
# Seleccionar: fechomap's Projects → GASTOS-SAAS → production → registroGASTOS

# 3. Deploy
railway up
```

### 3. Verificación
```bash
# Logs en tiempo real
railway logs --follow

# Variables configuradas
railway variables

# Status del servicio
railway status
```

---

## 🔧 CONFIGURACIÓN COMPLETA

### Variables de Entorno Requeridas

```env
# ✅ Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# ✅ Database (Railway PostgreSQL)
DATABASE_URL=${{ Postgres.DATABASE_URL }}

# ✅ Environment
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# ✅ Railway (auto-configuradas)
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_NAME=GASTOS-SAAS  
RAILWAY_SERVICE_NAME=registroGASTOS
```

### Archivos de Configuración

#### `railway.toml`
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node dist/apps/telegram-bot/src/index.js"
restartPolicyType = "always"

[env]
NODE_ENV = "production"
PORT = "3000"
LOG_LEVEL = "info"
```

#### `Dockerfile` (optimizado)
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files (layer cache optimization)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/telegram-bot/package.json ./apps/telegram-bot/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/core/package.json ./packages/core/
COPY packages/storage/package.json ./packages/storage/
COPY packages/ai-processor/package.json ./packages/ai-processor/
COPY packages/reports/package.json ./packages/reports/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma types and build
RUN npx prisma generate
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/apps/telegram-bot/src/index.js"]
```

#### `.dockerignore`
```
node_modules
dist
.env*
.git
*.md
docs/
.turbo
coverage
*.log
```

---

## 🔍 TROUBLESHOOTING

### Error: "Command 'prisma' not found"
**Solución**: Usar `npx prisma generate`
```dockerfile
# ❌ Incorrecto
RUN pnpm exec prisma generate

# ✅ Correcto  
RUN npx prisma generate
```

### Error: "TELEGRAM_BOT_TOKEN is required"
**Solución**: Verificar variables en Railway
```bash
railway variables
# Debería mostrar TELEGRAM_BOT_TOKEN configurado
```

### Error: Database connection failed
**Solución**: Verificar DATABASE_URL
```bash
# Verificar conexión
railway run -- npx prisma db pull
```

### Build muy lento (>10 minutos)
**Causas comunes**:
- ✅ Primer build: Normal, instala todas las dependencies
- ⚠️ Cambios en package.json: Reinstala dependencies  
- ⚠️ Cambios en Dockerfile: Rebuild completo

**Optimizaciones**:
- Layer caching en Dockerfile
- `.dockerignore` para excluir archivos innecesarios
- `pnpm prune --prod` para reducir tamaño final

### Build exitoso pero bot no responde
**Verificaciones**:
```bash
# 1. Ver logs de startup
railway logs --tail

# 2. Verificar webhook/polling
# Bot debería mostrar: "✅ Bot iniciado: @tu_bot"

# 3. Test básico
# Enviar /start al bot en Telegram
```

---

## 📊 MONITOREO

### Logs Importantes
```bash
# Logs en tiempo real
railway logs --follow

# Filtrar errores
railway logs --tail | grep ERROR

# Logs específicos por tiempo
railway logs --since 1h
```

### Métricas Clave
- **Uptime**: >99% esperado
- **Response time**: <2 segundos
- **Memory usage**: <512MB típico
- **Error rate**: <1% aceptable

### Health Checks
```bash
# Status del servicio
railway status

# Conexión base de datos
railway run -- npx prisma db pull

# Test del bot (manual)
# /start en Telegram
```

---

## 🔄 PROCESO DE ACTUALIZACIONES

### Actualizaciones de Código
```bash
# 1. Desarrollo local
git add .
git commit -m "Update: descripción"
git push origin main

# 2. Deploy automático (si configurado)
# Railway detecta push y redeploya automáticamente

# 3. Deploy manual
railway up
```

### Actualizaciones de Dependencies
```bash
# 1. Actualizar packages
pnpm update

# 2. Verificar build local
pnpm run build

# 3. Commit y deploy
git add pnpm-lock.yaml package.json
git commit -m "Update dependencies"
git push origin main
```

### Rollback en caso de problemas
```bash
# 1. Ver deployments recientes
railway deployments

# 2. Rollback al anterior
railway rollback [deployment-id]

# 3. O redeploy versión específica
git checkout [commit-hash]
railway up
git checkout main
```

---

## 🛡️ SEGURIDAD

### Variables Sensibles
- ✅ **TELEGRAM_BOT_TOKEN**: Configurado en Railway (no en código)
- ✅ **DATABASE_URL**: Generado por Railway automáticamente
- ✅ **Secrets**: Nunca en repositorio, solo en Railway dashboard

### Acceso de Producción
- ✅ **Railway**: Solo owner tiene acceso
- ✅ **GitHub**: Repositorio privado recomendado
- ✅ **Telegram Bot**: Token específico de producción

### Backups
```bash
# Backup manual de base de datos
railway run -- pg_dump $DATABASE_URL > backup.sql

# Restauración (si necesario)
railway run -- psql $DATABASE_URL < backup.sql
```

---

## 🎯 OPTIMIZACIONES FUTURAS

### Para Builds Más Rápidos
1. **Multi-stage Docker builds**
2. **GitHub Actions** para CI/CD
3. **Railway build cache** optimization
4. **Dependencies splitting** (dev vs prod)

### Para Mejor Monitoring
1. **Health check endpoint** (`GET /health`)
2. **Structured logging** con timestamps
3. **Error tracking** con Sentry
4. **Metrics collection** con OpenTelemetry

### Para Escalabilidad
1. **Redis** para sessions distribuidas
2. **Load balancing** si múltiples instancias
3. **Database pooling** optimization
4. **Rate limiting** para anti-spam

---

## 📞 SOPORTE RÁPIDO

### Comandos de Emergencia
```bash
# Ver estado general
railway status

# Logs de los últimos errores
railway logs --tail | grep -i error

# Reiniciar servicio
railway redeploy

# Variables configuradas
railway variables
```

### Contactos
- **Railway Dashboard**: https://railway.app
- **Proyecto**: GASTOS-SAAS  
- **Documentación**: /docs en este repositorio

---

## ✅ CHECKLIST DE DEPLOYMENT

### Pre-deployment
- [ ] Código testeado localmente
- [ ] Build exitoso: `pnpm run build`
- [ ] Variables verificadas
- [ ] Changelog actualizado

### Durante deployment
- [ ] `railway up` ejecutado
- [ ] Build logs monitoreados
- [ ] Deploy exitoso confirmado

### Post-deployment  
- [ ] Bot responde a `/start`
- [ ] Logs sin errores críticos
- [ ] Database accesible
- [ ] Funcionalidad básica verificada

---

**Estado Actual**: ✅ Configuración optimizada y lista para producción  
**Próximo deploy**: Ready to go con `railway up`

---

*Guía de deployment para Financial Bot Multi-Tenant v3.0*