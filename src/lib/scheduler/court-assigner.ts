import type {
  GeneratedMatch,
  ScheduledMatch,
  SchedulerConfig,
} from './types';

/**
 * Compute scheduling priority for match ordering.
 * If categoryPriorityIds is provided, interleaves by round number FIRST, then by category priority.
 */
function getMatchPriority(match: GeneratedMatch & { categoryId?: string }, categoryPriorityIds?: string[]): number {
  if (match.isBye) {
    return Number.MAX_SAFE_INTEGER;
  }
  
  const roundLvl = Math.max(match.roundNumber, match.bracketRound || 0);
  
  if (categoryPriorityIds && match.categoryId) {
    const catIdx = categoryPriorityIds.indexOf(match.categoryId);
    const catPriority = catIdx === -1 ? 999 : catIdx;
    // Interleave sorting: Round 1 for all categories, then Round 2, etc.
    return (roundLvl * 10000) + (catPriority * 100) + (match.bracketPosition ?? 0);
  }

  // Fallback sorting for single-category generation
  if (match.poolId) {
    return match.roundNumber * 100;
  }
  return 100_000 + (match.bracketRound ?? 0) * 100 + (match.bracketPosition ?? 0);
}

type TimeBlock = { start: Date; end: Date };

/**
 * Finds the earliest available gap on any court that fits the duration
 * and respects the player's earliest availability.
 */
function findEarliestGap(
  courts: { id: string; name: string }[],
  courtSchedules: Map<string, TimeBlock[]>,
  playerEarliestAvailability: Date,
  durationMs: number,
  tournamentStartTime: Date
): { courtId: string; startTime: Date } {
  let bestCourtId = courts[0].id;
  let bestStartTime = new Date(3000, 0, 1); // Infinity basically

  for (const court of courts) {
    const blocks = courtSchedules.get(court.id) || [];
    
    // If court is empty, candidate is max of tournament start and player availability
    if (blocks.length === 0) {
      const candidateStart = new Date(Math.max(tournamentStartTime.getTime(), playerEarliestAvailability.getTime()));
      if (candidateStart.getTime() < bestStartTime.getTime()) {
        bestStartTime = candidateStart;
        bestCourtId = court.id;
      }
      continue;
    }

    // Check gap before the first block
    const firstCandidateStart = new Date(Math.max(tournamentStartTime.getTime(), playerEarliestAvailability.getTime()));
    if (firstCandidateStart.getTime() + durationMs <= blocks[0].start.getTime()) {
      if (firstCandidateStart.getTime() < bestStartTime.getTime()) {
        bestStartTime = firstCandidateStart;
        bestCourtId = court.id;
      }
    }

    // Check gaps between blocks
    let foundGap = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlockEnd = blocks[i].end.getTime();
      const nextBlockStart = blocks[i+1].start.getTime();
      
      const candidateStart = new Date(Math.max(currentBlockEnd, playerEarliestAvailability.getTime()));
      
      if (candidateStart.getTime() + durationMs <= nextBlockStart) {
        if (candidateStart.getTime() < bestStartTime.getTime()) {
          bestStartTime = candidateStart;
          bestCourtId = court.id;
        }
        foundGap = true;
        break; // Found the earliest gap on THIS court
      }
    }

    // Check after the last block
    if (!foundGap) {
      const lastBlockEnd = blocks[blocks.length - 1].end.getTime();
      const candidateStart = new Date(Math.max(lastBlockEnd, playerEarliestAvailability.getTime()));
      if (candidateStart.getTime() < bestStartTime.getTime()) {
        bestStartTime = candidateStart;
        bestCourtId = court.id;
      }
    }
  }

  return { courtId: bestCourtId, startTime: bestStartTime };
}

/**
 * Normalizes participant names (e.g. "John Doe / Jane Smith") into an array of individual names ("johndoe", "janesmith")
 * so that we can track rest periods for the same human playing across different categories.
 */
function getNormalizedPlayers(
  match: GeneratedMatch,
  participantNameMap: Map<string, string>
): string[] {
  const players: string[] = [];

  const addPlayers = (pId: string | null) => {
    if (!pId) return;
    const rawName = participantNameMap.get(pId);
    if (!rawName) return;
    
    // Split by common doubles delimiters
    const names = rawName.split(/[/,&+]/);
    for (const name of names) {
      const normalized = name.trim().toLowerCase().replace(/\s+/g, '');
      if (normalized) players.push(normalized);
    }
  };

  addPlayers(match.participant1Id);
  addPlayers(match.participant2Id);

  return players;
}

