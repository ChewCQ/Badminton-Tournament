import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PoolStandingsTable, type PoolData } from "@/components/PoolStandingsTable";

export default async function CategoryStandingsPage({
  params,
}: {
  params: Promise<{ tournamentId: string; categoryId: string }>;
}) {
  const { tournamentId, categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });

  if (!category || category.tournamentId !== tournamentId) {
    notFound();
  }

  // Fetch all pools for this category with their participants and matches
  const pools = await prisma.pool.findMany({
    where: { categoryId },
    include: {
      participants: true,
      matches: {
        include: {
          participant1: true,
          participant2: true,
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
      },
    },
    orderBy: { poolNumber: "asc" },
  });

  // Map to frontend type
  const poolDataList: PoolData[] = pools.map((pool) => ({
    id: pool.id,
    name: pool.name,
    participants: pool.participants.map((p) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
    })),
    matches: pool.matches.map((m) => ({
      id: m.id,
      participant1: m.participant1
        ? { id: m.participant1.id, name: m.participant1.name, seed: m.participant1.seed }
        : null,
      participant2: m.participant2
        ? { id: m.participant2.id, name: m.participant2.name, seed: m.participant2.seed }
        : null,
      winnerId: m.winnerId,
      status: m.status as any,
      sets: m.sets,
    })),
  }));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-1/3 h-1/3 bg-emerald-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 text-xs font-bold tracking-widest text-blue-300 bg-blue-500/20 rounded-full border border-blue-500/30 uppercase">
              Phase 1
            </span>
            <span className="text-zinc-500 text-sm font-medium">
              {category.tournament.name}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight">
            {category.name}
          </h1>
          <p className="text-zinc-400 font-medium">Live Standings</p>
        </div>

        {poolDataList.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
            No pools have been generated for this category yet.
          </div>
        ) : (
          poolDataList.map((poolData) => (
            <PoolStandingsTable key={poolData.id} pool={poolData} />
          ))
        )}
      </div>
    </div>
  );
}
