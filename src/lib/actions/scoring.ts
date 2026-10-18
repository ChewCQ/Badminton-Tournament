"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface SetScore {
  setNumber: number;
  score1: number;
  score2: number;
}

export async function saveMatchScore(
  matchId: string,
  tournamentId: string,
  scores: SetScore[],
  isFinal: boolean = true
) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { category: { include: { tournament: true } } }
    });

    if (!match) return { success: false, error: "Match not found" };

    const bestOf = match.category.bestOf;
    const setsToWin = Math.ceil(bestOf / 2);

    // Count sets won by each participant
    let p1SetsWon = 0;
    let p2SetsWon = 0;

    for (const s of scores) {
      if (s.score1 > s.score2) p1SetsWon++;
      else if (s.score2 > s.score1) p2SetsWon++;
    }

    // Determine winner
    let winnerId: string | null = null;
    let newStatus: "IN_PROGRESS" | "COMPLETED" = "IN_PROGRESS";

    if (isFinal) {
      if (p1SetsWon >= setsToWin) {
        winnerId = match.participant1Id;
        newStatus = "COMPLETED";
      } else if (p2SetsWon >= setsToWin) {
        winnerId = match.participant2Id;
        newStatus = "COMPLETED";
      } else {
        return { success: false, error: "Cannot finalize: no player has won enough sets." };
      }
    }

    // Save everything in a transaction
    await prisma.$transaction(async (tx) => {
      // Upsert all set scores
      for (const s of scores) {
        await tx.matchSet.upsert({
          where: {
            matchId_setNumber: { matchId, setNumber: s.setNumber }
          },
          create: {
            matchId,
            setNumber: s.setNumber,
            score1: s.score1,
            score2: s.score2,
          },
          update: {
            score1: s.score1,
            score2: s.score2,
          }
        });
      }

      // Update match status & winner
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: newStatus,
          winnerId,
        }
      });

      // If completed, advance winner to next match
      if (newStatus === "COMPLETED" && winnerId && match.nextMatchId && match.nextMatchSlot) {
        const updateField = match.nextMatchSlot === "SLOT_1" ? "participant1Id" : "participant2Id";
        await tx.match.update({
          where: { id: match.nextMatchId },
          data: { [updateField]: winnerId }
        });
      }
    });

    const slug = match.category.tournament.slug;
    const paths = [
      `/hq-admin-v2/tournaments/${tournamentId}`,
      `/tournaments/${tournamentId}`,
      `/tournaments/${tournamentId}/schedule`,
      `/tournaments/${tournamentId}/draws`,
      `/tournaments/${tournamentId}/draws/${match.categoryId}`,
      `/tournaments/${tournamentId}/live`,
      `/tournaments/${tournamentId}/tv`,
    ];
    if (slug && slug !== tournamentId) {
      paths.push(
        `/hq-admin-v2/tournaments/${slug}`,
        `/tournaments/${slug}`,
        `/tournaments/${slug}/schedule`,
        `/tournaments/${slug}/draws`,
        `/tournaments/${slug}/draws/${match.categoryId}`,
        `/tournaments/${slug}/live`,
        `/tournaments/${slug}/tv`
      );
    }
    for (const p of paths) {
      revalidatePath(p);
    }
    return { success: true, winnerId, status: newStatus };
  } catch (error) {
    console.error("Failed to save match score:", error);
    return { success: false, error: "Failed to save score" };
  }
}

export async function markWalkover(
  matchId: string,
  tournamentId: string,
  winnerParticipantId: string,
  reason: "WALKOVER" | "BYE" | "CANCELLED"
) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { category: { include: { tournament: true } } }
    });

    if (!match) return { success: false, error: "Match not found" };

    await prisma.$transaction(async (tx) => {
      // Set status and winner
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: reason,
          winnerId: winnerParticipantId,
        }
      });

      // Advance winner to next match
      if (match.nextMatchId && match.nextMatchSlot) {
        const updateField = match.nextMatchSlot === "SLOT_1" ? "participant1Id" : "participant2Id";
        await tx.match.update({
          where: { id: match.nextMatchId },
          data: { [updateField]: winnerParticipantId }
        });
      }
    });

    const slug = match.category.tournament.slug;
    const paths = [
      `/hq-admin-v2/tournaments/${tournamentId}`,
      `/tournaments/${tournamentId}`,
      `/tournaments/${tournamentId}/schedule`,
      `/tournaments/${tournamentId}/draws`,
      `/tournaments/${tournamentId}/draws/${match.categoryId}`,
      `/tournaments/${tournamentId}/live`,
      `/tournaments/${tournamentId}/tv`,
    ];
    if (slug && slug !== tournamentId) {
      paths.push(
        `/hq-admin-v2/tournaments/${slug}`,
        `/tournaments/${slug}`,
        `/tournaments/${slug}/schedule`,
        `/tournaments/${slug}/draws`,
        `/tournaments/${slug}/draws/${match.categoryId}`,
        `/tournaments/${slug}/live`,
        `/tournaments/${slug}/tv`
      );
    }
    for (const p of paths) {
      revalidatePath(p);
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to mark walkover:", error);
    return { success: false, error: "Failed to mark walkover" };
  }
}
