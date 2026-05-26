"use client";

import React, { useTransition } from "react";
import { deleteSponsor } from "@/lib/actions/sponsor";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  tournamentId: string;
  sponsorId: string;
}

export function DeleteSponsorButton({ tournamentId, sponsorId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Are you sure you want to remove this sponsor?")) return;
    
    startTransition(async () => {
      await deleteSponsor(tournamentId, sponsorId);
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors absolute top-2 right-2"
      title="Delete Sponsor"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
