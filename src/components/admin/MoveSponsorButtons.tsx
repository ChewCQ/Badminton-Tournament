"use client";

import React, { useTransition } from "react";
import { moveSponsor } from "@/lib/actions/sponsor";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface Props {
  tournamentId: string;
  sponsorId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function MoveSponsorButtons({ tournamentId, sponsorId, isFirst, isLast }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleMove = (direction: 'UP' | 'DOWN') => {
    startTransition(async () => {
      await moveSponsor(tournamentId, sponsorId, direction);
    });
  };

  return (
    <div className="absolute top-2 left-2 flex gap-1">
      <button
        onClick={() => handleMove('UP')}
        disabled={isPending || isFirst}
        className="w-7 h-7 flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Move Left (Earlier)"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      <button
        onClick={() => handleMove('DOWN')}
        disabled={isPending || isLast}
        className="w-7 h-7 flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Move Right (Later)"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
