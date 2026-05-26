import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, Trophy, ChevronRight, Activity } from "lucide-react";
import Link from "next/link";

export default async function PublicTournamentOverview({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentId },
    include: {
      sponsors: {
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ]
      },
      categories: true,
      _count: {
        select: {
          courts: true,
        }
      }
    }
  });

  if (!tournament) notFound();

  // Find active matches count for a quick stat
  const activeMatchesCount = await prisma.match.count({
    where: {
      category: { tournamentId: tournament.id },
      status: "IN_PROGRESS",
    },
  });

  // Fetch upcoming dynamic court assignments
  const globalMatches = await prisma.match.findMany({
    where: {
      category: { tournamentId: tournament.id },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    include: {
      participant1: true,
      participant2: true,
      court: true,
      category: true,
    },
    orderBy: { scheduledStartTime: "asc" },
    take: 8,
  });

  return (
    <div className="w-full bg-white min-h-screen">
      
      {/* Slim Brand Bar */}
      <div className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
          {tournament.hostLogoUrl ? (
            <div className="relative w-10 h-10 shrink-0">
              <Image 
                src={tournament.hostLogoUrl} 
                alt="Organizer Logo" 
                fill 
                className="object-contain" 
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm border border-indigo-200">
              <Trophy className="w-5 h-5 text-indigo-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-slate-800 truncate leading-tight tracking-tight">{tournament.name}</h2>
            <span className={`inline-block text-[11px] font-bold uppercase tracking-widest ${
              tournament.status === 'IN_PROGRESS' ? 'text-emerald-600' 
              : tournament.status === 'REGISTRATION_OPEN' ? 'text-indigo-600'
              : 'text-slate-500'
            }`}>
              {tournament.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Poster Banner */}
      <div className="w-full h-[50vh] min-h-[400px] relative bg-slate-900 border-b border-slate-800 overflow-hidden">
        {tournament.posterUrl ? (
          <Image 
            src={tournament.posterUrl} 
            alt={tournament.name} 
            fill 
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-400 via-transparent to-transparent" />
            <Trophy className="w-32 h-32 text-indigo-500/20 drop-shadow-2xl" />
          </div>
        )}
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-7xl mx-auto w-full p-6 sm:p-10">
            <div className="flex items-center gap-4 mb-4">
              <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                tournament.status === 'IN_PROGRESS' ? 'bg-emerald-500 text-white' 
                : tournament.status === 'REGISTRATION_OPEN' ? 'bg-indigo-500 text-white'
                : 'bg-slate-700 text-slate-200'
              }`}>
                {tournament.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl drop-shadow-lg">
              {tournament.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full">
        {/* Info Strip */}
        <div className="p-6 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200/50">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                <p className="text-base font-bold text-slate-800">
                  {new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  {tournament.endDate && tournament.endDate.getTime() !== tournament.startDate.getTime() 
                    ? ` - ${new Date(tournament.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}` 
                    : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0 border border-rose-200/50">
                <MapPin className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Venue</p>
                <p className="text-base font-bold text-slate-800">
                  {tournament.venue || "TBA"}
                </p>
              </div>
            </div>
          </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Link 
            href={`/tournaments/${tournamentId}/live`}
            className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-1 hover:shadow-emerald-500/30 transition-all"
          >
            <Activity className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-lg tracking-tight">Live Courts</h3>
            <p className="text-emerald-100 text-xs font-bold mt-1 uppercase tracking-wider">
              {activeMatchesCount} Matches Live
            </p>
          </Link>
          
          <Link 
            href={`/tournaments/${tournamentId}/draws`}
            className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:-translate-y-1 hover:shadow-slate-900/30 transition-all"
          >
            <Trophy className="w-8 h-8 mb-3 text-indigo-400 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-lg tracking-tight">Draws</h3>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">
              {tournament.categories.length} Categories
            </p>
          </Link>
        </div>

        {/* Dynamic Court Assignments (Up Next) */}
        {globalMatches.length > 0 && (
          <div className="pt-8 pb-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
              <Activity className="text-emerald-500 w-5 h-5" />
              Up Next
            </h2>
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 sm:px-6 py-4 font-black">Time</th>
                    <th className="px-4 sm:px-6 py-4 font-black">Court</th>
                    <th className="px-4 sm:px-6 py-4 font-black">Category</th>
                    <th className="px-4 sm:px-6 py-4 font-black hidden sm:table-cell">Matchup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {globalMatches.map((match) => (
                    <tr key={match.id} className="hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                      <td className="px-4 sm:px-6 py-4 text-slate-600 font-medium">
                        {match.scheduledStartTime ? new Date(match.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-black text-emerald-600">
                        {match.court?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-slate-500 font-medium">
                        {match.category.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-slate-800 hidden sm:table-cell">
                        {match.participant1 ? match.participant1.name : "TBD"} <span className="text-slate-300 font-bold mx-2">VS</span> {match.participant2 ? match.participant2.name : "TBD"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sponsors Section */}
      {tournament.sponsors.length > 0 && (() => {
        // Group sponsors by their custom text tier
        const groupedSponsors = tournament.sponsors.reduce((acc, sponsor) => {
          if (!acc[sponsor.tier]) {
            acc[sponsor.tier] = [];
          }
          acc[sponsor.tier].push(sponsor);
          return acc;
        }, {} as Record<string, typeof tournament.sponsors>);

        // Extract ordered keys based on first appearance
        const orderedTiers = Array.from(new Set(tournament.sponsors.map(s => s.tier)));

        return (
          <div className="px-6 sm:px-8 py-10 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-10">
              Proudly Sponsored By
            </h3>
            
            <div className="space-y-12">
              {orderedTiers.map((tierName) => {
                const sponsors = groupedSponsors[tierName];
                return (
                <div key={tierName} className="flex flex-col items-center">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest mb-6">
                    {tierName}
                  </span>
                  
                  <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center">
                    {sponsors.map(sponsor => (
                      <div key={sponsor.id} className="flex flex-col items-center gap-4">
                        <div className="relative w-48 h-28 sm:w-72 sm:h-40 md:w-80 md:h-48 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                          <Image 
                            src={sponsor.logoUrl} 
                            alt={sponsor.name} 
                            fill 
                            className="object-contain p-3 group-hover:scale-105 transition-transform" 
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-500 text-center max-w-[200px] truncate">{sponsor.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
