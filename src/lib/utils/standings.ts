import type { MatchResult, StandingEntry, GeneratedMatch } from '../scheduler/types';

/**
 * Accumulate raw stats for a participant from a set of match results.
 */
interface ParticipantStats {
  participantId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
}

/**
 * Build stats for all participants from match results.
 */
function buildStats(
  matches: MatchResult[],
  participantIds: string[]
): Map<string, ParticipantStats> {
  const statsMap = new Map<string, ParticipantStats>();

  for (const pid of participantIds) {
    statsMap.set(pid, {
      participantId: pid,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
    });
  }

  for (const match of matches) {
    const p1Stats = statsMap.get(match.participant1Id);
    const p2Stats = statsMap.get(match.participant2Id);

    if (!p1Stats || !p2Stats) {
      continue; // Skip matches with participants not in our list
    }

    p1Stats.matchesPlayed++;
    p2Stats.matchesPlayed++;

    if (match.winnerId === match.participant1Id) {
      p1Stats.matchesWon++;
      p2Stats.matchesLost++;
    } else {
      p2Stats.matchesWon++;
      p1Stats.matchesLost++;
    }

    for (const set of match.sets) {
      // Points
      p1Stats.pointsWon += set.score1;
      p1Stats.pointsLost += set.score2;
      p2Stats.pointsWon += set.score2;
      p2Stats.pointsLost += set.score1;

      // Sets won/lost (a participant wins a set if their score > opponent's)
      if (set.score1 > set.score2) {
        p1Stats.setsWon++;
        p2Stats.setsLost++;
      } else if (set.score2 > set.score1) {
        p2Stats.setsWon++;
        p1Stats.setsLost++;
      }
      // Tie sets (shouldn't happen in badminton, but handle gracefully)
    }
  }

  return statsMap;
}

/**
 * Get the head-to-head winner between exactly two participants.
 * Returns the winner's ID, or null if no direct match found.
 */
function getHeadToHeadWinner(
  matches: MatchResult[],
  pid1: string,
  pid2: string
): string | null {
  for (const match of matches) {
    if (
      (match.participant1Id === pid1 && match.participant2Id === pid2) ||
      (match.participant1Id === pid2 && match.participant2Id === pid1)
    ) {
      return match.winnerId;
    }
  }
  return null;
}

/**
 * Resolve a multi-way tie using BWF Article 16.2 tiebreaking rules.
 *
 * Applied recursively:
 * 1. Set difference (setsWon - setsLost) DESC
 * 2. If reduced to two-way tie: head-to-head
 * 3. Point difference (pointsWon - pointsLost) DESC
 * 4. If reduced to two-way tie: head-to-head
 *
 * @returns Participant IDs in resolved order (best first)
 */
