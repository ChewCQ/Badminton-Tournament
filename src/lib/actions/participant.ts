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
