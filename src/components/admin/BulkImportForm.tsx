"use client";

import React, { useState, useTransition } from "react";
import { bulkImportParticipants } from "@/lib/actions/participant";
import { Loader2, TableProperties, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

export function BulkImportForm({ 
  tournamentId, 
  categories 
}: { 
  tournamentId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || "");
  const [rawData, setRawData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleImport = async () => {
    setError(null);
    setSuccessCount(null);

    if (!selectedCategory) {
      setError("Please select a category first.");
      return;
    }
    if (!rawData.trim()) {
      setError("Please paste some data to import.");
      return;
    }

    startTransition(async () => {
      const res = await bulkImportParticipants(selectedCategory, tournamentId, rawData);
      if (res.success) {
        setSuccessCount(res.count || 0);
        setRawData(""); // Clear the form on success
        router.refresh();
      } else {
        setError(res.error || "Import failed.");
      }
    });
  };

  if (categories.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Categories Found</h3>
        <p className="text-slate-500">Please create a category first before importing participants.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <TableProperties className="w-6 h-6 text-indigo-500" />
          Bulk Import from Excel
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Select a category and paste a list of names directly from Excel. 
          If you copy two columns (Name and Team), the system will automatically parse the Team Name.
        </p>
      </div>

      <div className="space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Target Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={isPending}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Text Area */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Paste Data <span className="text-slate-400 font-normal">(Name [tab] Team Name)</span>
          </label>
          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            disabled={isPending}
            placeholder="John Doe&#10;Mike Smith&#9;VBA&#10;Jane Mary&#9;RBC"
            rows={10}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all whitespace-pre"
          />
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-700">{error}</p>
          </div>
        )}

        {successCount !== null && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-emerald-700">Successfully imported {successCount} participants!</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleImport}
          disabled={isPending || !rawData.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Importing Data...
            </>
          ) : (
            <>
              <TableProperties className="w-5 h-5" />
              Import Participants
            </>
          )}
        </button>
      </div>
    </div>
  );
}
