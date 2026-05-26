import type { Round, MatchPairing } from './types';

const BYE_SENTINEL = '__BYE__';

/**
 * Generate round-robin pairings using the Circle Method.
 *
 * The algorithm fixes participant[0] in place and rotates the remaining
 * participants through (n-1) rounds, guaranteeing every participant faces
 * every other participant exactly once.
 *
 * @param participantIds - Array of participant identifiers (at least 2)
 * @returns Array of Rounds, each containing pairings for that round (1-indexed)
 */
export function generateRoundRobinPairings(
  participantIds: string[]
): Round[] {
  if (participantIds.length < 2) {
    return [];
  }

  // Copy so we don't mutate the caller's array
  const ids = [...participantIds];

  // Step 1: If odd count, add a BYE sentinel to make even
  if (ids.length % 2 !== 0) {
    ids.push(BYE_SENTINEL);
  }

  const n = ids.length;
  const totalRounds = n - 1;

  // Step 2: Fix first participant, rotating list = rest
  const fixed = ids[0];
  const rotating = ids.slice(1); // length = n - 1

  const rounds: Round[] = [];

  for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
    const pairings: MatchPairing[] = [];

    // Step 3a: Pair the fixed participant with the first in the rotating list
    pairings.push({
      participant1Id: fixed,
      participant2Id: rotating[0],
    });

    // Step 3b: Pair rotating[i] with rotating[length - 1 - i]
    const halfLen = rotating.length / 2;
    for (let i = 1; i < halfLen; i++) {
      // Cast needed because halfLen is always an integer (rotating.length is odd => n-1 is odd only if n is even, which it always is at this point)
      pairings.push({
        participant1Id: rotating[i],
        participant2Id: rotating[rotating.length - i],
      });
    }

    // Step 4: Filter out any pairings that include the BYE sentinel
    const filteredPairings = pairings.filter(
      (p) =>
        p.participant1Id !== BYE_SENTINEL &&
        p.participant2Id !== BYE_SENTINEL
    );

    // Step 5: Add round (1-indexed)
    rounds.push({
      roundNumber: roundIdx + 1,
      pairings: filteredPairings,
    });

    // Step 3c: Rotate — move last element to front
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  return rounds;
}
