"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateParticipantSeed(participantId: string, seed: number | null, tournamentId: string) {
  try {
    await prisma.participant.update({
      where: { id: participantId },
      data: { seed },
    });

    revalidatePath(`/admin/tournaments/${tournamentId}/draws`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update seed:", error);
    return { success: false, error: "Failed to update seed" };
  }
}

export async function updateMatchTime(matchId: string, scheduledStartTime: Date, tournamentId: string) {
  try {
    await prisma.match.update({
      where: { id: matchId },
      data: { scheduledStartTime },
    });

    revalidatePath(`/admin/tournaments/${tournamentId}/draws`);
    revalidatePath(`/admin/tournaments/${tournamentId}/courts`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update match time:", error);
    return { success: false, error: "Failed to update match time" };
  }
}