function resolveMultiWayTie(
  tiedIds: string[],
  statsMap: Map<string, ParticipantStats>,
  matches: MatchResult[]
): string[] {
  if (tiedIds.length <= 1) {
    return tiedIds;
  }

  // Two-way tie: use head-to-head
  if (tiedIds.length === 2) {
    const h2hWinner = getHeadToHeadWinner(matches, tiedIds[0], tiedIds[1]);
    if (h2hWinner) {
      return h2hWinner === tiedIds[0]
        ? [tiedIds[0], tiedIds[1]]
        : [tiedIds[1], tiedIds[0]];
    }
    // If no H2H result, fall through to set/point difference
  }

  // Step 1: Sort by set difference DESC
  const bySetDiff = [...tiedIds].sort((a, b) => {
    const statsA = statsMap.get(a)!;
    const statsB = statsMap.get(b)!;
    return (statsB.setsWon - statsB.setsLost) - (statsA.setsWon - statsA.setsLost);
  });

  // Group by set difference to find remaining ties
  const setDiffGroups = groupByKey(bySetDiff, (id) => {
    const s = statsMap.get(id)!;
    return s.setsWon - s.setsLost;
  });

  if (setDiffGroups.length > 1) {
    // Ties partially broken — recursively resolve each remaining group
    const result: string[] = [];
    for (const group of setDiffGroups) {
      result.push(...resolveMultiWayTie(group, statsMap, matches));
    }
    return result;
  }

  // Step 2: If reduced to two from set diff, check H2H
  if (tiedIds.length === 2) {
    const h2hWinner = getHeadToHeadWinner(matches, tiedIds[0], tiedIds[1]);
    if (h2hWinner) {
      return h2hWinner === tiedIds[0]
        ? [tiedIds[0], tiedIds[1]]
        : [tiedIds[1], tiedIds[0]];
    }
  }

  // Step 3: Sort by point difference DESC
  const byPointDiff = [...tiedIds].sort((a, b) => {
    const statsA = statsMap.get(a)!;
    const statsB = statsMap.get(b)!;
    return (statsB.pointsWon - statsB.pointsLost) - (statsA.pointsWon - statsA.pointsLost);
  });

  const pointDiffGroups = groupByKey(byPointDiff, (id) => {
    const s = statsMap.get(id)!;
    return s.pointsWon - s.pointsLost;
  });

  if (pointDiffGroups.length > 1) {
    const result: string[] = [];
    for (const group of pointDiffGroups) {
      result.push(...resolveMultiWayTie(group, statsMap, matches));
    }
    return result;
  }

  // Step 4: If still tied and exactly two, check H2H one more time
  if (tiedIds.length === 2) {
    const h2hWinner = getHeadToHeadWinner(matches, tiedIds[0], tiedIds[1]);
    if (h2hWinner) {
      return h2hWinner === tiedIds[0]
        ? [tiedIds[0], tiedIds[1]]
        : [tiedIds[1], tiedIds[0]];
    }
  }

  // Unresolvable tie — maintain current order
  return byPointDiff;
}

/**
 * Group an ordered array by a key function, preserving order.
 * Adjacent elements with the same key are grouped together.
 */
