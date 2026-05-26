import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Settings, ChevronRight } from "lucide-react";
import Link from "next/link";
import { TournamentSettingsForm } from "@/components/admin/TournamentSettingsForm";
import { DeleteTournamentButton } from "@/components/admin/DeleteTournamentButton";

export default async function TournamentSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id }
  });

  if (!tournament) notFound();

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium mb-3">
          <Link href={`/admin/tournaments/${id}`} className="hover:text-zinc-300 transition-colors">{tournament.name}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-zinc-300">Settings</span>
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight flex items-center gap-4">
          <Settings className="w-8 h-8 text-indigo-400" />
          Tournament Settings
        </h1>
        <p className="text-zinc-400 mt-4 max-w-3xl">
          Configure the core properties of your tournament including dates, status, and scheduling logic.
        </p>
      </div>

      <div className="max-w-5xl">
        <TournamentSettingsForm tournament={tournament} />
        
        <DeleteTournamentButton 
          tournamentId={tournament.id} 
          tournamentName={tournament.name} 
        />
      </div>
    </div>
  );
}
