import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Resolve a tournament slug to its database ID.
 * Uses React cache() to deduplicate across components in the same request.
 */
export const getTournamentIdBySlug = cache(async (slug: string): Promise<string | null> => {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });
  return tournament?.id ?? null;
});
