"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  ListFilter, 
  LayoutList, 
  SlidersHorizontal, 
  X, 
  Check, 
  Clock, 
  MapPin, 
  Trophy,
  Activity,
  AlertCircle
} from "lucide-react";
import { TimetableGrid } from "@/components/admin/TimetableGrid";
import { generateMatchCodeMap, generateMatchCodePrefix } from "@/lib/utils/matchCode";
import { getCategoryTheme, getCategoryDot } from "@/lib/utils/colors";
import { LocalTime } from "@/components/LocalTime";

interface Participant {
  id: string;
  name: string;
  teamName?: string | null;
}

interface MatchSet {
  setNumber: number;
  score1: number;
  score2: number;
}

interface Match {
  id: string;
  roundNumber: number;
  bracketRound: number | null;
  bracketPosition: number | null;
  poolId: string | null;
  scheduledStartTime: Date | null;
  scheduledEndTime: Date | null;
  courtId: string | null;
  court: { name: string } | null;
  status: string;
  winnerId?: string | null;
  participant1: Participant | null;
  participant2: Participant | null;
  category: { id: string; name: string; bestOf: number };
  sets: MatchSet[];
}

interface Court {
  id: string;
  name: string;
  courtNumber?: number;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  matches: Match[];
  courts: Court[];
  categories: Category[];
  tournamentId: string;
  tournamentStartDate: Date;
}

