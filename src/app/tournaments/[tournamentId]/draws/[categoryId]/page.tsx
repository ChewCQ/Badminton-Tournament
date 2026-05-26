import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BracketTree } from "@/components/admin/BracketTree";

export const revalidate = 60; // Auto refresh bracket every minute

export default async function PublicCategoryBracketPage({
  params,
}: {
  params: Promise<{ tournamentId: string; categoryId: string }>;
}) {
  const { tournamentId, categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId, tournamentId },
    include: {
      matches: {
        include: {
          participant1: true,
          participant2: true,
          sets: true,
          category: true,
          court: true,
        }
      }
    }
  });

  if (!category) notFound();

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 md:top-16 z-40 shadow-sm flex items-center gap-4">
        <Link 
          href={`/tournaments/${tournamentId}/draws`}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{category.name}</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{category.type.replace('_', ' ')} Draw</p>
        </div>
      </div>

      <div className="p-4 sm:p-8 overflow-x-auto">
        <div className="min-w-max">
          <BracketTree matches={category.matches} tournamentId={tournamentId} readOnly={true} />
        </div>
      </div>
    </div>
  );
}
