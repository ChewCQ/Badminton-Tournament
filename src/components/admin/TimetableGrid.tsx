"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { reassignMatch } from "@/lib/actions/schedule";
import { updateCourtName } from "@/lib/actions/court";
import { Users, AlertCircle, MapPin, Loader2, Sparkles, Link as LinkIcon, X, Clock, Info, Edit2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { AutoScheduleModal } from "./AutoScheduleModal";
import { ScoreEntryModal } from "./ScoreEntryModal";
import { getCategoryColor, getCategoryColorBg } from "@/lib/utils/colors";
import { generateMatchCodePrefix } from "@/lib/utils/matchCode";
import { LocalTime } from "@/components/LocalTime";

// Types
interface Participant { id: string; name: string; teamName?: string | null; }
interface Category { name: string; id: string; bestOf: number }
interface MatchSet {
  setNumber: number;
  score1: number;
  score2: number;
}
interface Match {
  id: string;
  roundNumber: number;
  bracketRound: number | null;
  scheduledStartTime: Date | null;
  scheduledEndTime: Date | null;
  courtId: string | null;
  court: { name: string } | null;
  status: string;
  participant1: Participant | null;
  participant2: Participant | null;
  category: Category;
  sets: MatchSet[];
}
interface Court {
  id: string;
  name: string;
}

export function TimetableGrid({
  matches,
  courts,
  tournamentId,
  tournamentStartDate,
  isReadOnly = false,
}: {
  matches: Match[];
  courts: Court[];
  tournamentId: string;
  tournamentStartDate: Date;
  isReadOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editingCourtName, setEditingCourtName] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract unique categories from matches for the modal
  const uniqueCategories = Array.from(new Set(matches.map(m => m.category.name))).map(name => {
    const catMatches = matches.filter(m => m.category.name === name);
    return {
      id: catMatches[0].category.id,
      name: name,
      count: catMatches.length
    }
  });

  // Compute match codes: group matches by category, sort chronologically, assign numbers
  const matchCodeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    // Group all matches by categoryId
    const byCat = new Map<string, Match[]>();
    for (const m of matches) {
      const catId = m.category.id;
      if (!byCat.has(catId)) byCat.set(catId, []);
      byCat.get(catId)!.push(m);
    }
    // For each category, sort by scheduledStartTime (nulls last), then assign numbers
    for (const [catId, catMatches] of byCat) {
      const prefix = generateMatchCodePrefix(catMatches[0].category.name);
      const sorted = [...catMatches].sort((a, b) => {
        const ta = a.scheduledStartTime ? new Date(a.scheduledStartTime).getTime() : Infinity;
        const tb = b.scheduledStartTime ? new Date(b.scheduledStartTime).getTime() : Infinity;
        return ta - tb;
      });
      sorted.forEach((m, idx) => {
        map.set(m.id, `${prefix}-${idx + 1}`);
      });
    }
    return map;
  }, [matches]);
  const START_HOUR = 8;
  const END_HOUR = 20;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;
  
  // UX Configuration
  const PIXELS_PER_MINUTE = 6; // 120px for 20 mins, 180px for 30 mins
  const TIMELINE_WIDTH = TOTAL_MINUTES * PIXELS_PER_MINUTE;

  // Generate hour markers
  const hourMarkers = Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => START_HOUR + i);

  // Helper to calculate X position and width in pixels
  // IMPORTANT: JavaScript Date.getHours() already returns LOCAL time.
  // Do NOT manually apply timezoneOffset — that would double-convert!
  const getStyleForMatch = (start: Date, end: Date) => {
    const s = new Date(start);
    const e = new Date(end);

    const startMinutes = (s.getHours() - START_HOUR) * 60 + s.getMinutes();
    const durationMinutes = (e.getTime() - s.getTime()) / 60000;

    const leftPx = Math.max(0, startMinutes * PIXELS_PER_MINUTE);
    const widthPx = Math.max(40, durationMinutes * PIXELS_PER_MINUTE); // min 40px width

    return {
      left: `${leftPx}px`,
      width: `${widthPx}px`,
    };
  };

  // Auto-scroll to the earliest match on mount
  useEffect(() => {
    if (scrollContainerRef.current && scheduledMatches.length > 0) {
      const earliest = scheduledMatches.reduce((min, m) =>
        m.scheduledStartTime! < min.scheduledStartTime! ? m : min
      );
      if (earliest.scheduledStartTime) {
        const s = new Date(earliest.scheduledStartTime);
        const minutesFromStart = (s.getHours() - START_HOUR) * 60 + s.getMinutes();
        const scrollPx = Math.max(0, minutesFromStart * PIXELS_PER_MINUTE - 50); // 50px padding
        scrollContainerRef.current.scrollLeft = scrollPx;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Colors are now imported from @/lib/utils/colors

  const getPlayerLabel = (p: Participant | null, match: Match) => {
    if (p) {
      const prefix = p.teamName ? `[${p.teamName}] ` : "";
      return `${prefix}${p.name}`;
    }
    return "TBA";
  };

  const getRoundName = (match: Match) => {
    if (match.bracketRound === null || match.bracketRound === undefined) {
      return `Round ${match.roundNumber}`;
    }
    
    const catMatches = matches.filter(m => m.category.id === match.category.id && m.bracketRound !== null);
    if (catMatches.length === 0) return `Round ${match.roundNumber}`;
    
    const maxRound = Math.max(...catMatches.map(m => m.bracketRound as number));
    const roundsFromFinal = maxRound - match.bracketRound;
    
    if (roundsFromFinal === 0) return "Final";
    if (roundsFromFinal === 1) return "Semifinal";
    if (roundsFromFinal === 2) return "Quarterfinal";
    
    const playersInRound = Math.pow(2, roundsFromFinal + 1);
    return `Round of ${playersInRound}`;
  };

  const getShortRoundName = (match: Match) => {
    if (match.bracketRound === null || match.bracketRound === undefined) {
      return `R${match.roundNumber}`;
    }
    
    const catMatches = matches.filter(m => m.category.id === match.category.id && m.bracketRound !== null);
    if (catMatches.length === 0) return `R${match.roundNumber}`;
    
    const maxRound = Math.max(...catMatches.map(m => m.bracketRound as number));
    const roundsFromFinal = maxRound - match.bracketRound;
    
    if (roundsFromFinal === 0) return "Final";
    if (roundsFromFinal === 1) return "SF";
    if (roundsFromFinal === 2) return "QF";
    
    const playersInRound = Math.pow(2, roundsFromFinal + 1);
    return `R${playersInRound}`;
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, matchId: string) => {
    e.dataTransfer.setData("matchId", matchId);
    
    // Crucial UX fix: calculate where the mouse grabbed the box relative to its left edge
    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffset = e.clientX - rect.left;
    e.dataTransfer.setData("grabOffset", grabOffset.toString());
    
    e.dataTransfer.effectAllowed = "move";
    // Native DOM manipulation to avoid React re-renders during drag (smoothness)
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = "0.4";
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnterZone = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.05)"; // lighter hover
    }
  };

  const handleDragLeaveZone = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = "transparent";
    }
  };

  const handleDropOnCourt = (e: React.DragEvent, courtId: string) => {
    e.preventDefault();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = "transparent";
    }

    const matchId = e.dataTransfer.getData("matchId");
    const grabOffsetStr = e.dataTransfer.getData("grabOffset");
    if (!matchId) return;

    const grabOffset = parseInt(grabOffsetStr || "0", 10);

    // Calculate exact time based on the visual left edge of the box, not just the mouse!
    const trackRect = e.currentTarget.getBoundingClientRect();
    const rawDropX = e.clientX - grabOffset - trackRect.left;
    const dropX = Math.max(0, rawDropX);
    
    // Convert pixels back to minutes
    const totalMins = Math.round(dropX / PIXELS_PER_MINUTE);
    // Optional: snap to nearest 5 minutes for cleanliness, but keep it mostly "free"
    const snappedMins = Math.round(totalMins / 5) * 5;
    
    const dropHour = START_HOUR + Math.floor(snappedMins / 60);
    const dropMinute = snappedMins % 60;

    // Create the drop date using the tournament's actual date, not "today"
    const tourneyDate = new Date(tournamentStartDate);
    const newStart = new Date(
      tourneyDate.getFullYear(),
      tourneyDate.getMonth(),
      tourneyDate.getDate(),
      dropHour,
      dropMinute,
      0,
      0
    );
    // JavaScript Date constructor with local args already stores correct UTC epoch internally.
    // No manual timezone conversion needed — just send it directly.

    // Validate Overlap locally before sending to server
    const dropStartMs = newStart.getTime();
    
    // Estimate dragged match duration
    const draggedMatch = matches.find(m => m.id === matchId);
    let durationMins = 30; // fallback
    if (draggedMatch?.scheduledStartTime && draggedMatch?.scheduledEndTime) {
      durationMins = (draggedMatch.scheduledEndTime.getTime() - draggedMatch.scheduledStartTime.getTime()) / 60000;
    } else {
      // In case we are dragging from the queue and it doesn't have start/end yet
      // We assume it's roughly 20-30 mins, but the backend uses the exact tournament duration.
      // We'll use 20 as a safe default for overlap checking if unknown.
      durationMins = 20; 
    }
    
    const dropEndMs = dropStartMs + durationMins * 60000;

    startTransition(async () => {
      const res = await reassignMatch(matchId, courtId, newStart, tournamentId, false);
      if (res && res.requiresConfirmation) {
        if (window.confirm(res.warning)) {
          await reassignMatch(matchId, courtId, newStart, tournamentId, true);
        }
      } else if (res && !res.success) {
        alert(res.error || "Failed to assign match");
      }
      router.refresh();
    });
  };

  const handleDropOnQueue = (e: React.DragEvent) => {
    e.preventDefault();
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;

    startTransition(async () => {
      await reassignMatch(matchId, null, null, tournamentId);
      router.refresh();
    });
  };

  const handleCourtNameSave = (courtId: string) => {
    if (!editingCourtName.trim()) {
      setEditingCourtId(null);
      return;
    }
    startTransition(async () => {
      await updateCourtName(courtId, editingCourtName, tournamentId);
      setEditingCourtId(null);
      router.refresh();
    });
  };

  const handleCourtNameKeyDown = (e: React.KeyboardEvent, courtId: string) => {
    if (e.key === "Enter") {
      handleCourtNameSave(courtId);
    } else if (e.key === "Escape") {
      setEditingCourtId(null);
    }
  };

  // Split matches
  const scheduledMatches = matches.filter(m => m.courtId && m.scheduledStartTime && m.scheduledEndTime);
  const queueMatches = matches.filter(m => !m.courtId);

  return (
    <div className="flex flex-col xl:flex-row gap-6 relative">
      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold">
            <Loader2 className="w-5 h-5 animate-spin" />
            Updating Schedule...
          </div>
        </div>
      )}

      {/* Gantt Chart (Left Side) */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="font-black text-lg text-slate-800 tracking-tight">
              {isReadOnly ? "Tournament Schedule" : "Live Court Timetable"}
            </h2>
            {!isReadOnly && (
              <p className="text-xs font-medium text-slate-500 mt-1">Drag matches to reassign courts or adjust times.</p>
            )}
          </div>
        </div>

        {/* Timetable Container with Both Scrolls */}
        <div ref={scrollContainerRef} className="overflow-auto max-h-[70vh] relative w-full pb-4">
          <div 
            className="relative" 
            style={{ width: `${TIMELINE_WIDTH + 150}px` }} // +150px for the sticky court labels
          >
            
            {/* X-Axis Header (Hours & Minutes) */}
            <div className="flex border-b border-slate-200 bg-slate-50/95 backdrop-blur sticky top-0 z-30 h-10 ml-[150px]">
              <div className="relative w-full h-full">
                {Array.from({ length: TOTAL_HOURS * 4 }).map((_, i) => {
                  const h = START_HOUR + Math.floor(i / 4);
                  const m = (i % 4) * 15;
                  const leftPx = (h - START_HOUR) * 60 * PIXELS_PER_MINUTE + m * PIXELS_PER_MINUTE;
                  
                  if (m === 0) {
                    return (
                      <div 
                        key={`${h}:${m}`} 
                        className="absolute top-0 bottom-0 border-l border-slate-300 pl-1.5 pt-1.5"
                        style={{ left: `${leftPx}px` }}
                      >
                        <span className="text-[11px] font-black text-slate-600">{h}:00</span>
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        key={`${h}:${m}`} 
                        className="absolute top-0 bottom-0 border-l border-slate-200 pl-1 pt-3.5"
                        style={{ left: `${leftPx}px` }}
                      >
                        <span className="text-[9px] font-bold text-slate-400">:{m}</span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* Y-Axis Grid (Courts) */}
            <div className="divide-y divide-slate-100">
              {courts.map(court => {
                const courtMatches = scheduledMatches.filter(m => m.courtId === court.id);

                return (
                  <div key={court.id} className="flex relative group min-h-[110px]">
                    {/* Court Label (Sticky Left) */}
                    <div className="w-[150px] sticky left-0 bg-white/95 backdrop-blur-sm border-r border-slate-200 flex flex-col justify-center px-4 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] space-y-2 group/court">
                      {editingCourtId === court.id && !isReadOnly ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            autoFocus
                            type="text"
                            value={editingCourtName}
                            onChange={(e) => setEditingCourtName(e.target.value)}
                            onKeyDown={(e) => handleCourtNameKeyDown(e, court.id)}
                            onBlur={() => handleCourtNameSave(court.id)}
                            className="w-full text-sm font-bold text-slate-800 bg-white border border-indigo-300 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500/50"
                          />
                          <button 
                            onMouseDown={(e) => { e.preventDefault(); handleCourtNameSave(court.id); }}
                            className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="font-bold text-sm text-slate-800 truncate">{court.name}</span>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                setEditingCourtName(court.name);
                                setEditingCourtId(court.id);
                              }}
                              className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover/court:opacity-100 transition-opacity p-1 hover:bg-indigo-50 rounded shrink-0"
                              title="Edit Court Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      {!isReadOnly && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/tournaments/${tournamentId}/umpire/${court.id}`);
                            alert("Umpire link copied to clipboard!");
                          }}
                          className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-1 px-2 rounded-md transition-colors w-full text-center flex items-center justify-center gap-1"
                          title="Copy Umpire Interface Link"
                        >
                          <LinkIcon className="w-3 h-3 shrink-0" /> Copy Link
                        </button>
                      )}
                    </div>

                    {/* Timeline Track */}
                    <div 
                      className="relative flex-1 bg-slate-50/10 transition-colors duration-150"
                      onDragOver={isReadOnly ? undefined : handleDragOver}
                      onDragEnter={isReadOnly ? undefined : handleDragEnterZone}
                      onDragLeave={isReadOnly ? undefined : handleDragLeaveZone}
                      onDrop={isReadOnly ? undefined : (e) => handleDropOnCourt(e, court.id)}
                    >
                      {/* Grid Lines */}
                      {hourMarkers.map((hour) => {
                        const leftPx = (hour - START_HOUR) * 60 * PIXELS_PER_MINUTE;
                        return (
                          <div 
                            key={hour} 
                            className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                            style={{ left: `${leftPx}px` }}
                          />
                        );
                      })}

                      {/* Match Blocks */}
                      {courtMatches.map(match => {
                        const style = getStyleForMatch(match.scheduledStartTime!, match.scheduledEndTime!);
                        const scoreText = match.sets.length > 0 
                          ? match.sets.sort((a,b) => a.setNumber - b.setNumber).map(s => `${s.score1}-${s.score2}`).join(', ')
                          : null;
                        
                        const catColor = getCategoryColor(match.category.id);
                        const isCompleted = match.status === 'COMPLETED' || match.status === 'WALKOVER';

                        return (
                          <div
                            key={match.id}
                            draggable={!isReadOnly}
                            onDragStart={isReadOnly ? undefined : (e) => handleDragStart(e, match.id)}
                            onDragEnd={isReadOnly ? undefined : handleDragEnd}
                            onClick={isReadOnly ? () => {
                              if (match.participant1 && match.participant2) {
                                setSelectedMatch(match);
                              } else {
                                setDetailMatch(match);
                              }
                            } : undefined}
                            onDoubleClick={!isReadOnly ? () => {
                              if (match.participant1 && match.participant2) {
                                setSelectedMatch(match);
                              } else {
                                setDetailMatch(match);
                              }
                            } : undefined}
                            className={`absolute top-2 bottom-2 rounded-lg shadow-sm border-y border-r border-l-[6px] px-2 py-1.5 overflow-hidden z-10 transition-all
                              ${isReadOnly ? '' : 'cursor-grab active:cursor-grabbing hover:shadow-md'}
                              ${catColor}
                              ${isCompleted ? 'bg-slate-50 border-y-slate-200 border-r-slate-200 opacity-80' : 'bg-white border-y-slate-200 border-r-slate-200 hover:bg-slate-50'}
                            `}
                            style={style}
                            title={isReadOnly ? match.category.name : "Double-click to enter score"}
                          >
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate mb-1">
                              {match.category.name} • {getShortRoundName(match)}
                            </div>
                            <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                              {getPlayerLabel(match.participant1, match)}
                            </div>
                            <div className="text-[10px] font-medium text-slate-300 ml-1 my-px truncate flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-slate-300" /> vs
                            </div>
                            <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                              {getPlayerLabel(match.participant2, match)}
                            </div>
                            {scoreText && (
                              <div className="text-[9px] font-bold text-emerald-600 mt-1 truncate border-t border-slate-100 pt-1">
                                {scoreText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Sidebar: Match Queue */}
      {!isReadOnly && (
        <div 
          className="w-full xl:w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm h-[calc(100vh-8rem)] sticky top-8 flex flex-col overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={handleDropOnQueue}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-lg text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Unscheduled Queue
              </h2>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Schedule Timeline
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
            {queueMatches.length === 0 ? (
              <div className="text-center py-10 px-4">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">No unscheduled matches.</p>
              </div>
            ) : (
              queueMatches.map((match) => {
                const catColor = getCategoryColor(match.category.id);
                const catBg = getCategoryColorBg(match.category.id);

                return (
                  <div 
                    key={match.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, match.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border-y border-r border-slate-200 border-l-[6px] hover:border-r-indigo-300 hover:border-y-indigo-300 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${catColor}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${catBg}`}>
                        {match.category.name}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase">
                        {getShortRoundName(match)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 mt-3">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {getPlayerLabel(match.participant1, match)}
                      </div>
                      <div className="text-xs font-bold text-slate-400 ml-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" /> vs
                      </div>
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {getPlayerLabel(match.participant2, match)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <AutoScheduleModal 
        tournamentId={tournamentId}
        categories={uniqueCategories}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {selectedMatch && (
        <ScoreEntryModal
          match={selectedMatch}
          tournamentId={tournamentId}
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          matchCode={matchCodeMap.get(selectedMatch.id)}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Detail Popup for future matches without both participants */}
      {detailMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white relative">
              <div className="absolute top-4 right-4 flex items-center gap-3">
                {matchCodeMap.get(detailMatch.id) && (
                  <span className="bg-white/25 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-black tracking-wider border border-white/20 shadow-lg">
                    {matchCodeMap.get(detailMatch.id)}
                  </span>
                )}
                <button onClick={() => setDetailMatch(null)} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">{detailMatch.category.name} • {getRoundName(detailMatch)}</p>
              <h2 className="text-xl font-black tracking-tight mt-1">Upcoming Match</h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium">
                  This match is waiting for earlier round results. Participants will be determined once their preceding matches are completed.
                </p>
              </div>

              {/* Matchup */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-slate-200 text-[10px] font-black text-slate-500 flex items-center justify-center">1</div>
                  <span className={`text-sm font-bold ${detailMatch.participant1 ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {detailMatch.participant1?.name || 'TBA'}
                  </span>
                </div>
                <div className="flex items-center gap-3 pl-2">
                  <span className="text-[10px] font-black text-slate-300 uppercase">vs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-slate-200 text-[10px] font-black text-slate-500 flex items-center justify-center">2</div>
                  <span className={`text-sm font-bold ${detailMatch.participant2 ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {detailMatch.participant2?.name || 'TBA'}
                  </span>
                </div>
              </div>

              {/* Court & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Court</p>
                    <p className="text-sm font-bold text-slate-800">{detailMatch.court?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Time</p>
                    <p className="text-sm font-bold text-slate-800">
                      {detailMatch.scheduledStartTime ? <LocalTime date={detailMatch.scheduledStartTime} /> : 'TBA'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setDetailMatch(null)}
                className="py-2.5 px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-sm shadow-sm"
              >
                Close
              </button>
              {isReadOnly && (
                <button
                  onClick={() => {
                    setDetailMatch(null);
                    router.push(`/tournaments/${tournamentId}/draws/${detailMatch.category.id}`);
                  }}
                  className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-sm shadow-md flex items-center gap-2"
                >
                  View in Draw
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
