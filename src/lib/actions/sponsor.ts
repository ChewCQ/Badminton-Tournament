"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSponsor(tournamentId: string, data: { name: string; logoUrl: string; tier?: string }) {
  try {
    await prisma.sponsor.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        tier: data.tier || "STANDARD",
        tournamentId,
      },
    });
    
    revalidatePath(`/admin/tournaments/${tournamentId}/display`);
    revalidatePath(`/tournaments/${tournamentId}/tv`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to create sponsor:", error);
    return { success: false, error: "Failed to create sponsor" };
  }
}

export async function deleteSponsor(tournamentId: string, sponsorId: string) {
  try {
    await prisma.sponsor.delete({
      where: { id: sponsorId },
    });
    
    revalidatePath(`/admin/tournaments/${tournamentId}/display`);
    revalidatePath(`/tournaments/${tournamentId}/tv`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sponsor:", error);
    return { success: false, error: "Failed to delete sponsor" };
  }
}

export async function updateSponsorTier(tournamentId: string, sponsorId: string, tier: string) {
  try {
    await prisma.sponsor.update({
      where: { id: sponsorId },
      data: { tier },
    });
    
    revalidatePath(`/admin/tournaments/${tournamentId}/display`);
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/tv`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update sponsor tier:", error);
    return { success: false, error: "Failed to update sponsor tier" };
  }
}

export async function moveSponsor(tournamentId: string, sponsorId: string, direction: 'UP' | 'DOWN') {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: { tournamentId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    const index = sponsors.findIndex(s => s.id === sponsorId);
    if (index === -1) return { success: false, error: "Sponsor not found" };

    const reorderedList = [...sponsors];
    if (direction === 'UP' && index > 0) {
      [reorderedList[index - 1], reorderedList[index]] = [reorderedList[index], reorderedList[index - 1]];
    } else if (direction === 'DOWN' && index < sponsors.length - 1) {
      [reorderedList[index + 1], reorderedList[index]] = [reorderedList[index], reorderedList[index + 1]];
    } else {
      return { success: true };
    }

    await prisma.$transaction(
      reorderedList.map((s, i) => 
        prisma.sponsor.update({
          where: { id: s.id },
          data: { order: i }
        })
      )
    );

    revalidatePath(`/admin/tournaments/${tournamentId}/display`);
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/tv`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to move sponsor:", error);
    return { success: false, error: "Failed to move sponsor" };
  }
}
