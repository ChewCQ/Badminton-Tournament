"use client";

import React, { useState, useTransition } from "react";
import { Users, GripVertical, AlertCircle, Loader2 } from "lucide-react";
import { globalAutoSchedule } from "@/lib/actions/schedule";
import { useRouter } from "next/navigation";

interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export function AutoScheduleModal({
  tournamentId,
  categories,
  isOpen,
  onClose
}: {
  tournamentId: string;
  categories: CategoryInfo[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderedCats, setOrderedCats] = useState(categories);

  if (!isOpen) return null;

  // Simple drag-and-drop for the list
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("catId", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("catId");
    if (draggedId === targetId) return;

    setOrderedCats((prev) => {
      const draggedIdx = prev.findIndex(c => c.id === draggedId);
      const targetIdx = prev.findIndex(c => c.id === targetId);
      
      const newArray = [...prev];
      const [draggedItem] = newArray.splice(draggedIdx, 1);
      newArray.splice(targetIdx, 0, draggedItem);
      
      return newArray;
    });
  };

  const handleRun = () => {
    startTransition(async () => {
      const priorityIds = orderedCats.map(c => c.id);
      await globalAutoSchedule(tournamentId, priorityIds);
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center">
          <h2 className="text-2xl font-black tracking-tight">Global Auto-Scheduler</h2>
          <p className="text-indigo-100 text-sm mt-1 font-medium">Interleave all matches round-by-round.</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium">
              <span className="font-bold block mb-1">Warning: Overwrites entire timeline!</span>
              This will wipe your current court assignments and dynamically perfectly-pack every match across all categories from scratch.
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Drag to set Category Priority
            </label>
            <div className="space-y-2">
              {orderedCats.map((cat, index) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </div>
                  <div className="flex-1 font-bold text-slate-800">{cat.name}</div>
                  <div className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-md">
                    {cat.count} matches
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-3 text-center">
              e.g. Priority 1's Round 1 plays before Priority 2's Round 1.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleRun}
            disabled={isPending}
            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Scheduling...</>
            ) : (
              "Run Scheduler"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
