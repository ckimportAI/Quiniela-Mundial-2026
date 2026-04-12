import { z } from "zod";

export const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(3, "Minimo 3 caracteres")
    .max(20, "Maximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, numeros y guion bajo"),
});

export const paymentReportSchema = z.object({
  credits: z.number().int().min(1, "Minimo 1 credito").max(50, "Maximo 50 creditos"),
  amount: z.number().positive("El monto debe ser positivo"),
  method: z.string().min(2, "Metodo requerido").max(50),
  reference: z.string().min(3, "Referencia requerida").max(100),
  notes: z.string().max(500).optional(),
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

export type NicknameInput = z.infer<typeof nicknameSchema>;
export type PaymentReportInput = z.infer<typeof paymentReportSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
export type PredictionInput = z.infer<typeof predictionSchema>;
export type TournamentPredictionInput = z.infer<typeof tournamentPredictionSchema>;
export type MatchResultInput = z.infer<typeof matchResultSchema>;
