"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function reassignMatch(
  matchId: string, 
  courtId: string | null, 
  scheduledStartTime: Date | null,
  tournamentId: string,
  force: boolean = false
) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { estimatedMatchDurationMinutes: true, restPeriodMinutes: true }
    });
    
    const durationMins = tournament?.estimatedMatchDurationMinutes || 30;
    
    // 1. If dropping into the queue (courtId is null), just clear it
    if (!courtId || !scheduledStartTime) {
      await prisma.match.update({
        where: { id: matchId },
        data: { courtId: null, scheduledStartTime: null, scheduledEndTime: null },
      });
      revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/courts`);
      return { success: true };
    }

    // 2. We are dropping onto a court. Check Rest Rules if not forced.
    const scheduledEndTime = new Date(scheduledStartTime.getTime() + durationMins * 60000);
    const restPeriod = tournament?.restPeriodMinutes || 20;

    if (!force) {
      const draggedMatch = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          participant1: { include: { playerLinks: { select: { playerId: true } } } },
          participant2: { include: { playerLinks: { select: { playerId: true } } } },
        }
      });
      
      const playerIds = new Set<string>();
      draggedMatch?.participant1?.playerLinks.forEach(link => playerIds.add(link.playerId));
      draggedMatch?.participant2?.playerLinks.forEach(link => playerIds.add(link.playerId));

      if (playerIds.size > 0) {
        const otherMatches = await prisma.match.findMany({
          where: {
            id: { not: matchId },
            status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
            OR: [
              { participant1: { playerLinks: { some: { playerId: { in: Array.from(playerIds) } } } } },
              { participant2: { playerLinks: { some: { playerId: { in: Array.from(playerIds) } } } } }
            ],
            scheduledStartTime: { not: null },
            scheduledEndTime: { not: null }
          }
        });

        for (const other of otherMatches) {
          if (!other.scheduledStartTime || !other.scheduledEndTime) continue;
          
          let gapMins = 0;
          if (other.scheduledEndTime <= scheduledStartTime) {
            gapMins = (scheduledStartTime.getTime() - other.scheduledEndTime.getTime()) / 60000;
          } else if (scheduledEndTime <= other.scheduledStartTime) {
            gapMins = (other.scheduledStartTime.getTime() - scheduledEndTime.getTime()) / 60000;
          } else {
             return { success: false, requiresConfirmation: true, warning: `Overlap Warning: One or more players in this match are already playing at this time in another match. Proceed anyway?` };
          }

          if (gapMins < restPeriod) {
             return { success: false, requiresConfirmation: true, warning: `Rest Warning: Players require ${restPeriod} mins of rest between matches. This gap is only ${Math.round(gapMins)} mins. Proceed anyway?` };
          }
        }
      }
    }

    // Execute Ripple Shift (Squeeze).
    // Get all matches on the target court that start AT OR AFTER the drop time
    const existingMatches = await prisma.match.findMany({
      where: { 
        courtId,
        id: { not: matchId }, // Exclude the match we are dragging
        scheduledStartTime: { gte: scheduledStartTime },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] } 
      },
      orderBy: { scheduledStartTime: 'asc' }
    });

    // Bulk update tracking
    const updates = [];

    // First update is the dragged match itself
    updates.push(
      prisma.match.update({
        where: { id: matchId },
        data: { courtId, scheduledStartTime, scheduledEndTime }
      })
    );

    // Now ripple shift subsequent matches if they overlap
    let currentEndTimeMs = scheduledEndTime.getTime();

    for (const match of existingMatches) {
      if (!match.scheduledStartTime || !match.scheduledEndTime) continue;
      
      const mStartMs = match.scheduledStartTime.getTime();
      const mEndMs = match.scheduledEndTime.getTime();
      const mDurationMs = mEndMs - mStartMs;

      // If this match starts before the previous match ends (Overlap!)
      if (mStartMs < currentEndTimeMs) {
        const newStart = new Date(currentEndTimeMs);
        const newEnd = new Date(currentEndTimeMs + mDurationMs);

        updates.push(
          prisma.match.update({
            where: { id: match.id },
            data: {
              scheduledStartTime: newStart,
              scheduledEndTime: newEnd
            }
          })
        );
        
        currentEndTimeMs = newEnd.getTime();
      } else {
        // No overlap, so the ripple stops pushing (but we keep checking just in case of weird gaps)
        currentEndTimeMs = Math.max(currentEndTimeMs, mEndMs);
      }
    }

    // Run all updates in a transaction
    await prisma.$transaction(updates);

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/courts`);
    return { success: true };
  } catch (error) {
    console.error("Failed to reassign match:", error);
    return { success: false, error: "Failed to reassign match" };
  }
}

