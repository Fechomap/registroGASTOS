#!/bin/bash

# 🔧 Wrapper para Prisma que carga .env automáticamente
# Uso: ./scripts/prisma.sh [comandos de prisma]

set -e

# Cargar variables de entorno de forma segura
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Cambiar al directorio de la base de datos
cd packages/database

# Ejecutar comando prisma con los argumentos pasados
pnpm prisma "$@"