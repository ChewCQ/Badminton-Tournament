import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MatchTimeOverride } from "@/components/admin/MatchTimeOverride";
import Link from "next/link";
import { ChevronLeft, GitMerge } from "lucide-react";

export default async function MatchesOverridePage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      matches: {
        where: { status: "SCHEDULED" }, // Only override pending matches
        include: {
          participant1: true,
          participant2: true,
        },
        orderBy: [
          { scheduledStartTime: "asc" },
          { roundNumber: "asc" },
        ],
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-2 text-slate-900 rounded-xl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <Link href={`/hq-admin-v2/tournaments/${id}/draws`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Draw Manager
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <GitMerge className="text-emerald-500 w-8 h-8" />
            {category.name} Schedule
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Category Type: <span className="text-slate-700 font-bold">{category.type}</span> | Format: <span className="text-slate-700 font-bold">{category.format.replace("_", " ")}</span>
          </p>
        </div>

        {/* Override Table */}
        <MatchTimeOverride 
          matches={category.matches} 
          tournamentId={id} 
        />

      </div>
    </div>
  );
}
