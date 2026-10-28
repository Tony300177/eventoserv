import { z } from "zod";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { cancelRegistration, createLeadershipRegistration, createRegistration, generateRegistrationReport, getAdminStats, getPublicStats, listAuditLogs, listLeadershipRegistrations, listRegistrations, updateRegistration } from "./db.js";
import type { TrpcContext } from "./context.js";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have required permission" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

const schoolSectorSchema = z.enum([
  "CEI LUIZ FELIPE", "CEM SAO CRISTOVAO", "CEI ARCO IRIS", "CEI BRUNO LEONARDO", "CEI DOM FRANCO", "CEI MENINO JESUS", "CEI NOSSO LAR", "CEI VASCO PAPA", "CEI CRIANÇA FELIZ", "CEM GUILHERME", "CEM ORLANDO PEREIRA", "EM MARIA HILDA", "EM PAULO FREIRE", "EM JOSE ANCHIETA", "ERM ALVARES AZEVEDO", "ERM CORA CORALINA", "ERM EUCLIDES CUNHA", "ERM OSVALDO CRUZ", "ERM VINICIUS DE MORAIS", "SME", "LOGISTICA", "ALMOXARIFADO", "MERENDA",
]);

const registrationInput = z.object({
  schoolSector: schoolSectorSchema,
  role: z.string().trim().min(2, "Informe a função.").max(160),
  employeeName: z.string().trim().min(3, "Informe o nome completo.").max(180),
  eventDay: z.enum(["29", "30"]),
});

const adminRegistrationInput = registrationInput;

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ status: "ok" as const })),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
  }),
  leadership: router({
    create: publicProcedure.input(z.object({
      fullName: z.string().trim().min(3, "Informe o nome completo.").max(180),
      sector: z.string().trim().min(2, "Informe o setor.").max(180),
    })).mutation(({ input }) => createLeadershipRegistration(input)),
    adminList: adminProcedure.query(() => listLeadershipRegistrations()),
  }),
  registration: router({
    publicStats: publicProcedure.query(() => getPublicStats()),
    create: publicProcedure.input(registrationInput).mutation(({ input }) => createRegistration(input)),
    adminStats: adminProcedure.query(() => getAdminStats()),
    adminList: adminProcedure.input(z.object({
      search: z.string().optional(),
      schoolSector: z.string().optional(),
      status: z.enum(["all", "active", "cancelled"]).optional(),
      eventDay: z.enum(["all", "29", "30"]).optional(),
    }).optional()).query(({ input }) => listRegistrations(input)),
    audit: adminProcedure.query(() => listAuditLogs()),
    report: adminProcedure.mutation(() => generateRegistrationReport()),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: adminRegistrationInput })).mutation(({ input, ctx }) => updateRegistration(input.id, input.data, ctx.user.id)),
    cancel: adminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })).mutation(({ input, ctx }) => cancelRegistration(input.id, input.reason, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
