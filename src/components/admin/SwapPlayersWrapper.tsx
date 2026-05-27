"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { SwapParticipantsModal } from "./SwapParticipantsModal";

interface ParticipantInfo {
  id: string;
  name: string;
  seed: number | null;
}

export function SwapPlayersWrapper({
  tournamentId,
  categoryId,
  participants,
}: {
  tournamentId: string;
  categoryId: string;
  participants: ParticipantInfo[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white hover:bg-slate-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl transition-colors border border-indigo-200 shadow-sm flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Swap Players
      </button>

      <SwapParticipantsModal
        tournamentId={tournamentId}
        categoryId={categoryId}
        participants={participants}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
