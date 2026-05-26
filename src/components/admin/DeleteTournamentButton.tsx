"use client";

import React, { useState, useTransition } from "react";
import { deleteTournament } from "@/lib/actions/tournament";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteTournamentButton({ tournamentId, tournamentName }: { tournamentId: string, tournamentName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = () => {
    if (confirmText !== tournamentName) {
      alert("Name does not match.");
      return;
    }

    startTransition(async () => {
      const res = await deleteTournament(tournamentId);
      if (res.success) {
        // Redirection is handled by server action revalidatePath/redirect or we can push
        router.push("/admin");
      } else {
        alert(res.error || "Failed to delete tournament");
      }
    });
  };

  return (
    <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6 lg:p-8 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <p className="text-red-400/80 text-sm mt-1 max-w-2xl">
            Permanently delete this tournament, including all categories, participants, matches, and results. This action cannot be undone.
          </p>
        </div>
        
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 flex shrink-0"
          >
            Delete Tournament
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-6 bg-black/50 p-6 rounded-xl border border-red-900/30">
          <p className="text-sm text-zinc-300 mb-4">
            To confirm deletion, please type the exact tournament name: <strong className="text-white select-all">{tournamentName}</strong>
          </p>
          
          <div className="flex gap-3">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tournamentName}
              className="flex-1 bg-zinc-950 border border-red-900/50 text-white px-4 py-3 rounded-xl focus:border-red-500 focus:outline-none placeholder:text-zinc-700"
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
            />
            
            <button
              onClick={handleDelete}
              disabled={isPending || confirmText !== tournamentName}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Confirm Delete
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                setConfirmText("");
              }}
              disabled={isPending}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-xl font-bold transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
