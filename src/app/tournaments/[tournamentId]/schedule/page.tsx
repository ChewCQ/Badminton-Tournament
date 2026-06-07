import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TimetableGrid } from "@/components/admin/TimetableGrid";
import { Calendar } from "lucide-react";

export const revalidate = 60;

export default async function PublicSchedulePage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentId },
    include: {
      courts: {
        orderBy: { courtNumber: "asc" },
      },
      categories: true,
    },
  });

  if (!tournament) notFound();

  // Fetch all matches that are scheduled or in progress or completed
  const matches = await prisma.match.findMany({
    where: {
      category: { tournamentId: tournament.id },
      status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "WALKOVER"] },
      courtId: { not: null },
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
    <div className="max-w-[1920px] mx-auto bg-slate-50 min-h-screen p-4 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Full Schedule</h1>
        </div>
        <p className="text-slate-500 font-medium pl-13">View the complete timetable for all courts.</p>
      </div>

      <TimetableGrid 
        matches={matches} 
        courts={tournament.courts} 
        tournamentId={tournament.id}
        tournamentStartDate={tournament.startDate}
        isReadOnly={true}
      />
    </div>
  );
}
