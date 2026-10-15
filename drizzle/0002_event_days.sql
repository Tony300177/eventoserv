-- Migração: dias do evento (29 e 30 de outubro), 400 pessoas/dia
-- Aplicar no Supabase (SQL Editor) ou via psql com DATABASE_URL.

-- 1. Enum de dias do evento
DO $$ BEGIN
  CREATE TYPE "event_day" AS ENUM ('29', '30');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Coluna do dia (default '29' para registros existentes)
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "eventDay" "event_day" NOT NULL DEFAULT '29';

-- 3. Chave de nome normalizado (minúsculas, espaços colapsados)
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "employeeNameKey" varchar(180);

UPDATE "registrations"
SET "employeeNameKey" = lower(regexp_replace(trim("employeeName"), '\s+', ' ', 'g'))
WHERE "employeeNameKey" IS NULL;

ALTER TABLE "registrations" ALTER COLUMN "employeeNameKey" SET NOT NULL;

-- 4. Índice único: uma única inscrição ATIVA por pessoa (nome normalizado)
DROP INDEX IF EXISTS "registrations_active_person_unique";
CREATE UNIQUE INDEX "registrations_active_person_unique"
  ON "registrations" ("employeeNameKey")
  WHERE "status" = 'active';

-- 5. Capacidade por dia: 400 pessoas (linha id=1 → dia 29, id=2 → dia 30)
UPDATE "eventSettings" SET "capacity" = 400 WHERE "id" = 1;

INSERT INTO "eventSettings" ("id", "capacity", "occupied")
VALUES (2, 400, 0)
ON CONFLICT ("id") DO UPDATE SET "capacity" = 400;
