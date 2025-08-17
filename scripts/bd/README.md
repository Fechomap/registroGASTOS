# 📋 Scripts de Base de Datos

## 🛠️ Scripts Disponibles

### `prisma.sh` - Wrapper Prisma

```bash
./scripts/bd/prisma.sh migrate status
./scripts/bd/prisma.sh studio
./scripts/bd/prisma.sh migrate dev --name nueva_feature
```

### `check-migrations.sh` - Verificar Migraciones

```bash
./scripts/bd/check-migrations.sh
```

Compara local vs Railway. Requiere `DATABASE_URL` y `RAILWAY_DATABASE_URL` en `.env`.

### `push-migrations.sh` - Push a Railway

```bash
./scripts/bd/push-migrations.sh
```

Aplica migraciones a Railway con backup automático.

### `backup-db.sh` - Backups

```bash
./scripts/bd/backup-db.sh local          # Backup local
./scripts/bd/backup-db.sh railway        # Backup Railway
./scripts/bd/backup-db.sh all            # Ambos
./scripts/bd/backup-db.sh list           # Listar backups
```

### `sync-from-production.sh` - Sincronizar desde Railway

```bash
./scripts/bd/sync-from-production.sh
```

⚠️ SOBRESCRIBE base local con datos de Railway.

## 📁 Variables en .env

```bash
DATABASE_URL=postgresql://jhonvc@localhost:5432/financial_bot_dev
RAILWAY_DATABASE_URL=postgresql://postgres:...@nozomi.proxy.rlwy.net:13847/railway
```

## 🔄 Flujo Normal

1. `./scripts/bd/prisma.sh migrate dev --name feature` - Crear migración
2. `./scripts/bd/check-migrations.sh` - Verificar diferencias
3. `./scripts/bd/push-migrations.sh` - Push a Railway

## 💾 Backups

- Ubicación: `/backups/`
- Formato: `local_backup_TIMESTAMP.sql.gz`
- Automáticos antes de cambios críticos

## ⚠️ Importante

- Usar `./scripts/bd/prisma.sh` en lugar de `pnpm prisma`
- Scripts cargan `.env` automáticamente
- Backups están en `.gitignore`
