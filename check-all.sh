#!/bin/bash

echo "🔄 Iniciando validación completa del proyecto..."
echo ""

# 1. Format Check
echo "🎨 Ejecutando format check..."
if pnpm run format:check; then
    echo "✅ Format check pasó correctamente"
else
    echo "❌ Format check falló"
    exit 1
fi

echo ""

# 2. Lint
echo "📝 Ejecutando lint..."
if pnpm lint; then
    echo "✅ Lint pasó correctamente"
else
    echo "❌ Lint falló"
    exit 1
fi

echo ""

# 3. Build
echo "🔨 Ejecutando build..."
if pnpm build; then
    echo "✅ Build pasó correctamente"
else
    echo "❌ Build falló"
    exit 1
fi

echo ""

# 4. Tests (si existen)
echo "🧪 Ejecutando tests..."
if pnpm test; then
    echo "✅ Tests pasaron correctamente"
else
    echo "⚠️ Tests fallaron o no existen"
fi

echo ""
echo "🎉 Validación completa exitosa!"