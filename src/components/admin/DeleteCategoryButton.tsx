"use client";

import React, { useTransition } from "react";
import { deleteCategory } from "@/lib/actions/category";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  tournamentId: string;
  categoryId: string;
  categoryName: string;
  hasMatches: boolean;
}

export function DeleteCategoryButton({ tournamentId, categoryId, categoryName, hasMatches }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const warningText = hasMatches
      ? `WARNING: This category "${categoryName}" already has generated matches!\n\nDeleting this category will permanently erase all matches, schedules, scores, standings, and participant assignments.\n\nAre you sure you want to proceed?`
      : `Are you sure you want to delete the category "${categoryName}"?`;

    if (!confirm(warningText)) return;

    startTransition(async () => {
      const res = await deleteCategory(tournamentId, categoryId);
      if (!res.success) {
        alert(res.error || "Failed to delete category");
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex items-center justify-center border border-zinc-800 hover:border-red-500/20"
      title="Delete Category"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}
