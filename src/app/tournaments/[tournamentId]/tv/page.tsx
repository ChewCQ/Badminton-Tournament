import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { LocalTime } from "@/components/LocalTime";
import { getCategoryBadge } from "@/lib/utils/colors";

export const revalidate = 120; // auto-refresh every 2 minutes (reduced from 30s to save DB network transfer)

export default async function TVDisplayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findFirst({
    where: {
      OR: [
        { slug: tournamentId },
        { id: tournamentId },
      ],
    },
    include: {
      sponsors: {
        select: { id: true, name: true, logoUrl: true },
      },
      courts: {
        orderBy: { courtNumber: 'asc' },
        include: {
          matches: {
            where: {
              status: { in: ['IN_PROGRESS', 'SCHEDULED'] },
              OR: [
                { scheduledEndTime: { gt: new Date() } },
                { scheduledEndTime: null }
              ]
            },
            orderBy: {
              scheduledStartTime: 'asc'
            },
            take: 1,
            include: {
              participant1: {
                select: { id: true, name: true, teamName: true }
              },
              participant2: {
                select: { id: true, name: true, teamName: true }
              },
              category: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }
    }
  });

  if (!tournament) notFound();

  // Custom CSS for the sponsor ticker animation
  const tickerStyles = `
    @keyframes ticker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-ticker {
      animation: ticker 30s linear infinite;
    }
    .animate-ticker:hover {
      animation-play-state: paused;
    }
  `;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{ __html: tickerStyles }} />
      
      {/* Header */}
      <header className="px-8 py-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{tournament.name}</h1>
            <p className="text-slate-400 font-bold tracking-widest uppercase text-xs mt-1">Live Court Status & Assignments</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Local Time</p>
          <div className="text-3xl font-black text-white bg-slate-800 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-700 shadow-inner">
            <LocalTime date={new Date()} />
          </div>
        </div>
      </header>

      {/* Main Content - Courts Grid */}
      <main className="flex-1 p-8 overflow-hidden flex flex-col justify-center relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-indigo-950/40 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px] mx-auto w-full z-10">
          {tournament.courts.map((court) => {
            const match = court.matches[0];
            const isActive = match?.status === 'IN_PROGRESS';
            
            const formatName = (p: { name: string; teamName?: string | null } | null) => {
              if (!p) return 'TBA';
              return p.teamName ? `[${p.teamName}] ${p.name}` : p.name;
            };
            
            return (
              <div 
                key={court.id} 
                className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 shadow-xl ${
                  isActive 
                    ? 'bg-slate-900 border-2 border-emerald-500 shadow-[0_0_35px_-5px_rgba(16,185,129,0.3)]' 
                    : match 
                      ? 'bg-slate-900 border border-indigo-500/40 shadow-indigo-950/50' 
                      : 'bg-slate-900/90 border border-slate-800'
                }`}
              >
                {/* Court Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${
                  isActive 
                    ? 'bg-emerald-950/70 border-emerald-500/30' 
                    : match 
                      ? 'bg-indigo-950/60 border-indigo-500/20' 
                      : 'bg-slate-800/60 border-slate-700/60'
                }`}>
                  <h2 className={`text-2xl font-black tracking-tight ${
                    isActive ? 'text-emerald-400' : match ? 'text-indigo-200' : 'text-slate-200'
                  }`}>
                    {court.name}
                  </h2>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 animate-pulse' 
                    : match ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isActive ? 'Live Now' : match ? 'Up Next' : 'Available'}
                  </span>
                </div>

                {/* Match Details */}
                <div className="p-6 flex-1 flex flex-col justify-center min-h-[200px]">
                  {match ? (
                    <div className="space-y-6">
                      <div className="text-center">
                        <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-4 border ${getCategoryBadge(match.category.id)}`}>
                          {match.category.name}
                        </span>
                        
                        <div className="flex flex-col gap-4">
                          <div className="text-2xl font-extrabold text-white truncate">
                            {formatName(match.participant1)}
                          </div>
                          
                          <div className="flex items-center justify-center gap-4 text-slate-500 font-black italic text-sm">
                            <hr className="w-12 border-slate-700" />
                            VS
                            <hr className="w-12 border-slate-700" />
                          </div>
                          
                          <div className="text-2xl font-extrabold text-white truncate">
                            {formatName(match.participant2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6">
                      <p className="text-sm font-bold uppercase tracking-widest">No match assigned</p>
                      <span className="text-xs text-slate-500 mt-1">Court is open</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Sponsor Footer Ticker with High Contrast Logo Backdrops */}
      {tournament.sponsors.length > 0 && (
        <footer className="h-32 bg-slate-900 border-t border-slate-800 relative flex items-center overflow-hidden z-20">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-10" />
          
          <div className="flex whitespace-nowrap animate-ticker items-center">
            {/* Double the sponsors to create a seamless infinite loop effect */}
            {[...tournament.sponsors, ...tournament.sponsors, ...tournament.sponsors, ...tournament.sponsors].map((sponsor, index) => (
              <div 
                key={`${sponsor.id}-${index}`} 
                className="w-56 h-20 mx-4 flex-shrink-0 bg-white rounded-2xl p-2.5 shadow-md flex items-center justify-center relative hover:scale-105 transition-all duration-300"
              >
                <Image 
                  src={sponsor.logoUrl} 
                  alt={sponsor.name} 
                  fill 
                  className="object-contain p-2" 
                />
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
