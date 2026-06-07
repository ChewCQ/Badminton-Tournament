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

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentId },
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
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{ __html: tickerStyles }} />
      
      {/* Header */}
      <header className="px-8 py-6 bg-zinc-950 border-b border-zinc-900 flex justify-between items-center z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{tournament.name}</h1>
            <p className="text-zinc-400 font-bold tracking-widest uppercase text-sm mt-1">Live Court Status</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Local Time</p>
          <div className="text-3xl font-black text-white bg-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-sm border border-slate-700">
            <LocalTime date={new Date()} />
          </div>
        </div>
      </header>

      {/* Main Content - Courts Grid */}
      <main className="flex-1 p-8 overflow-hidden flex flex-col justify-center relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none" />
        
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
                className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-500 ${
                  isActive 
                    ? 'bg-zinc-900/80 border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]' 
                    : match 
                      ? 'bg-zinc-950/80 border-indigo-500/20' 
                      : 'bg-zinc-950/50 border-zinc-800/50 opacity-60'
                }`}
              >
                {/* Court Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${
                  isActive ? 'bg-emerald-950/40 border-emerald-500/20' : 'bg-black/40 border-white/5'
                }`}>
                  <h2 className={`text-2xl font-black tracking-tight ${isActive ? 'text-emerald-400' : 'text-zinc-100'}`}>
                    {court.name}
                  </h2>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                    isActive ? 'bg-emerald-500/20 text-emerald-400' 
                    : match ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {isActive ? 'Live Now' : match ? 'Up Next' : 'Empty'}
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
                          <div className="text-2xl font-bold text-white truncate">
                            {formatName(match.participant1)}
                          </div>
                          
                          <div className="flex items-center justify-center gap-4 text-zinc-600 font-black italic">
                            <hr className="w-12 border-zinc-800" />
                            VS
                            <hr className="w-12 border-zinc-800" />
                          </div>
                          
                          <div className="text-2xl font-bold text-white truncate">
                            {formatName(match.participant2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <p className="text-lg font-bold uppercase tracking-widest">No match assigned</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Sponsor Footer Ticker */}
      {tournament.sponsors.length > 0 && (
        <footer className="h-32 bg-zinc-950 border-t border-zinc-900 relative flex items-center overflow-hidden z-20">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
          
          <div className="flex whitespace-nowrap animate-ticker">
            {/* Double the sponsors to create a seamless infinite loop effect */}
            {[...tournament.sponsors, ...tournament.sponsors, ...tournament.sponsors, ...tournament.sponsors].map((sponsor, index) => (
              <div 
                key={`${sponsor.id}-${index}`} 
                className="w-64 h-24 mx-8 flex-shrink-0 flex items-center justify-center relative grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
              >
                <Image 
                  src={sponsor.logoUrl} 
                  alt={sponsor.name} 
                  fill 
                  className="object-contain" 
                />
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
