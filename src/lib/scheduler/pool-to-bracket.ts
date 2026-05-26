import type {
  GeneratedMatch,
  KnockoutBracket,
  PoolToBracketConfig,
  StandingEntry,
} from './types';
import { generateRoundRobinPairings } from './round-robin';
import { generateKnockoutBracket } from './knockout';

/** Create a pool match ID generator scoped to a single call. */
function createPoolMatchIdGenerator(): () => string {
  let counter = 0;
  const timestamp = Date.now();
  return () => {
    counter++;
    return `pool-match-${timestamp}-${counter}`;
  };
}

/**
 * Divide participants into balanced pools using snake-draft ordering.
 *
 * Given participants in seed order (index 0 = best seed), distributes them
 * across pools so that each pool has a similar range of skill levels.
 *
 * Snake draft example with 3 pools:
 *   Pool 0: seed 1, seed 6, seed 7, seed 12, ...
 *   Pool 1: seed 2, seed 5, seed 8, seed 11, ...
 *   Pool 2: seed 3, seed 4, seed 9, seed 10, ...
 *
 * @param participantIds - Participant IDs in seed order
 * @param poolSize - Target size of each pool
 * @returns Array of pools, each containing participant IDs
 */
function distributeIntoPools(
  participantIds: string[],
  poolSize: number
): { poolId: string; participantIds: string[] }[] {
  const numPools = Math.ceil(participantIds.length / poolSize);
  const pools: { poolId: string; participantIds: string[] }[] = [];

  for (let i = 0; i < numPools; i++) {
    pools.push({
      poolId: `pool-${String.fromCharCode(65 + i)}`, // pool-A, pool-B, etc.
      participantIds: [],
    });
  }

  // Snake draft distribution
  let forward = true;
  let poolIdx = 0;

  for (const participantId of participantIds) {
    pools[poolIdx].participantIds.push(participantId);

    if (forward) {
      if (poolIdx === numPools - 1) {
        forward = false;
        // Stay on the same pool index for the next iteration (snake turn)
      } else {
        poolIdx++;
      }
    } else {
      if (poolIdx === 0) {
        forward = true;
        // Stay on the same pool index for the next iteration (snake turn)
      } else {
        poolIdx--;
      }
    }
  }

  return pools;
}

/**
 * Generate pool-to-bracket hybrid format.
 *
 * This creates round-robin pools and returns the pool matches and pool assignments.
 * The knockout bracket is deferred until pool play completes — use
 * `generateKnockoutFromPoolResults` after standings are calculated.
 *
 * @param participantIds - Participant IDs in seed order
 * @param config - Pool size and advance count configuration
 * @returns Pool matches, placeholder bracket info, and pool assignments
 */
export function generatePoolToBracket(
  participantIds: string[],
  config: PoolToBracketConfig
): {
  poolMatches: GeneratedMatch[];
  knockoutBracket: KnockoutBracket;
  pools: { poolId: string; participantIds: string[] }[];
} {
  // Step 1: Divide into pools
  const pools = distributeIntoPools(participantIds, config.poolSize);

  // Step 2: Generate round-robin matches for each pool
  const poolMatches: GeneratedMatch[] = [];
  const generatePoolMatchId = createPoolMatchIdGenerator();

  for (const pool of pools) {
    if (pool.participantIds.length < 2) {
      continue;
    }

    const rounds = generateRoundRobinPairings(pool.participantIds);

    for (const round of rounds) {
      for (const pairing of round.pairings) {
        poolMatches.push({
          id: generatePoolMatchId(),
          participant1Id: pairing.participant1Id,
          participant2Id: pairing.participant2Id,
          roundNumber: round.roundNumber,
          poolId: pool.poolId,
        });
      }
    }
  }

  // Step 3: Return placeholder knockout bracket (deferred until pool play completes)
  const placeholderBracket: KnockoutBracket = {
    matches: [],
    totalRounds: 0,
    bracketSize: 0,
  };

  return {
    poolMatches,
    knockoutBracket: placeholderBracket,
    pools,
  };
}

