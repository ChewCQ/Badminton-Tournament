"use client";

import React, { useState, useTransition } from "react";
import { BulkImportForm } from "@/components/admin/BulkImportForm";
import { deleteParticipant, updateParticipant } from "@/lib/actions/participant";
import { Loader2, Trash2, Edit2, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  name: string;
  teamName: string | null;
  categoryId: string;
  category: { name: string };
}

export function ParticipantManager({
  tournamentId,
  categories,
  allParticipants,
}: {
  tournamentId: string;
  categories: Category[];
  allParticipants: Participant[];
}) {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredParticipants = allParticipants.filter((p) => p.categoryId === selectedCategory);

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditTeam(p.teamName || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = (id: string) => {
    startTransition(async () => {
      await updateParticipant(id, tournamentId, { name: editName, teamName: editTeam || null });
      setEditingId(null);
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    startTransition(async () => {
      await deleteParticipant(id, tournamentId);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Import Form */}
      <div className="lg:col-span-1">
        <BulkImportForm
          tournamentId={tournamentId}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Right Column: Participant List Summary */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800">
              Entries ({filteredParticipants.length})
            </h2>
            {categories.length > 0 && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                {categories.find((c) => c.id === selectedCategory)?.name || "All"}
              </span>
            )}
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <p className="font-bold uppercase tracking-widest text-sm">No Participants Found</p>
              <p className="text-sm mt-1">Use the bulk import tool to add players to this category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParticipants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {editingId === p.id ? (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editTeam}
                              onChange={(e) => setEditTeam(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="None"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSave(p.id)}
                                disabled={isPending}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {p.teamName || <span className="text-slate-300 italic">None</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(p)}
                                disabled={isPending}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                disabled={isPending}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
