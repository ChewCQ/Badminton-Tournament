import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ParticipantManager } from "@/components/admin/ParticipantManager";

export default async function ParticipantsManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch all categories for this tournament to populate the dropdown
  const categories = await prisma.category.findMany({
    where: { tournamentId: id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  // Fetch all existing participants to display a summary
  const allParticipants = await prisma.participant.findMany({
    where: { category: { tournamentId: id } },
    include: { category: { select: { name: true } } },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }]
  });

  if (!categories) notFound();

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Participant Management</h1>
        <p className="text-slate-500 font-medium">Bulk import players from Excel and manage your entry lists.</p>
      </div>

      <ParticipantManager
        tournamentId={id}
        categories={categories}
        allParticipants={allParticipants}
      />
    </div>
  );
}
