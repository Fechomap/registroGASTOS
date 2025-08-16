#!/bin/bash

# 💾 Script de backup de base de datos
# Uso: ./scripts/backup-db.sh [local|railway|all]

set -e

# Cargar variables de entorno de forma segura
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

BACKUP_TYPE=${1:-local}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "💾 Iniciando backup: $BACKUP_TYPE"

backup_local() {
    echo "📦 Haciendo backup de base de datos local..."
    
    local backup_file="$BACKUP_DIR/local_backup_$TIMESTAMP.sql"
    
    pg_dump financial_bot_dev > "$backup_file"
    
    # Comprimir el backup
    gzip "$backup_file"
    
    echo "✅ Backup local guardado: ${backup_file}.gz"
    
    # Mantener solo los últimos 10 backups locales
    find "$BACKUP_DIR" -name "local_backup_*.sql.gz" -type f | \
        sort -r | tail -n +11 | xargs -r rm
    
    echo "🧹 Backups antiguos limpiados (manteniendo últimos 10)"
}

backup_railway() {
    echo "🚂 Haciendo backup de base de datos Railway..."
    
    if [ -z "$RAILWAY_DATABASE_URL" ]; then
        echo "⚠️  RAILWAY_DATABASE_URL no configurada"
        echo "💡 Configura la variable de entorno o usa:"
        echo "   RAILWAY_DATABASE_URL=postgresql://... ./scripts/backup-db.sh railway"
        return 1
    fi
    
    local backup_file="$BACKUP_DIR/railway_backup_$TIMESTAMP.sql"
    
    pg_dump "$RAILWAY_DATABASE_URL" > "$backup_file"
    
    # Comprimir el backup
    gzip "$backup_file"
    
    echo "✅ Backup Railway guardado: ${backup_file}.gz"
    
    # Mantener solo los últimos 5 backups de Railway
    find "$BACKUP_DIR" -name "railway_backup_*.sql.gz" -type f | \
        sort -r | tail -n +6 | xargs -r rm
}

restore_backup() {
    local backup_file="$1"
    local target_db="$2"
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ Archivo de backup no encontrado: $backup_file"
        return 1
    fi
    
    echo "🔄 Restaurando backup a $target_db..."
    
    # Si el archivo está comprimido, descomprimirlo temporalmente
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | psql "$target_db"
    else
        psql "$target_db" < "$backup_file"
    fi
    
    echo "✅ Backup restaurado exitosamente"
}

case $BACKUP_TYPE in
    "local")
        backup_local
        ;;
    
    "railway")
        backup_railway
        ;;
    
    "all")
        backup_local
        backup_railway
        ;;
    
    "restore")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "❌ Uso para restaurar: ./scripts/backup-db.sh restore <archivo_backup> <base_datos_destino>"
            echo "   Ejemplo: ./scripts/backup-db.sh restore backups/local_backup_20240116_143022.sql.gz financial_bot_dev"
            exit 1
        fi
        restore_backup "$2" "$3"
        ;;
    
    "list")
        echo "📋 Backups disponibles:"
        ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No hay backups disponibles"
        ;;
    
    *)
        echo "❌ Tipo de backup inválido"
        echo "💡 Uso: ./scripts/backup-db.sh [local|railway|all|restore|list]"
        echo ""
        echo "Ejemplos:"
        echo "  ./scripts/backup-db.sh local              # Backup local"
        echo "  ./scripts/backup-db.sh railway            # Backup Railway"
        echo "  ./scripts/backup-db.sh all                # Ambos backups"
        echo "  ./scripts/backup-db.sh list               # Listar backups"
        echo "  ./scripts/backup-db.sh restore <file> <db> # Restaurar backup"
        exit 1
        ;;
esac

echo "🎉 Operación completada: $BACKUP_TYPE"