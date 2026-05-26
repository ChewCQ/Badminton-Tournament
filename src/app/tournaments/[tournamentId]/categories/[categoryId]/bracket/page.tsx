import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TournamentBracket, type BracketMatch } from "@/components/TournamentBracket";

export default async function CategoryBracketPage({
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

  // Fetch all matches for this category that are part of a bracket
  const matches = await prisma.match.findMany({
    where: {
      categoryId,
      bracketRound: { not: null },
    },
    include: {
      participant1: true,
      participant2: true,
      sets: {
        orderBy: { setNumber: "asc" },
      },
    },
  });

  // Map to frontend type
  const bracketMatches: BracketMatch[] = matches.map((m) => ({
    id: m.id,
    participant1: m.participant1
      ? {
          id: m.participant1.id,
          name: m.participant1.name,
          seed: m.participant1.seed,
        }
      : null,
    participant2: m.participant2
      ? {
          id: m.participant2.id,
          name: m.participant2.name,
          seed: m.participant2.seed,
        }
      : null,
    winnerId: m.winnerId,
    status: m.status as any,
    sets: m.sets,
    nextMatchId: m.nextMatchId,
    nextMatchSlot: m.nextMatchSlot as any,
    bracketRound: m.bracketRound,
    bracketPosition: m.bracketPosition,
  }));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-violet-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-[90rem] mx-auto space-y-8 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 text-xs font-bold tracking-widest text-indigo-300 bg-indigo-500/20 rounded-full border border-indigo-500/30 uppercase">
              Live Event
            </span>
            <span className="text-zinc-500 text-sm font-medium">
              {category.tournament.name}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight">
            {category.name}
          </h1>
          <p className="text-zinc-400 font-medium">Knockout Stage Bracket</p>
        </div>

        <TournamentBracket matches={bracketMatches} />
      </div>
    </div>
  );
}
