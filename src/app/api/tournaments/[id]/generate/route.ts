import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateRoundRobinPairings,
  generateKnockoutBracket,
  generatePoolToBracket,
  assignMatchesToCourts,
} from "@/lib/scheduler";
import type {
  GeneratedMatch,
  SchedulerConfig,
} from "@/lib/scheduler/types";

// ============================================================================
// POST /api/tournaments/[id]/generate — Generate match schedule for a category
// ============================================================================
// Generates all matches for a given category based on its tournament format:
//   - ROUND_ROBIN:      Circle-method pool matches
//   - KNOCKOUT:         Seeded bracket with byes
//   - POOL_TO_BRACKET:  Pool play first, knockout after (deferred)
//
// Then assigns all generated matches to courts chronologically with
// 20-minute rest enforcement between matches for the same player.
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;

    const body = await request.json();
    const { categoryId } = body;

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 }
      );
    }

    // ── Load tournament, category, participants, courts ──────────────────

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { courts: { orderBy: { courtNumber: "asc" } } },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, tournamentId },
      include: {
        participants: {
          include: {
            playerLinks: true,
          },
          orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found in this tournament" },
        { status: 404 }
      );
    }

    if (category.participants.length < 2) {
      return NextResponse.json(
        { error: "At least 2 participants are required to generate a schedule" },
        { status: 400 }
      );
    }

    // Check if matches already exist for this category
    const existingMatchCount = await prisma.match.count({
      where: { categoryId },
    });

    if (existingMatchCount > 0) {
      return NextResponse.json(
        {
          error:
            "Matches already generated for this category. Delete existing matches first.",
        },
        { status: 409 }
      );
    }

    // ── Build participant name mapping (for cross-category rest enforcement) ────

    const participantNameMap = new Map<string, string>();
    for (const p of category.participants) {
      participantNameMap.set(p.id, p.name);
    }

    const participantIds = category.participants.map((p) => p.id);

    // Sort by seed if seeds exist, otherwise use registration order
    const seededIds = [...category.participants]
      .sort((a, b) => {
        if (a.seed != null && b.seed != null) return a.seed - b.seed;
        if (a.seed != null) return -1;
        if (b.seed != null) return 1;
        return 0;
      })
      .map((p) => p.id);

    // ── Generate matches based on format ────────────────────────────────

    let generatedMatches: GeneratedMatch[] = [];
    let poolRecords: { poolId: string; name: string; poolNumber: number; participantIds: string[] }[] = [];

    switch (category.format) {
      // ────────────────────────────────────────────────────────────────────
      // ROUND ROBIN — All participants in a single pool
      // ────────────────────────────────────────────────────────────────────
      case "ROUND_ROBIN": {
        const rounds = generateRoundRobinPairings(participantIds);
        let matchCounter = 0;

        for (const round of rounds) {
          for (const pairing of round.pairings) {
            generatedMatches.push({
              id: `rr-${++matchCounter}`,
              participant1Id: pairing.participant1Id,
              participant2Id: pairing.participant2Id,
              roundNumber: round.roundNumber,
              isBye: false,
            });
          }
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────────
      // KNOCKOUT — Seeded single-elimination bracket
      // ────────────────────────────────────────────────────────────────────
      case "KNOCKOUT": {
        const bracket = generateKnockoutBracket(seededIds);
        generatedMatches = bracket.matches;
        break;
      }

      // ────────────────────────────────────────────────────────────────────
      // POOL TO BRACKET — Pool play first, knockout deferred until
      //                    pool standings are computed after score entry
      // ────────────────────────────────────────────────────────────────────
      case "POOL_TO_BRACKET": {
        const result = generatePoolToBracket(seededIds, {
          poolSize: category.poolSize,
          advanceCount: category.advanceCount,
        });

        generatedMatches = result.poolMatches;
        poolRecords = result.pools.map((pool, i) => ({
          poolId: pool.poolId,
          name: `Pool ${String.fromCharCode(65 + i)}`, // Pool A, Pool B, ...
          poolNumber: i + 1,
          participantIds: pool.participantIds,
        }));
        break;
      }
    }

    // ── Separate bye matches from real matches ──────────────────────────

    const byeMatches = generatedMatches.filter((m) => m.isBye);
    const realMatches = generatedMatches.filter((m) => !m.isBye);

    // ── Fetch Global Existing Schedules ─────────────────────────────────
    const existingMatches = await prisma.match.findMany({
      where: {
        category: { tournamentId },
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
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

      // Track existing player rest
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

    // ── Assign courts and times to real matches ─────────────────────────

    const schedulerConfig: SchedulerConfig = {
      tournamentStartTime: tournament.startDate,
      estimatedMatchDurationMinutes: tournament.estimatedMatchDurationMinutes,
      restPeriodMinutes: tournament.restPeriodMinutes,
    };

    const scheduledMatches = assignMatchesToCourts(
      realMatches,
      tournament.courts.map((c) => ({ id: c.id, name: c.name })),
      schedulerConfig,
      participantNameMap,
      existingCourtSchedules,
      existingPlayerLastMatchEnd
    );

    // ── Build a mapping from temp IDs to real match IDs ─────────────────
    // We need this for wiring nextMatchId in the database

    const tempIdToDbId = new Map<string, string>();

    // ── Persist everything in a transaction ──────────────────────────────

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Pools (for Pool-to-Bracket format)
      const dbPools: { id: string; tempId: string }[] = [];

      if (poolRecords.length > 0) {
        for (const poolRec of poolRecords) {
          const pool = await tx.pool.create({
            data: {
              name: poolRec.name,
              poolNumber: poolRec.poolNumber,
              categoryId: category.id,
            },
          });

          dbPools.push({ id: pool.id, tempId: poolRec.poolId });

          // Assign participants to pools
          await Promise.all(
            poolRec.participantIds.map((pId) =>
              tx.participant.update({
                where: { id: pId },
                data: { poolId: pool.id },
              })
            )
          );
        }
      }

      // Helper to resolve pool temp IDs
      const resolvePoolId = (tempPoolId?: string): string | null => {
        if (!tempPoolId) return null;
        const found = dbPools.find((p) => p.tempId === tempPoolId);
        return found?.id ?? null;
      };

      // 2. Create all matches (first pass: without nextMatchId)
      //    We do two passes because nextMatchId references other match IDs
      //    that may not exist yet.

      // scheduledMatches only contains Round 1 matches (placeholders were skipped).
      // We must explicitly add the skipped placeholders back so they get saved!
      const scheduledMatchIds = new Set(scheduledMatches.map(m => m.id));
      const placeholderMatches = realMatches.filter(m => !scheduledMatchIds.has(m.id));

      const allMatches = [...scheduledMatches, ...placeholderMatches, ...byeMatches];

      const createdMatches = await Promise.all(
        allMatches.map((match) =>
          tx.match.create({
            data: {
              categoryId: category.id,
              poolId: resolvePoolId(match.poolId),
              participant1Id: match.participant1Id || null,
              participant2Id: match.participant2Id || null,
              status: match.isBye ? "BYE" : "SCHEDULED",
              roundNumber: match.roundNumber,
              bracketRound: match.bracketRound ?? null,
              bracketPosition: match.bracketPosition ?? null,
              nextMatchSlot: match.nextMatchSlot ?? null,
              // Court & time from scheduled matches
              courtId: "courtId" in match ? (match as any).courtId : null,
              scheduledStartTime:
                "scheduledStartTime" in match
                  ? (match as any).scheduledStartTime
                  : null,
              scheduledEndTime:
                "scheduledEndTime" in match
                  ? (match as any).scheduledEndTime
                  : null,
            },
          })
        )
      );

      for (let i = 0; i < allMatches.length; i++) {
        tempIdToDbId.set(allMatches[i].id, createdMatches[i].id);
      }

      // 3. Second pass: wire nextMatchId references
      for (const match of allMatches) {
        if (match.nextMatchId) {
          const dbMatchId = tempIdToDbId.get(match.id);
          const dbNextMatchId = tempIdToDbId.get(match.nextMatchId);

          if (dbMatchId && dbNextMatchId) {
            await tx.match.update({
              where: { id: dbMatchId },
              data: { nextMatchId: dbNextMatchId },
            });
          }
        }
      }

      // 4. Auto-advance bye matches
      //    For bye matches with a single participant, set the winner and
      //    populate the next match slot.
      for (const match of byeMatches) {
        const dbMatchId = tempIdToDbId.get(match.id)!;
        const winnerId = match.participant1Id || match.participant2Id;

        if (winnerId && match.nextMatchId) {
          const dbNextMatchId = tempIdToDbId.get(match.nextMatchId);

          // Mark bye match as completed with the winner
          await tx.match.update({
            where: { id: dbMatchId },
            data: {
              winnerId,
              status: "BYE",
            },
          });

          // Advance winner to the correct slot in the next match
          if (dbNextMatchId && match.nextMatchSlot) {
            const updateField =
              match.nextMatchSlot === "SLOT_1"
                ? "participant1Id"
                : "participant2Id";

            await tx.match.update({
              where: { id: dbNextMatchId },
              data: { [updateField]: winnerId },
            });
          }
        }
      }

      // 5. Update tournament status to IN_PROGRESS
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: "IN_PROGRESS" },
      });

      // 6. Fetch the complete result
      const matches = await tx.match.findMany({
        where: { categoryId: category.id },
        include: {
          participant1: { select: { id: true, name: true, seed: true } },
          participant2: { select: { id: true, name: true, seed: true } },
          court: { select: { id: true, name: true, courtNumber: true } },
          sets: true,
        },
        orderBy: [
          { scheduledStartTime: "asc" },
          { roundNumber: "asc" },
          { bracketPosition: "asc" },
        ],
      });

      return { matches, pools: dbPools };
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    // ── Build response ──────────────────────────────────────────────────

    return NextResponse.json(
      {
        message: `Schedule generated for ${category.name}`,
        format: category.format,
        totalMatches: result.matches.length,
        scheduledMatches: result.matches.filter(
          (m) => m.status === "SCHEDULED"
        ).length,
        byeMatches: result.matches.filter((m) => m.status === "BYE").length,
        pools: result.pools.length > 0 ? result.pools : undefined,
        matches: result.matches,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/tournaments/[id]/generate] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
