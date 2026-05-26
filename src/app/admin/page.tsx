import React from "react";
import { prisma } from "@/lib/prisma";
import { CreateTournamentForm } from "@/components/admin/CreateTournamentForm";
import { Calendar, Users, Activity, Plus } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { categories: true, courts: true },
      },
    },
  });

  return (
    <div className="space-y-12 pb-24">
      {/* Header section */}
      <div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight mb-2">
          Dashboard Overview
        </h1>
        <p className="text-zinc-400 font-medium">
          Manage your tournaments, view live status, and configure schedules.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Tournament List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-100">All Tournaments</h2>
            <div className="text-xs font-semibold px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full">
              {tournaments.length} Total
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tournaments.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                <p className="text-zinc-500 font-medium">No tournaments created yet.</p>
              </div>
            ) : (
              tournaments.map((t) => (
                <div
                  key={t.id}
                  className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all rounded-2xl p-5 group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-zinc-100 leading-tight">
                      {t.name}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                        t.status === "IN_PROGRESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : t.status === "DRAFT"
                          ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 mb-6">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(t.startDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      {t._count.courts} Courts
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-zinc-800 flex justify-end">
                    <Link
                      href={`/admin/tournaments/${t.id}`}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
                    >
                      Manage &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Creation Form */}
        <div className="space-y-6">
          <CreateTournamentForm />
        </div>

      </div>
    </div>
  );
}
