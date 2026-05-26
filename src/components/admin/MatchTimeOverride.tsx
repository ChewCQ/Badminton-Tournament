"use client";

import React, { useState, useTransition } from "react";
import { updateMatchTime } from "@/lib/actions/draws";
import { Check, Clock, Loader2 } from "lucide-react";

interface MatchData {
  id: string;
  roundNumber: number;
  bracketRound: number | null;
  scheduledStartTime: Date | null;
  participant1: { name: string } | null;
  participant2: { name: string } | null;
}

export function MatchTimeOverride({
  matches,
  tournamentId,
}: {
  matches: MatchData[];
  tournamentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // datetime-local inputs require YYYY-MM-DDThh:mm
  const formatForInput = (date: Date | null) => {
    if (!date) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [editValue, setEditValue] = useState<string>("");

  const handleSave = (id: string) => {
    if (!editValue) return;
    
    startTransition(async () => {
      await updateMatchTime(id, new Date(editValue), tournamentId);
      setEditingId(null);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800">Match Overrides</h2>
        <p className="text-slate-500 text-xs font-medium mt-1">Push back match times due to injuries, delays, or specific umpire requirements. Edits reflect instantly on the Live Court grid.</p>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
            <th className="px-6 py-4 font-semibold w-20">Round</th>
            <th className="px-6 py-4 font-semibold">Matchup</th>
            <th className="px-6 py-4 font-semibold w-64">Scheduled Time</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {matches.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <span className="text-xs font-bold text-slate-400">R{m.roundNumber}</span>
              </td>
              <td className="px-6 py-4">
                <div className="font-bold text-slate-800 text-sm">
                  {m.participant1?.name || (m.bracketRound && m.bracketRound > 1 ? `Winner of R${m.bracketRound - 1}` : 'TBA')} 
                  <span className="text-slate-300 mx-1">vs</span> 
                  {m.participant2?.name || (m.bracketRound && m.bracketRound > 1 ? `Winner of R${m.bracketRound - 1}` : 'TBA')}
                </div>
              </td>
              <td className="px-6 py-4">
                {editingId === m.id ? (
                  <input
                    type="datetime-local"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-indigo-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {m.scheduledStartTime ? new Date(m.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {editingId === m.id ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(m.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-xs font-bold"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(m.id);
                      setEditValue(formatForInput(m.scheduledStartTime));
                    }}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Override
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