export async function resetDraw(categoryId: string, tournamentId: string) {
  try {
    // Delete all matches for this category so the admin can regenerate
    await prisma.match.deleteMany({
      where: { categoryId }
    });
    
    // Also delete any pools generated for this category
    await prisma.pool.deleteMany({
      where: { categoryId }
    });

    // Reset poolId for participants
    await prisma.participant.updateMany({
      where: { categoryId },
      data: { poolId: null }
    });

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/draws`);
    return { success: true };
  } catch (error) {
    console.error("Failed to reset draw:", error);
    return { success: false, error: "Failed to reset draw" };
  }
}

export async function globalAutoSchedule(tournamentId: string, categoryPriorityIds: string[]) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { courts: { orderBy: { courtNumber: 'asc' } } }
    });
    if (!tournament) throw new Error("Tournament not found");

    // Fetch all SCHEDULED matches to be scheduled
    const matches = await prisma.match.findMany({
      where: {
        category: { tournamentId },
        status: 'SCHEDULED'
      },
      include: {
        category: {
          include: { participants: true }
        }
      }
    });

    if (matches.length === 0) return { success: true };

    // Build participant name map for global rest tracking
    const participantNameMap = new Map<string, string>();
    for (const match of matches) {
      for (const p of match.category.participants) {
        if (!participantNameMap.has(p.id)) {
          participantNameMap.set(p.id, p.name);
        }
      }
    }

    // Convert db matches to GeneratedMatch format
    const generatedMatches = matches.map(m => ({
      id: m.id,
      categoryId: m.categoryId,
      poolId: m.poolId,
      participant1Id: m.participant1Id,
      participant2Id: m.participant2Id,
      roundNumber: m.roundNumber,
      bracketRound: m.bracketRound,
      bracketPosition: m.bracketPosition,
      nextMatchId: m.nextMatchId,
      nextMatchSlot: m.nextMatchSlot,
      isBye: m.status === 'BYE'
    }));

    // Run the global interleaved gap-finding algorithm
    const { assignMatchesToCourts } = await import('@/lib/scheduler/court-assigner');
    
    // ── Fetch Existing Non-Scheduled Matches ──────────────────────────────
    const existingMatches = await prisma.match.findMany({
      where: {
        category: { tournamentId },
        status: { in: ['IN_PROGRESS', 'COMPLETED'] },
        courtId: { not: null },
        scheduledStartTime: { not: null },
        scheduledEndTime: { not: null }
      },
      include: { participant1: true, participant2: true }
    });

    const existingCourtSchedules = new Map<string, { start: Date; end: Date }[]>();
    const existingPlayerLastMatchEnd = new Map<string, Date>();

    for (const em of existingMatches) {
      if (!em.courtId || !em.scheduledStartTime || !em.scheduledEndTime) continue;
      
      if (!existingCourtSchedules.has(em.courtId)) {
        existingCourtSchedules.set(em.courtId, []);
      }
      existingCourtSchedules.get(em.courtId)!.push({
        start: em.scheduledStartTime,
        end: em.scheduledEndTime
      });

      const addPlayerRest = (pId: string | null) => {
        if (!pId) return;
        const rawName = em.participant1Id === pId ? em.participant1?.name : em.participant2?.name;
        if (!rawName) return;
        const names = rawName.split(/[/,&+]/);
        for (const name of names) {
          const normalized = name.trim().toLowerCase().replace(/\s+/g, '');
          if (!normalized) continue;
          const existing = existingPlayerLastMatchEnd.get(normalized);
          if (!existing || em.scheduledEndTime!.getTime() > existing.getTime()) {
            existingPlayerLastMatchEnd.set(normalized, em.scheduledEndTime!);
          }
        }
      };
      addPlayerRest(em.participant1Id);
      addPlayerRest(em.participant2Id);
    }

    const scheduledMatches = assignMatchesToCourts(
      generatedMatches,
      tournament.courts,
      {
        tournamentStartTime: tournament.startDate,
        estimatedMatchDurationMinutes: tournament.estimatedMatchDurationMinutes,
        restPeriodMinutes: tournament.restPeriodMinutes
      },
      participantNameMap,
      existingCourtSchedules,
      existingPlayerLastMatchEnd,
      categoryPriorityIds
    );

    // Save everything back to the database in a massive transaction
    const updates = scheduledMatches.map(sm => 
      prisma.match.update({
        where: { id: sm.id },
        data: {
          courtId: "courtId" in sm ? sm.courtId : null,
          scheduledStartTime: "scheduledStartTime" in sm ? sm.scheduledStartTime : null,
          scheduledEndTime: "scheduledEndTime" in sm ? sm.scheduledEndTime : null,
        }
      })
    );

    await prisma.$transaction(updates);

    revalidatePath(`/hq-admin-v2/tournaments/${tournamentId}/courts`);
    return { success: true };
  } catch (error) {
    console.error("Failed global auto schedule:", error);
    return { success: false, error: "Failed to auto-schedule" };
  }
}
