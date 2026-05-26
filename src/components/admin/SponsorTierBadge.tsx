"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { updateSponsorTier } from "@/lib/actions/sponsor";
import { Loader2, Edit3, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function SponsorTierBadge({
  tournamentId,
  sponsorId,
  currentTier,
}: {
  tournamentId: string;
  sponsorId: string;
  currentTier: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentTier);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() === currentTier || !editValue.trim()) {
      setIsEditing(false);
      setEditValue(currentTier);
      return;
    }
    
    startTransition(async () => {
      await updateSponsorTier(tournamentId, sponsorId, editValue.trim());
      setIsEditing(false);
      router.refresh();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(currentTier);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input 
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-zinc-950 border border-indigo-500/50 text-zinc-100 text-[10px] uppercase font-black px-2 py-1 rounded w-24 focus:outline-none focus:border-indigo-500"
        />
        <button 
          onClick={handleSave} 
          disabled={isPending}
          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button 
          onClick={() => { setIsEditing(false); setEditValue(currentTier); }}
          disabled={isPending}
          className="p-1 text-zinc-500 hover:bg-zinc-800 rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      disabled={isPending}
      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 cursor-text"
      title="Edit Label"
    >
      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : currentTier}
      <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
