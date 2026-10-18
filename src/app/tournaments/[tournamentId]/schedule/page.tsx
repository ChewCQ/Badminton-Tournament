import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicScheduleView } from "@/components/PublicScheduleView";

export const revalidate = 60;

export default async function PublicSchedulePage({
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
      courts: {
        orderBy: { courtNumber: "asc" },
      },
      categories: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!tournament) notFound();

  // Fetch all matches that are scheduled or in progress or completed
  const matches = await prisma.match.findMany({
    where: {
      category: { tournamentId: tournament.id },
      status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "WALKOVER"] },
      OR: [
        { courtId: { not: null } },
        { scheduledStartTime: { not: null } },
      ],
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
      <PublicScheduleView 
        matches={matches} 
        courts={tournament.courts} 
        categories={tournament.categories}
        tournamentId={tournamentId} 
        tournamentStartDate={tournament.startDate}
      />
    </div>
  );
}

