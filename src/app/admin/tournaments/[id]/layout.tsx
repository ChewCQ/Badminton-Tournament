import React from "react";
import { SidebarNav } from "@/components/admin/SidebarNav";

export default async function TournamentDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const navigation = [
    { name: "Overview", href: `/admin/tournaments/${id}` },
    { name: "Participants", href: `/admin/tournaments/${id}/participants` },
    { name: "Draws & Formats", href: `/admin/tournaments/${id}/draws` },
    { name: "Live Courts", href: `/admin/tournaments/${id}/courts` },
    { name: "Settings", href: `/admin/tournaments/${id}/settings` },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar Navigation */}
      <SidebarNav tournamentId={id} />

      {/* Main Content Area - padded to account for the fixed 64 (256px) sidebar */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
