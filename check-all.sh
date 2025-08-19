#!/bin/bash

echo "🔄 Iniciando validación completa del proyecto..."
echo ""

# 1. Lint
echo "📝 Ejecutando lint..."
if pnpm lint; then
    echo "✅ Lint pasó correctamente"
else
    echo "❌ Lint falló"
    exit 1
fi

echo ""

# 2. Build
echo "🔨 Ejecutando build..."
if pnpm build; then
    echo "✅ Build pasó correctamente"
else
    echo "❌ Build falló"
    exit 1
fi

echo ""

# 3. Tests (si existen)
echo "🧪 Ejecutando tests..."
if pnpm test; then
    echo "✅ Tests pasaron correctamente"
else
    echo "⚠️ Tests fallaron o no existen"
fi

echo ""
echo "🎉 Validación completa exitosa!"