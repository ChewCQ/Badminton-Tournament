"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink, Clipboard } from "lucide-react";

interface Court {
  id: string;
  name: string;
  courtNumber: number;
}

interface Props {
  tournamentId: string;
  courts: Court[];
}

export function UmpireLinksPanel({ tournamentId, courts }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getUmpireUrl = (courtId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/tournaments/${tournamentId}/umpire/${courtId}`;
    }
    return `/tournaments/${tournamentId}/umpire/${courtId}`;
  };

  const handleCopy = (courtId: string) => {
    const url = getUmpireUrl(courtId);
    navigator.clipboard.writeText(url);
    setCopiedId(courtId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const allLinks = courts
      .map(court => `${court.name}: ${getUmpireUrl(court.id)}`)
      .join("\n");
    navigator.clipboard.writeText(allLinks);
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (courts.length === 0) return null;

  return (
    <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Umpire Scoring Links</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Share these links with umpires to score matches on their phone
          </p>
        </div>
        <button
          onClick={handleCopyAll}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            copiedId === "all"
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
          }`}
        >
          {copiedId === "all" ? (
            <><Check className="w-3.5 h-3.5" /> Copied All!</>
          ) : (
            <><Clipboard className="w-3.5 h-3.5" /> Copy All Links</>
          )}
        </button>
      </div>

      {/* Court Links */}
      <div className="divide-y divide-slate-50">
        {courts.map(court => (
          <div
            key={court.id}
            className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-indigo-600">{court.courtNumber}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{court.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                  /tournaments/.../umpire/{court.id.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/tournaments/${tournamentId}/umpire/${court.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors border border-indigo-100"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </a>
              <button
                onClick={() => handleCopy(court.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                  copiedId === court.id
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {copiedId === court.id ? (
                  <><Check className="w-3 h-3" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy Link</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
