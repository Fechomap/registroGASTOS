#!/bin/bash

# 🔍 Script para verificar estado de migraciones
# Uso: ./scripts/check-migrations.sh

set -e

echo "🔍 Verificando estado de migraciones..."

# Verificar local
echo ""
echo "📍 MIGRACIONES LOCALES:"
cd packages/database
pnpm prisma migrate status

echo ""
echo "📍 MIGRACIONES EN RAILWAY:"
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "⚠️  RAILWAY_DATABASE_URL no configurada"
    echo "💡 Configura la variable o copia la URL desde Railway dashboard"
else
    DATABASE_URL=$RAILWAY_DATABASE_URL pnpm prisma migrate status
fi

echo ""
echo "🎯 Para conectar a Railway DB:"
echo "   railway connect postgres"
echo "   SELECT * FROM \"_prisma_migrations\" ORDER BY finished_at DESC;"

echo ""
echo "✅ Verificación completada"