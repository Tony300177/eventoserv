import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: pgEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const eventSettings = pgTable("eventSettings", {
  id: integer("id").primaryKey(),
  capacity: integer("capacity").notNull().default(200),
  occupied: integer("occupied").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  protocol: varchar("protocol", { length: 24 }).notNull().unique(),
  schoolSector: varchar("schoolSector", { length: 140 }).notNull(),
  role: varchar("role", { length: 160 }).notNull(),
  employeeName: varchar("employeeName", { length: 180 }).notNull(),
  hasCompanion: integer("hasCompanion").notNull().default(0),
  companionName: varchar("companionName", { length: 180 }),
  peopleCount: integer("peopleCount").notNull().default(1),
  status: pgEnum("status", ["active", "cancelled"]).notNull().default("active"),
  rulesVersion: varchar("rulesVersion", { length: 32 }).notNull().default("1.0"),
  rulesAcceptedAt: timestamp("rulesAcceptedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: integer("cancelledBy"),
  cancellationReason: text("cancellationReason"),
});

export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 80 }).notNull(),
  registrationId: integer("registrationId"),
  actorUserId: integer("actorUserId"),
  summary: text("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Registration = typeof registrations.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
