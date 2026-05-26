"use client";

import React, { useState, useRef, useTransition } from "react";
import { updateTournamentDetails } from "@/lib/actions/tournament";
import { Camera, MapPin, Copy, Check, Edit2, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Props {
  tournamentId: string;
  initialVenue: string | null;
  initialPosterUrl: string | null;
  initialHostLogoUrl: string | null;
}

export function TournamentSettingsCard({ tournamentId, initialVenue, initialPosterUrl, initialHostLogoUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  
  // Venue State
  const [isEditingVenue, setIsEditingVenue] = useState(false);
  const [venueInput, setVenueInput] = useState(initialVenue || "");
  const [copied, setCopied] = useState(false);
  const [isUploadingHostLogo, setIsUploadingHostLogo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hostLogoInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    if (!initialVenue) return;
    navigator.clipboard.writeText(initialVenue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveVenue = () => {
    startTransition(async () => {
      await updateTournamentDetails(tournamentId, { venue: venueInput });
      setIsEditingVenue(false);
      router.refresh();
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.success && data.url) {
        startTransition(async () => {
          await updateTournamentDetails(tournamentId, { posterUrl: data.url });
          router.refresh();
        });
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleHostLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHostLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.success && data.url) {
        startTransition(async () => {
          await updateTournamentDetails(tournamentId, { hostLogoUrl: data.url });
          router.refresh();
        });
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setIsUploadingHostLogo(false);
      if (hostLogoInputRef.current) hostLogoInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col md:flex-row gap-6">
      
      {/* Poster Section (Left Side on Desktop) */}
      <div className="relative md:w-1/3 bg-zinc-950 flex flex-col justify-center items-center p-6 border-b md:border-b-0 md:border-r border-zinc-800 min-h-[250px] group">
        
        {initialPosterUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <Image 
              src={initialPosterUrl} 
              alt="Tournament Poster" 
              fill 
              className="object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-300"
            />
            {/* Hover Overlay for Upload */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isPending}
                className="bg-black/50 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-black/70 transition-colors"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Change Poster
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 gap-3">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Camera className="w-6 h-6 text-zinc-600" />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Upload Poster Image
            </button>
            <p className="text-xs font-medium">JPEG, PNG, WEBP</p>
          </div>
        )}
        
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload}
          className="hidden" 
        />
      </div>

      {/* Venue & Details Section */}
      <div className="flex-1 p-6 flex flex-col justify-center">
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Event Details</h3>
        
        <div className="space-y-6">
          {/* Venue Card */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold flex items-center gap-2 text-zinc-400">
                <MapPin className="w-4 h-4" />
                Tournament Venue
              </span>
              
              {!isEditingVenue && (
                <button 
                  onClick={() => setIsEditingVenue(true)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditingVenue ? (
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  autoFocus
                  value={venueInput}
                  onChange={(e) => setVenueInput(e.target.value)}
                  placeholder="e.g. Grand Slam Arena, Court 1-12"
                  className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm font-bold focus:border-indigo-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveVenue()}
                />
                <button 
                  onClick={handleSaveVenue}
                  disabled={isPending}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsEditingVenue(false)}
                  disabled={isPending}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className={`flex-1 font-black ${initialVenue ? 'text-zinc-100 text-lg' : 'text-zinc-600 text-sm italic'}`}>
                  {initialVenue || "No venue configured yet."}
                </p>
                
                {initialVenue && (
                  <button 
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      copied 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'COPIED!' : 'COPY'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Host Logo Card */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-zinc-400">Host / Organizer Logo</span>
              <span className="text-xs text-zinc-500">Displays near the title on the public page</span>
            </div>
            
            <div className="flex items-center gap-3">
              {initialHostLogoUrl && (
                <div className="relative w-12 h-12 bg-white rounded-md p-1 border border-zinc-700">
                  <Image src={initialHostLogoUrl} alt="Host Logo" fill className="object-contain p-1" />
                </div>
              )}
              <button 
                onClick={() => hostLogoInputRef.current?.click()}
                disabled={isUploadingHostLogo || isPending}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors border border-zinc-700 flex items-center gap-1.5"
              >
                {isUploadingHostLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                {initialHostLogoUrl ? "Change" : "Upload"}
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={hostLogoInputRef} 
                onChange={handleHostLogoUpload}
                className="hidden" 
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
