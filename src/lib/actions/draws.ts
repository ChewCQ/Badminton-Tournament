"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateParticipantSeed(participantId: string, seed: number | null, tournamentId: string) {
  try {
    await prisma.participant.update({
      where: { id: participantId },
      data: { seed },
    });

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
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

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/courts`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update match time:", error);
    return { success: false, error: "Failed to update match time" };
  }
}

export async function swapParticipants(
  participantAId: string,
  participantBId: string,
  categoryId: string,
  tournamentId: string
) {
  try {
    // 1. Check if any matches have started in this category
    const startedMatches = await prisma.match.count({
      where: {
        categoryId,
        status: { in: ["IN_PROGRESS", "COMPLETED", "WALKOVER"] }
      }
    });

    if (startedMatches > 0) {
      return { success: false, error: "Cannot swap participants after matches have started in this category." };
    }

    // 2. Fetch the participants to swap their seeds and pool assignments
    const partA = await prisma.participant.findUnique({ where: { id: participantAId } });
    const partB = await prisma.participant.findUnique({ where: { id: participantBId } });

    if (!partA || !partB) {
      return { success: false, error: "Participants not found." };
    }

    // 3. Fetch all matches involving either participant
    const matchesA1 = await prisma.match.findMany({ where: { categoryId, participant1Id: participantAId } });
    const matchesA2 = await prisma.match.findMany({ where: { categoryId, participant2Id: participantAId } });
    const matchesB1 = await prisma.match.findMany({ where: { categoryId, participant1Id: participantBId } });
    const matchesB2 = await prisma.match.findMany({ where: { categoryId, participant2Id: participantBId } });

    const updates = [];

    // Swap A -> B
    for (const m of matchesA1) {
      updates.push(prisma.match.update({ where: { id: m.id }, data: { participant1Id: participantBId } }));
    }
    for (const m of matchesA2) {
      updates.push(prisma.match.update({ where: { id: m.id }, data: { participant2Id: participantBId } }));
    }

    // Swap B -> A
    for (const m of matchesB1) {
      updates.push(prisma.match.update({ where: { id: m.id }, data: { participant1Id: participantAId } }));
    }
    for (const m of matchesB2) {
      updates.push(prisma.match.update({ where: { id: m.id }, data: { participant2Id: participantAId } }));
    }

    // Swap seeds and pools
    updates.push(prisma.participant.update({
      where: { id: participantAId },
      data: { seed: partB.seed, poolId: partB.poolId }
    }));
    
    updates.push(prisma.participant.update({
      where: { id: participantBId },
      data: { seed: partA.seed, poolId: partA.poolId }
    }));

    // Execute massive transaction
    await prisma.$transaction(updates);

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws/${categoryId}/bracket`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to swap participants:", error);
    return { success: false, error: "Failed to swap participants" };
  }
}
