// src/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";


export const metadata = {
  title: "HEXA Badminton Tournament",
  description: "Browse and manage badminton tournaments",
};

export default async function HomePage() {
  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      startDate: true,
      status: true,
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-6 md:p-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="text-center mb-10 w-full max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight drop-shadow-sm mb-3">
          🏸 HEXA Badminton Tournament
        </h1>
        <p className="text-slate-500 text-sm md:text-base font-medium">
          Pick a tournament to view live courts, brackets, and draws.
        </p>
      </header>

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-4xl text-center">
          <p className="text-slate-500">No tournaments found – create one via the admin panel.</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-4">
          {tournaments.map((t) => (
            <Link 
              href={`/tournaments/${t.id}`} 
              key={t.id}
              className="group block w-full"
            >
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-indigo-300 transition-all duration-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {t.name}
                  </h2>
                  <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(t.startDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    t.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                    t.status === 'REGISTRATION_OPEN' ? 'bg-blue-100 text-blue-700' :
                    t.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' :
                    t.status === 'COMPLETED' ? 'bg-purple-100 text-purple-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}