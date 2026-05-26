import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTournamentSchema } from "@/lib/validations/tournament";

// ============================================================================
// POST /api/tournaments — Create a new tournament
// ============================================================================
// Creates a tournament with courts, categories, and registered participants
// in a single transactional operation.
//
// After creation the tournament is in DRAFT status. Call the
// /api/tournaments/[id]/generate endpoint to generate the match schedule
// for each category.
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate ────────────────────────────────────────────────────────────
    const parsed = CreateTournamentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // ── Transaction: create everything atomically ───────────────────────────
    const tournament = await prisma.$transaction(async (tx) => {
      // 1. Create Tournament
      const newTournament = await tx.tournament.create({
        data: {
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          numberOfCourts: input.numberOfCourts,
          estimatedMatchDurationMinutes: input.estimatedMatchDurationMinutes,
          restPeriodMinutes: input.restPeriodMinutes,
          status: "DRAFT",
        },
      });

      // 2. Create Courts
      const courts = await Promise.all(
        Array.from({ length: input.numberOfCourts }, (_, i) =>
          tx.court.create({
            data: {
              name: `Court ${i + 1}`,
              courtNumber: i + 1,
              tournamentId: newTournament.id,
            },
          })
        )
      );

      // 3. Create Categories with Participants
      const categoriesWithParticipants = await Promise.all(
        input.categories.map(async (catInput) => {
          // 3a. Create the Category
          const category = await tx.category.create({
            data: {
              name: catInput.name,
              type: catInput.type,
              format: catInput.format,
              poolSize: catInput.poolSize,
              advanceCount: catInput.advanceCount,
              tournamentId: newTournament.id,
            },
          });

          // 3b. Create Participants and link to Players
          const participants = await Promise.all(
            catInput.participants.map(async (pInput) => {
              // Ensure all referenced players exist
              const existingPlayers = await tx.player.findMany({
                where: { id: { in: pInput.playerIds } },
                select: { id: true },
              });

              if (existingPlayers.length !== pInput.playerIds.length) {
                const found = new Set(existingPlayers.map((p) => p.id));
                const missing = pInput.playerIds.filter(
                  (id) => !found.has(id)
                );
                throw new Error(
                  `Players not found: ${missing.join(", ")}. Register players before creating the tournament.`
                );
              }

              // Create participant and link to players
              const participant = await tx.participant.create({
                data: {
                  name: pInput.name,
                  seed: pInput.seed ?? null,
                  categoryId: category.id,
                  playerLinks: {
                    create: pInput.playerIds.map((playerId) => ({
                      playerId,
                    })),
                  },
                },
                include: {
                  playerLinks: { include: { player: true } },
                },
              });

              return participant;
            })
          );

          return {
            ...category,
            participants,
          };
        })
      );

      // Return the full tournament with nested data
      return {
        ...newTournament,
        courts,
        categories: categoriesWithParticipants,
      };
    });

    return NextResponse.json(
      {
        message: "Tournament created successfully",
        tournament,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/tournaments] Error:", error);

    if (error instanceof Error) {
      // Handle known business logic errors (thrown from transaction)
      if (error.message.includes("Players not found")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/tournaments — List all tournaments
// ============================================================================

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            courts: true,
            categories: true,
          },
        },
      },
    });

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("[GET /api/tournaments] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
