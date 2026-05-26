import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().min(3, "Tournament name must be at least 3 characters").max(100),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid end date",
  }),
  numberOfCourts: z.coerce.number().min(1, "Must have at least 1 court").max(50),
  estimatedMatchDurationMinutes: z.coerce.number().min(10).max(120),
  restPeriodMinutes: z.coerce.number().min(0).max(120),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

// Schema for the /api/tournaments POST route
export const CreateTournamentSchema = z.object({
  name: z.string().min(3),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  numberOfCourts: z.number().int().min(1),
  estimatedMatchDurationMinutes: z.number().int().min(1),
  restPeriodMinutes: z.number().int().min(0),
  categories: z.array(z.object({
    name: z.string(),
    type: z.enum(["SINGLES", "DOUBLES", "MIXED_DOUBLES"]),
    format: z.enum(["ROUND_ROBIN", "KNOCKOUT", "POOL_TO_BRACKET"]),
    poolSize: z.number().int().default(4),
    advanceCount: z.number().int().default(2),
    participants: z.array(z.object({
      name: z.string(),
      seed: z.number().nullable().optional(),
      playerIds: z.array(z.string())
    }))
  }))
});

// Schema for the /api/matches/[id]/score PATCH route
export const SubmitScoreSchema = z.object({
  winnerId: z.string(),
  sets: z.array(z.object({
    setNumber: z.number().int().min(1).max(3),
    score1: z.number().int().min(0),
    score2: z.number().int().min(0),
  })).min(1).max(3),
});
