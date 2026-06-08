import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateCategoryForm } from "@/components/admin/CreateCategoryForm";
import { GenerateScheduleButton } from "@/components/admin/GenerateScheduleButton";
import { TournamentSettingsCard } from "@/components/admin/TournamentSettingsCard";
import { TournamentQRCode } from "@/components/admin/TournamentQRCode";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";
import { LocalTime } from "@/components/LocalTime";
import { Users, Layers, Activity, Calendar, LayoutGrid, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function TournamentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      courts: true,
      categories: {
        include: {
          _count: {
            select: { participants: true, matches: true },
          },
        },
      },
    },
  });

  if (!tournament) {
    notFound();
  }

  // Fetch all matches across the tournament to show a global Live Assignment View
  const globalMatches = await prisma.match.findMany({
    where: {
      category: { tournamentId: id },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    include: {
      participant1: true,
      participant2: true,
      court: true,
      category: true,
    },
    orderBy: [
      { scheduledStartTime: "asc" },
      { court: { courtNumber: "asc" } }
    ],
    take: tournament.numberOfCourts, // Show exactly one block of matches per court
  });

  return (
    <div className="space-y-12 pb-24">
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium mb-3">
          <Link href="/hq-admin-v2" className="hover:text-zinc-300 transition-colors">Admin</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-zinc-300">Tournaments</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight">
            {tournament.name}
          </h1>
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest ${
              tournament.status === "IN_PROGRESS"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : tournament.status === "DRAFT"
                ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}
          >
            {tournament.status.replace("_", " ")}
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-medium text-zinc-400 mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            {new Date(tournament.startDate).toLocaleDateString()} - {tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : "TBD"}
          </div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-zinc-500" />
            {tournament.numberOfCourts} Courts
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            {tournament.estimatedMatchDurationMinutes}m / {tournament.restPeriodMinutes}m rest
          </div>
        </div>
      </div>

      {/* Tournament Settings Card (Venue & Poster) */}
      <TournamentSettingsCard 
        tournamentId={tournament.id}
        initialVenue={tournament.venue}
        initialPosterUrl={tournament.posterUrl}
        initialHostLogoUrl={tournament.hostLogoUrl}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Categories */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Layers className="text-indigo-400 w-5 h-5" />
              Tournament Categories
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tournament.categories.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                <p className="text-zinc-500 font-medium">No categories created yet. Create one to begin!</p>
              </div>
            ) : (
              tournament.categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                      {category.name}
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {category.type.replace("_", " ")}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {category.format.replace("_", " ")}
                      </span>
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {category._count.participants} Entries
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        {category._count.matches} Matches Scheduled
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {category._count.matches === 0 ? (
                      <GenerateScheduleButton tournamentId={tournament.id} categoryId={category.id} />
                    ) : (
                      <div className="flex gap-2">
                        <Link
                          href={`/tournaments/${tournament.id}/categories/${category.id}/bracket`}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-zinc-700"
                        >
                          Bracket
                        </Link>
                        {(category.format === "ROUND_ROBIN" || category.format === "POOL_TO_BRACKET") && (
                          <Link
                            href={`/tournaments/${tournament.id}/categories/${category.id}/standings`}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-zinc-700"
                          >
                            Standings
                          </Link>
                        )}
                      </div>
                    )}
                    <DeleteCategoryButton
                      tournamentId={tournament.id}
                      categoryId={category.id}
                      categoryName={category.name}
                      hasMatches={category._count.matches > 0}
                    />
                  </div>

                </div>
              ))
            )}
          </div>

          {/* Dynamic Game Assignment View (Tourny.ca feature) */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 mb-6">
              <Activity className="text-emerald-400 w-5 h-5" />
              Dynamic Court Assignments
            </h2>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400">
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Court</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Matchup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {globalMatches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 font-medium text-sm">
                        No upcoming matches scheduled.
                      </td>
                    </tr>
                  ) : (
                    globalMatches.map((match) => (
                      <tr key={match.id} className="hover:bg-zinc-900/50 transition-colors text-sm">
                        <td className="px-4 py-3 text-zinc-300">
                          {match.scheduledStartTime ? <LocalTime date={match.scheduledStartTime} /> : 'TBD'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-400">
                          {match.court?.name || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {match.category.name}
                        </td>
                        <td className="px-4 py-3 text-zinc-100">
                          {match.participant1 ? match.participant1.name : "TBD"} <span className="text-zinc-600 font-bold mx-2">VS</span> {match.participant2 ? match.participant2.name : "TBD"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Creation Form */}
        <div className="space-y-6">

          <TournamentQRCode tournamentId={tournament.slug} />

          <CreateCategoryForm tournamentId={tournament.id} />
        </div>

      </div>
    </div>
  );
}
