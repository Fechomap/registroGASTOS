#!/bin/bash

# 🚀 Script para hacer push de migraciones a Railway
# Uso: ./scripts/push-migrations.sh

set -e

# Cargar variables de entorno de forma segura
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🚀 PUSH DE MIGRACIONES A RAILWAY"
echo "================================"

# Verificar que tenemos la URL de Railway
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "❌ RAILWAY_DATABASE_URL no configurada en .env"
    echo "💡 Agrega la URL desde Railway Dashboard:"
    echo "   RAILWAY_DATABASE_URL=postgresql://postgres:..."
    exit 1
fi

# Paso 1: Verificar estado local
echo ""
echo "📍 PASO 1: Verificando migraciones locales..."
cd packages/database
pnpm prisma migrate status

# Paso 2: Hacer backup de Railway antes del push
echo ""
echo "📍 PASO 2: Haciendo backup de Railway..."
cd ../..
RAILWAY_DATABASE_URL=$RAILWAY_DATABASE_URL ./scripts/backup-db.sh railway

# Paso 3: Aplicar migraciones a Railway
echo ""
echo "📍 PASO 3: Aplicando migraciones a Railway..."
echo "🔍 Conectando a Railway..."
cd packages/database
DATABASE_URL=$RAILWAY_DATABASE_URL pnpm prisma migrate deploy

# Paso 4: Verificar estado final
echo ""
echo "📍 PASO 4: Verificando estado final..."
DATABASE_URL=$RAILWAY_DATABASE_URL pnpm prisma migrate status

echo ""
echo "✅ PUSH COMPLETADO EXITOSAMENTE"
echo "🎯 Migraciones aplicadas a Railway"
echo "💾 Backup guardado en /backups/"