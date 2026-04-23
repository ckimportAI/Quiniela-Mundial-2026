import { z } from "zod";

export const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(3, "Minimo 3 caracteres")
    .max(20, "Maximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, numeros y guion bajo"),
  name: z.string().min(2, "Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
  cedula: z.string().min(5, "Minimo 5 caracteres").max(20, "Maximo 20 caracteres"),
  phone: z.string().min(7, "Minimo 7 caracteres").max(20, "Maximo 20 caracteres"),
  aceptaTerminos: z
    .boolean()
    .refine((v) => v === true, {
      message: "Debes aceptar los Terminos y la Politica de Privacidad",
    }),
});

export const paymentReportSchema = z.object({
  packageId: z.string().cuid("Paquete requerido").optional(),
  credits: z.number().int().min(1).max(50).optional(),
  amount: z.number().positive("El monto debe ser positivo"),
  amountBs: z.number().positive().optional(),
  paymentDate: z.string().datetime().optional(),
  bcvRateUsd: z.number().positive().optional(),
  bcvRateEur: z.number().positive().optional(),
  method: z.string().min(2, "Metodo requerido").max(50),
  reference: z.string().min(3, "Referencia requerida").max(100),
  notes: z.string().max(500).optional(),
  proofUrl: z.string().max(300).optional(),
}).refine((data) => !!data.packageId || !!data.credits, {
  message: "Debes indicar un paquete o cantidad de creditos",
});

export const reviewPaymentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionNote: z.string().max(500).optional(),
});

export const predictionSchema = z.object({
  quinielaId: z.string().cuid(),
  matchId: z.string().cuid(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  isWildcard: z.boolean().optional().default(false),
});

export const tournamentPredictionSchema = z.object({
  quinielaId: z.string().cuid(),
  type: z.enum([
    "CHAMPION",
    "RUNNER_UP",
    "THIRD_PLACE",
    "TOP_SCORER",
    "GROUP_WINNER",
    "GROUP_RUNNER_UP",
  ]),
  teamId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  playerName: z.string().min(2).max(100).optional(),
});

export const matchResultSchema = z.object({
  matchId: z.string().cuid(),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePenalty: z.number().int().min(0).optional(),
  awayPenalty: z.number().int().min(0).optional(),
});

export const lockMatchesSchema = z.object({
  matchIds: z.array(z.string().cuid()).optional(),
  before: z.string().datetime().optional(),
});

export const createSubQuinielaSchema = z.object({
  name: z
    .string()
    .min(3, "Minimo 3 caracteres")
    .max(50, "Maximo 50 caracteres"),
  description: z.string().max(200, "Maximo 200 caracteres").optional(),
  quinielaId: z.string().cuid("Quiniela requerida"),
});

export const joinSubQuinielaSchema = z.object({
  inviteCode: z
    .string()
    .min(6, "Codigo invalido")
    .max(8, "Codigo invalido")
    .transform((v) => v.toUpperCase()),
  quinielaId: z.string().cuid("Quiniela requerida"),
});

export const updateMemberQuinielaSchema = z.object({
  quinielaId: z.string().cuid("Quiniela requerida"),
});

export type NicknameInput = z.infer<typeof nicknameSchema>;
export type PaymentReportInput = z.infer<typeof paymentReportSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
export type PredictionInput = z.infer<typeof predictionSchema>;
export type TournamentPredictionInput = z.infer<typeof tournamentPredictionSchema>;
export type MatchResultInput = z.infer<typeof matchResultSchema>;
export type CreateSubQuinielaInput = z.infer<typeof createSubQuinielaSchema>;
export type JoinSubQuinielaInput = z.infer<typeof joinSubQuinielaSchema>;
export type UpdateMemberQuinielaInput = z.infer<typeof updateMemberQuinielaSchema>;
