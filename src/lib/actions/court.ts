"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateCourtName(courtId: string, newName: string, tournamentId: string) {
  try {
    if (!newName || newName.trim() === "") {
      return { success: false, error: "Court name cannot be empty." };
    }

    await prisma.court.update({
      where: { id: courtId },
      data: { name: newName.trim() },
    });

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/courts`);
    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/display`);
    revalidatePath(`/tournaments/${tournamentId}/live`);
    revalidatePath(`/tournaments/${tournamentId}/tv`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update court name:", error);
    return { success: false, error: "Failed to update court name." };
  }
}
