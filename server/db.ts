import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auditLogs, eventSettings, InsertUser, registrations, Registration, users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
export const EVENT_CAPACITY = 200;
export const RULES_VERSION = "1.0";

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
  await db.insert(eventSettings).values({ id: 1, capacity: EVENT_CAPACITY, occupied: 0 }).onConflictDoUpdate({
    target: eventSettings.id,
    set: { capacity: sql`${eventSettings.capacity}` },
  });
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createProtocol() {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `EVT-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export async function getPublicStats() {
  const db = await getDb();
  if (!db) return { capacity: EVENT_CAPACITY, occupied: 0, remaining: EVENT_CAPACITY, activeRegistrations: 0 };
  await ensureSettings(db);
  const [settings] = await db.select().from(eventSettings).where(eq(eventSettings.id, 1));
  const [active] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "active"));
  const occupied = Number(settings?.occupied ?? 0);
  return {
    capacity: Number(settings?.capacity ?? EVENT_CAPACITY),
    occupied,
    remaining: Math.max(0, Number(settings?.capacity ?? EVENT_CAPACITY) - occupied),
    activeRegistrations: Number(active?.count ?? 0),
  };
}

export async function createRegistration(input: {
  schoolSector: string;
  role: string;
  employeeName: string;
  hasCompanion: boolean;
  companionName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const schoolSector = cleanText(input.schoolSector);
  const role = cleanText(input.role);
  const employeeName = cleanText(input.employeeName);
  const hasCompanion = Boolean(input.hasCompanion);
  const companionName = input.companionName ? cleanText(input.companionName) : null;
  const peopleCount = hasCompanion ? 2 : 1;

  return db.transaction(async (tx) => {
    await ensureSettings(tx);
    const [settings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, 1)).for("update");
    if (!settings || settings.occupied + peopleCount > settings.capacity) throw new Error("NO_CAPACITY");

    const protocol = createProtocol();
    const [inserted] = await tx.insert(registrations).values({
      protocol,
      schoolSector,
      role,
      employeeName,
      hasCompanion: hasCompanion ? 1 : 0,
      companionName: hasCompanion ? companionName : null,
      peopleCount,
      status: "active",
      rulesVersion: RULES_VERSION,
      rulesAcceptedAt: new Date(),
    }).returning({ id: registrations.id });
    await tx.update(eventSettings).set({ occupied: settings.occupied + peopleCount }).where(eq(eventSettings.id, 1));
    return { id: Number(inserted.id), protocol, peopleCount };
  });
}

export async function listRegistrations(filters?: { search?: string; schoolSector?: string; status?: "all" | "active" | "cancelled"; hasCompanion?: "all" | "yes" | "no" }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const conditions = [];
  if (filters?.search?.trim()) {
    const term = `%${cleanText(filters.search)}%`;
    conditions.push(or(like(registrations.employeeName, term), like(registrations.protocol, term)));
  }
  if (filters?.schoolSector && filters.schoolSector !== "all") conditions.push(eq(registrations.schoolSector, filters.schoolSector));
  if (filters?.status && filters.status !== "all") conditions.push(eq(registrations.status, filters.status));
  if (filters?.hasCompanion === "yes") conditions.push(eq(registrations.hasCompanion, 1));
  if (filters?.hasCompanion === "no") conditions.push(eq(registrations.hasCompanion, 0));
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
      companions: sectorRows.reduce((total, row) => total + (row.hasCompanion ? 1 : 0), 0),
    };
  }).sort((a, b) => b.people - a.people);
  return {
    ...stats,
    employees: activeRows.length,
    companions: activeRows.reduce((total, row) => total + (row.hasCompanion ? 1 : 0), 0),
    cancelled: rows.filter(row => row.status === "cancelled").length,
    distribution,
  };
}

export async function updateRegistration(id: number, input: {
  schoolSector: string;
  role: string;
  employeeName: string;
  hasCompanion: boolean;
  companionName?: string;
}, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(registrations).where(eq(registrations.id, id)).for("update");
    if (!current) throw new Error("NOT_FOUND");
    const nextCount = input.hasCompanion ? 2 : 1;
    const delta = current.status === "active" ? nextCount - current.peopleCount : 0;
    await ensureSettings(tx);
    const [settings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, 1)).for("update");
    if (delta > 0 && (!settings || settings.occupied + delta > settings.capacity)) throw new Error("NO_CAPACITY");
    if (delta !== 0 && settings) {
      await tx.update(eventSettings).set({ occupied: settings.occupied + delta }).where(eq(eventSettings.id, 1));
    }
    await tx.update(registrations).set({
      schoolSector: cleanText(input.schoolSector),
      role: cleanText(input.role),
      employeeName: cleanText(input.employeeName),
      hasCompanion: input.hasCompanion ? 1 : 0,
      companionName: input.hasCompanion ? cleanText(input.companionName ?? "") : null,
      peopleCount: nextCount,
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
    const [settings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, 1)).for("update");
    await tx.update(registrations).set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: actorUserId, cancellationReason: cleanText(reason) }).where(eq(registrations.id, id));
    if (settings) await tx.update(eventSettings).set({ occupied: Math.max(0, settings.occupied - current.peopleCount) }).where(eq(eventSettings.id, 1));
    await tx.insert(auditLogs).values({ action: "registration.cancelled", registrationId: id, actorUserId, summary: `Inscrição ${current.protocol} cancelada.` });
    return { success: true, alreadyCancelled: false };
  });
}

export async function listAuditLogs() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(40);
}
