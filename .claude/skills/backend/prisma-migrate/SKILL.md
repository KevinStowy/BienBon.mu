---
name: prisma-migrate
description: Crée une migration Prisma + script de rollback
argument-hint: <migration-name>
---

# Prisma Migrate

Crée une migration Prisma `$ARGUMENTS` avec un script de rollback.

## Étape 1 — Modifier le schéma Prisma

Éditer `prisma/schema.prisma` avec les changements nécessaires.

Conventions ADR-003 :
- Tables : `snake_case` pluriel
- Colonnes : `snake_case`
- Enums : `PascalCase`
- Relations nommées explicitement
- `@@map("table_name")` si le nom Prisma diffère du nom SQL
- Champs audit : `createdAt`, `updatedAt` partout
- Soft delete : `deletedAt DateTime?`

## Étape 2 — Générer la migration

```bash
cd apps/api
npx prisma migrate dev --name $ARGUMENTS
```

Vérifier le SQL généré dans `prisma/migrations/<timestamp>_$ARGUMENTS/migration.sql`.

## Étape 3 — Créer le script de rollback

Fichier : `prisma/migrations/<timestamp>_$ARGUMENTS/rollback.sql`

Écrire le SQL inverse de la migration :
- `CREATE TABLE` → `DROP TABLE`
- `ADD COLUMN` → `ALTER TABLE ... DROP COLUMN`
- `CREATE INDEX` → `DROP INDEX`
- `INSERT` → `DELETE`

## Étape 4 — Mettre à jour les seeds si nécessaire

Si la migration ajoute des tables ou des champs obligatoires, mettre à jour `prisma/seed.ts`.

## Étape 5 — Vérifier

```bash
npx prisma generate          # Types OK
npx prisma migrate dev       # Migration s'applique
npx prisma db seed           # Seeds fonctionnent
```

## Conventions de nommage des migrations

- `add-<table>` : ajout de table
- `add-<column>-to-<table>` : ajout de colonne
- `create-index-<name>` : ajout d'index
- `rename-<old>-to-<new>` : renommage

## Validation

- [ ] Le schéma Prisma est valide (`npx prisma validate`)
- [ ] La migration s'applique (`npx prisma migrate dev`)
- [ ] Le rollback SQL est correct
- [ ] `npx prisma generate` fonctionne
- [ ] Les seeds passent
