import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { GitMerge, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getCategoryTheme } from "@/lib/utils/colors";
import { SponsorCard } from "@/components/SponsorCard";

export const revalidate = 300; // Cache for 5 minutes to reduce DB network transfer

export default async function PublicDrawsHub({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentId },
    include: {
      sponsors: true,
      categories: {
        include: {
          _count: {
            select: { participants: true }
          }
        }
      }
    }
  });

  if (!tournament) notFound();

  return (
    <div className="max-w-3xl mx-auto bg-slate-50 min-h-screen border-x border-slate-100 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <GitMerge className="w-4 h-4 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Draws</h1>
        </div>
        <p className="text-sm font-medium text-slate-500 pl-11">Select a category to view the bracket</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {tournament.categories.length === 0 ? (
          <div className="text-center p-12 text-slate-400">
            No categories have been created yet.
          </div>
        ) : (
          tournament.categories.map((category, idx) => {
            const theme = getCategoryTheme(category.id, idx);
            return (
              <Link 
                key={category.id} 
                href={`/tournaments/${tournamentId}/draws/${category.id}`}
                className={`group block bg-white border border-slate-200 border-l-[6px] ${theme.borderL} rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all`}
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                      <h2 className="text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                        {category.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-4">
                      <span>{category._count.participants} Participants</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${theme.badge}`}>
                        {category.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Compact Sponsor Bar */}
      {tournament.sponsors.length > 0 && (
        <div className="mx-4 sm:mx-6 mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-4">Sponsored By</p>
          <div className="flex flex-wrap justify-center gap-6 items-center">
            {tournament.sponsors.map(sponsor => (
              <SponsorCard key={sponsor.id} sponsor={sponsor} compact={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
