"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, ShieldCheck, Trophy } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/hq-admin-v2");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/10 blur-[60px] pointer-events-none rounded-full" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Access</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Restricted Area</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-11 p-4 transition-all"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-3 text-sm font-bold text-rose-500 flex items-center justify-center gap-1.5 bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              {isLoading ? "Authenticating..." : "Unlock Dashboard"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-12 flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-widest">
        <Trophy className="w-4 h-4" />
        TournyAdmin System
      </div>
    </div>
  );
}
