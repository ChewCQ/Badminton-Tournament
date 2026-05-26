import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// POST /api/players — Register a new player
// ============================================================================

const CreatePlayerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
});

const CreatePlayersSchema = z.object({
  players: z.array(CreatePlayerSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreatePlayersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const players = await prisma.$transaction(
      parsed.data.players.map((p) =>
        prisma.player.create({
          data: {
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email ?? null,
            phone: p.phone ?? null,
          },
        })
      )
    );

    return NextResponse.json(
      { message: `${players.length} player(s) registered`, players },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/players] Error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A player with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/players — List all players
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const players = await prisma.player.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        _count: { select: { participantLinks: true } },
      },
    });

    return NextResponse.json({ players });
  } catch (error) {
    console.error("[GET /api/players] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
