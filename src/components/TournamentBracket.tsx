"use client";

import React from "react";
import { Trophy } from "lucide-react";

// --- Utilities ---
function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

function getRoundName(round: number, totalRounds: number) {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  return `Round ${round}`;
}

// --- Types ---
export type BracketParticipant = {
  id: string;
  name: string;
  seed?: number | null;
};

export type BracketMatchSet = {
  setNumber: number;
  score1: number;
  score2: number;
};

export type BracketMatch = {
  id: string;
  participant1: BracketParticipant | null;
  participant2: BracketParticipant | null;
  winnerId: string | null;
  status:
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "WALKOVER"
    | "CANCELLED"
    | "BYE";
  sets: BracketMatchSet[];
  nextMatchId: string | null;
  nextMatchSlot: "SLOT_1" | "SLOT_2" | null;
  bracketRound: number | null;
  bracketPosition: number | null;
};

// --- Subcomponents ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    SCHEDULED: "bg-zinc-800 text-zinc-400 border border-zinc-700",
    IN_PROGRESS: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    COMPLETED: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    WALKOVER: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    CANCELLED: "bg-red-500/20 text-red-400 border border-red-500/30",
    BYE: "bg-zinc-800 text-zinc-500 border border-zinc-800",
  };

  const activeStyle = styles[status] || styles.SCHEDULED;

  return (
    <span
      className={cn(
        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
        activeStyle
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
};

const ParticipantRow = ({
  participant,
  scores,
  isWinner,
  isCompleted,
  isBye,
  isFinalMatchAndWon,
}: {
  participant: BracketParticipant | null;
  scores: number[];
  isWinner: boolean;
  isCompleted: boolean;
  isBye: boolean;
  isFinalMatchAndWon?: boolean;
}) => {
  const isLoser = isCompleted && !isWinner && !isBye;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2.5 transition-colors",
        isWinner && !isBye && "bg-indigo-500/10",
        isLoser && "opacity-40 grayscale"
      )}
    >
      <div className="flex items-center gap-2 truncate pr-2">
        {participant?.seed ? (
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
            {participant.seed}
          </span>
        ) : (
          <span className="w-4" /> // placeholder for alignment
        )}
        <span
          className={cn(
            "text-sm font-semibold truncate tracking-tight flex items-center gap-2",
            isWinner && !isBye ? "text-indigo-400" : "text-zinc-200"
          )}
        >
          {isBye ? "BYE" : participant?.name || "TBD"}
          {isFinalMatchAndWon && <Trophy className="w-3.5 h-3.5 text-yellow-500" />}
        </span>
      </div>

      {/* Scores (Boxes) */}
      {scores && scores.length > 0 && !isBye && (
        <div className="flex gap-1">
          {scores.map((score, idx) => (
            <div
              key={idx}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded text-xs font-bold font-mono border",
                isWinner
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : "bg-zinc-800/80 text-zinc-400 border-zinc-700"
              )}
            >
              {score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MatchCard = ({
  match,
  isFinalRound,
}: {
  match: BracketMatch;
  isFinalRound: boolean;
}) => {
  const p1 = match.participant1;
  const p2 = match.participant2;
  const isBye = match.status === "BYE";
  const isCompleted = match.status === "COMPLETED";

  // Sort sets by setNumber, just in case
  const sortedSets = [...match.sets].sort((a, b) => a.setNumber - b.setNumber);
  const p1Scores = sortedSets.map((s) => s.score1);
  const p2Scores = sortedSets.map((s) => s.score2);

  return (
    <div
      className={cn(
        "w-[280px] bg-zinc-900/90 backdrop-blur-xl border rounded-xl overflow-hidden shadow-xl flex flex-col transition-all duration-300",
        match.winnerId && !isBye
          ? "border-indigo-500/50 shadow-indigo-500/10"
          : "border-zinc-800 shadow-black/50 hover:border-zinc-700"
      )}
    >
      {/* Header */}
      <div className="bg-zinc-950/80 px-3 py-1.5 flex justify-between items-center border-b border-zinc-800/80">
        <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
          Match {match.bracketPosition}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Participants */}
      <div className="flex flex-col">
        <ParticipantRow
          participant={p1}
          scores={p1Scores}
          isWinner={match.winnerId === p1?.id}
          isCompleted={isCompleted}
          isBye={isBye}
          isFinalMatchAndWon={isFinalRound && match.winnerId === p1?.id}
        />
        <div className="h-[1px] w-full bg-zinc-800/50" />
        <ParticipantRow
          participant={p2}
          scores={p2Scores}
          isWinner={match.winnerId === p2?.id}
          isCompleted={isCompleted}
          isBye={isBye}
          isFinalMatchAndWon={isFinalRound && match.winnerId === p2?.id}
        />
      </div>
    </div>
  );
};

/**
 * Recursive BracketNode component.
 * It builds the bracket from right to left (Finals -> Semis -> Quarters).
 * Using flex layout, children (previous round) are placed on the left,
 * and the current match is placed on the right.
 */
const BracketNode = ({
  match,
  matches,
  round,
  totalRounds,
}: {
  match: BracketMatch;
  matches: BracketMatch[];
  round: number;
  totalRounds: number;
}) => {
  // Find the two matches from the previous round that feed into this match
  const feedMatches = matches.filter((m) => m.nextMatchId === match.id);
  const topMatch = feedMatches.find((m) => m.nextMatchSlot === "SLOT_1");
  const bottomMatch = feedMatches.find((m) => m.nextMatchSlot === "SLOT_2");

  const hasChildren = topMatch || bottomMatch;

  return (
    <div className="flex flex-row items-center">
      {/* Left side: branches to previous round */}
      {hasChildren && (
        <div className="flex flex-col justify-around h-full relative">
          <div className="flex-1 flex items-center relative pr-6 py-4">
            {topMatch ? (
              <BracketNode
                match={topMatch}
                matches={matches}
                round={round - 1}
                totalRounds={totalRounds}
              />
            ) : (
              <div className="w-[280px]" /> // Placeholder if branch missing
            )}
            {/* Connector line down to center */}
            <div className="absolute right-0 top-1/2 bottom-[-1px] w-6 border-t-2 border-r-2 border-indigo-500/20 rounded-tr-xl pointer-events-none" />
          </div>

          <div className="flex-1 flex items-center relative pr-6 py-4">
            {bottomMatch ? (
              <BracketNode
                match={bottomMatch}
                matches={matches}
                round={round - 1}
                totalRounds={totalRounds}
              />
            ) : (
              <div className="w-[280px]" />
            )}
            {/* Connector line up to center */}
            <div className="absolute right-0 top-[-1px] bottom-1/2 w-6 border-b-2 border-r-2 border-indigo-500/20 rounded-br-xl pointer-events-none" />
          </div>
        </div>
      )}

      {/* Right side: current match card */}
      <div className="relative pl-6">
        {/* Short horizontal line connecting the vertical join to this card */}
        {hasChildren && (
          <div className="absolute left-0 top-1/2 w-6 border-t-2 border-indigo-500/20 -translate-y-[1px] pointer-events-none" />
        )}
        <MatchCard match={match} isFinalRound={round === totalRounds} />
      </div>
    </div>
  );
};

// --- Main Component ---

export const TournamentBracket = ({
  matches,
}: {
  matches: BracketMatch[];
}) => {
  // We only render knockout bracket matches
  const knockoutMatches = matches.filter((m) => m.bracketRound != null);

  if (knockoutMatches.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
        No bracket matches available yet.
      </div>
    );
  }

  // Find the final matches (those with no nextMatchId, or highest bracketRound)
  const finalMatches = knockoutMatches.filter((m) => !m.nextMatchId);
  const totalRounds = Math.max(...knockoutMatches.map((m) => m.bracketRound!));

  return (
    <div className="w-full overflow-x-auto bg-[#0a0a0a] rounded-2xl border border-zinc-800/80 shadow-2xl custom-scrollbar relative">
      <div className="p-4 md:p-8 min-w-max">
        {/* Header Row */}
        <div className="flex mb-8">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div key={i} className="w-[328px] pl-6 pr-6 flex-shrink-0">
              <div className="w-[280px] text-center text-[11px] font-bold tracking-[0.2em] text-indigo-400/90 uppercase bg-indigo-500/10 py-2.5 rounded-lg border border-indigo-500/20 backdrop-blur-sm shadow-inner shadow-indigo-500/5">
                {getRoundName(i + 1, totalRounds)}
              </div>
            </div>
          ))}
        </div>

        {/* Bracket Trees */}
        <div className="flex flex-col gap-16 relative z-10">
          {finalMatches.map((finalMatch) => (
            <BracketNode
              key={finalMatch.id}
              match={finalMatch}
              matches={knockoutMatches}
              round={totalRounds}
              totalRounds={totalRounds}
            />
          ))}
        </div>
        
        {/* Ambient Glow Background Effect */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
};
