"use client";

import React, { useMemo } from "react";
import { calculatePoolStandings } from "@/lib/utils/standings";
import type { MatchResult } from "@/lib/scheduler/types";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// --- Types ---

export type PoolParticipant = {
  id: string;
  name: string;
  seed?: number | null;
};

export type PoolMatch = {
  id: string;
  participant1: PoolParticipant | null;
  participant2: PoolParticipant | null;
  winnerId: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "WALKOVER" | "CANCELLED";
  sets: { setNumber: number; score1: number; score2: number }[];
};

export type PoolData = {
  id: string;
  name: string;
  participants: PoolParticipant[];
  matches: PoolMatch[];
};

// --- Component ---

export const PoolStandingsTable = ({ pool }: { pool: PoolData }) => {
  // Compute standings using the BWF Article 16.2 logic we wrote in the backend
  const standings = useMemo(() => {
    // 1. Convert frontend matches to MatchResult format expected by the utility
    const completedMatches: MatchResult[] = pool.matches
      .filter(
        (m) =>
          m.status === "COMPLETED" ||
          m.status === "WALKOVER" // Walkovers count for standings
      )
      .map((m) => ({
        matchId: m.id,
        participant1Id: m.participant1?.id ?? "",
        participant2Id: m.participant2?.id ?? "",
        winnerId: m.winnerId ?? "",
        sets: m.sets,
      }))
      .filter(
        (m) =>
          m.participant1Id !== "" &&
          m.participant2Id !== "" &&
          m.winnerId !== ""
      );

    const participantIds = pool.participants.map((p) => p.id);

    // 2. Call the BWF tiebreaking engine
    const computed = calculatePoolStandings(completedMatches, participantIds);

    // 3. Map computed standings back to full participant objects for rendering
    return computed.map((entry) => ({
      ...entry,
      participant: pool.participants.find((p) => p.id === entry.participantId)!,
      pointsDifference: entry.pointsWon - entry.pointsLost,
      setDifference: entry.setsWon - entry.setsLost,
    }));
  }, [pool]);

  return (
    <div className="w-full bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900/50 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
          {pool.name}
        </h3>
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
          Round Robin
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950/80 text-zinc-400 text-xs uppercase tracking-wider font-semibold border-b border-zinc-800/80">
            <tr>
              <th className="px-6 py-4 w-16 text-center">Pos</th>
              <th className="px-6 py-4">Player</th>
              <th className="px-6 py-4 w-20 text-center" title="Played">P</th>
              <th className="px-6 py-4 w-20 text-center" title="Won">W</th>
              <th className="px-6 py-4 w-20 text-center" title="Lost">L</th>
              <th className="px-6 py-4 w-24 text-center" title="Set Difference">Sets</th>
              <th className="px-6 py-4 w-32 text-center" title="Points Difference">Pts Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {standings.map((row, index) => {
              const isTopTwo = index < 2; // Assuming top 2 advance
              return (
                <tr
                  key={row.participantId}
                  className={cn(
                    "transition-colors hover:bg-zinc-800/30",
                    isTopTwo ? "bg-indigo-500/[0.02]" : "bg-transparent"
                  )}
                >
                  {/* Position */}
                  <td className="px-6 py-4">
                    <div
                      className={cn(
                        "w-8 h-8 mx-auto flex items-center justify-center rounded-lg font-bold",
                        index === 0
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : index === 1
                          ? "bg-zinc-300/20 text-zinc-300 border border-zinc-300/30"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                      )}
                    >
                      {row.rank}
                    </div>
                  </td>

                  {/* Player */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {row.participant.seed && (
                        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                          {row.participant.seed}
                        </span>
                      )}
                      <span
                        className={cn(
                          "font-semibold",
                          isTopTwo ? "text-indigo-300" : "text-zinc-200"
                        )}
                      >
                        {row.participant.name}
                      </span>
                    </div>
                  </td>

                  {/* Played */}
                  <td className="px-6 py-4 text-center font-medium text-zinc-300">
                    {row.matchesPlayed}
                  </td>

                  {/* Won */}
                  <td className="px-6 py-4 text-center font-bold text-emerald-400">
                    {row.matchesWon}
                  </td>

                  {/* Lost */}
                  <td className="px-6 py-4 text-center font-bold text-red-400">
                    {row.matchesLost}
                  </td>
                  
                  {/* Sets (W-L) */}
                  <td className="px-6 py-4 text-center font-medium text-zinc-400">
                    {row.setsWon} - {row.setsLost}
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        row.setDifference > 0
                          ? "text-emerald-500"
                          : row.setDifference < 0
                          ? "text-red-500"
                          : "text-zinc-600"
                      )}
                    >
                      ({row.setDifference > 0 ? "+" : ""}
                      {row.setDifference})
                    </span>
                  </td>

                  {/* Points Difference */}
                  <td className="px-6 py-4 text-center">
                    <div
                      className={cn(
                        "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold font-mono min-w-[3rem]",
                        row.pointsDifference > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : row.pointsDifference < 0
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      )}
                    >
                      {row.pointsDifference > 0 ? "+" : ""}
                      {row.pointsDifference}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
