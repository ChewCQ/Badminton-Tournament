import React from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { GitMerge, Layers, Clock, Users, ArrowRight, Play } from "lucide-react";

export default async function DrawManagerHub({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const categories = await prisma.category.findMany({
    where: { tournamentId: id },
    include: {
      _count: {
        select: { participants: true, matches: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const ungenerated = categories.filter((c) => c._count.matches === 0);
  const generated = categories.filter((c) => c._count.matches > 0);

  return (
    <div className="min-h-screen bg-slate-50 p-2 text-slate-900 rounded-xl">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <GitMerge className="text-indigo-500 w-8 h-8" />
            Draw & Bracket Manager
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Configure player seedings before generating draws, or override match schedules after generating.
          </p>
        </div>

        {/* Step 1: Ungenerated Categories (Needs Seeding & Generation) */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span>
            Pending Draws (Needs Seeding)
          </h2>
          
          {ungenerated.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-300 rounded-2xl bg-white/50">
              <p className="text-slate-500 font-medium text-sm">All category draws have been generated!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ungenerated.map((cat) => (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{cat.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span className="bg-slate-100 px-2 py-1 rounded">{cat.type}</span>
                      <span className="bg-slate-100 px-2 py-1 rounded">{cat.format.replace("_", " ")}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                      <Users className="w-4 h-4" /> {cat._count.participants} Players
                    </span>
                    <Link
                      href={`/hq-admin-v2/tournaments/${id}/draws/${cat.id}/seeding`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
                    >
                      Seed & Generate
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Generated Categories (Needs Time Overrides) */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">2</span>
            Active Draws (Match Overrides)
          </h2>
          
          {generated.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-300 rounded-2xl bg-white/50">
              <p className="text-slate-500 font-medium text-sm">No draws have been generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generated.map((cat) => (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{cat.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1">
                        <Play className="w-3 h-3" /> Live
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                      <Clock className="w-4 h-4" /> {cat._count.matches} Matches
                    </span>
                    <div className="flex flex-col gap-2 w-full mt-4">
                      <Link
                        href={`/hq-admin-v2/tournaments/${id}/draws/${cat.id}/bracket`}
                        className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors border border-indigo-100 shadow-sm flex items-center justify-center gap-2"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        View Bracket
                      </Link>
                      <Link
                        href={`/hq-admin-v2/tournaments/${id}/draws/${cat.id}/matches`}
                        className="w-full px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Edit Times
                      </Link>
                      <form action={async () => {
                        "use server";
                        const { resetDraw } = await import('@/lib/actions/schedule');
                        await resetDraw(cat.id, id);
                      }}>
                        <button type="submit" className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors border border-red-100 shadow-sm flex items-center justify-center gap-2">
                          Reset Draw
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
