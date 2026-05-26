import { z } from "zod";
import { CategoryType, TournamentFormat } from "@prisma/client";

export const createCategorySchema = z.object({
  tournamentId: z.string().min(1, "Tournament ID is required"),
  name: z.string().min(3, "Category name must be at least 3 characters").max(100),
  type: z.nativeEnum(CategoryType),
  format: z.nativeEnum(TournamentFormat),
  poolSize: z.coerce.number().catch(4),
  advanceCount: z.coerce.number().catch(2),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
