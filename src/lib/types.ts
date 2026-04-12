import type {
  User,
  Team,
  Group,
  Match,
  Prediction,
  Quiniela,
  QuinielaScore,
  TournamentPrediction,
  PaymentReport,
} from "@/generated/prisma/client";

// Extended types with relations
export type MatchWithTeams = Match & {
  homeTeam: Team | null;
  awayTeam: Team | null;
};

export type MatchWithDetails = MatchWithTeams & {
  venue: { name: string; city: string; country: string } | null;
  group: { name: string } | null;
};

export type PredictionWithMatch = Prediction & {
  match: MatchWithTeams;
};

export type GroupWithTeams = Group & {
  teams: Team[];
};

// Quiniela types
export type QuinielaWithScore = Quiniela & {
  score: QuinielaScore | null;
};

export type QuinielaWithUser = Quiniela & {
  user: Pick<User, "id" | "name" | "nickname" | "image">;
};

export type LeaderboardEntry = QuinielaScore & {
  quiniela: QuinielaWithUser;
};

export type UserWithQuinielas = User & {
  quinielas: QuinielaWithScore[];
};

export type TournamentPredictionWithTeam = TournamentPrediction & {
  team: Team | null;
};

// Payment types
export type PaymentReportWithUser = PaymentReport & {
  user: Pick<User, "id" | "name" | "nickname" | "email">;
};
