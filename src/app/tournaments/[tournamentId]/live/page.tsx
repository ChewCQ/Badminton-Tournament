import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Activity, Clock, MapPin } from "lucide-react";
import { LocalTime } from "@/components/LocalTime";

export const revalidate = 30; // auto-refresh every 30s

const getCategoryColorBg = (categoryId: string) => {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-indigo-50/70 border-indigo-200 text-indigo-900', 
    'bg-rose-50/70 border-rose-200 text-rose-900', 
    'bg-emerald-50/70 border-emerald-200 text-emerald-900',
    'bg-amber-50/70 border-amber-200 text-amber-900', 
    'bg-cyan-50/70 border-cyan-200 text-cyan-900', 
    'bg-fuchsia-50/70 border-fuchsia-200 text-fuchsia-900',
    'bg-blue-50/70 border-blue-200 text-blue-900', 
    'bg-orange-50/70 border-orange-200 text-orange-900', 
    'bg-teal-50/70 border-teal-200 text-teal-900',
    'bg-pink-50/70 border-pink-200 text-pink-900', 
    'bg-violet-50/70 border-violet-200 text-violet-900', 
    'bg-lime-50/70 border-lime-200 text-lime-900',
    'bg-sky-50/70 border-sky-200 text-sky-900', 
    'bg-red-50/70 border-red-200 text-red-900', 
    'bg-yellow-50/70 border-yellow-200 text-yellow-900'
  ];
  return colors[Math.abs(hash) % colors.length];
};

const getCategoryColorText = (categoryId: string) => {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'text-indigo-600 bg-indigo-100/80 border-indigo-200', 
    'text-rose-600 bg-rose-100/80 border-rose-200', 
    'text-emerald-600 bg-emerald-100/80 border-emerald-200',
    'text-amber-600 bg-amber-100/80 border-amber-200', 
    'text-cyan-600 bg-cyan-100/80 border-cyan-200', 
    'text-fuchsia-600 bg-fuchsia-100/80 border-fuchsia-200',
    'text-blue-600 bg-blue-100/80 border-blue-200', 
    'text-orange-600 bg-orange-100/80 border-orange-200', 
    'text-teal-600 bg-teal-100/80 border-teal-200',
    'text-pink-600 bg-pink-100/80 border-pink-200', 
    'text-violet-600 bg-violet-100/80 border-violet-200', 
    'text-lime-600 bg-lime-100/80 border-lime-200',
    'text-sky-600 bg-sky-100/80 border-sky-200', 
    'text-red-600 bg-red-100/80 border-red-200', 
    'text-yellow-600 bg-yellow-100/80 border-yellow-200'
  ];
  return colors[Math.abs(hash) % colors.length];
};

export default async function PublicLiveMatchesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentId },
    include: {
      sponsors: true,
      courts: {
        orderBy: { courtNumber: 'asc' },
        include: {
          matches: {
            where: {
              status: { in: ['IN_PROGRESS', 'SCHEDULED'] }
            },
            orderBy: {
              scheduledStartTime: 'asc'
            },
            take: 2,
            include: {
              participant1: true,
              participant2: true,
              category: true,
              sets: true
            }
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
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Courts</h1>
        </div>
        <p className="text-sm font-medium text-slate-500 pl-11">Real-time match assignments</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {tournament.courts.map(court => {
          const liveMatch = court.matches.find(m => m.status === 'IN_PROGRESS') || (court.matches.length > 0 && court.matches[0].status === 'SCHEDULED' ? court.matches[0] : null);
          const upNextMatch = liveMatch ? court.matches.find(m => m.id !== liveMatch.id) : null;
          
          const isLive = liveMatch?.status === 'IN_PROGRESS';

          const formatName = (p: { name: string; teamName?: string | null } | null) => {
            if (!p) return 'TBA';
            return p.teamName ? `[${p.teamName}] ${p.name}` : p.name;
          };

          return (
            <div key={court.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Court Banner */}
              <div className={`px-5 py-3 border-b flex justify-between items-center ${isLive ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                <h2 className="font-black tracking-tight text-lg">
                  {court.name}
                </h2>
                {isLive ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest border border-white/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    Live Now
                  </span>
                ) : liveMatch ? (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                    Scheduled
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Empty
                  </span>
                )}
              </div>

              {/* Match Display Block */}
              <div className="p-5">
                {liveMatch ? (
                  <div className="space-y-5">
                    {/* Main Matchup Card with Category Theme Color */}
                    <div className={`p-6 rounded-2xl border ${getCategoryColorBg(liveMatch.category.id)} shadow-sm relative overflow-hidden`}>
                      <div className="flex justify-between items-center gap-2 mb-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getCategoryColorText(liveMatch.category.id)}`}>
                          {liveMatch.category.name}
                        </span>
                        
                        {/* Court & Time badging */}
                        <div className="flex gap-1.5 text-[9px] font-black uppercase text-slate-600">
                          <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200/50 shadow-sm">
                            <MapPin className="w-3 h-3 text-indigo-500" /> {court.name}
                          </span>
                          {liveMatch.scheduledStartTime && (
                            <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200/50 shadow-sm">
                              <Clock className="w-3 h-3 text-rose-500" /> <LocalTime date={liveMatch.scheduledStartTime} />
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
                        <div className="text-lg font-black truncate sm:flex-1 text-slate-800 text-center sm:text-left">
                          {formatName(liveMatch.participant1)}
                        </div>
                        <div className="text-xs font-black text-slate-400 italic shrink-0 text-center">VS</div>
                        <div className="text-lg font-black truncate sm:flex-1 text-slate-800 text-center sm:text-right">
                          {formatName(liveMatch.participant2)}
                        </div>
                      </div>
                    </div>

                    {/* Up Next Card with Category Theme Color */}
                    {upNextMatch && (
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Up Next</p>
                        <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${getCategoryColorBg(upNextMatch.category.id)} shadow-sm`}>
                          <div className="truncate text-sm font-bold text-slate-800 flex-1">
                            {formatName(upNextMatch.participant1)} <span className="text-slate-400 font-bold italic mx-1">vs</span> {formatName(upNextMatch.participant2)}
                          </div>
                          
                          {/* Court & Time for Up Next */}
                          <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase text-slate-600 shrink-0">
                            <span className={`px-2 py-0.5 rounded border ${getCategoryColorText(upNextMatch.category.id)}`}>
                              {upNextMatch.category.name}
                            </span>
                            <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200/50 shadow-sm">
                              <MapPin className="w-3 h-3 text-indigo-500" /> {court.name}
                            </span>
                            {upNextMatch.scheduledStartTime && (
                              <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200/50 shadow-sm">
                                <Clock className="w-3 h-3 text-rose-500" /> <LocalTime date={upNextMatch.scheduledStartTime} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 flex items-center justify-center text-slate-400 text-sm font-bold uppercase tracking-widest">
                    No matches scheduled
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
