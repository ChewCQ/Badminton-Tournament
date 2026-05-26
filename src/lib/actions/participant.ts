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
    revalidatePath(`/admin/tournaments/${tournamentId}/participants`);
    revalidatePath(`/admin/tournaments/${tournamentId}/draws`);

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
    revalidatePath(`/admin/tournaments/${tournamentId}/participants`);
    revalidatePath(`/admin/tournaments/${tournamentId}/draws`);
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

    revalidatePath(`/admin/tournaments/${tournamentId}/participants`);
    revalidatePath(`/admin/tournaments/${tournamentId}/draws`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update participant:", error);
    return { success: false, error: "Failed to update participant." };
  }
}
