import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CreateSponsorForm } from "@/components/admin/CreateSponsorForm";
import { DeleteSponsorButton } from "@/components/admin/DeleteSponsorButton";
import { SponsorTierBadge } from "@/components/admin/SponsorTierBadge";
import { MoveSponsorButtons } from "@/components/admin/MoveSponsorButtons";
import { MonitorPlay, Megaphone, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function SponsorAndDisplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      sponsors: {
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ]
      }
    }
  });

  if (!tournament) notFound();

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium mb-3">
          <Link href={`/hq-admin-v2/tournaments/${id}`} className="hover:text-zinc-300 transition-colors">{tournament.name}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-zinc-300">Sponsor & Display</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight flex items-center gap-4">
            <Megaphone className="w-8 h-8 text-indigo-400" />
            Sponsors & TV Display
          </h1>
          
          <Link
            href={`/tournaments/${id}/tv`}
            target="_blank"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3 shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/20 hover:-translate-y-0.5"
          >
            <MonitorPlay className="w-5 h-5" />
            Launch TV Display
            <ExternalLink className="w-4 h-4 text-indigo-300" />
          </Link>
        </div>
        <p className="text-zinc-400 mt-4 max-w-3xl">
          Upload sponsor logos here. These will dynamically rotate on the public TV Display mode, 
          alongside the live court assignments. Use the <strong>Launch TV Display</strong> button 
          to open the full-screen view for the venue TVs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Existing Sponsors */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            Active Sponsors ({tournament.sponsors.length})
          </h2>
          
          {tournament.sponsors.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30 flex flex-col items-center justify-center">
              <Megaphone className="w-12 h-12 text-zinc-700 mb-4" />
              <h3 className="text-lg font-bold text-zinc-300 mb-2">No Sponsors Yet</h3>
              <p className="text-zinc-500 text-sm">Upload sponsor logos to have them featured on the TV Display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tournament.sponsors.map((sponsor, index) => (
                <div key={sponsor.id} className="bg-zinc-900 border border-zinc-800 rounded-xl relative group">
                  <div className="h-32 bg-zinc-950 flex items-center justify-center p-4 relative rounded-t-xl overflow-hidden">
                      <Image 
                        src={sponsor.logoUrl} 
                        alt={sponsor.name} 
                        fill 
                        className="object-contain p-4 group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                    <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between gap-2 rounded-b-xl">
                      <p className="font-bold text-sm text-zinc-200 truncate">{sponsor.name}</p>
                      <SponsorTierBadge tournamentId={tournament.id} sponsorId={sponsor.id} currentTier={sponsor.tier} />
                    </div>
                    
                    <DeleteSponsorButton tournamentId={tournament.id} sponsorId={sponsor.id} />
                    <MoveSponsorButtons 
                      tournamentId={tournament.id} 
                      sponsorId={sponsor.id} 
                      isFirst={index === 0} 
                      isLast={index === tournament.sponsors.length - 1} 
                    />
                  </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Upload Form */}
        <div>
          <CreateSponsorForm tournamentId={tournament.id} />
        </div>
      </div>
    </div>
  );
}