/**
 * Generate the knockout bracket from completed pool results.
 *
 * Takes pool standings, extracts the top `advanceCount` from each pool,
 * seeds them with cross-pool seeding (so pool-A winner doesn't face pool-A
 * runner-up early), and generates the knockout bracket.
 *
 * Cross-seeding approach:
 *   - Pool winners are top seeds (A1, B1, C1, ...)
 *   - Pool runners-up are next (A2, B2, C2, ...)
 *   - Within each tier, order is determined by standings quality
 *   - Cross-seeding ensures A1 is in opposite half from A2, B1 opposite from B2, etc.
 *
 * @param poolStandings - Map from poolId to sorted standings for that pool
 * @param advanceCount - Number of participants advancing from each pool
 * @returns KnockoutBracket with all matches wired
 */
export function generateKnockoutFromPoolResults(
  poolStandings: Map<string, StandingEntry[]>,
  advanceCount: number
): KnockoutBracket {
  const poolIds = Array.from(poolStandings.keys()).sort();
  const numPools = poolIds.length;

  // Collect advancing participants by placement tier
  // tiers[0] = all pool winners, tiers[1] = all runners-up, etc.
  const tiers: string[][] = [];

  for (let tier = 0; tier < advanceCount; tier++) {
    tiers.push([]);
  }

  for (const poolId of poolIds) {
    const standings = poolStandings.get(poolId)!;
    for (let tier = 0; tier < advanceCount && tier < standings.length; tier++) {
      tiers[tier].push(standings[tier].participantId);
    }
  }

  // Build seeded list: pool winners first, then runners-up, etc.
  // Within each tier, the order from poolStandings already reflects quality
  const seededParticipants: string[] = [];

  for (const tier of tiers) {
    seededParticipants.push(...tier);
  }

  // Apply cross-seeding: reorder so that participants from the same pool
  // are placed in opposite halves of the bracket.
  // We achieve this by interleaving: odd-indexed pools go to the "bottom" half
  // of each tier's seeding.
  if (numPools > 1 && advanceCount >= 2) {
    const crossSeeded = applyCrossSeeding(tiers, poolIds, numPools);
    return generateKnockoutBracket(crossSeeded);
  }

  return generateKnockoutBracket(seededParticipants);
}

/**
 * Apply cross-seeding so same-pool participants end up in different bracket halves.
 *
 * Strategy:
 *   - Seed 1: A1 (pool A winner)
 *   - Seed 2: B1 (pool B winner) — opposite half from A1
 *   - Seed 3: C1 (pool C winner, if exists)
 *   - ...
 *   - Next tier: B2, A2, D2, C2 (reversed pool order for cross-seeding)
 *
 * This ensures A1 can't meet A2 until as late as possible in the bracket.
 */
function applyCrossSeeding(
  tiers: string[][],
  poolIds: string[],
  numPools: number
): string[] {
  const result: string[] = [];

  // Build a map: poolId → array of advancing participants (ordered by rank)
  const poolAdvancers = new Map<string, string[]>();
  for (const poolId of poolIds) {
    poolAdvancers.set(poolId, []);
  }

  for (let tierIdx = 0; tierIdx < tiers.length; tierIdx++) {
    for (let poolIdx = 0; poolIdx < tiers[tierIdx].length; poolIdx++) {
      const poolId = poolIds[poolIdx];
      poolAdvancers.get(poolId)!.push(tiers[tierIdx][poolIdx]);
    }
  }

  // Interleave tiers with alternating pool order
  for (let tierIdx = 0; tierIdx < tiers.length; tierIdx++) {
    const tierOrder =
      tierIdx % 2 === 0 ? [...poolIds] : [...poolIds].reverse();

    for (const poolId of tierOrder) {
      const advancers = poolAdvancers.get(poolId)!;
      if (tierIdx < advancers.length) {
        result.push(advancers[tierIdx]);
      }
    }
  }

  return result;
}
