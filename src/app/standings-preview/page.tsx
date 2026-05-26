import { PoolStandingsTable, type PoolData } from "@/components/PoolStandingsTable";

const mockPoolA: PoolData = {
  id: "pool-a",
  name: "Group A",
  participants: [
    { id: "p1", name: "Lin Dan", seed: 1 },
    { id: "p2", name: "Chen Long", seed: null },
    { id: "p3", name: "Lee Chong Wei", seed: null },
    { id: "p4", name: "Kento Momota", seed: 4 },
  ],
  matches: [
    // Round 1
    {
      id: "m1",
      participant1: { id: "p1", name: "Lin Dan" },
      participant2: { id: "p2", name: "Chen Long" },
      winnerId: "p1",
      status: "COMPLETED",
      sets: [
        { setNumber: 1, score1: 21, score2: 15 },
        { setNumber: 2, score1: 21, score2: 18 },
      ],
    },
    {
      id: "m2",
      participant1: { id: "p3", name: "Lee Chong Wei" },
      participant2: { id: "p4", name: "Kento Momota" },
      winnerId: "p3",
      status: "COMPLETED",
      sets: [
        { setNumber: 1, score1: 21, score2: 19 },
        { setNumber: 2, score1: 17, score2: 21 },
        { setNumber: 3, score1: 21, score2: 14 },
      ],
    },
    // Round 2
    {
      id: "m3",
      participant1: { id: "p1", name: "Lin Dan" },
      participant2: { id: "p4", name: "Kento Momota" },
      winnerId: "p1",
      status: "COMPLETED",
      sets: [
        { setNumber: 1, score1: 21, score2: 12 },
        { setNumber: 2, score1: 21, score2: 10 },
      ],
    },
    {
      id: "m4",
      participant1: { id: "p2", name: "Chen Long" },
      participant2: { id: "p3", name: "Lee Chong Wei" },
      winnerId: "p3",
      status: "COMPLETED",
      sets: [
        { setNumber: 1, score1: 18, score2: 21 },
        { setNumber: 2, score1: 15, score2: 21 },
      ],
    },
    // Round 3 (Incomplete / In Progress)
    {
      id: "m5",
      participant1: { id: "p1", name: "Lin Dan" },
      participant2: { id: "p3", name: "Lee Chong Wei" },
      winnerId: null,
      status: "SCHEDULED",
      sets: [],
    },
    {
      id: "m6",
      participant1: { id: "p2", name: "Chen Long" },
      participant2: { id: "p4", name: "Kento Momota" },
      winnerId: "p4",
      status: "COMPLETED", // Consolation win for Momota
      sets: [
        { setNumber: 1, score1: 10, score2: 21 },
        { setNumber: 2, score1: 12, score2: 21 },
      ],
    }
  ],
};

export default function StandingsPreview() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans relative">
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
            <span className="text-zinc-500 text-sm font-medium">Pool Play</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight">
            Live Standings
          </h1>
          <p className="text-zinc-400 font-medium">BWF Article 16.2 Tiebreaking Rules Applied</p>
        </div>

        <PoolStandingsTable pool={mockPoolA} />
      </div>
    </div>
  );
}
