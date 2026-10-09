import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const eventSettings = mysqlTable("eventSettings", {
  id: int("id").primaryKey(),
  capacity: int("capacity").notNull().default(200),
  occupied: int("occupied").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  protocol: varchar("protocol", { length: 24 }).notNull().unique(),
  schoolSector: varchar("schoolSector", { length: 140 }).notNull(),
  role: varchar("role", { length: 160 }).notNull(),
  employeeName: varchar("employeeName", { length: 180 }).notNull(),
  hasCompanion: int("hasCompanion").notNull().default(0),
  companionName: varchar("companionName", { length: 180 }),
  peopleCount: int("peopleCount").notNull().default(1),
  status: mysqlEnum("status", ["active", "cancelled"]).notNull().default("active"),
  rulesVersion: varchar("rulesVersion", { length: 32 }).notNull().default("1.0"),
  rulesAcceptedAt: timestamp("rulesAcceptedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: int("cancelledBy"),
  cancellationReason: text("cancellationReason"),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 80 }).notNull(),
  registrationId: int("registrationId"),
  actorUserId: int("actorUserId"),
  summary: text("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Registration = typeof registrations.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
