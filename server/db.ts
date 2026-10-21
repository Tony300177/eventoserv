import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auditLogs, eventSettings, InsertUser, registrations, Registration, users } from "../drizzle/schema.js";

let _db: ReturnType<typeof drizzle> | null = null;
export const EVENT_CAPACITY = 400;
export const RULES_VERSION = "1.0";
export const EVENT_DAYS = ["29", "30"] as const;
export type EventDay = (typeof EVENT_DAYS)[number];

const DAY_SETTING_ID: Record<EventDay, number> = { "29": 1, "30": 2 };

export function isEventDay(value: string): value is EventDay {
  return (EVENT_DAYS as readonly string[]).includes(value);
}

let _schemaEnsured: Promise<void> | null = null;
async function ensureSchema(db: any) {
  if (!_schemaEnsured) {
    _schemaEnsured = (async () => {
      await db.execute(sql`DO $$ BEGIN CREATE TYPE "event_day" AS ENUM ('29', '30'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
      await db.execute(sql`ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "eventDay" "event_day" NOT NULL DEFAULT '29'`);
      await db.execute(sql`ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "employeeNameKey" varchar(180)`);
      await db.execute(sql`UPDATE "registrations" SET "employeeNameKey" = lower(regexp_replace(trim("employeeName"), '\\s+', ' ', 'g')) WHERE "employeeNameKey" IS NULL`);
      await db.execute(sql`ALTER TABLE "registrations" ALTER COLUMN "employeeNameKey" SET NOT NULL`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "registrations_active_person_unique" ON "registrations" ("employeeNameKey") WHERE "status" = 'active'`);
    })().catch((error) => {
      _schemaEnsured = null;
      throw error;
    });
  }
  await _schemaEnsured;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { ssl: "require" });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db) {
    try {
      await ensureSchema(_db);
    } catch (error) {
      console.warn("[Database] Schema ensure failed:", error);
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function ensureSettings(db: any) {
  for (const day of EVENT_DAYS) {
    const id = DAY_SETTING_ID[day];
    await db.insert(eventSettings).values({ id, capacity: EVENT_CAPACITY, occupied: 0 }).onConflictDoUpdate({
      target: eventSettings.id,
      set: { capacity: EVENT_CAPACITY },
    });
  }
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeName(value: string) {
  return cleanText(value).toLowerCase();
}

function createProtocol() {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `EVT-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

function daySettingsId(day: EventDay) {
  return DAY_SETTING_ID[day];
}

export async function getPublicStats() {
  const db = await getDb();
  const emptyDay = { capacity: EVENT_CAPACITY, occupied: 0, remaining: EVENT_CAPACITY };
  if (!db) {
    return {
      capacity: EVENT_CAPACITY * EVENT_DAYS.length,
      occupied: 0,
      remaining: EVENT_CAPACITY * EVENT_DAYS.length,
      activeRegistrations: 0,
      days: { "29": emptyDay, "30": emptyDay } as Record<EventDay, typeof emptyDay>,
    };
  }
  await ensureSettings(db);
  const settingsRows = await db.select().from(eventSettings);
  const [active] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "active"));

  const days = {} as Record<EventDay, { capacity: number; occupied: number; remaining: number }>;
  let totalOccupied = 0;
  let totalCapacity = 0;
  for (const day of EVENT_DAYS) {
    const row = settingsRows.find((r: any) => r.id === daySettingsId(day));
    const capacity = Number(row?.capacity ?? EVENT_CAPACITY);
    const occupied = Number(row?.occupied ?? 0);
    const remaining = Math.max(0, capacity - occupied);
    days[day] = { capacity, occupied, remaining };
    totalOccupied += occupied;
    totalCapacity += capacity;
  }
  return {
    capacity: totalCapacity,
    occupied: totalOccupied,
    remaining: Math.max(0, totalCapacity - totalOccupied),
    activeRegistrations: Number(active?.count ?? 0),
    days,
  };
}

export async function createRegistration(input: {
  schoolSector: string;
  role: string;
  employeeName: string;
  eventDay: EventDay;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const schoolSector = cleanText(input.schoolSector);
  const role = cleanText(input.role);
  const employeeName = cleanText(input.employeeName);
  const employeeNameKey = normalizeName(input.employeeName);
  const eventDay = input.eventDay;

  return await db.transaction(async (tx) => {
    await ensureSettings(tx);

    const [existing] = await tx
      .select({ id: registrations.id, eventDay: registrations.eventDay })
      .from(registrations)
      .where(and(eq(registrations.employeeNameKey, employeeNameKey), eq(registrations.status, "active")))
      .limit(1);
    if (existing) {
      throw new Error(existing.eventDay === eventDay ? "DUPLICATE_PERSON_SAME_DAY" : "DUPLICATE_PERSON");
    }

    const settingsId = daySettingsId(eventDay);
    const [settings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, settingsId)).for("update");
    if (!settings || settings.occupied + 1 > settings.capacity) throw new Error("NO_CAPACITY");

    const protocol = createProtocol();
    const [inserted] = await tx.insert(registrations).values({
      protocol,
      schoolSector,
      role,
      employeeName,
      employeeNameKey,
      eventDay,
      status: "active",
      rulesVersion: RULES_VERSION,
      rulesAcceptedAt: new Date(),
    }).returning({ id: registrations.id });
    await tx.update(eventSettings).set({ occupied: settings.occupied + 1 }).where(eq(eventSettings.id, settingsId));
    return { id: Number(inserted.id), protocol, eventDay };
  });
}

export async function listRegistrations(filters?: { search?: string; schoolSector?: string; status?: "all" | "active" | "cancelled"; eventDay?: "all" | EventDay }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const conditions = [];
  if (filters?.search?.trim()) {
    const term = `%${cleanText(filters.search)}%`;
    conditions.push(or(like(registrations.employeeName, term), like(registrations.protocol, term)));
  }
  if (filters?.schoolSector && filters.schoolSector !== "all") conditions.push(eq(registrations.schoolSector, filters.schoolSector));
  if (filters?.status && filters.status !== "all") conditions.push(eq(registrations.status, filters.status));
  if (filters?.eventDay && filters.eventDay !== "all") conditions.push(eq(registrations.eventDay, filters.eventDay));
  return db.select().from(registrations).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(registrations.createdAt));
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const stats = await getPublicStats();
  const rows = await db.select().from(registrations).orderBy(asc(registrations.schoolSector), asc(registrations.employeeName));
  const activeRows = rows.filter(row => row.status === "active");
  const distribution = Array.from(new Set(rows.map(row => row.schoolSector))).map(schoolSector => {
    const sectorRows = activeRows.filter(row => row.schoolSector === schoolSector);
    return {
      schoolSector,
      registrations: sectorRows.length,
      people: sectorRows.reduce((total, row) => total + row.peopleCount, 0),
    };
  }).sort((a, b) => b.people - a.people);
  return {
    ...stats,
    employees: activeRows.length,
    cancelled: rows.filter(row => row.status === "cancelled").length,
    distribution,
  };
}

export async function updateRegistration(id: number, input: {
  schoolSector: string;
  role: string;
  employeeName: string;
  eventDay: EventDay;
}, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(registrations).where(eq(registrations.id, id)).for("update");
    if (!current) throw new Error("NOT_FOUND");
    const nextDay = input.eventDay;
    const employeeNameKey = normalizeName(input.employeeName);

    if (current.status === "active") {
      const [conflict] = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(and(
          eq(registrations.employeeNameKey, employeeNameKey),
          eq(registrations.status, "active"),
          sql`${registrations.id} <> ${id}`,
        ))
        .limit(1);
      if (conflict) throw new Error("DUPLICATE_PERSON");
    }

    const isActive = current.status === "active";
    const dayChanged = current.eventDay !== nextDay;

    await ensureSettings(tx);

    if (isActive && dayChanged) {
      const fromId = daySettingsId(current.eventDay as EventDay);
      const toId = daySettingsId(nextDay);
      const [fromSettings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, fromId)).for("update");
      const [toSettings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, toId)).for("update");
      if (!toSettings || toSettings.occupied + 1 > toSettings.capacity) throw new Error("NO_CAPACITY");
      if (fromSettings) {
        await tx.update(eventSettings).set({ occupied: Math.max(0, fromSettings.occupied - current.peopleCount) }).where(eq(eventSettings.id, fromId));
      }
      if (toSettings) {
        await tx.update(eventSettings).set({ occupied: toSettings.occupied + 1 }).where(eq(eventSettings.id, toId));
      }
    }

    await tx.update(registrations).set({
      schoolSector: cleanText(input.schoolSector),
      role: cleanText(input.role),
      employeeName: cleanText(input.employeeName),
      employeeNameKey,
      eventDay: nextDay,
    }).where(eq(registrations.id, id));
    await tx.insert(auditLogs).values({ action: "registration.updated", registrationId: id, actorUserId, summary: `Inscrição ${current.protocol} corrigida.` });
    return { success: true };
  });
}

export async function cancelRegistration(id: number, reason: string, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(registrations).where(eq(registrations.id, id)).for("update");
    if (!current) throw new Error("NOT_FOUND");
    if (current.status === "cancelled") return { success: true, alreadyCancelled: true };
    await ensureSettings(tx);
    const settingsId = daySettingsId(current.eventDay as EventDay);
    const [settings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, settingsId)).for("update");
    await tx.update(registrations).set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: actorUserId, cancellationReason: cleanText(reason) }).where(eq(registrations.id, id));
    if (settings) await tx.update(eventSettings).set({ occupied: Math.max(0, settings.occupied - current.peopleCount) }).where(eq(eventSettings.id, settingsId));
    await tx.insert(auditLogs).values({ action: "registration.cancelled", registrationId: id, actorUserId, summary: `Inscrição ${current.protocol} cancelada.` });
    return { success: true, alreadyCancelled: false };
  });
}

export async function listAuditLogs() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(40);
}
