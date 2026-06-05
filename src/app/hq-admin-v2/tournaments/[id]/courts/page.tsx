import React from "react";
import { prisma } from "@/lib/prisma";
import { TimetableGrid } from "@/components/admin/TimetableGrid";
import { UmpireLinksPanel } from "@/components/admin/UmpireLinksPanel";

export default async function LiveCourtController({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch tournament for start date
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { startDate: true },
  });

  // Fetch all physical courts
  const courts = await prisma.court.findMany({
    where: { tournamentId: id },
    orderBy: { courtNumber: "asc" },
  });

  // Fetch all relevant matches (Scheduled + In Progress)
  const matches = await prisma.match.findMany({
    where: {
      category: { tournamentId: id },
      status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
    },
    include: {
      participant1: true,
      participant2: true,
      category: { select: { id: true, name: true, bestOf: true } },
      sets: true,
      court: true,
    },
    orderBy: [
      { scheduledStartTime: "asc" },
      { roundNumber: "asc" },
    ],
  });

  return (
    <div className="min-h-screen bg-slate-50 p-2 text-slate-900 rounded-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Live Court Controller</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Gantt-chart view of your daily schedule. Drag and drop matches to assign courts and times.</p>
      </div>

      <TimetableGrid 
        matches={matches} 
        courts={courts} 
        tournamentId={id}
        tournamentStartDate={tournament?.startDate ?? new Date()}
      />

      {/* Umpire Scoring Links */}
      <UmpireLinksPanel tournamentId={id} courts={courts} />
    </div>
  );
}
