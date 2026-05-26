import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UmpireScoringClient } from "@/components/umpire/UmpireScoringClient";
import { CheckCircle } from "lucide-react";

export const revalidate = 0; // Disable caching for umpire page so it always fetches the live match

export default async function UmpireCourtPage({
  params,
}: {
  params: Promise<{ tournamentId: string; courtId: string }>;
}) {
  const { tournamentId: slug, courtId } = await params;

  const tournamentRecord = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tournamentRecord) notFound();

  const court = await prisma.court.findUnique({
    where: { id: courtId, tournamentId: tournamentRecord.id },
  });

  if (!court) notFound();

  // Find the currently IN_PROGRESS match for this court
  const activeMatch = await prisma.match.findFirst({
    where: {
      courtId: court.id,
      status: "IN_PROGRESS",
    },
    include: {
      participant1: true,
      participant2: true,
      category: {
        select: { bestOf: true, name: true }
      },
      sets: true,
    }
  });

  if (!activeMatch) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">{court.name}</h1>
        <p className="text-slate-400 text-lg">No active match is currently assigned to this court.</p>
        <p className="text-slate-600 mt-8 text-sm">Waiting for the Admin to assign a match...</p>
      </div>
    );
  }

  return (
    <UmpireScoringClient 
      match={activeMatch} 
      tournamentId={slug}
      courtName={court.name}
    />
  );
}
