-- Inscrições de lideranças (Diretores, Assessores e Chefes de Departamento)
-- Presença nos dois dias do evento (29 e 30 de outubro).
-- Aplicar no Supabase (SQL Editor) ou via psql com DATABASE_URL.

DO $$ BEGIN
  CREATE TYPE "status" AS ENUM ('active', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "leadershipRegistrations" (
  "id" serial PRIMARY KEY,
  "protocol" varchar(24) NOT NULL UNIQUE,
  "fullName" varchar(180) NOT NULL,
  "fullNameKey" varchar(180) NOT NULL,
  "sector" varchar(180) NOT NULL,
  "status" "status" NOT NULL DEFAULT 'active',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "leadership_active_person_unique"
  ON "leadershipRegistrations" ("fullNameKey")
  WHERE "status" = 'active';
