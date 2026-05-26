import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubmitScoreSchema } from "@/lib/validations/tournament";
import { calculatePoolStandings } from "@/lib/utils/standings";
import {
  generateKnockoutBracket,
  generateKnockoutFromPoolResults,
  assignMatchesToCourts,
} from "@/lib/scheduler";
import type {
  MatchResult,
  StandingEntry,
  SchedulerConfig,
} from "@/lib/scheduler/types";

// ============================================================================
// PATCH /api/matches/[id]/score — Submit or update a match score
// ============================================================================
// Accepts set scores (best of 3) and a winner ID from a court umpire.
//
// Side effects:
//   1. Creates/updates MatchSet records
//   2. Sets match status to COMPLETED, records winner
//   3. For KNOCKOUT: advances winner to next bracket match
//   4. For POOL_TO_BRACKET: when all pool matches in a category are done,
//      automatically generates the knockout bracket from pool standings
//   5. Updates standings for the category
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;

    const body = await request.json();

    // ── Validate ────────────────────────────────────────────────────────

    const parsed = SubmitScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sets, winnerId } = parsed.data;

    // ── Load the match ──────────────────────────────────────────────────

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        category: {
          include: { tournament: { include: { courts: true } } },
        },
        participant1: { include: { playerLinks: true } },
        participant2: { include: { playerLinks: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // ── Business rule validations ───────────────────────────────────────

    if (match.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Match is already completed. Use a separate endpoint to amend scores." },
        { status: 409 }
      );
    }

    if (match.status === "BYE" || match.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot submit score for a ${match.status} match` },
        { status: 400 }
      );
    }

    // Validate winner is one of the two participants
    if (
      winnerId !== match.participant1Id &&
      winnerId !== match.participant2Id
    ) {
      return NextResponse.json(
        {
          error: "winnerId must be one of the match participants",
          participant1Id: match.participant1Id,
          participant2Id: match.participant2Id,
        },
        { status: 400 }
      );
    }

    // Validate set scores are consistent with winner
    const setsWonByP1 = sets.filter((s) => s.score1 > s.score2).length;
    const setsWonByP2 = sets.filter((s) => s.score2 > s.score1).length;

    if (winnerId === match.participant1Id && setsWonByP1 <= setsWonByP2) {
      return NextResponse.json(
        {
          error:
            "Declared winner must have won more sets than the opponent",
        },
        { status: 400 }
      );
    }

    if (winnerId === match.participant2Id && setsWonByP2 <= setsWonByP1) {
      return NextResponse.json(
        {
          error:
            "Declared winner must have won more sets than the opponent",
        },
        { status: 400 }
      );
    }

    // ── Transaction: persist score + side effects ───────────────────────

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert set scores
      for (const set of sets) {
        await tx.matchSet.upsert({
          where: {
            matchId_setNumber: { matchId, setNumber: set.setNumber },
          },
          create: {
            matchId,
            setNumber: set.setNumber,
            score1: set.score1,
            score2: set.score2,
          },
          update: {
            score1: set.score1,
            score2: set.score2,
          },
        });
      }

      // 2. Mark match as completed
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          winnerId,
          status: "COMPLETED",
          actualEndTime: new Date(),
        },
        include: {
          sets: { orderBy: { setNumber: "asc" } },
          participant1: { select: { id: true, name: true } },
          participant2: { select: { id: true, name: true } },
          court: { select: { id: true, name: true } },
        },
      });

      // 3. Bracket progression: advance winner to next match
      let advancedTo: string | null = null;

      if (match.nextMatchId && match.nextMatchSlot) {
        const updateField =
          match.nextMatchSlot === "SLOT_1"
            ? "participant1Id"
            : "participant2Id";

        await tx.match.update({
          where: { id: match.nextMatchId },
          data: { [updateField]: winnerId },
        });

        advancedTo = match.nextMatchId;
      }

      // 4. Update standings for this category
      await updateCategoryStandings(tx, match.categoryId, match.poolId);

      // 5. Check if pool-to-bracket transition is needed
      let knockoutGenerated = false;

      if (match.category.format === "POOL_TO_BRACKET" && match.poolId) {
        knockoutGenerated = await maybeGenerateKnockoutPhase(
          tx,
          match.categoryId,
          match.category.tournament
        );
      }

      return {
        match: updatedMatch,
        advancedTo,
        knockoutGenerated,
      };
    });

    // ── Response ────────────────────────────────────────────────────────

    return NextResponse.json({
      message: "Score submitted successfully",
      match: result.match,
      advancedToMatchId: result.advancedTo,
      knockoutPhaseGenerated: result.knockoutGenerated,
    });
  } catch (error) {
    console.error("[PATCH /api/matches/[id]/score] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: Update standings for all participants in a category (or pool)
// ============================================================================

async function updateCategoryStandings(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  categoryId: string,
  poolId: string | null
) {
  // Fetch all completed matches in this scope
  const whereClause = poolId
    ? { categoryId, poolId, status: "COMPLETED" as const }
    : {
        categoryId,
        status: "COMPLETED" as const,
        poolId: null, // Non-pool matches only
      };

  const completedMatches = await tx.match.findMany({
    where: whereClause,
    include: { sets: true },
  });

  if (completedMatches.length === 0) return;

  // Get all participant IDs in this scope
  const participantIdsInScope = new Set<string>();
  for (const m of completedMatches) {
    if (m.participant1Id) participantIdsInScope.add(m.participant1Id);
    if (m.participant2Id) participantIdsInScope.add(m.participant2Id);
  }

  // Convert to MatchResult format for the standings calculator
  const matchResults: MatchResult[] = completedMatches
    .filter((m) => m.participant1Id && m.participant2Id && m.winnerId)
    .map((m) => ({
      matchId: m.id,
      participant1Id: m.participant1Id!,
      participant2Id: m.participant2Id!,
      winnerId: m.winnerId!,
      sets: m.sets.map((s) => ({
        setNumber: s.setNumber,
        score1: s.score1,
        score2: s.score2,
      })),
    }));

  // Calculate standings using BWF Article 16.2
  const standings = calculatePoolStandings(
    matchResults,
    Array.from(participantIdsInScope)
  );

  // Upsert standings into database
  for (const entry of standings) {
    await tx.standing.upsert({
      where: {
        categoryId_participantId: {
          categoryId,
          participantId: entry.participantId,
        },
      },
      create: {
        categoryId,
        participantId: entry.participantId,
        poolId,
        rank: entry.rank,
        matchesPlayed: entry.matchesPlayed,
        matchesWon: entry.matchesWon,
        matchesLost: entry.matchesLost,
        setsWon: entry.setsWon,
        setsLost: entry.setsLost,
        pointsWon: entry.pointsWon,
        pointsLost: entry.pointsLost,
      },
      update: {
        rank: entry.rank,
        matchesPlayed: entry.matchesPlayed,
        matchesWon: entry.matchesWon,
        matchesLost: entry.matchesLost,
        setsWon: entry.setsWon,
        setsLost: entry.setsLost,
        pointsWon: entry.pointsWon,
        pointsLost: entry.pointsLost,
      },
    });
  }
}

// ============================================================================
// Helper: Check if all pool matches are done, and generate knockout bracket
// ============================================================================
// This is the POOL_TO_BRACKET transition: once every pool match in the
// category is completed, we:
//   1. Compute final pool standings
//   2. Extract top `advanceCount` from each pool
//   3. Generate a knockout bracket with cross-seeding
//   4. Assign courts/times to the new knockout matches
// ============================================================================

async function maybeGenerateKnockoutPhase(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  categoryId: string,
  tournament: {
    id: string;
    startDate: Date;
    estimatedMatchDurationMinutes: number;
    restPeriodMinutes: number;
    courts: { id: string; name: string; courtNumber: number }[];
  }
): Promise<boolean> {
  // Check if knockout matches already exist
  const existingKnockoutMatches = await tx.match.count({
    where: {
      categoryId,
      bracketRound: { not: null },
    },
  });

  if (existingKnockoutMatches > 0) return false;

  // Check if ALL pool matches are completed
  const remainingPoolMatches = await tx.match.count({
    where: {
      categoryId,
      poolId: { not: null },
      status: { notIn: ["COMPLETED", "WALKOVER", "BYE", "CANCELLED"] },
    },
  });

  if (remainingPoolMatches > 0) return false;

  // ── All pool matches done — generate knockout ─────────────────────────

  const category = await tx.category.findUnique({
    where: { id: categoryId },
    include: {
      pools: {
        include: {
          participants: { include: { playerLinks: true } },
        },
      },
    },
  });

  if (!category) return false;

  // Compute final standings per pool
  const poolStandings = new Map<string, StandingEntry[]>();

  for (const pool of category.pools) {
    const poolMatches = await tx.match.findMany({
      where: {
        categoryId,
        poolId: pool.id,
        status: "COMPLETED",
      },
      include: { sets: true },
    });

    const matchResults: MatchResult[] = poolMatches
      .filter((m) => m.participant1Id && m.participant2Id && m.winnerId)
      .map((m) => ({
        matchId: m.id,
        participant1Id: m.participant1Id!,
        participant2Id: m.participant2Id!,
        winnerId: m.winnerId!,
        sets: m.sets.map((s) => ({
          setNumber: s.setNumber,
          score1: s.score1,
          score2: s.score2,
        })),
      }));

    const standings = calculatePoolStandings(
      matchResults,
      pool.participants.map((p) => p.id)
    );

    poolStandings.set(pool.id, standings);
  }

  // Generate cross-seeded knockout bracket from pool results
  const knockoutBracket = generateKnockoutFromPoolResults(
    poolStandings,
    category.advanceCount
  );

  if (knockoutBracket.matches.length === 0) return false;

  // Build participantNameMap for court assigner
  const participantNameMap = new Map<string, string>();
  for (const pool of category.pools) {
    for (const p of pool.participants) {
      participantNameMap.set(p.id, p.name);
    }
  }

  // Assign courts to knockout matches
  // Find the latest pool match end time to start knockout after it
  const lastPoolMatch = await tx.match.findFirst({
    where: { categoryId, poolId: { not: null } },
    orderBy: { scheduledEndTime: "desc" },
  });

  const knockoutStartTime =
    lastPoolMatch?.scheduledEndTime ?? tournament.startDate;

  const schedulerConfig: SchedulerConfig = {
    tournamentStartTime: knockoutStartTime,
    estimatedMatchDurationMinutes: tournament.estimatedMatchDurationMinutes,
    restPeriodMinutes: tournament.restPeriodMinutes,
  };

  const realKnockoutMatches = knockoutBracket.matches.filter((m) => !m.isBye);
  const byeKnockoutMatches = knockoutBracket.matches.filter((m) => m.isBye);

  const scheduledKnockout = assignMatchesToCourts(
    realKnockoutMatches,
    tournament.courts.map((c) => ({ id: c.id, name: c.name })),
    schedulerConfig,
    participantNameMap
  );

  // Persist knockout matches (same 2-pass approach as generate endpoint)
  const tempIdToDbId = new Map<string, string>();

  const allKnockoutMatches = [...scheduledKnockout, ...byeKnockoutMatches];

  for (const m of allKnockoutMatches) {
    const dbMatch = await tx.match.create({
      data: {
        categoryId,
        participant1Id: m.participant1Id || null,
        participant2Id: m.participant2Id || null,
        status: m.isBye ? "BYE" : "SCHEDULED",
        roundNumber: m.roundNumber,
        bracketRound: m.bracketRound ?? null,
        bracketPosition: m.bracketPosition ?? null,
        nextMatchSlot: m.nextMatchSlot ?? null,
        courtId: "courtId" in m ? (m as any).courtId : null,
        scheduledStartTime:
          "scheduledStartTime" in m ? (m as any).scheduledStartTime : null,
        scheduledEndTime:
          "scheduledEndTime" in m ? (m as any).scheduledEndTime : null,
      },
    });

    tempIdToDbId.set(m.id, dbMatch.id);
  }

  // Wire nextMatchId
  for (const m of allKnockoutMatches) {
    if (m.nextMatchId) {
      const dbId = tempIdToDbId.get(m.id);
      const dbNextId = tempIdToDbId.get(m.nextMatchId);
      if (dbId && dbNextId) {
        await tx.match.update({
          where: { id: dbId },
          data: { nextMatchId: dbNextId },
        });
      }
    }
  }

  // Auto-advance byes
  for (const m of byeKnockoutMatches) {
    const dbId = tempIdToDbId.get(m.id)!;
    const winner = m.participant1Id || m.participant2Id;

    if (winner && m.nextMatchId) {
      const dbNextId = tempIdToDbId.get(m.nextMatchId);
      await tx.match.update({
        where: { id: dbId },
        data: { winnerId: winner, status: "BYE" },
      });

      if (dbNextId && m.nextMatchSlot) {
        const field =
          m.nextMatchSlot === "SLOT_1" ? "participant1Id" : "participant2Id";
        await tx.match.update({
          where: { id: dbNextId },
          data: { [field]: winner },
        });
      }
    }
  }

  return true;
}

// ============================================================================
// GET /api/matches/[id]/score — Get match details with scores
// ============================================================================

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participant1: { select: { id: true, name: true, seed: true } },
        participant2: { select: { id: true, name: true, seed: true } },
        winner: { select: { id: true, name: true } },
        court: { select: { id: true, name: true, courtNumber: true } },
        sets: { orderBy: { setNumber: "asc" } },
        nextMatch: { select: { id: true, bracketRound: true, bracketPosition: true } },
        category: { select: { id: true, name: true, format: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ match });
  } catch (error) {
    console.error("[GET /api/matches/[id]/score] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
