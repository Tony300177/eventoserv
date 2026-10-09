import postgres from "postgres";

const sql = postgres("postgresql://postgres:Mud@r202650@127.0.0.1:5433/postgres", {
  ssl: "require",
});

try {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`DO $$ BEGIN CREATE TYPE "public"."role" AS ENUM('user', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await sql`DO $$ BEGIN CREATE TYPE "public"."status" AS ENUM('active', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await sql`CREATE TABLE IF NOT EXISTS "public"."users" ("id" serial NOT NULL, "openId" varchar(64) NOT NULL, "name" text, "email" varchar(320), "loginMethod" varchar(64), "role" "public"."role" DEFAULT 'user'::"public"."role" NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "lastSignedIn" timestamp DEFAULT now() NOT NULL, CONSTRAINT "users_pkey" PRIMARY KEY ("id"), CONSTRAINT "users_openId_unique" UNIQUE ("openId"))`;
  await sql`CREATE TABLE IF NOT EXISTS "public"."eventSettings" ("id" integer NOT NULL, "capacity" integer DEFAULT 200 NOT NULL, "occupied" integer DEFAULT 0 NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, CONSTRAINT "eventSettings_pkey" PRIMARY KEY ("id"))`;
  await sql`CREATE TABLE IF NOT EXISTS "public"."registrations" ("id" serial NOT NULL, "protocol" varchar(24) NOT NULL, "schoolSector" varchar(140) NOT NULL, "role" varchar(160) NOT NULL, "employeeName" varchar(180) NOT NULL, "hasCompanion" integer DEFAULT 0 NOT NULL, "companionName" varchar(180), "peopleCount" integer DEFAULT 1 NOT NULL, "status" "public"."status" DEFAULT 'active'::"public"."status" NOT NULL, "rulesVersion" varchar(32) DEFAULT '1.0' NOT NULL, "rulesAcceptedAt" timestamp NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "cancelledAt" timestamp, "cancelledBy" integer, "cancellationReason" text, CONSTRAINT "registrations_pkey" PRIMARY KEY ("id"), CONSTRAINT "registrations_protocol_unique" UNIQUE ("protocol"))`;
  await sql`CREATE TABLE IF NOT EXISTS "public"."auditLogs" ("id" serial NOT NULL, "action" varchar(80) NOT NULL, "registrationId" integer, "actorUserId" integer, "summary" text NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, CONSTRAINT "auditLogs_pkey" PRIMARY KEY ("id"))`;
  await sql`INSERT INTO "public"."eventSettings" ("id", "capacity", "occupied") VALUES (1, 200, 0) ON CONFLICT ("id") DO NOTHING`;
  console.log("Tables created successfully");
} catch (e) {
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