export function PublicScheduleView({
  matches,
  courts,
  categories,
  tournamentId,
  tournamentStartDate,
}: Props) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  // Filter state
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState<string>("ALL");

  // Selected match for detail view
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);

  // Generate structure-based match codes
  const matchCodeMap = useMemo(() => {
    return generateMatchCodeMap(matches);
  }, [matches]);

  // Unique dates from matches
  const uniqueDates = useMemo(() => {
    const datesMap = new Map<string, Date>();
    for (const m of matches) {
      if (m.scheduledStartTime) {
        const d = new Date(m.scheduledStartTime);
        const key = d.toISOString().split("T")[0];
        if (!datesMap.has(key)) {
          datesMap.set(key, d);
        }
      }
    }
    return Array.from(datesMap.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([key, date]) => ({
        key,
        date,
        formatted: date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric"
        })
      }));
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Category filter
      if (selectedCatIds.length > 0 && !selectedCatIds.includes(m.category.id)) {
        return false;
      }
      // Court filter
      if (selectedCourtIds.length > 0 && (!m.courtId || !selectedCourtIds.includes(m.courtId))) {
        return false;
      }
      // Date filter
      if (activeDate !== "ALL" && m.scheduledStartTime) {
        const matchDateKey = new Date(m.scheduledStartTime).toISOString().split("T")[0];
        if (matchDateKey !== activeDate) {
          return false;
        }
      }
      return true;
    });
  }, [matches, selectedCatIds, selectedCourtIds, activeDate]);

  // Group filtered matches by Date for List View
  const groupedMatchesByDate = useMemo(() => {
    const groups = new Map<string, { label: string; date: Date; matches: Match[] }>();

    for (const m of filteredMatches) {
      const d = m.scheduledStartTime ? new Date(m.scheduledStartTime) : new Date(tournamentStartDate);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      if (!groups.has(key)) {
        groups.set(key, { label, date: d, matches: [] });
      }
      groups.get(key)!.matches.push(m);
    }

    // Sort matches within each date group by scheduled start time
    for (const group of groups.values()) {
      group.matches.sort((a, b) => {
        if (!a.scheduledStartTime) return 1;
        if (!b.scheduledStartTime) return -1;
        return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime();
      });
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([_, val]) => val);
  }, [filteredMatches, tournamentStartDate]);

  const activeFilterCount = selectedCatIds.length + selectedCourtIds.length;

  const handleToggleCategory = (catId: string) => {
    setSelectedCatIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleToggleCourt = (courtId: string) => {
    setSelectedCourtIds(prev => 
      prev.includes(courtId) ? prev.filter(id => id !== courtId) : [...prev, courtId]
    );
  };

  const handleClearAll = () => {
    setSelectedCatIds([]);
    setSelectedCourtIds([]);
    setActiveDate("ALL");
  };

  const getRoundLabel = (m: Match) => {
    if (m.bracketRound === null || m.bracketRound === undefined) {
      return `Round ${m.roundNumber}`;
    }
    const catMatches = matches.filter(match => match.category.id === m.category.id && match.bracketRound !== null);
    const maxRound = catMatches.length > 0 ? Math.max(...catMatches.map(match => match.bracketRound as number)) : 1;
    const roundsFromFinal = maxRound - m.bracketRound;
    
    if (roundsFromFinal === 0) return "Final";
    if (roundsFromFinal === 1) return "Semifinal";
    if (roundsFromFinal === 2) return "Quarterfinal";
    const playersInRound = Math.pow(2, roundsFromFinal + 1);
    return `Round of ${playersInRound}`;
  };

  const formatPlayerName = (p: Participant | null) => {
    if (!p) return "TBA";
    return p.teamName ? `[${p.teamName}] ${p.name}` : p.name;
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Matches</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            {filteredMatches.length} matches scheduled across {courts.length} courts
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* List vs Calendar Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setFilterModalOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeFilterCount > 0
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Date Pill Selector if Multi-Day */}
      {uniqueDates.length > 1 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveDate("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeDate === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Dates
          </button>
          {uniqueDates.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveDate(item.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeDate === item.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.formatted}
            </button>
          ))}
        </div>
      )}

      {/* ── View Mode: LIST VIEW (Image 1 Style) ─────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-8">
          {groupedMatchesByDate.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No matches found</h3>
              <p className="text-xs text-slate-400 mt-1">Try clearing your filters to see more matches.</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            groupedMatchesByDate.map((group) => (
              <div key={group.label} className="space-y-4">
                {/* Centered Date Badge (matching Image 1) */}
                <div className="flex justify-center">
                  <div className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-1.5 rounded-full shadow-sm">
                    {group.label}
                  </div>
                </div>

                {/* Match Cards Container */}
                <div className="grid grid-cols-1 gap-3.5">
                  {group.matches.map((m) => {
                    const code = matchCodeMap.get(m.id);
                    const round = getRoundLabel(m);
                    const theme = getCategoryTheme(m.category.id);
                    const isCancelled = m.status === "CANCELLED";
                    const isWalkover = m.status === "WALKOVER";
                    const isLive = m.status === "IN_PROGRESS";
                    const isCompleted = m.status === "COMPLETED";

                    // Total points or set scores
                    const p1TotalScore = m.sets.reduce((sum, s) => sum + s.score1, 0);
                    const p2TotalScore = m.sets.reduce((sum, s) => sum + s.score2, 0);
                    const hasScores = m.sets.length > 0;

                    const isP1Winner = m.winnerId === m.participant1?.id;
                    const isP2Winner = m.winnerId === m.participant2?.id;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setDetailMatch(m)}
                        className={`bg-white border border-slate-200 border-l-[6px] ${theme.borderL} rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer`}
                      >
                        {/* Top Row: Match Code • Round + Status/Time */}
                        <div className="flex items-center justify-between text-xs mb-3">
                          <div className="flex items-center gap-2 font-bold text-slate-500 truncate">
                            {code && (
                              <span className="font-black text-slate-900 tracking-tight">
                                {code}
                              </span>
                            )}
                            {code && <span>•</span>}
                            <span className="truncate">{round}</span>
                          </div>

                          <div>
                            {isCancelled && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                Cancelled
                              </span>
                            )}
                            {isWalkover && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                                Walkover
                              </span>
                            )}
                            {isLive && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                              </span>
                            )}
                            {!isCancelled && !isWalkover && !isLive && m.scheduledStartTime && (
                              <span className="font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                <LocalTime date={m.scheduledStartTime} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Participants & Scores (Stacked vertically as in Image 1) */}
                        <div className="space-y-2 py-1">
                          {/* Participant 1 */}
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-sm sm:text-base truncate ${
                              isP1Winner ? "font-black text-slate-900" : "font-semibold text-slate-700"
                            }`}>
                              {formatPlayerName(m.participant1)}
                            </span>
                            {hasScores && (
                              <span className={`text-base font-black shrink-0 ${
                                isP1Winner ? "text-slate-900" : "text-slate-500"
                              }`}>
                                {p1TotalScore}
                              </span>
                            )}
                          </div>

                          {/* Participant 2 */}
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-sm sm:text-base truncate ${
                              isP2Winner ? "font-black text-slate-900" : "font-semibold text-slate-700"
                            }`}>
                              {formatPlayerName(m.participant2)}
                            </span>
                            {hasScores && (
                              <span className={`text-base font-black shrink-0 ${
                                isP2Winner ? "text-slate-900" : "text-slate-500"
                              }`}>
                                {p2TotalScore}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Court Name */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{m.court?.name || "Court TBA"}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${theme.badge}`}>
                            {m.category.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── View Mode: CALENDAR VIEW (Timetable Gantt Grid) ─────────────── */}
      {viewMode === "calendar" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
          <TimetableGrid 
            matches={filteredMatches} 
            courts={courts} 
            tournamentId={tournamentId}
            tournamentStartDate={tournamentStartDate}
            isReadOnly={true}
          />
        </div>
      )}

      {/* ── Filter Modal (Matching Image 4) ─────────────────────────────── */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Filters</h2>
              <button 
                onClick={() => setFilterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-100">
              {/* Category Filters */}
              <div>
                <h3 className="text-sm font-black text-slate-800 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, idx) => {
                    const isSelected = selectedCatIds.includes(cat.id);
                    const prefix = generateMatchCodePrefix(cat.name);
                    const theme = getCategoryTheme(cat.id, idx);

                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : theme.dot}`} />
                        <span>{cat.name} ({prefix})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Court Filters */}
              <div className="pt-6">
                <h3 className="text-sm font-black text-slate-800 mb-3">Courts</h3>
                <div className="flex flex-wrap gap-2">
                  {courts.map((court) => {
                    const isSelected = selectedCourtIds.includes(court.id);
                    return (
                      <button
                        key={court.id}
                        onClick={() => handleToggleCourt(court.id)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {court.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer (Matching Image 4: Clear all on left, Show matches on right) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-slate-900/10 transition-colors"
              >
                Show matches ({filteredMatches.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Match Detail Modal (when clicked) ───────────────────────────── */}
      {detailMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-slate-900 text-white relative">
              <button 
                onClick={() => setDetailMatch(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {detailMatch.category.name}
              </span>
              <h3 className="text-xl font-black mt-1">
                {matchCodeMap.get(detailMatch.id) || "Match Details"} • {getRoundLabel(detailMatch)}
              </h3>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-bold">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{detailMatch.court?.name || "Court TBA"}</span>
                </div>
                {detailMatch.scheduledStartTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <LocalTime date={detailMatch.scheduledStartTime} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${detailMatch.winnerId === detailMatch.participant1?.id ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                    {formatPlayerName(detailMatch.participant1)}
                  </span>
                  {detailMatch.sets.length > 0 && (
                    <div className="flex gap-2">
                      {detailMatch.sets.map(s => (
                        <span key={s.setNumber} className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-black">
                          {s.score1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-sm ${detailMatch.winnerId === detailMatch.participant2?.id ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                    {formatPlayerName(detailMatch.participant2)}
                  </span>
                  {detailMatch.sets.length > 0 && (
                    <div className="flex gap-2">
                      {detailMatch.sets.map(s => (
                        <span key={s.setNumber} className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-black">
                          {s.score2}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setDetailMatch(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
