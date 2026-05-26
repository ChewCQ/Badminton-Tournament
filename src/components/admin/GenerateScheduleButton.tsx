"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export const GenerateScheduleButton = ({
  tournamentId,
  categoryId,
}: {
  tournamentId: string;
  categoryId: string;
}) => {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatus("idle");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate schedule");
      }

      setStatus("success");
      // Refresh the page to show the newly generated matches
      router.refresh();
      
      // Reset status after a few seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating || status === "success"}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
        ${
          status === "success"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : status === "error"
            ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white"
        }
      `}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Running Algorithm...
        </>
      ) : status === "success" ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Generated!
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          Failed
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5" />
          Generate Draw
        </>
      )}
    </button>
  );
};
