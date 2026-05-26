import React from "react";
import Link from "next/link";
import { LayoutDashboard, Trophy, Users, Settings } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800/50 flex-shrink-0 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500 tracking-tight">
            TournyAdmin
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Tournament Management
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors font-medium cursor-not-allowed opacity-50">
            <Trophy className="w-4 h-4" />
            Tournaments
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors font-medium cursor-not-allowed opacity-50">
            <Users className="w-4 h-4" />
            Players
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors font-medium cursor-not-allowed opacity-50">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-sm shadow-inner">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Admin User</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Director
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none" />
        <div className="p-8 md:p-12 max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
