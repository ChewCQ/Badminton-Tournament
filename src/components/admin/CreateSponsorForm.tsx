"use client";

import React, { useState, useRef, useTransition } from "react";
import { createSponsor } from "@/lib/actions/sponsor";
import { uploadFileAsBase64 } from "@/lib/utils/upload";
import { ImagePlus, Loader2, Save } from "lucide-react";
import Image from "next/image";

interface Props {
  tournamentId: string;
}

export function CreateSponsorForm({ tournamentId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [tier, setTier] = useState("Main Sponsor");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await uploadFileAsBase64(file);
      
      if (data.success && data.url) {
        setLogoUrl(data.url);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Error reading file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!name || !logoUrl) {
      alert("Please provide both a name and a logo.");
      return;
    }
    
    startTransition(async () => {
      const res = await createSponsor(tournamentId, { name, logoUrl, tier: tier || "Sponsor" });
      if (res.success) {
        setName("");
        setLogoUrl("");
        setTier("Main Sponsor");
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-zinc-100 mb-4">Add New Sponsor</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Sponsor Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Yonex, Red Bull"
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Custom Label Selector */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Sponsor Label / Category</label>
          <input 
            type="text" 
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            placeholder="e.g. Main Sponsor, Equipment Partner"
            list="sponsor-tier-suggestions"
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
          />
          <datalist id="sponsor-tier-suggestions">
            <option value="Main Sponsor" />
            <option value="Title Sponsor" />
            <option value="Product Sponsor" />
            <option value="Apparel Partner" />
            <option value="Official Partner" />
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Sponsor Logo</label>
          
          <div className="flex gap-4 items-center">
            {/* Logo Preview */}
            <div className="w-24 h-24 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden relative flex-shrink-0">
              {logoUrl ? (
                <Image src={logoUrl} alt="Preview" fill className="object-contain p-2" />
              ) : (
                <ImagePlus className="w-8 h-8 text-zinc-700" />
              )}
            </div>
            
            {/* Upload Button */}
            <div className="flex-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isPending}
                className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-zinc-700"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {logoUrl ? "Change Logo" : "Upload Logo Image"}
              </button>
              <p className="text-xs text-zinc-500 mt-2 text-center">Use PNGs with transparent backgrounds for best results on the TV display.</p>
            </div>
          </div>
        </div>

        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload}
          className="hidden" 
        />

        <button 
          onClick={handleSave}
          disabled={isPending || isUploading || !name || !logoUrl}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Sponsor
        </button>
      </div>
    </div>
  );
}
