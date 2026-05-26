"use client";

import React, { useState, useTransition } from "react";
import { saveMatchScore } from "@/lib/actions/scoring";
import { Loader2, Undo2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SetScore {
  setNumber: number;
  score1: number;
  score2: number;
}

interface Participant {
  id: string;
  name: string;
  teamName?: string | null;
}

interface MatchData {
  id: string;
  categoryId: string;
  category: { bestOf: number, name: string };
  participant1: Participant | null;
  participant2: Participant | null;
  sets: SetScore[];
}

export function UmpireScoringClient({ 
  match, 
  tournamentId, 
  courtName 
}: { 
  match: MatchData; 
  tournamentId: string;
  courtName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for instant feedback
  const [sets, setSets] = useState<SetScore[]>(() => {
    if (match.sets.length > 0) return [...match.sets].sort((a,b) => a.setNumber - b.setNumber);
    return [{ setNumber: 1, score1: 0, score2: 0 }];
  });

  const currentSetIndex = sets.length - 1;
  const currentSet = sets[currentSetIndex];
  
  // History stack for undo (just pushing the whole array stringified)
  const [history, setHistory] = useState<string[]>([]);

  const pushHistory = () => {
    setHistory(prev => [...prev, JSON.stringify(sets)]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = JSON.parse(history[history.length - 1]);
    setSets(previousState);
    setHistory(prev => prev.slice(0, -1));
    
    // Sync the undo to server
    startTransition(async () => {
      await saveMatchScore(match.id, tournamentId, previousState, false);
      router.refresh();
    });
  };

  const handleScore = (playerIndex: 1 | 2) => {
    pushHistory();
    const newSets = [...sets];
    if (playerIndex === 1) {
      newSets[currentSetIndex] = { ...currentSet, score1: currentSet.score1 + 1 };
    } else {
      newSets[currentSetIndex] = { ...currentSet, score2: currentSet.score2 + 1 };
    }
    setSets(newSets);

    startTransition(async () => {
      await saveMatchScore(match.id, tournamentId, newSets, false);
      router.refresh();
    });
  };

  const handleNextSet = () => {
    if (sets.length >= match.category.bestOf) return;
    pushHistory();
    const newSets = [...sets, { setNumber: sets.length + 1, score1: 0, score2: 0 }];
    setSets(newSets);
  };

  const handleFinishMatch = () => {
    if (!confirm("Are you sure you want to submit the final score and end the match?")) return;
    
    startTransition(async () => {
      const res = await saveMatchScore(match.id, tournamentId, sets, true);
      if (res && res.success === false) {
        alert(res.error || "Failed to finalize match.");
      } else {
        alert("Match completed successfully!");
        router.refresh();
      }
    });
  };

  const formatName = (p: Participant | null, fallback: string) => {
    if (!p) return fallback;
    return p.teamName ? `[${p.teamName}] ${p.name}` : p.name;
  };

  const p1Name = formatName(match.participant1, "Player 1");
  const p2Name = formatName(match.participant2, "Player 2");

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">{courtName}</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{match.category.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleUndo}
            disabled={history.length === 0 || isPending}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 disabled:opacity-30 active:scale-95 transition-all"
          >
            <Undo2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Set Navigation */}
      <div className="flex px-2 py-3 bg-slate-900 gap-2 justify-center">
        {sets.map((s, i) => (
          <div key={s.setNumber} className={`px-4 py-1.5 rounded-full text-sm font-bold ${i === currentSetIndex ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            Set {s.setNumber}: {s.score1}-{s.score2}
          </div>
        ))}
        {sets.length < match.category.bestOf && (
          <button 
            onClick={handleNextSet}
            className="px-4 py-1.5 rounded-full text-sm font-bold bg-slate-800 text-slate-300 active:scale-95 transition-transform"
          >
            + Next Set
          </button>
        )}
      </div>

      {/* Massive Tap Areas */}
      <div className="flex-1 flex flex-col sm:flex-row relative">
        {isPending && (
          <div className="absolute top-2 right-2 z-50">
            <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          </div>
        )}
        
        {/* P1 Area */}
        <button 
          onClick={() => handleScore(1)}
          className="flex-1 flex flex-col items-center justify-center bg-blue-600 active:bg-blue-700 transition-colors border-b sm:border-b-0 sm:border-r border-blue-800/50 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <h2 className="text-2xl sm:text-3xl font-black z-10 px-4 text-center text-blue-50 drop-shadow-md leading-tight mb-2">
            {p1Name}
          </h2>
          <div className="text-[120px] leading-none font-black text-white drop-shadow-2xl tabular-nums tracking-tighter">
            {currentSet.score1}
          </div>
          <div className="absolute inset-0 bg-white/0 group-active:bg-white/10 transition-colors" />
        </button>

        {/* P2 Area */}
        <button 
          onClick={() => handleScore(2)}
          className="flex-1 flex flex-col items-center justify-center bg-rose-600 active:bg-rose-700 transition-colors relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <h2 className="text-2xl sm:text-3xl font-black z-10 px-4 text-center text-rose-50 drop-shadow-md leading-tight mb-2">
            {p2Name}
          </h2>
          <div className="text-[120px] leading-none font-black text-white drop-shadow-2xl tabular-nums tracking-tighter">
            {currentSet.score2}
          </div>
          <div className="absolute inset-0 bg-white/0 group-active:bg-white/10 transition-colors" />
        </button>
      </div>

      {/* Finalize Button */}
      <div className="p-4 bg-slate-950 pb-safe">
        <button
          onClick={handleFinishMatch}
          disabled={isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all"
        >
          <CheckCircle2 className="w-7 h-7" />
          SUBMIT FINAL SCORE
        </button>
      </div>
    </div>
  );
}
