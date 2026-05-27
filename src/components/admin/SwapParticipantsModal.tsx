"use client";

import React, { useState, useTransition } from "react";
import { Users, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { swapParticipants } from "@/lib/actions/draws";

interface ParticipantInfo {
  id: string;
  name: string;
  seed: number | null;
}

export function SwapParticipantsModal({
  tournamentId,
  categoryId,
  participants,
  isOpen,
  onClose
}: {
  tournamentId: string;
  categoryId: string;
  participants: ParticipantInfo[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [playerA, setPlayerA] = useState<string>("");
  const [playerB, setPlayerB] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwap = () => {
    if (!playerA || !playerB) {
      setError("Please select both players to swap.");
      return;
    }
    if (playerA === playerB) {
      setError("Cannot swap a player with themselves.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await swapParticipants(playerA, playerB, categoryId, tournamentId);
      if (!res.success) {
        setError(res.error || "Failed to swap players.");
      } else {
        onClose();
        setPlayerA("");
        setPlayerB("");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-indigo-200 hover:text-white transition-colors">
            ×
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Swap Players</h2>
              <p className="text-indigo-200 text-xs font-medium">Transpose two players in the bracket</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-slate-700 text-sm font-medium">
            <Users className="w-5 h-5 flex-shrink-0 text-slate-400" />
            <div>
              Swap positions to avoid early club matchups. This swaps their seeds, pools, and all assigned bracket positions.
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Player 1
              </label>
              <select
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow appearance-none"
              >
                <option value="">-- Select Player --</option>
                {participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.seed ? `(Seed ${p.seed})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center -my-1 relative z-10">
              <div className="bg-white border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-slate-400">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Player 2
              </label>
              <select
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow appearance-none"
              >
                <option value="">-- Select Player --</option>
                {participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.seed ? `(Seed ${p.seed})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            disabled={isPending || !playerA || !playerB}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Execute Swap
          </button>
        </div>
      </div>
    </div>
  );
}
