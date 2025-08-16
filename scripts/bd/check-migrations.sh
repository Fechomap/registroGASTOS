#!/bin/bash

# 🔍 Script para verificar estado de migraciones
# Uso: ./scripts/check-migrations.sh

set -e

# Cargar variables de entorno de forma segura
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 Verificando estado de migraciones..."

# Verificar local
echo ""
echo "📍 MIGRACIONES LOCALES:"
cd packages/database
pnpm prisma migrate status

echo ""
echo "📍 MIGRACIONES EN RAILWAY:"
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "⚠️  RAILWAY_DATABASE_URL no configurada en .env"
    echo "💡 Agrega la URL desde Railway Dashboard a tu .env:"
    echo "   RAILWAY_DATABASE_URL=postgresql://postgres:..."
    echo ""
    echo "🔗 O ejecuta temporalmente:"
    echo "   RAILWAY_DATABASE_URL=postgresql://... ./scripts/check-migrations.sh"
else
    echo "🔍 Conectando a Railway..."
    DATABASE_URL=$RAILWAY_DATABASE_URL pnpm prisma migrate status
fi

echo ""
echo "🎯 Para conectar a Railway DB:"
echo "   railway connect postgres"
echo "   SELECT * FROM \"_prisma_migrations\" ORDER BY finished_at DESC;"

echo ""
echo "✅ Verificación completada"