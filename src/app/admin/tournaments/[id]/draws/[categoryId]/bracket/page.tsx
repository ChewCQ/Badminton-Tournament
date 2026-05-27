import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BracketTree } from "@/components/admin/BracketTree";
import Link from "next/link";
import { ChevronLeft, GitMerge } from "lucide-react";
import { SwapPlayersWrapper } from "@/components/admin/SwapPlayersWrapper";

export default async function BracketViewPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      participants: { orderBy: { name: 'asc' } },
      matches: {
        include: {
          participant1: true,
          participant2: true,
          sets: true,
          court: true,
        },
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-2 text-slate-900 rounded-xl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <Link href={`/admin/tournaments/${id}/draws`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Draw Manager
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <GitMerge className="text-emerald-500 w-8 h-8" />
                {category.name} Bracket
              </h1>
              <p className="text-slate-500 mt-2 font-medium">
                Visual Knockout Tree
              </p>
            </div>
            
            <SwapPlayersWrapper 
              tournamentId={id} 
              categoryId={categoryId} 
              participants={category.participants.map(p => ({
                id: p.id,
                name: p.name,
                seed: p.seed
              }))}
            />
          </div>
        </div>

        {/* The Visual Bracket Component */}
        <BracketTree 
          matches={category.matches.map(m => ({
            ...m,
            category: { id: category.id, name: category.name, bestOf: category.bestOf },
          }))}
          tournamentId={id}
        />

      </div>
    </div>
  );
}
