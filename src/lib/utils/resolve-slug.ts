import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Resolve a tournament slug to its database ID.
 * Uses React cache() to deduplicate across components in the same request.
 */
export const getTournamentIdBySlug = cache(async (slugOrId: string): Promise<string | null> => {
  const tournament = await prisma.tournament.findFirst({
    where: {
      OR: [
        { slug: slugOrId },
        { id: slugOrId },
      ],
    },
    select: { id: true },
  });
  return tournament?.id ?? null;
});
