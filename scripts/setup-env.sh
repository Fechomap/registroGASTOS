#!/bin/bash

# 🔧 Script de configuración de ambiente
# Uso: ./scripts/setup-env.sh [development|production|test]

set -e

ENVIRONMENT=${1:-development}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔧 Configurando ambiente: $ENVIRONMENT"

case $ENVIRONMENT in
  "development")
    echo "📋 Copiando configuración de desarrollo..."
    cp "$ROOT_DIR/.env.development" "$ROOT_DIR/.env"
    echo "✅ Archivo .env configurado para desarrollo"
    echo "📝 Edita .env y agrega tu TELEGRAM_BOT_TOKEN"
    ;;
  
  "production")
    echo "🚀 Copiando configuración de producción..."
    cp "$ROOT_DIR/.env.production" "$ROOT_DIR/.env"
    echo "✅ Archivo .env configurado para producción"
    echo "⚠️  IMPORTANTE: Configura todas las variables de producción"
    ;;
  
  "test")
    echo "🧪 Configurando ambiente de pruebas..."
    export NODE_ENV=test
    export DATABASE_URL="postgresql://jhonvc@localhost:5432/financial_bot_test"
    echo "✅ Variables de prueba configuradas"
    ;;
  
  *)
    echo "❌ Ambiente inválido. Usa: development, production, o test"
    exit 1
    ;;
esac

echo "🎉 Configuración completada para: $ENVIRONMENT"