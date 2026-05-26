import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { GitMerge, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function PublicDrawsHub({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
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
          tournament.categories.map(category => (
            <Link 
              key={category.id} 
              href={`/tournaments/${tournamentId}/draws/${category.id}`}
              className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {category.name}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    {category._count.participants} Participants • {category.type.replace('_', ' ')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Compact Sponsor Bar */}
      {tournament.sponsors.length > 0 && (
        <div className="mx-4 sm:mx-6 mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-4">Sponsored By</p>
          <div className="flex flex-wrap justify-center gap-6 items-center">
            {tournament.sponsors.map(sponsor => (
              <div key={sponsor.id} className="flex items-center gap-3">
                <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0">
                  <Image 
                    src={sponsor.logoUrl} 
                    alt={sponsor.name} 
                    fill 
                    className="object-contain p-1" 
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">{sponsor.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
