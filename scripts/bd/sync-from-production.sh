#!/bin/bash

# 🔄 Script para sincronizar base local desde producción (Railway)
# Uso: ./scripts/sync-from-production.sh

set -e

# Cargar variables de entorno de forma segura
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔄 SINCRONIZACIÓN DESDE PRODUCCIÓN"
echo "=================================="

# Verificar que tenemos la URL de Railway
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "❌ RAILWAY_DATABASE_URL no configurada en .env"
    echo "💡 Agrega la URL desde Railway Dashboard:"
    echo "   RAILWAY_DATABASE_URL=postgresql://postgres:..."
    exit 1
fi

# Verificar que tenemos la URL local
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL no configurada en .env"
    echo "💡 Verifica tu configuración local"
    exit 1
fi

echo "📋 PLAN DE SINCRONIZACIÓN:"
echo "  🚂 Origen: Railway (producción)"
echo "  🏠 Destino: Base local"
echo ""

# Confirmación del usuario
read -p "⚠️  ADVERTENCIA: Esto SOBRESCRIBIRÁ tu base local. ¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🚫 Operación cancelada"
    exit 0
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo ""
echo "📍 PASO 1: Haciendo backup de base local actual..."
./scripts/bd/backup-db.sh local

echo ""
echo "📍 PASO 2: Haciendo backup de producción..."
./scripts/bd/backup-db.sh railway

echo ""
echo "📍 PASO 3: Obteniendo último backup de Railway..."
LATEST_RAILWAY_BACKUP=$(find scripts/backups -name "railway_backup_*.sql.gz" -type f | sort -r | head -n 1)

if [ -z "$LATEST_RAILWAY_BACKUP" ]; then
    echo "❌ No se encontró backup de Railway"
    exit 1
fi

echo "📦 Usando backup: $LATEST_RAILWAY_BACKUP"

echo ""
echo "📍 PASO 4: Limpiando base local..."
echo "🗑️  Eliminando conexiones activas..."
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'financial_bot_dev' AND pid <> pg_backend_pid();" || true

echo "🗑️  Eliminando y recreando base de datos..."
# Extraer nombre de la base de datos
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
DB_URL_WITHOUT_DB=$(echo "$DATABASE_URL" | sed 's/\/[^\/]*$/\/postgres/')

psql "$DB_URL_WITHOUT_DB" -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql "$DB_URL_WITHOUT_DB" -c "CREATE DATABASE $DB_NAME;"

echo ""
echo "📍 PASO 5: Restaurando datos de producción..."
echo "🔄 Descomprimiendo y restaurando..."
gunzip -c "$LATEST_RAILWAY_BACKUP" | psql "$DATABASE_URL"

echo ""
echo "📍 PASO 6: Verificando sincronización..."
cd packages/database
DATABASE_URL="$DATABASE_URL" pnpm prisma migrate status

echo ""
echo "✅ SINCRONIZACIÓN COMPLETADA"
echo "🎯 Tu base local ahora es idéntica a producción"
echo "💾 Backup de tu base local anterior guardado en /backups/"
echo ""
echo "📋 SIGUIENTE PASO:"
echo "   Si vas a desarrollar nuevas features, crea una nueva migración:"
echo "   ./scripts/prisma.sh migrate dev --name nueva_feature"