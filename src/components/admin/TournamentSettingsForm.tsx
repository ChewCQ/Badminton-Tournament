"use client";

import React, { useState, useTransition } from "react";
import { updateTournamentDetails } from "@/lib/actions/tournament";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

// Define the shape based on the Prisma schema
interface TournamentData {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  status: "DRAFT" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  numberOfCourts: number;
  estimatedMatchDurationMinutes: number;
  restPeriodMinutes: number;
}

export function TournamentSettingsForm({ tournament }: { tournament: TournamentData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: tournament.name,
    startDate: new Date(tournament.startDate).toISOString().slice(0, 16),
    endDate: tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : "",
    status: tournament.status,
    numberOfCourts: tournament.numberOfCourts,
    estimatedMatchDurationMinutes: tournament.estimatedMatchDurationMinutes,
    restPeriodMinutes: tournament.restPeriodMinutes,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = () => {
    // Check if courts are being reduced
    if (formData.numberOfCourts < tournament.numberOfCourts) {
      const confirmReduce = confirm(
        `WARNING: You are reducing the number of courts from ${tournament.numberOfCourts} to ${formData.numberOfCourts}. ` +
        `This will PERMANENTLY delete the highest numbered courts. If they have matches assigned, this could break the schedule. Proceed?`
      );
      if (!confirmReduce) return;
    }

    startTransition(async () => {
      const res = await updateTournamentDetails(tournament.id, {
        name: formData.name,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        status: formData.status as any,
        numberOfCourts: formData.numberOfCourts,
        estimatedMatchDurationMinutes: formData.estimatedMatchDurationMinutes,
        restPeriodMinutes: formData.restPeriodMinutes,
      });

      if (res.success) {
        alert("Tournament settings updated successfully!");
        router.refresh();
      } else {
        alert(res.error || "Failed to update settings.");
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">General Settings</h2>
          <p className="text-zinc-400 text-sm mt-1">Configure the core details of your tournament.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Tournament Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">End Date & Time (Optional)</label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Tournament Status Override</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none"
            >
              <option value="DRAFT">Draft (Not visible)</option>
              <option value="REGISTRATION_OPEN">Registration Open</option>
              <option value="IN_PROGRESS">In Progress (Live)</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <p className="text-xs text-zinc-500 mt-2">Manually override the status of the tournament to lock or unlock features.</p>
          </div>
        </div>

        {/* Right Column (Scheduling Rules) */}
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-bold text-zinc-300 mb-4 flex items-center gap-2">
              Scheduling Configuration
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Total Courts</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="numberOfCourts"
                    min="1"
                    max="50"
                    value={formData.numberOfCourts}
                    onChange={handleChange}
                    className="w-24 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none text-center"
                  />
                  {formData.numberOfCourts < tournament.numberOfCourts && (
                    <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Warning: Reducing courts will delete them
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Estimated Match Duration (Mins)</label>
                <input
                  type="number"
                  name="estimatedMatchDurationMinutes"
                  min="5"
                  max="120"
                  step="5"
                  value={formData.estimatedMatchDurationMinutes}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Rest Period Between Matches (Mins)</label>
                <input
                  type="number"
                  name="restPeriodMinutes"
                  min="0"
                  max="120"
                  step="5"
                  value={formData.restPeriodMinutes}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-xs text-zinc-500 mt-2">Required rest time before a player can be assigned to their next consecutive match.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
