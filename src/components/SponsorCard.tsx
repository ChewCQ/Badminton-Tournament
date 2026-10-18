"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink, X } from "lucide-react";

interface SponsorProps {
  sponsor: {
    id: string;
    name: string;
    logoUrl: string;
    websiteUrl?: string | null;
  };
  compact?: boolean;
}

export function SponsorCard({ sponsor, compact = false }: SponsorProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!sponsor.websiteUrl) return;
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirmRedirect = () => {
    if (!sponsor.websiteUrl) return;
    setConfirmOpen(false);
    window.open(sponsor.websiteUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div 
        onClick={handleClick}
        className={`relative group ${sponsor.websiteUrl ? 'cursor-pointer' : ''}`}
      >
        {compact ? (
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0 transition-transform group-hover:scale-105">
              <Image 
                src={sponsor.logoUrl} 
                alt={sponsor.name} 
                fill 
                className="object-contain p-1" 
              />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">
              {sponsor.name}
            </span>
            {sponsor.websiteUrl && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                Visit <ExternalLink className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-28 sm:w-72 sm:h-40 md:w-80 md:h-48 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all group-hover:-translate-y-1">
              <Image 
                src={sponsor.logoUrl} 
                alt={sponsor.name} 
                fill 
                className="object-contain p-3 group-hover:scale-105 transition-transform duration-300" 
              />
              {/* Subtle transparent tooltip indicating clickable website */}
              {sponsor.websiteUrl && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none">
                  <span>Visit website</span>
                  <ExternalLink className="w-3 h-3 text-indigo-300" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 max-w-[200px]">
              <span className="text-xs sm:text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors text-center truncate">
                {sponsor.name}
              </span>
              {sponsor.websiteUrl && (
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Misclick Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 animate-in zoom-in-95 duration-150 relative">
            <button 
              onClick={() => setConfirmOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 mx-auto mb-4 flex items-center justify-center relative overflow-hidden p-2">
              <Image src={sponsor.logoUrl} alt={sponsor.name} fill className="object-contain p-1" />
            </div>

            <h3 className="text-lg font-black text-slate-800">Visit {sponsor.name}?</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 mb-6 break-all">
              You are navigating to an external sponsor website:
              <span className="block font-bold text-indigo-600 mt-1 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 text-[11px]">
                {sponsor.websiteUrl}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRedirect}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
