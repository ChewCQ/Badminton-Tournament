"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function bulkImportParticipants(
  categoryId: string,
  tournamentId: string,
  rawData: string
) {
  try {
    // Basic validation
    if (!rawData || rawData.trim() === "") {
      return { success: false, error: "No data provided." };
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return { success: false, error: "Category not found." };
    }

    // Split by newlines, ignoring completely empty lines
    const lines = rawData.split(/\r?\n/).filter(line => line.trim() !== "");
    let importedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        // Support Tab separated pasting from Excel
        const columns = line.split('\t').map(c => c.trim());
        
        const participantName = columns[0];
        if (!participantName) continue;

        // If a second column exists, treat it as the team name
        const teamName = columns.length > 1 && columns[1] !== "" ? columns[1] : null;

        // Create a dummy underlying Player record for relational integrity.
        // If it's a doubles team (e.g. "John / Mike"), we just store the full string as the "lastName" for now,
        // or parse it if we wanted to get fancy. For MVP, we just store it in lastName.
        const player = await tx.player.create({
          data: {
            firstName: "Imported",
            lastName: participantName,
          }
        });

        // Create the Participant entry
        await tx.participant.create({
          data: {
            name: participantName,
            teamName: teamName,
            categoryId: category.id,
            playerLinks: {
              create: {
                playerId: player.id
              }
            }
          }
        });

        importedCount++;
      }
    });

    // Revalidate paths so the UI updates instantly
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/participants`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);

    return { success: true, count: importedCount };
  } catch (error) {
    console.error("Failed to bulk import:", error);
    return { success: false, error: "An unexpected error occurred during import." };
  }
}

export async function deleteParticipant(participantId: string, tournamentId: string) {
  try {
    await prisma.participant.delete({
      where: { id: participantId }
    });
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/participants`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete participant:", error);
    return { success: false, error: "Failed to delete participant." };
  }
}

export async function updateParticipant(participantId: string, tournamentId: string, data: { name: string; teamName: string | null }) {
  try {
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        name: data.name,
        teamName: data.teamName,
      }
    });
    // Also try to update the dummy Player record linked, if there's only 1 player linked
    const links = await prisma.playerOnParticipant.findMany({
      where: { participantId },
      include: { player: true }
    });
    if (links.length === 1) {
      await prisma.player.update({
        where: { id: links[0].playerId },
        data: { lastName: data.name }
      });
    }

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/participants`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update participant:", error);
    return { success: false, error: "Failed to update participant." };
  }
}

export async function toggleWalkover(participantId: string, tournamentId: string, walkover: boolean) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update the participant's walkover field
      await tx.participant.update({
        where: { id: participantId },
        data: { walkover }
      });

      if (walkover) {
        // Find all SCHEDULED matches involving this participant
        const matchesToWalkover = await tx.match.findMany({
          where: {
            OR: [
              { participant1Id: participantId },
              { participant2Id: participantId }
            ],
            status: 'SCHEDULED'
          }
        });

        for (const match of matchesToWalkover) {
          const winnerId = match.participant1Id === participantId ? match.participant2Id : match.participant1Id;
          
          if (!winnerId) continue; // If opponent is TBA, we can't walkover yet

          // Mark match as WALKOVER
          await tx.match.update({
            where: { id: match.id },
            data: {
              status: 'WALKOVER',
              winnerId: winnerId
            }
          });

          // Advance the opponent
          if (match.nextMatchId && match.nextMatchSlot) {
            const updateField = match.nextMatchSlot === "SLOT_1" ? "participant1Id" : "participant2Id";
            await tx.match.update({
              where: { id: match.nextMatchId },
              data: { [updateField]: winnerId }
            });
          }
        }
      } else {
        // Undo walkovers: find matches marked as WALKOVER involving this participant
        const walkoverMatches = await tx.match.findMany({
          where: {
            OR: [
              { participant1Id: participantId },
              { participant2Id: participantId }
            ],
            status: 'WALKOVER'
          }
        });

        for (const match of walkoverMatches) {
          const winnerId = match.winnerId;

          // Revert match back to SCHEDULED
          await tx.match.update({
            where: { id: match.id },
            data: {
              status: 'SCHEDULED',
              winnerId: null
            }
          });

          // Remove the opponent from the next match
          if (match.nextMatchId && match.nextMatchSlot && winnerId) {
            const updateField = match.nextMatchSlot === "SLOT_1" ? "participant1Id" : "participant2Id";
            
            // Check if the opponent actually advanced to the next match
            const nextMatch = await tx.match.findUnique({ where: { id: match.nextMatchId }});
            // We need to satisfy TS index signature, but we know it's one of these fields.
            const currentParticipantInSlot = updateField === "participant1Id" ? nextMatch?.participant1Id : nextMatch?.participant2Id;
            
            if (currentParticipantInSlot === winnerId) {
                await tx.match.update({
                    where: { id: match.nextMatchId },
                    data: { [updateField]: null }
                });
            }
          }
        }
      }
    });

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/participants`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle walkover:", error);
    return { success: false, error: "Failed to toggle walkover status." };
  }
}