function groupByKey<T>(items: T[], keyFn: (item: T) => number): T[][] {
  if (items.length === 0) return [];

  const groups: T[][] = [];
  let currentKey = keyFn(items[0]);
  let currentGroup: T[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const key = keyFn(items[i]);
    if (key === currentKey) {
      currentGroup.push(items[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [items[i]];
      currentKey = key;
    }
  }
  groups.push(currentGroup);

  return groups;
}

/**
 * Calculate pool standings following BWF Article 16.2 tiebreaking rules.
 *
 * Ranking criteria (in order):
 * 1. Matches won (DESC)
 * 2. Two-way tie: head-to-head result
 * 3. Three+ way tie:
 *    a. Set difference (setsWon - setsLost) DESC
 *    b. If two remain tied: head-to-head
 *    c. Point difference (pointsWon - pointsLost) DESC
 *    d. If two remain tied: head-to-head
 *
 * @param matches - Completed match results for this pool
 * @param participantIds - All participant IDs in this pool
 * @returns Sorted standings with ranks assigned (1-indexed)
 */
export function calculatePoolStandings(
  matches: MatchResult[],
  participantIds: string[]
): StandingEntry[] {
  if (participantIds.length === 0) {
    return [];
  }

  // Build raw stats
  const statsMap = buildStats(matches, participantIds);

  // Primary sort: matchesWon DESC
  const sortedByWins = [...participantIds].sort((a, b) => {
    const statsA = statsMap.get(a)!;
    const statsB = statsMap.get(b)!;
    return statsB.matchesWon - statsA.matchesWon;
  });

  // Group by matchesWon to identify ties
  const winGroups = groupByKey(sortedByWins, (id) => statsMap.get(id)!.matchesWon);

  // Resolve ties within each group
  const finalOrder: string[] = [];
  for (const group of winGroups) {
    if (group.length === 1) {
      finalOrder.push(group[0]);
    } else {
      finalOrder.push(...resolveMultiWayTie(group, statsMap, matches));
    }
  }

  // Build standing entries with ranks
  return finalOrder.map((pid, index) => {
    const stats = statsMap.get(pid)!;
    return {
      participantId: pid,
      rank: index + 1,
      matchesPlayed: stats.matchesPlayed,
      matchesWon: stats.matchesWon,
      matchesLost: stats.matchesLost,
      setsWon: stats.setsWon,
      setsLost: stats.setsLost,
      pointsWon: stats.pointsWon,
      pointsLost: stats.pointsLost,
    };
  });
}

/**
 * Calculate placements for a knockout bracket based on the round in which
 * each participant was eliminated.
 *
 * Placement logic:
 * - Winner of the final: 1st place
 * - Loser of the final: 2nd place
 * - Losers of the semi-finals: joint 3rd place
 * - Losers of the quarter-finals: joint 5th place
 * - etc.
 *
 * For participants with byes that haven't played yet, they are excluded from
 * standings.
 *
 * @param matches - All matches in the knockout bracket (GeneratedMatch format)
 * @returns Array of standing entries with placement ranks
 */
export function calculateKnockoutPlacements(
  matches: GeneratedMatch[]
): StandingEntry[] {
  if (matches.length === 0) {
    return [];
  }

  // Find the maximum bracket round (the final)
  const maxRound = Math.max(...matches.map((m) => m.bracketRound ?? 0));

  // Track each participant's elimination round
  // Participants who advance keep getting higher elimination rounds
  const participantElimRound = new Map<string, number>();
  const allParticipants = new Set<string>();

  // Collect all non-null participants
  for (const match of matches) {
    if (match.participant1Id) allParticipants.add(match.participant1Id);
    if (match.participant2Id) allParticipants.add(match.participant2Id);
  }

  // For each match that has a determined winner (non-bye, both participants assigned),
  // track elimination. We need to look at which participant is NOT progressing.
  // Since GeneratedMatch doesn't have winnerId, we infer from progression:
  // A participant who appears in a later round was NOT eliminated in the earlier round.

  // Build a map of which participants appear in each round
  const participantsInRound = new Map<number, Set<string>>();
  for (const match of matches) {
    const round = match.bracketRound ?? match.roundNumber;
    if (!participantsInRound.has(round)) {
      participantsInRound.set(round, new Set());
    }
    const roundSet = participantsInRound.get(round)!;
    if (match.participant1Id) roundSet.add(match.participant1Id);
    if (match.participant2Id) roundSet.add(match.participant2Id);
  }

  // Determine elimination round: the highest round a participant appears in
  for (const pid of allParticipants) {
    let highestRound = 0;
    for (const [round, participants] of participantsInRound) {
      if (participants.has(pid) && round > highestRound) {
        highestRound = round;
      }
    }
    participantElimRound.set(pid, highestRound);
  }

  // Convert elimination rounds to placements
  // Eliminated in final (maxRound): places 1-2
  // Eliminated in semi-final (maxRound - 1): places 3-4
  // Eliminated in quarter-final (maxRound - 2): places 5-8
  // General formula: eliminated in round R → placement starts at bracketSize / 2^(R-1) + 1
  //   except for the final round where it's 1-2

  const entries: StandingEntry[] = [];

  // Group participants by their highest round
  const groupedByRound = new Map<number, string[]>();
  for (const [pid, round] of participantElimRound) {
    if (!groupedByRound.has(round)) {
      groupedByRound.set(round, []);
    }
    groupedByRound.get(round)!.push(pid);
  }

  // Sort rounds descending (finalist first)
  const rounds = Array.from(groupedByRound.keys()).sort((a, b) => b - a);

  let currentRank = 1;
  for (const round of rounds) {
    const participants = groupedByRound.get(round)!;
    const rank = currentRank;

    for (const pid of participants) {
      entries.push({
        participantId: pid,
        rank,
        matchesPlayed: 0, // These would be filled from actual results
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0,
      });
    }

    currentRank += participants.length;
  }

  return entries;
}
