"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTournamentSchema, type CreateTournamentInput } from "@/lib/validations/tournament";
import { createTournament } from "@/lib/actions/tournament";
import { Calendar, Clock, Trophy, Layers, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

export const CreateTournamentForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      numberOfCourts: 4,
      estimatedMatchDurationMinutes: 30,
      restPeriodMinutes: 20,
    },
  });

  const onSubmit = async (data: CreateTournamentInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setServerSuccess(false);

    try {
      const result = await createTournament(data);
      if (result.success) {
        setServerSuccess(true);
        reset();
        if (onSuccess) onSuccess();
      } else {
        setServerError(result.error || "Failed to create tournament.");
      }
    } catch (err) {
      setServerError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <Trophy className="text-indigo-400 w-6 h-6" />
          Create New Tournament
        </h2>
        <p className="text-zinc-500 mt-2 text-sm">
          Initialize a new tournament event. Courts will be generated automatically based on your configuration.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{serverError}</p>
        </div>
      )}

      {serverSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">Tournament created successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Tournament Name
            </label>
            <input
              {...register("name")}
              placeholder="e.g., BWF World Tour Finals 2026"
              className={cn(
                "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                errors.name ? "border-red-500/50" : "border-zinc-800"
              )}
            />
            {errors.name && <p className="text-red-400 text-xs mt-2 font-medium">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Start Date
              </label>
              <input
                type="datetime-local"
                {...register("startDate")}
                className={cn(
                  "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]",
                  errors.startDate ? "border-red-500/50" : "border-zinc-800"
                )}
              />
              {errors.startDate && <p className="text-red-400 text-xs mt-2 font-medium">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> End Date (Optional)
              </label>
              <input
                type="datetime-local"
                {...register("endDate")}
                className={cn(
                  "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]",
                  errors.endDate ? "border-red-500/50" : "border-zinc-800"
                )}
              />
              {errors.endDate && <p className="text-red-400 text-xs mt-2 font-medium">{errors.endDate.message}</p>}
            </div>
          </div>
        </div>

        <div className="h-px bg-zinc-800 w-full my-8" />

        {/* Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Number of Courts
              </label>
              <input
                type="number"
                {...register("numberOfCourts")}
                className={cn(
                  "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                  errors.numberOfCourts ? "border-red-500/50" : "border-zinc-800"
                )}
              />
              {errors.numberOfCourts && <p className="text-red-400 text-xs mt-2 font-medium">{errors.numberOfCourts.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Match Duration (min)
              </label>
              <input
                type="number"
                {...register("estimatedMatchDurationMinutes")}
                className={cn(
                  "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                  errors.estimatedMatchDurationMinutes ? "border-red-500/50" : "border-zinc-800"
                )}
              />
              {errors.estimatedMatchDurationMinutes && <p className="text-red-400 text-xs mt-2 font-medium">{errors.estimatedMatchDurationMinutes.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Rest Period (min)
              </label>
              <input
                type="number"
                {...register("restPeriodMinutes")}
                className={cn(
                  "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                  errors.restPeriodMinutes ? "border-red-500/50" : "border-zinc-800"
                )}
              />
              {errors.restPeriodMinutes && <p className="text-red-400 text-xs mt-2 font-medium">{errors.restPeriodMinutes.message}</p>}
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Tournament...
              </>
            ) : (
              "Create Tournament"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
