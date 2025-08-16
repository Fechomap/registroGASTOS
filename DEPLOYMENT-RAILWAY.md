# 🚀 DEPLOYMENT EN RAILWAY - Financial Bot

**Token de Producción**: `8493729556:AAEC6h3wE7sS_HOSfd0saAVaZhHlpTn-ZWo`  
**Database URL**: `postgresql://postgres:tjWLCyJIrprazEhIxMKTUyATLeuDyrRU@nozomi.proxy.rlwy.net:13847/railway`

---

## 📋 CHECKLIST PRE-DEPLOYMENT

### ✅ Archivos de Configuración
- [x] `railway.toml` - Configuración de build y deploy
- [x] `nixpacks.toml` - Configuración de Nixpacks
- [x] `Procfile` - Comando de inicio alternativo
- [x] `.env.production` - Variables de entorno de producción

### ✅ Variables de Entorno Requeridas
```env
TELEGRAM_BOT_TOKEN=8493729556:AAEC6h3wE7sS_HOSfd0saAVaZhHlpTn-ZWo
DATABASE_URL=postgresql://postgres:tjWLCyJIrprazEhIxMKTUyATLeuDyrRU@nozomi.proxy.rlwy.net:13847/railway
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

---

## 🛠️ PROCESO DE DEPLOYMENT

### Opción 1: Script Automático
```bash
# Ejecutar script para configurar variables
./scripts/setup-railway.sh

# Hacer deployment
railway up
```

### Opción 2: Manual
```bash
# 1. Instalar Railway CLI (si no está instalado)
npm install -g @railway/cli

# 2. Login a Railway
railway login

# 3. Link al proyecto
railway link

# 4. Configurar variables de entorno
railway variables set TELEGRAM_BOT_TOKEN=8493729556:AAEC6h3wE7sS_HOSfd0saAVaZhHlpTn-ZWo
railway variables set DATABASE_URL=postgresql://postgres:tjWLCyJIrprazEhIxMKTUyATLeuDyrRU@nozomi.proxy.rlwy.net:13847/railway
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set LOG_LEVEL=info

# 5. Verificar variables
railway variables

# 6. Deploy
railway up
```

---

## 🔍 VERIFICACIÓN POST-DEPLOYMENT

### Health Check
```bash
# El bot debería responder en:
curl https://tu-app.railway.app/health
```

**Respuesta esperada**:
```json
{
  "status": "ok",
  "bot": "running", 
  "timestamp": "2025-01-16T..."
}
```

### Logs del Bot
```bash
# Ver logs en tiempo real
railway logs --follow
```

**Logs esperados**:
```
✅ Bot iniciado: @tu_bot_production
✅ Database connected
✅ Redis connected (opcional)
```

### Testing del Bot
1. **Enviar `/start` al bot en Telegram**
2. **Verificar respuesta del menú interactivo**
3. **Probar comando `/setup_super_admin`**
4. **Confirmar base de datos funcional**

---

## 🚨 TROUBLESHOOTING

### Error: "TELEGRAM_BOT_TOKEN is required"
**Solución**: Verificar que la variable esté configurada en Railway
```bash
railway variables set TELEGRAM_BOT_TOKEN=8493729556:AAEC6h3wE7sS_HOSfd0saAVaZhHlpTn-ZWo
```

### Error: Database connection failed
**Solución**: Verificar URL de base de datos
```bash
railway variables set DATABASE_URL=postgresql://postgres:tjWLCyJIrprazEhIxMKTUyATLeuDyrRU@nozomi.proxy.rlwy.net:13847/railway
```

### Error: Build failed
**Solución**: Verificar que `pnpm` esté configurado en `nixpacks.toml`

### Error: Health check failed
**Solución**: El bot necesita un servidor HTTP para health checks
- Implementar endpoint `/health` en el bot
- O cambiar configuración de Railway para no requerir health check

---

## 📊 MONITOREO

### Logs importantes a monitorear:
- ✅ Bot startup successful
- ✅ Database connections
- ❌ Webhook failures
- ❌ API errors de Telegram
- ❌ Database timeouts

### Métricas clave:
- **Uptime**: Debe ser >99%
- **Response time**: <2 segundos
- **Error rate**: <1%
- **Memory usage**: <512MB

---

## 🔄 ACTUALIZACIONES

Para deployments futuros:
```bash
# 1. Hacer commit de cambios
git add .
git commit -m "Update: descripción"
git push

# 2. Deploy automático (si está configurado)
# O manual:
railway up
```

---

**Estado**: Listo para deployment  
**Última actualización**: 16/01/2025