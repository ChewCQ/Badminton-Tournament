"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, ExternalLink, Printer } from "lucide-react";

export function TournamentQRCode({ tournamentId }: { tournamentId: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    // Only available on the client
    setUrl(`${window.location.origin}/tournaments/${tournamentId}`);
  }, [tournamentId]);

  if (!url) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center gap-6">
      
      <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm shrink-0">
        <QRCodeSVG 
          value={url} 
          size={160} 
          level="H"
          includeMargin={false}
          className="rounded-lg"
        />
      </div>

      <div className="space-y-4 w-full">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-500" />
            Public Portal QR
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Players can scan this to instantly view the live draws and schedule on their phones.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open Portal
          </a>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-bold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Page
          </button>
        </div>
      </div>
    </div>
  );
}
