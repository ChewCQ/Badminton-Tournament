"use client";

import React, { useState } from 'react';
import { GitMerge, X, Clock, Calendar, MapPin, Trophy, Activity, Award, Info } from 'lucide-react';
import { ScoreEntryModal } from './ScoreEntryModal';
import { LocalTime } from '@/components/LocalTime';
import { getCategoryTheme } from '@/lib/utils/colors';
import { generateMatchCodePrefix } from '@/lib/utils/matchCode';

interface Participant {
  id: string;
  name: string;
  teamName?: string | null;
  seed: number | null;
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
  status: string;
  winnerId: string | null;
  participant1: Participant | null;
  participant2: Participant | null;
  category: { id: string; name: string; bestOf: number };
  sets: MatchSet[];
  court: { name: string } | null;
  scheduledStartTime: Date | null;
}

export function BracketTree({ matches, tournamentId, readOnly = false }: { matches: Match[]; tournamentId: string; readOnly?: boolean }) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<Match | null>(null);
  const [futureDetailMatch, setFutureDetailMatch] = useState<Match | null>(null);

  // Compute match codes for this category's matches
  const matchCodeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (matches.length === 0) return map;
    const prefix = generateMatchCodePrefix(matches[0].category.name);
    const sorted = [...matches].sort((a, b) => {
      const ta = a.scheduledStartTime ? new Date(a.scheduledStartTime).getTime() : Infinity;
      const tb = b.scheduledStartTime ? new Date(b.scheduledStartTime).getTime() : Infinity;
      return ta - tb;
    });
    sorted.forEach((m, idx) => {
      map.set(m.id, `${prefix}-${idx + 1}`);
    });
    return map;
  }, [matches]);

  // getCategoryTheme is now imported from @/lib/utils/colors

  // Filter only knockout matches and group by bracketRound
  const knockoutMatches = matches.filter(m => m.bracketRound !== null);
  
  if (knockoutMatches.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <GitMerge className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">No Bracket Generated</h3>
        <p className="text-slate-500">Generate the draw first to view the bracket tree.</p>
      </div>
    );
  }

  const maxRound = Math.max(...knockoutMatches.map(m => m.bracketRound as number));
  
  const columns: Match[][] = [];
  for (let i = 1; i <= maxRound; i++) {
    const roundMatches = knockoutMatches
      .filter(m => m.bracketRound === i)
      .sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
    columns.push(roundMatches);
  }

  const getPlayerLabel = (p: Participant | null, match: Match) => {
    if (!p) {
      return "TBA";
    }
    const prefix = p.teamName ? `[${p.teamName}] ` : "";
    return `${prefix}${p.name}`;
  };

  const getRoundName = (colIndex: number, totalCols: number) => {
    const roundsFromFinal = totalCols - 1 - colIndex;
    if (roundsFromFinal === 0) return "Final";
    if (roundsFromFinal === 1) return "Semifinals";
    if (roundsFromFinal === 2) return "Quarterfinals";
    const playersInRound = Math.pow(2, roundsFromFinal + 1);
    return `Round of ${playersInRound}`;
  };

  // Format set scores as a compact string like "21-15, 18-21, 21-17"
  const formatSetScores = (sets: MatchSet[]) => {
    if (sets.length === 0) return null;
    return sets
      .sort((a, b) => a.setNumber - b.setNumber)
      .map(s => `${s.score1}-${s.score2}`)
      .join(', ');
  };

  const canEditScore = (match: Match) => {
    return match.participant1 !== null && match.participant2 !== null && match.status !== 'BYE';
  };

  return (
    <>
      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 overflow-x-auto">
        <div className="flex min-w-max">
          {columns.map((roundMatches, colIndex) => {
            const isFinal = colIndex === columns.length - 1;
            const roundName = getRoundName(colIndex, columns.length);
            
            return (
              <div 
                key={`round-${colIndex}`} 
                className="flex flex-col justify-around w-72 relative"
              >
                {/* Round Header */}
                <div className="absolute -top-6 left-0 right-0 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
                  {roundName}
                </div>

                {roundMatches.map((match, rowIndex) => {
                  const isTopSlot = rowIndex % 2 === 0;
                  const scoreText = formatSetScores(match.sets);
                  const isCardClickable = !readOnly ? canEditScore(match) : true;
                  const theme = getCategoryTheme(match.category.id);

                  return (
                    <div 
                      key={match.id} 
                      className="relative flex items-center justify-center w-full"
                      style={{ height: `${Math.pow(2, colIndex) * 120}px` }}
                    >
                      {/* Horizontal line entering the card from the left */}
                      {colIndex > 0 && (
                        <div className="absolute top-1/2 left-0 w-8 border-t-[3px] border-slate-200" />
                      )}

                      {/* The Match Card */}
                      <div 
                        onClick={() => {
                          if (!readOnly) {
                            if (canEditScore(match)) {
                              setSelectedMatch(match);
                            } else {
                              setFutureDetailMatch(match);
                            }
                          } else {
                            setSelectedDetailMatch(match);
                          }
                        }}
                        className={`w-56 bg-white border border-y-slate-200 border-r-slate-200 border-l-[6px] rounded-lg shadow-sm overflow-hidden z-10 flex flex-col relative transition-all
                          ${theme.borderL}
                          cursor-pointer hover:shadow-md hover:border-r-slate-300 hover:border-y-slate-300 hover:-translate-y-0.5
                          ${match.status === 'COMPLETED' ? 'opacity-95' : ''}
                        `}
                      >
                        {/* Status indicator */}
                        <div className={`h-1.5 w-full ${
                          match.status === 'COMPLETED' ? theme.statusCompleted 
                          : match.status === 'IN_PROGRESS' ? theme.statusInProgress
                          : match.status === 'BYE' ? 'bg-slate-200' 
                          : theme.statusScheduled
                        }`} />
                        
                        {/* Court / Time Header */}
                        {match.court && match.scheduledStartTime && (
                          <div className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-center border-b ${
                            match.status === 'COMPLETED' ? theme.headerCompleted
                            : match.status === 'IN_PROGRESS' ? theme.headerInProgress
                            : theme.headerScheduled
                          }`}>
                            {match.court.name} • <LocalTime date={match.scheduledStartTime} />
                          </div>
                        )}
                        
                        <div className="flex flex-col divide-y divide-slate-100">
                          {/* Participant 1 */}
                          {(() => {
                            const isWinner = match.winnerId && match.participant1 && match.winnerId === match.participant1.id;
                            const isLoser = match.winnerId && match.participant1 && match.winnerId !== match.participant1.id;
                            return (
                              <div className={`px-3 py-2.5 flex items-center gap-2 ${isWinner ? theme.winnerBg : 'bg-slate-50/50'}`}>
                                <div className={`w-5 h-5 rounded flex items-center justify-center bg-white border ${isWinner ? `${theme.winnerBorder} ${theme.winnerText}` : 'border-slate-200 text-slate-400'} text-[9px] font-black flex-shrink-0`}>
                                  {match.participant1?.seed || '-'}
                                </div>
                                <span className={`text-xs truncate flex-1 ${!match.participant1 ? 'text-slate-400 italic' : isWinner ? 'text-slate-900 font-black' : isLoser ? 'text-slate-400 font-semibold' : 'text-slate-800 font-bold'}`}>
                                  {getPlayerLabel(match.participant1, match)}
                                </span>
                                {/* Inline set scores for P1 */}
                                {scoreText && (
                                  <span className={`text-[9px] font-black flex-shrink-0 ${isWinner ? theme.winnerText : isLoser ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {match.sets.sort((a,b) => a.setNumber - b.setNumber).map(s => s.score1).join(' ')}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          
                          {/* Participant 2 */}
                          {(() => {
                            const isWinner = match.winnerId && match.participant2 && match.winnerId === match.participant2.id;
                            const isLoser = match.winnerId && match.participant2 && match.winnerId !== match.participant2.id;
                            return (
                              <div className={`px-3 py-2.5 flex items-center gap-2 ${isWinner ? theme.winnerBg : 'bg-white'}`}>
                                <div className={`w-5 h-5 rounded flex items-center justify-center bg-white border ${isWinner ? `${theme.winnerBorder} ${theme.winnerText}` : 'border-slate-200 text-slate-400'} text-[9px] font-black flex-shrink-0`}>
                                  {match.participant2?.seed || '-'}
                                </div>
                                <span className={`text-xs truncate flex-1 ${!match.participant2 ? 'text-slate-400 italic' : isWinner ? 'text-slate-900 font-black' : isLoser ? 'text-slate-400 font-semibold' : 'text-slate-800 font-bold'}`}>
                                  {getPlayerLabel(match.participant2, match)}
                                </span>
                                {scoreText && (
                                  <span className={`text-[9px] font-black flex-shrink-0 ${isWinner ? theme.winnerText : isLoser ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {match.sets.sort((a,b) => a.setNumber - b.setNumber).map(s => s.score2).join(' ')}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Connecting Lines exiting to the right */}
                      {!isFinal && (
                        <>
                          <div className="absolute top-1/2 right-0 w-8 border-t-[3px] border-indigo-200" />
                          <div 
                            className={`absolute right-0 w-[3px] bg-indigo-200 ${
                              isTopSlot 
                                ? "top-1/2 bottom-0"
                                : "top-0 bottom-1/2"
                            }`} 
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Entry Modal */}
      {selectedMatch && (
        <ScoreEntryModal
          match={selectedMatch}
          tournamentId={tournamentId}
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          matchCode={matchCodeMap.get(selectedMatch.id)}
        />
      )}

      {/* Public Match Details Modal */}
      {selectedDetailMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header with gradient status */}
            <div className={`p-6 text-white relative ${
              selectedDetailMatch.status === 'COMPLETED' ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
              : selectedDetailMatch.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
              : 'bg-gradient-to-r from-slate-700 to-slate-800'
            }`}>
              <button 
                onClick={() => setSelectedDetailMatch(null)} 
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black uppercase tracking-widest text-white/90">
                  {selectedDetailMatch.category.name}
                </span>
                <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-black uppercase tracking-widest text-white/90">
                  {getRoundName(selectedDetailMatch.bracketRound ? selectedDetailMatch.bracketRound - 1 : 0, columns.length)}
                </span>
              </div>
              
              <h2 className="text-2xl font-black tracking-tight mt-2">Match Details</h2>
              
              {/* Status Badge */}
              <div className="mt-3 flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full w-max text-xs font-bold">
                {selectedDetailMatch.status === 'COMPLETED' && (
                  <><Trophy className="w-3.5 h-3.5" /> Completed</>
                )}
                {selectedDetailMatch.status === 'IN_PROGRESS' && (
                  <><Activity className="w-3.5 h-3.5 animate-pulse" /> Live in Progress</>
                )}
                {selectedDetailMatch.status === 'SCHEDULED' && (
                  <><Clock className="w-3.5 h-3.5" /> Scheduled</>
                )}
                {selectedDetailMatch.status === 'BYE' && (
                  <>Bye</>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Timing and Court Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3.5 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Court</p>
                    <p className="text-sm font-bold text-slate-800">{selectedDetailMatch.court?.name ?? "TBA"}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3.5 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scheduled Time</p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedDetailMatch.scheduledStartTime ? (
                        <LocalTime date={selectedDetailMatch.scheduledStartTime} />
                      ) : (
                        "TBA"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Competitors & Sets Scoreboard */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Scoreboard (Best of {selectedDetailMatch.category.bestOf})</p>
                
                {/* Competitor 1 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedDetailMatch.winnerId && selectedDetailMatch.participant1 && selectedDetailMatch.winnerId === selectedDetailMatch.participant1.id ? (
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-200/60 text-[9px] font-black text-slate-500 flex items-center justify-center shrink-0">
                        {selectedDetailMatch.participant1?.seed || "-"}
                      </div>
                    )}
                    <span className={`text-sm truncate ${
                      selectedDetailMatch.winnerId && selectedDetailMatch.participant1 && selectedDetailMatch.winnerId === selectedDetailMatch.participant1.id 
                        ? "text-slate-900 font-extrabold" 
                        : "text-slate-700 font-bold"
                    }`}>
                      {getPlayerLabel(selectedDetailMatch.participant1, selectedDetailMatch)}
                    </span>
                  </div>

                  {/* Sets Score */}
                  <div className="flex gap-2">
                    {selectedDetailMatch.sets.length > 0 ? (
                      selectedDetailMatch.sets.sort((a,b) => a.setNumber - b.setNumber).map(set => (
                        <div 
                          key={set.setNumber} 
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black ${
                            set.score1 > set.score2 
                              ? "bg-indigo-600 text-white" 
                              : "bg-slate-200/50 text-slate-500"
                          }`}
                        >
                          {set.score1}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold italic">No scores yet</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 my-2" />

                {/* Competitor 2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedDetailMatch.winnerId && selectedDetailMatch.participant2 && selectedDetailMatch.winnerId === selectedDetailMatch.participant2.id ? (
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-200/60 text-[9px] font-black text-slate-500 flex items-center justify-center shrink-0">
                        {selectedDetailMatch.participant2?.seed || "-"}
                      </div>
                    )}
                    <span className={`text-sm truncate ${
                      selectedDetailMatch.winnerId && selectedDetailMatch.participant2 && selectedDetailMatch.winnerId === selectedDetailMatch.participant2.id 
                        ? "text-slate-900 font-extrabold" 
                        : "text-slate-700 font-bold"
                    }`}>
                      {getPlayerLabel(selectedDetailMatch.participant2, selectedDetailMatch)}
                    </span>
                  </div>

                  {/* Sets Score */}
                  <div className="flex gap-2">
                    {selectedDetailMatch.sets.length > 0 ? (
                      selectedDetailMatch.sets.sort((a,b) => a.setNumber - b.setNumber).map(set => (
                        <div 
                          key={set.setNumber} 
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black ${
                            set.score2 > set.score1 
                              ? "bg-indigo-600 text-white" 
                              : "bg-slate-200/50 text-slate-500"
                          }`}
                        >
                          {set.score2}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold italic">No scores yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedDetailMatch(null)}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Future match detail popup */}
      {futureDetailMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white relative">
              <div className="absolute top-4 right-4 flex items-center gap-3">
                {matchCodeMap.get(futureDetailMatch.id) && (
                  <span className="bg-white/25 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-black tracking-wider border border-white/20 shadow-lg">
                    {matchCodeMap.get(futureDetailMatch.id)}
                  </span>
                )}
                <button onClick={() => setFutureDetailMatch(null)} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black uppercase tracking-widest text-white/90">
                  {futureDetailMatch.category.name}
                </span>
                <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-black uppercase tracking-widest text-white/90">
                  {getRoundName(futureDetailMatch.bracketRound ? futureDetailMatch.bracketRound - 1 : 0, columns.length)}
                </span>
              </div>
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
                  <span className={`text-sm font-bold ${futureDetailMatch.participant1 ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {futureDetailMatch.participant1?.name || 'TBA'}
                  </span>
                </div>
                <div className="flex items-center gap-3 pl-2">
                  <span className="text-[10px] font-black text-slate-300 uppercase">vs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-slate-200 text-[10px] font-black text-slate-500 flex items-center justify-center">2</div>
                  <span className={`text-sm font-bold ${futureDetailMatch.participant2 ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {futureDetailMatch.participant2?.name || 'TBA'}
                  </span>
                </div>
              </div>

              {/* Court & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Court</p>
                    <p className="text-sm font-bold text-slate-800">{futureDetailMatch.court?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Time</p>
                    <p className="text-sm font-bold text-slate-800">
                      {futureDetailMatch.scheduledStartTime ? <LocalTime date={futureDetailMatch.scheduledStartTime} /> : 'TBA'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setFutureDetailMatch(null)}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
