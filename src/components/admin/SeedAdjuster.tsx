"use client";

import React, { useState, useTransition } from "react";
import { updateParticipantSeed } from "@/lib/actions/draws";
import { Check, Edit2, Loader2 } from "lucide-react";
import { GenerateScheduleButton } from "@/components/admin/GenerateScheduleButton";

interface Participant {
  id: string;
  name: string;
  seed: number | null;
}

export function SeedAdjuster({
  participants,
  tournamentId,
  categoryId,
}: {
  participants: Participant[];
  tournamentId: string;
  categoryId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleSave = (id: string) => {
    const seedVal = editValue.trim() === "" ? null : parseInt(editValue, 10);
    
    startTransition(async () => {
      await updateParticipantSeed(id, seedVal, tournamentId);
      setEditingId(null);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Adjust Seedings</h2>
          <p className="text-slate-500 text-xs font-medium mt-1">Set player rankings before generating the draw. Top seeds will be placed in optimal bracket positions.</p>
        </div>
        <div>
          <GenerateScheduleButton tournamentId={tournamentId} categoryId={categoryId} />
        </div>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
            <th className="px-6 py-4 font-semibold w-24">Seed</th>
            <th className="px-6 py-4 font-semibold">Player Name</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {participants.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                {editingId === p.id ? (
                  <input
                    type="number"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave(p.id)}
                    className="w-16 px-2 py-1 bg-white border border-indigo-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="-"
                  />
                ) : (
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${p.seed ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                    {p.seed || "-"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="font-bold text-slate-800">{p.name}</span>
              </td>
              <td className="px-6 py-4 text-right">
                {editingId === p.id ? (
                  <button
                    onClick={() => handleSave(p.id)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setEditValue(p.seed ? p.seed.toString() : "");
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-600 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
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
