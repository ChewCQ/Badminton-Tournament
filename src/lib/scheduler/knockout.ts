import type { GeneratedMatch, KnockoutBracket } from './types';

/** Create a match ID generator scoped to a single bracket generation call. */
function createMatchIdGenerator(): () => string {
  let counter = 0;
  const timestamp = Date.now();
  return () => {
    counter++;
    return `ko-${timestamp}-${counter}`;
  };
}

/** Return the smallest power of 2 that is >= n. */
export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate seed positions in bracket order using recursive fold seeding.
 *
 * This ensures top seeds are placed in different halves/quarters of the bracket.
 * For a bracket of size 8: positions come out as [1, 8, 5, 4, 3, 6, 7, 2]
 * so that seed 1 and seed 2 can only meet in the final.
 *
 * @param bracketSize - Must be a power of 2
 * @returns Array of seed numbers in bracket-position order
 */
export function generateSeedPositions(bracketSize: number): number[] {
  if (bracketSize === 1) {
    return [1];
  }

  // Recursive approach: build bracket positions for size/2, then interleave
  // Each match in the previous round expands into two slots.
  // Seed X in position P expands to: seed X in position 2P-1,
  //   and seed (bracketSize + 1 - X) in position 2P.
  const halfPositions = generateSeedPositions(bracketSize / 2);
  const fullPositions: number[] = [];

  for (const seed of halfPositions) {
    fullPositions.push(seed);
    fullPositions.push(bracketSize + 1 - seed);
  }

  return fullPositions;
}

/**
 * Generate a complete knockout/elimination bracket with seeding and byes.
 *
 * @param seededParticipantIds - Participant IDs in seed order (index 0 = seed 1)
 * @returns KnockoutBracket with all matches, wired with nextMatchId/nextMatchSlot
 */
export function generateKnockoutBracket(
  seededParticipantIds: string[]
): KnockoutBracket {
  const n = seededParticipantIds.length;

  if (n < 2) {
    return {
      matches: [],
      totalRounds: 0,
      bracketSize: 0,
    };
  }

  const generateMatchId = createMatchIdGenerator();
  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);

  // Generate seed positions in bracket order
  const seedPositions = generateSeedPositions(bracketSize);

  // Map bracket slots to participants (null = bye)
  const bracketSlots: (string | null)[] = seedPositions.map((seedNum) => {
    const idx = seedNum - 1;
    return idx < n ? seededParticipantIds[idx] : null;
  });

  // Create all match shells across all rounds
  // matches[round][position] structure, flattened
  const matchesByRound: GeneratedMatch[][] = [];

  // Round 1: bracketSize / 2 matches
  const round1Matches: GeneratedMatch[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1 = bracketSlots[i * 2];
    const p2 = bracketSlots[i * 2 + 1];
    const isBye = p1 === null || p2 === null;

    round1Matches.push({
      id: generateMatchId(),
      participant1Id: p1,
      participant2Id: p2,
      roundNumber: 1,
      bracketRound: 1,
      bracketPosition: i + 1,
      isBye,
    });
  }
  matchesByRound.push(round1Matches);

  // Subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const numMatches = bracketSize / Math.pow(2, round);
    const roundMatches: GeneratedMatch[] = [];

    for (let pos = 0; pos < numMatches; pos++) {
      roundMatches.push({
        id: generateMatchId(),
        participant1Id: null,
        participant2Id: null,
        roundNumber: round,
        bracketRound: round,
        bracketPosition: pos + 1,
        isBye: false,
      });
    }
    matchesByRound.push(roundMatches);
  }

  // Wire nextMatchId + nextMatchSlot for progression
  for (let roundIdx = 0; roundIdx < matchesByRound.length - 1; roundIdx++) {
    const currentRound = matchesByRound[roundIdx];
    const nextRound = matchesByRound[roundIdx + 1];

    for (let i = 0; i < currentRound.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const slot: 'SLOT_1' | 'SLOT_2' = i % 2 === 0 ? 'SLOT_1' : 'SLOT_2';

      currentRound[i].nextMatchId = nextRound[nextMatchIndex].id;
      currentRound[i].nextMatchSlot = slot;
    }
  }

  // Flatten all matches
  const allMatches = matchesByRound.flat();

  return {
    matches: allMatches,
    totalRounds,
    bracketSize,
  };
}
