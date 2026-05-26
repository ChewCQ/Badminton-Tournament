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
  estimatedMatchDurationMinutes: z.coerce.number().min(10).max(120).default(30),
  restPeriodMinutes: z.coerce.number().min(0).max(120).default(20),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
