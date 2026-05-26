import { TournamentBracket, type BracketMatch } from "@/components/TournamentBracket";

const mockMatches: BracketMatch[] = [
  // --- QUARTERFINALS (Round 1) ---
  {
    id: "m1",
    bracketRound: 1,
    bracketPosition: 1,
    nextMatchId: "m5",
    nextMatchSlot: "SLOT_1",
    status: "COMPLETED",
    participant1: { id: "p1", name: "Lin Dan", seed: 1 },
    participant2: { id: "p8", name: "Viktor Axelsen", seed: 8 },
    winnerId: "p1",
    sets: [
      { setNumber: 1, score1: 21, score2: 18 },
      { setNumber: 2, score1: 21, score2: 15 },
    ],
  },
  {
    id: "m2",
    bracketRound: 1,
    bracketPosition: 2,
    nextMatchId: "m5",
    nextMatchSlot: "SLOT_2",
    status: "COMPLETED",
    participant1: { id: "p5", name: "Chen Long", seed: 5 },
    participant2: { id: "p4", name: "Kento Momota", seed: 4 },
    winnerId: "p4",
    sets: [
      { setNumber: 1, score1: 19, score2: 21 },
      { setNumber: 2, score1: 21, score2: 17 },
      { setNumber: 3, score1: 18, score2: 21 },
    ],
  },
  {
    id: "m3",
    bracketRound: 1,
    bracketPosition: 3,
    nextMatchId: "m6",
    nextMatchSlot: "SLOT_1",
    status: "BYE",
    participant1: { id: "p3", name: "Lee Chong Wei", seed: 3 },
    participant2: null,
    winnerId: "p3",
    sets: [],
  },
  {
    id: "m4",
    bracketRound: 1,
    bracketPosition: 4,
    nextMatchId: "m6",
    nextMatchSlot: "SLOT_2",
    status: "COMPLETED",
    participant1: { id: "p7", name: "Chou Tien Chen", seed: 7 },
    participant2: { id: "p2", name: "Anders Antonsen", seed: 2 },
    winnerId: "p7",
    sets: [
      { setNumber: 1, score1: 21, score2: 12 },
      { setNumber: 2, score1: 21, score2: 19 },
    ],
  },

  // --- SEMIFINALS (Round 2) ---
  {
    id: "m5",
    bracketRound: 2,
    bracketPosition: 1,
    nextMatchId: "m7",
    nextMatchSlot: "SLOT_1",
    status: "IN_PROGRESS",
    participant1: { id: "p1", name: "Lin Dan", seed: 1 },
    participant2: { id: "p4", name: "Kento Momota", seed: 4 },
    winnerId: null,
    sets: [
      { setNumber: 1, score1: 21, score2: 23 },
      { setNumber: 2, score1: 14, score2: 10 },
    ],
  },
  {
    id: "m6",
    bracketRound: 2,
    bracketPosition: 2,
    nextMatchId: "m7",
    nextMatchSlot: "SLOT_2",
    status: "SCHEDULED",
    participant1: { id: "p3", name: "Lee Chong Wei", seed: 3 },
    participant2: { id: "p7", name: "Chou Tien Chen", seed: 7 },
    winnerId: null,
    sets: [],
  },

  // --- FINAL (Round 3) ---
  {
    id: "m7",
    bracketRound: 3,
    bracketPosition: 1,
    nextMatchId: null,
    nextMatchSlot: null,
    status: "SCHEDULED",
    participant1: null,
    participant2: null,
    winnerId: null,
    sets: [],
  },
];

export default function BracketPreview() {
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
            <span className="text-zinc-500 text-sm font-medium">BWF World Tour Finals</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight">
            Men's Singles Pro
          </h1>
          <p className="text-zinc-400 font-medium">Knockout Stage Bracket</p>
        </div>

        <TournamentBracket matches={mockMatches} />
      </div>
    </div>
  );
}
