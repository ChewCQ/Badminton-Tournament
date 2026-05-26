"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema, type CreateCategoryInput } from "@/lib/validations/category";
import { createCategory } from "@/lib/actions/category";
import { CategoryType, TournamentFormat } from "@prisma/client";
import { Plus, AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

export const CreateCategoryForm = ({ tournamentId, onSuccess }: { tournamentId: string; onSuccess?: () => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      tournamentId,
      type: "SINGLES",
      format: "KNOCKOUT",
      poolSize: 4,
      advanceCount: 2,
    },
  });

  const selectedFormat = watch("format");

  const onSubmit = async (data: CreateCategoryInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setServerSuccess(false);

    try {
      const result = await createCategory(data);
      if (result.success) {
        setServerSuccess(true);
        reset({ ...data, name: "" }); // keep settings, reset name
        if (onSuccess) onSuccess();
      } else {
        setServerError(result.error || "Failed to create category.");
      }
    } catch (err) {
      setServerError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Plus className="text-indigo-400 w-5 h-5" />
          Add Category
        </h3>
        <p className="text-zinc-500 text-xs mt-1">
          Create a new playing category for this tournament.
        </p>
      </div>

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{serverError}</p>
        </div>
      )}

      {serverSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">Category created with 8 test players!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Hidden Tournament ID */}
        <input type="hidden" {...register("tournamentId")} value={tournamentId} />

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Category Name
          </label>
          <input
            {...register("name")}
            placeholder="e.g., Men's Singles Pro"
            className={cn(
              "w-full bg-zinc-950 border rounded-xl px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
              errors.name ? "border-red-500/50" : "border-zinc-800"
            )}
          />
          {errors.name && <p className="text-red-400 text-[10px] mt-1 font-medium">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              {...register("type")}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
            >
              <option value="SINGLES">Singles</option>
              <option value="DOUBLES">Doubles</option>
              <option value="MIXED_DOUBLES">Mixed Doubles</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Format
            </label>
            <select
              {...register("format")}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
            >
              <option value="KNOCKOUT">Knockout (Elimination)</option>
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="POOL_TO_BRACKET">Pool-to-Bracket</option>
            </select>
          </div>
        </div>

        {/* Dynamic Fields based on format */}
        {(selectedFormat === "ROUND_ROBIN" || selectedFormat === "POOL_TO_BRACKET") && (
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-3">
            <div className="flex items-start gap-2 text-indigo-300 text-xs font-medium mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <p>Configure pool settings for the group stage.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                  Players per Pool
                </label>
                <input
                  type="number"
                  {...register("poolSize")}
                  className="w-full bg-zinc-950 border border-indigo-500/20 rounded-lg px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                  Advance Count
                </label>
                <input
                  type="number"
                  {...register("advanceCount")}
                  className="w-full bg-zinc-950 border border-indigo-500/20 rounded-lg px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 mt-2 bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Create Category"
          )}
        </button>
      </form>
    </div>
  );
};
