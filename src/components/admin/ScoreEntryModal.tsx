"use client";

import React, { useState, useTransition } from "react";
import { saveMatchScore, markWalkover } from "@/lib/actions/scoring";
import { useRouter } from "next/navigation";
import { X, Trophy, Loader2 } from "lucide-react";
import { LocalTime } from "@/components/LocalTime";

interface SetScore {
  setNumber: number;
  score1: number;
  score2: number;
}

interface MatchForScoring {
  id: string;
  participant1: { id: string; name: string } | null;
  participant2: { id: string; name: string } | null;
  category: { id: string; name: string; bestOf: number };
  sets: { setNumber: number; score1: number; score2: number }[];
  status: string;
  court: { name: string } | null;
  scheduledStartTime: Date | null;
  matchCode?: string;
}

export function ScoreEntryModal({
  match,
  tournamentId,
  isOpen,
  onClose,
  matchCode,
  isReadOnly,
}: {
  match: MatchForScoring;
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
  matchCode?: string;
  isReadOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const bestOf = match.category.bestOf;
  const setsToWin = Math.ceil(bestOf / 2);

  // Initialize scores from existing data or empty
  const [scores, setScores] = useState<SetScore[]>(() => {
    const initial: SetScore[] = [];
    for (let i = 1; i <= bestOf; i++) {
      const existing = match.sets.find(s => s.setNumber === i);
      initial.push({
        setNumber: i,
        score1: existing?.score1 ?? 0,
        score2: existing?.score2 ?? 0,
      });
    }
    return initial;
  });

  if (!isOpen) return null;

  const p1Name = match.participant1?.name ?? "Player 1";
  const p2Name = match.participant2?.name ?? "Player 2";

  // Calculate live winner preview
  let p1SetsWon = 0;
  let p2SetsWon = 0;
  for (const s of scores) {
    if (s.score1 > s.score2) p1SetsWon++;
    else if (s.score2 > s.score1) p2SetsWon++;
  }
  const previewWinner = p1SetsWon >= setsToWin ? p1Name : p2SetsWon >= setsToWin ? p2Name : null;

  const updateScore = (setIndex: number, field: "score1" | "score2", value: string) => {
    const num = parseInt(value) || 0;
    setScores(prev => {
      const updated = [...prev];
      updated[setIndex] = { ...updated[setIndex], [field]: Math.max(0, num) };
      return updated;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveMatchScore(match.id, tournamentId, scores);
      onClose();
      router.refresh();
    });
  };

  const handleSpecialWin = (winnerId: string, reason: "WALKOVER" | "BYE" | "CANCELLED") => {
    const confirmAction = confirm(`Are you sure you want to mark this match as a ${reason}? This cannot be easily undone.`);
    if (!confirmAction) return;
    
    startTransition(async () => {
      await markWalkover(match.id, tournamentId, winnerId, reason);
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 sm:p-6 text-white relative">
          {/* Close button - always top right */}
          <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/60 hover:text-white transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {/* Category & Best-of */}
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider pr-8">{match.category.name} • Best of {bestOf}</p>

          {/* Title */}
          <h2 className="text-xl font-black tracking-tight mt-1 mb-2">Enter Score</h2>

          {/* Match code + Court/Time row - flex-wrap to prevent overlap on mobile */}
          <div className="flex flex-wrap items-center gap-2">
            {(matchCode || match.matchCode) && (
              <span className="bg-white/25 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-black tracking-wider border border-white/20 shadow-lg">
                {matchCode || match.matchCode}
              </span>
            )}
            {match.court && match.scheduledStartTime && (
              <span className="bg-white/20 text-white/90 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                {match.court.name} @ <LocalTime date={match.scheduledStartTime} />
              </span>
            )}
          </div>
        </div>

        {/* Score Grid */}
        <div className="p-6 space-y-5">
          {/* Header row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `1fr repeat(${bestOf}, 70px)` }}>
            <div />
            {scores.map((_, i) => (
              <div key={`header-${i}`} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Set {i + 1}
              </div>
            ))}
          </div>

          {/* Player 1 row */}
          <div className="grid items-center gap-3" style={{ gridTemplateColumns: `1fr repeat(${bestOf}, 70px)` }}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p1SetsWon >= setsToWin ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-sm font-bold text-slate-800 truncate">{p1Name}</span>
              <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{p1SetsWon}</span>
            </div>
            {scores.map((s, i) => (
              <input
                key={`p1-${i}`}
                type="number"
                min={0}
                value={s.score1 || ""}
                readOnly={isReadOnly}
                onChange={e => !isReadOnly && updateScore(i, "score1", e.target.value)}
                className={`w-full h-12 text-center text-lg font-black rounded-xl border-2 transition-all outline-none
                  ${s.score1 > s.score2 && (s.score1 > 0 || s.score2 > 0)
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : s.score2 > s.score1 && (s.score1 > 0 || s.score2 > 0)
                    ? 'border-red-200 bg-red-50/50 text-red-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                  }
                  ${isReadOnly ? 'opacity-80' : 'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex-1 border-t border-slate-100" />
            <span className="text-[10px] font-black text-slate-300 uppercase">vs</span>
            <div className="flex-1 border-t border-slate-100" />
          </div>

          {/* Player 2 row */}
          <div className="grid items-center gap-3" style={{ gridTemplateColumns: `1fr repeat(${bestOf}, 70px)` }}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p2SetsWon >= setsToWin ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-sm font-bold text-slate-800 truncate">{p2Name}</span>
              <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{p2SetsWon}</span>
            </div>
            {scores.map((s, i) => (
              <input
                key={`p2-${i}`}
                type="number"
                min={0}
                value={s.score2 || ""}
                readOnly={isReadOnly}
                onChange={e => !isReadOnly && updateScore(i, "score2", e.target.value)}
                className={`w-full h-12 text-center text-lg font-black rounded-xl border-2 transition-all outline-none
                  ${s.score2 > s.score1 && (s.score1 > 0 || s.score2 > 0)
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : s.score1 > s.score2 && (s.score1 > 0 || s.score2 > 0)
                    ? 'border-red-200 bg-red-50/50 text-red-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                  }
                  ${isReadOnly ? 'opacity-80' : 'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
            ))}
          </div>

          {/* Winner Preview */}
          {previewWinner && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 animate-in fade-in duration-300">
              <Trophy className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <div className="text-sm font-bold">
                <span className="text-emerald-600">{previewWinner}</span> wins {p1SetsWon >= setsToWin ? p1SetsWon : p2SetsWon}-{p1SetsWon >= setsToWin ? p2SetsWon : p1SetsWon}!
              </div>
            </div>
          )}
        </div>

        {/* Special Outcomes */}
        {!isReadOnly && (match.participant1 && match.participant2) && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Special Outcomes</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSpecialWin(match.participant1!.id, "WALKOVER")}
                disabled={isPending}
                className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm"
              >
                P2 Disqualified / Walkover (P1 Wins)
              </button>
              <button
                onClick={() => handleSpecialWin(match.participant2!.id, "WALKOVER")}
                disabled={isPending}
                className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm"
              >
                P1 Disqualified / Walkover (P2 Wins)
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          {isReadOnly ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/tournaments/${tournamentId}/draws/${match.category.id}`);
                }}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                View in Draw
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isPending}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                ) : (
                  "Save Score"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
