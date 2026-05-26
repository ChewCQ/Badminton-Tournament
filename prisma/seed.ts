import { PrismaClient, CategoryType, TournamentFormat } from "@prisma/client";
import { generateKnockoutBracket, assignMatchesToCourts, generateRoundRobinPairings } from "../src/lib/scheduler";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping database...");
  // Use try/catch to ignore errors if tables are missing (e.g., on fresh DB)
  try { await prisma.matchSet.deleteMany({}); } catch {}
  try { await prisma.match.deleteMany({}); } catch {}
  try { await prisma.playerOnParticipant.deleteMany({}); } catch {}
  try { await prisma.participant.deleteMany({}); } catch {}
  try { await prisma.player.deleteMany({}); } catch {}
  try { await prisma.court.deleteMany({}); } catch {}
  try { await prisma.category.deleteMany({}); } catch {}
  try { await prisma.tournament.deleteMany({}); } catch {}

  console.log("Creating Tournament...");
  const tournament = await prisma.tournament.create({
    data: {
      name: "BWF World Tour Finals 2026",
      startDate: new Date("2026-12-10T09:00:00Z"),
      endDate: new Date("2026-12-15T18:00:00Z"),
      status: "IN_PROGRESS",
      numberOfCourts: 4,
      estimatedMatchDurationMinutes: 45,
      restPeriodMinutes: 20,
    },
  });

  console.log("Creating Courts...");
  const courts = [];
  for (let i = 1; i <= 4; i++) {
    const court = await prisma.court.create({
      data: {
        name: `Court ${i}`,
        courtNumber: i,
        tournamentId: tournament.id,
      },
    });
    courts.push(court);
  }

  console.log("Creating Category...");
  const category = await prisma.category.create({
    data: {
      name: "Men's Singles Pro",
      type: CategoryType.SINGLES,
      format: TournamentFormat.KNOCKOUT,
      tournamentId: tournament.id,
    },
  });

  console.log("Creating Players & Participants...");
  const mockPlayers = [
    { firstName: "Lin", lastName: "Dan", seed: 1 },
    { firstName: "Lee", lastName: "Chong Wei", seed: 2 },
    { firstName: "Chen", lastName: "Long", seed: 3 },
    { firstName: "Kento", lastName: "Momota", seed: 4 },
    { firstName: "Viktor", lastName: "Axelsen", seed: null },
    { firstName: "Chou", lastName: "Tien Chen", seed: null },
    { firstName: "Anders", lastName: "Antonsen", seed: null },
  ];

  const participantIds: string[] = [];
  const participantNameMap = new Map<string, string>();

  for (const p of mockPlayers) {
    const player = await prisma.player.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
      },
    });

    const participant = await prisma.participant.create({
      data: {
        name: `${p.firstName} ${p.lastName}`,
        seed: p.seed,
        categoryId: category.id,
        playerLinks: {
          create: {
            playerId: player.id,
          },
        },
      },
    });

    participantIds.push(participant.id);
    participantNameMap.set(participant.id, `${p.firstName} ${p.lastName}`);
  }

  console.log("Generating Knockout Bracket...");
  // Sort by seed (nulls last)
  const seededIds = [...participantIds].sort((a, b) => {
    const pA = mockPlayers[participantIds.indexOf(a)];
    const pB = mockPlayers[participantIds.indexOf(b)];
    if (pA.seed === null) return 1;
    if (pB.seed === null) return -1;
    return pA.seed - pB.seed;
  });

  const bracket = generateKnockoutBracket(seededIds);
  
  // Assign courts
  const scheduledMatches = assignMatchesToCourts(
    bracket.matches,
    courts,
    {
      tournamentStartTime: tournament.startDate,
      estimatedMatchDurationMinutes: tournament.estimatedMatchDurationMinutes,
      restPeriodMinutes: tournament.restPeriodMinutes,
    },
    participantNameMap
  );

  console.log("Saving Matches to DB...");
  const idMap = new Map<string, string>(); // tempId -> real DB id

  // Insert matches (without wiring nextMatchId yet)
  for (const sm of scheduledMatches) {
    const match = await prisma.match.create({
      data: {
        categoryId: category.id,
        courtId: sm.courtId,
        participant1Id: sm.participant1Id,
        participant2Id: sm.participant2Id,
        roundNumber: sm.roundNumber,
        bracketRound: sm.bracketRound,
        bracketPosition: sm.bracketPosition,
        status: sm.isBye ? "BYE" : "SCHEDULED",
        scheduledStartTime: sm.scheduledStartTime,
        scheduledEndTime: sm.scheduledEndTime,
      },
    });
    idMap.set(sm.id, match.id);
  }

  // Wire up progressions
  for (const sm of scheduledMatches) {
    if (sm.nextMatchId) {
      const realId = idMap.get(sm.id);
      const realNextId = idMap.get(sm.nextMatchId);
      if (realId && realNextId) {
        await prisma.match.update({
          where: { id: realId },
          data: {
            nextMatchId: realNextId,
            nextMatchSlot: sm.nextMatchSlot,
          },
        });
      }
    }
  }

  console.log("Simulating some completed matches...");
  // Get Round 1 matches
  const round1Matches = await prisma.match.findMany({
    where: { categoryId: category.id, bracketRound: 1 },
    include: { participant1: true, participant2: true },
  });

  for (const match of round1Matches) {
    if (match.status === "BYE") {
      // Auto-advance the BYE winner (the non-null participant)
      const winnerId = match.participant1Id || match.participant2Id;
      if (winnerId && match.nextMatchId) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            status: "COMPLETED",
            winnerId: winnerId,
          },
        });

        // Push to next match
        const updateData: any = {};
        if (match.nextMatchSlot === "SLOT_1") {
          updateData.participant1Id = winnerId;
        } else {
          updateData.participant2Id = winnerId;
        }
        await prisma.match.update({
          where: { id: match.nextMatchId },
          data: updateData,
        });
      }
    } else {
      // Complete an actual match
      const winnerId = match.participant1Id; // Just hardcode P1 as winner for seed
      if (winnerId) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            status: "COMPLETED",
            winnerId: winnerId,
            sets: {
              create: [
                { setNumber: 1, score1: 21, score2: 15 },
                { setNumber: 2, score1: 21, score2: 18 },
              ],
            },
          },
        });

        if (match.nextMatchId) {
          const updateData: any = {};
          if (match.nextMatchSlot === "SLOT_1") {
            updateData.participant1Id = winnerId;
          } else {
            updateData.participant2Id = winnerId;
          }
          await prisma.match.update({
            where: { id: match.nextMatchId },
            data: updateData,
          });
        }
      }
    }
  }

  console.log("Creating Round Robin Category...");
  const rrCategory = await prisma.category.create({
    data: {
      name: "Women's Singles Group Stage",
      type: CategoryType.SINGLES,
      format: TournamentFormat.ROUND_ROBIN,
      tournamentId: tournament.id,
      poolSize: 4,
      advanceCount: 2,
    },
  });

  const rrPool = await prisma.pool.create({
    data: {
      name: "Group A",
      poolNumber: 1,
      categoryId: rrCategory.id,
    },
  });

  const rrPlayers = [
    { firstName: "Carolina", lastName: "Marin", seed: 1 },
    { firstName: "Tai", lastName: "Tzu Ying", seed: 2 },
    { firstName: "Akane", lastName: "Yamaguchi", seed: null },
    { firstName: "An", lastName: "Se Young", seed: null },
  ];

  const rrParticipantIds: string[] = [];
  for (const p of rrPlayers) {
    const player = await prisma.player.create({
      data: { firstName: p.firstName, lastName: p.lastName },
    });
    const participant = await prisma.participant.create({
      data: {
        name: `${p.firstName} ${p.lastName}`,
        seed: p.seed,
        categoryId: rrCategory.id,
        poolId: rrPool.id,
        playerLinks: { create: { playerId: player.id } },
      },
    });
    rrParticipantIds.push(participant.id);
    participantNameMap.set(participant.id, `${p.firstName} ${p.lastName}`);
  }

  const rrRounds = generateRoundRobinPairings(rrParticipantIds);
  
  for (const round of rrRounds) {
    for (const pairing of round.pairings) {
      await prisma.match.create({
        data: {
          categoryId: rrCategory.id,
          poolId: rrPool.id,
          participant1Id: pairing.participant1Id,
          participant2Id: pairing.participant2Id,
          roundNumber: round.roundNumber,
          status: "SCHEDULED",
        }
      });
    }
  }

  const allRRMatches = await prisma.match.findMany({
    where: { poolId: rrPool.id }
  });

  for (let i = 0; i < 2; i++) {
    const match = allRRMatches[i];
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "COMPLETED",
        winnerId: match.participant1Id,
        sets: {
          create: [
            { setNumber: 1, score1: 21, score2: Math.floor(Math.random() * 8) + 10 },
            { setNumber: 2, score1: 21, score2: Math.floor(Math.random() * 8) + 10 },
          ]
        }
      }
    });
  }

  console.log(`Seed completed successfully!`);
  console.log(`Tournament ID: ${tournament.id}`);
  console.log(`Knockout Category ID: ${category.id}`);
  console.log(`Round Robin Category ID: ${rrCategory.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
