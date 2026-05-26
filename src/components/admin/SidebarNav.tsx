"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MonitorPlay, 
  GitMerge, 
  Megaphone, 
  Settings, 
  LogOut,
  Trophy,
  Users
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarNavProps {
  tournamentId: string;
}

export function SidebarNav({ tournamentId }: SidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard Hub",
      href: `/admin/tournaments/${tournamentId}`,
      icon: LayoutDashboard,
    },
    {
      name: "Participants",
      href: `/admin/tournaments/${tournamentId}/participants`,
      icon: Users,
    },
    {
      name: "Live Courts",
      href: `/admin/tournaments/${tournamentId}/courts`,
      icon: MonitorPlay,
    },
    {
      name: "Draw Manager",
      href: `/admin/tournaments/${tournamentId}/draws`,
      icon: GitMerge,
    },
    {
      name: "Sponsor & Display",
      href: `/admin/tournaments/${tournamentId}/display`,
      icon: Megaphone,
    },
    {
      name: "Settings",
      href: `/admin/tournaments/${tournamentId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-slate-100 font-bold tracking-tight leading-none">TournyAdmin</h2>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1 font-semibold">Tournament Center</p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">
          Management
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
              )} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all w-full text-left group">
          <LogOut className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          Exit Tournament
        </button>
      </div>
    </div>
  );
}
