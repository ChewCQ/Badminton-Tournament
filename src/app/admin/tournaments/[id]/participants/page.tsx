import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BulkImportForm } from "@/components/admin/BulkImportForm";

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Import Form */}
        <div className="lg:col-span-1">
          <BulkImportForm tournamentId={id} categories={categories} />
        </div>

        {/* Right Column: Participant List Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 mb-6">Current Entries ({allParticipants.length})</h2>
            
            {allParticipants.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <p className="font-bold uppercase tracking-widest text-sm">No Participants Found</p>
                <p className="text-sm mt-1">Use the bulk import tool to add players.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                        <td className="py-3 px-4 text-slate-500 font-medium">{p.teamName || <span className="text-slate-300 italic">None</span>}</td>
                        <td className="py-3 px-4 text-indigo-600 font-bold">{p.category.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
