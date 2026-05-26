import React from "react";
import { PublicNav } from "@/components/public/PublicNav";

export default async function PublicTournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Main Content Area - padded to account for mobile bottom nav */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      <PublicNav tournamentId={tournamentId} />
    </div>
  );
}
