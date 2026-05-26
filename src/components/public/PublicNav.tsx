"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MonitorPlay, GitMerge } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function PublicNav({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview",
      href: `/tournaments/${tournamentId}`,
      icon: Home,
      exact: true
    },
    {
      name: "Live Courts",
      href: `/tournaments/${tournamentId}/live`,
      icon: MonitorPlay,
      exact: false
    },
    {
      name: "Draws",
      href: `/tournaments/${tournamentId}/draws`,
      icon: GitMerge,
      exact: false
    }
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
              
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                <span className={cn("text-[10px] font-bold", isActive ? "text-indigo-600" : "font-semibold")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <nav className="hidden md:flex sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto w-full px-8 h-16 flex items-center justify-center gap-8">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
              
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold",
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
