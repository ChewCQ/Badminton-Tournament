// Match pairing from generators
export interface MatchPairing {
  participant1Id: string;
  participant2Id: string;
}

// A round of matches (for round-robin)
export interface Round {
  roundNumber: number;
  pairings: MatchPairing[];
}

// Generated match (before court assignment)
export interface GeneratedMatch {
  id: string; // temporary ID for wiring
  participant1Id: string | null;
  participant2Id: string | null;
  roundNumber: number;
  poolId?: string;
  bracketRound?: number;
  bracketPosition?: number;
  nextMatchId?: string;
  nextMatchSlot?: 'SLOT_1' | 'SLOT_2';
  isBye?: boolean;
}

// After court assignment
export interface ScheduledMatch extends GeneratedMatch {
  courtId: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
}

// Court availability tracking
export interface CourtSlot {
  courtId: string;
  availableAt: Date;
}

// Scheduler configuration
export interface SchedulerConfig {
  tournamentStartTime: Date;
  estimatedMatchDurationMinutes: number;
  restPeriodMinutes: number;
}

// For knockout bracket
export interface KnockoutBracket {
  matches: GeneratedMatch[];
  totalRounds: number;
  bracketSize: number;
}

// Standings entry
export interface StandingEntry {
  participantId: string;
  rank: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
}

// Match result for standings calculation
export interface MatchResult {
  matchId: string;
  participant1Id: string;
  participant2Id: string;
  winnerId: string;
  sets: { setNumber: number; score1: number; score2: number }[];
}

// Pool-to-bracket config
export interface PoolToBracketConfig {
  poolSize: number;
  advanceCount: number;
}
