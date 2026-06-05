"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createTournamentSchema, type CreateTournamentInput } from "@/lib/validations/tournament";

// ──────────────────────────────────────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────────────────────────────────────

export async function createTournament(data: CreateTournamentInput) {
  try {
    // 1. Validate input strictly
    const parsedData = createTournamentSchema.parse(data);

    // 2. Create the tournament in the database
    const tournament = await prisma.tournament.create({
      data: {
        name: parsedData.name,
        slug: parsedData.slug,
        startDate: new Date(parsedData.startDate),
        endDate: parsedData.endDate ? new Date(parsedData.endDate) : null,
        numberOfCourts: parsedData.numberOfCourts,
        estimatedMatchDurationMinutes: parsedData.estimatedMatchDurationMinutes,
        restPeriodMinutes: parsedData.restPeriodMinutes,
        status: "DRAFT", // New tournaments start in DRAFT mode
        
        // Automatically create the requested number of courts
        courts: {
          create: Array.from({ length: parsedData.numberOfCourts }).map((_, i) => ({
            name: `Court ${i + 1}`,
            courtNumber: i + 1,
          })),
        },
      },
    });

    // 3. Revalidate the admin dashboard so the new tournament appears immediately
    revalidatePath("/hq-admin-v2");

    return { success: true, tournamentId: tournament.id };
  } catch (error) {
    console.error("Failed to create tournament:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "An unexpected error occurred while creating the tournament." };
  }
}

export async function updateTournamentDetails(id: string, data: { 
  name?: string;
  venue?: string; 
  posterUrl?: string;
  hostLogoUrl?: string;
  startDate?: Date;
  endDate?: Date | null;
  status?: "DRAFT" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  numberOfCourts?: number;
  estimatedMatchDurationMinutes?: number;
  restPeriodMinutes?: number;
}) {
  try {
    // If number of courts changes, we need to sync the Court records
    if (data.numberOfCourts !== undefined) {
      const currentTournament = await prisma.tournament.findUnique({
        where: { id },
        include: { courts: true }
      });
      
      if (currentTournament && currentTournament.numberOfCourts !== data.numberOfCourts) {
        if (data.numberOfCourts > currentTournament.numberOfCourts) {
          // Add new courts
          const courtsToAdd = data.numberOfCourts - currentTournament.numberOfCourts;
          await prisma.court.createMany({
            data: Array.from({ length: courtsToAdd }).map((_, i) => ({
              tournamentId: id,
              name: `Court ${currentTournament.numberOfCourts + i + 1}`,
              courtNumber: currentTournament.numberOfCourts + i + 1,
            }))
          });
        } else {
          // Remove highest numbered courts
          const courtsToKeep = data.numberOfCourts;
          await prisma.court.deleteMany({
            where: {
              tournamentId: id,
              courtNumber: { gt: courtsToKeep }
            }
          });
        }
      }
    }

    await prisma.tournament.update({
      where: { id },
      data: {
        name: data.name,
        venue: data.venue,
        posterUrl: data.posterUrl,
        hostLogoUrl: data.hostLogoUrl,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        numberOfCourts: data.numberOfCourts,
        estimatedMatchDurationMinutes: data.estimatedMatchDurationMinutes,
        restPeriodMinutes: data.restPeriodMinutes,
      },
    });
    
    revalidatePath(`/hq-admin-v2/tournaments/${id}`);
    revalidatePath(`/hq-admin-v2/tournaments/${id}/settings`);
    revalidatePath("/hq-admin-v2");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update tournament:", error);
    return { success: false, error: "Failed to update tournament details." };
  }
}

export async function deleteTournament(id: string) {
  try {
    // Prisma's Cascade delete will wipe out everything connected to this tournament
    await prisma.tournament.delete({
      where: { id }
    });
    
    revalidatePath("/hq-admin-v2");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete tournament:", error);
    return { success: false, error: "Failed to completely delete tournament." };
  }
}
