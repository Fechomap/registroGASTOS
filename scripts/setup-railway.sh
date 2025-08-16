#!/bin/bash

# 🚀 Script para configurar variables de entorno en Railway

echo "🔧 Configurando variables de entorno en Railway..."

# Variables principales
railway variables set TELEGRAM_BOT_TOKEN='${{ TELEGRAM_BOT_TOKEN }}'
railway variables set DATABASE_URL='${{ Postgres.DATABASE_URL }}'
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info

# Variables adicionales para deployment
railway variables set PORT=3000
railway variables set RAILWAY_ENVIRONMENT=production

echo "✅ Variables configuradas. Verificando..."
railway variables

echo "🚀 Para hacer deploy, ejecuta: railway up"