export function assignMatchesToCourts(
  matches: (GeneratedMatch & { categoryId?: string })[],
  courts: { id: string; name: string }[],
  config: SchedulerConfig,
  participantNameMap: Map<string, string>,
  // Optional pre-existing schedules for the global auto-scheduler
  existingCourtSchedules: Map<string, TimeBlock[]> = new Map(),
  existingPlayerLastMatchEnd: Map<string, Date> = new Map(),
  categoryPriorityIds?: string[]
): ScheduledMatch[] {
  if (matches.length === 0 || courts.length === 0) {
    return [];
  }

  // Separate Finals (no nextMatchId in knockout) from regular matches
  // Pool matches are never "finals" in this context
  const finals: GeneratedMatch[] = [];
  const regularMatches: GeneratedMatch[] = [];

  for (const m of matches) {
    if (m.isBye) {
      continue; // Skip byes
    }
    
    // If it's a knockout match with no nextMatchId, it is the Final!
    if (!m.poolId && !m.nextMatchId && m.bracketRound) {
      finals.push(m);
    } else {
      regularMatches.push(m);
    }
  }

  // Sort regular matches by priority (interleaved if categoryPriorityIds is provided)
  regularMatches.sort((a, b) => getMatchPriority(a, categoryPriorityIds) - getMatchPriority(b, categoryPriorityIds));

  const courtSchedules = new Map<string, TimeBlock[]>(existingCourtSchedules);
  for (const c of courts) {
    if (!courtSchedules.has(c.id)) courtSchedules.set(c.id, []);
  }

  const playerLastMatchEnd = new Map<string, Date>(existingPlayerLastMatchEnd);
  const matchDurationMs = config.estimatedMatchDurationMinutes * 60 * 1000;
  const restPeriodMs = config.restPeriodMinutes * 60 * 1000;
  const scheduledMatches: ScheduledMatch[] = [];

  // Reusable scheduling function
  const scheduleMatch = (match: GeneratedMatch, forcedStartTime?: Date) => {
    const playerNames = getNormalizedPlayers(match, participantNameMap);

    let playerEarliestAvailability = forcedStartTime || new Date(config.tournamentStartTime);

    if (!forcedStartTime) {
      for (const name of playerNames) {
        const lastEnd = playerLastMatchEnd.get(name);
        if (lastEnd) {
          const availAt = new Date(lastEnd.getTime() + restPeriodMs);
          if (availAt.getTime() > playerEarliestAvailability.getTime()) {
            playerEarliestAvailability = availAt;
          }
        }
      }
    }

    const { courtId, startTime } = findEarliestGap(
      courts,
      courtSchedules,
      playerEarliestAvailability,
      matchDurationMs,
      config.tournamentStartTime
    );

    const scheduledStartTime = forcedStartTime || startTime;
    const scheduledEndTime = new Date(scheduledStartTime.getTime() + matchDurationMs);

    scheduledMatches.push({ ...match, courtId, scheduledStartTime, scheduledEndTime });

    // Update trackers
    const blocks = courtSchedules.get(courtId)!;
    blocks.push({ start: scheduledStartTime, end: scheduledEndTime });
    blocks.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const name of playerNames) {
      // Only update if it's strictly later (handling edge cases where a player plays 2 matches simultaneously somehow)
      const existing = playerLastMatchEnd.get(name);
      if (!existing || scheduledEndTime.getTime() > existing.getTime()) {
        playerLastMatchEnd.set(name, scheduledEndTime);
      }
    }
  };

  // 1. Schedule all regular matches (packing into gaps)
  for (const match of regularMatches) {
    scheduleMatch(match);
  }

  // 2. Find the absolute latest end time across ALL courts so far
  let absoluteLatestEndTime = new Date(config.tournamentStartTime);
  for (const blocks of courtSchedules.values()) {
    if (blocks.length > 0) {
      const lastBlockEnd = blocks[blocks.length - 1].end;
      if (lastBlockEnd.getTime() > absoluteLatestEndTime.getTime()) {
        absoluteLatestEndTime = lastBlockEnd;
      }
    }
  }

  // 3. Schedule Finals grouped together at the very end of the day
  // To make it look like a "Finals Block", we assign them starting from the absoluteLatestEndTime
  // (Ignoring rest periods as they should have plenty of rest if they are playing the last match of the day)
  for (const finalMatch of finals) {
    scheduleMatch(finalMatch, absoluteLatestEndTime);
  }

  return scheduledMatches.sort((a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime());
}
