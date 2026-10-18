// Hashing function that provides better distribution for CUIDs by reversing the string
// so the highly-variable random suffix is hashed first, preventing clustering.
function getHash(str: string): number {
  let hash = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// 16 distinct, high-contrast, visually separated color themes (interleaved hues)
const THEMES = [
  { name: 'blue', borderL: 'border-l-blue-600', dot: 'bg-blue-500', statusCompleted: 'bg-blue-600', statusInProgress: 'bg-blue-400', statusScheduled: 'bg-blue-200', headerCompleted: 'bg-blue-100 text-blue-800 border-blue-200', headerInProgress: 'bg-blue-50 text-blue-600 border-blue-100', headerScheduled: 'bg-white text-blue-500 border-slate-100', winnerBg: 'bg-blue-50/80', winnerBorder: 'border-blue-300', winnerText: 'text-blue-600', bg: 'bg-blue-50 text-blue-700', badge: 'text-blue-700 bg-blue-100/90 border-blue-200' },
  { name: 'orange', borderL: 'border-l-orange-500', dot: 'bg-orange-500', statusCompleted: 'bg-orange-600', statusInProgress: 'bg-orange-400', statusScheduled: 'bg-orange-200', headerCompleted: 'bg-orange-100 text-orange-800 border-orange-200', headerInProgress: 'bg-orange-50 text-orange-600 border-orange-100', headerScheduled: 'bg-white text-orange-500 border-slate-100', winnerBg: 'bg-orange-50/80', winnerBorder: 'border-orange-300', winnerText: 'text-orange-600', bg: 'bg-orange-50 text-orange-700', badge: 'text-orange-700 bg-orange-100/90 border-orange-200' },
  { name: 'emerald', borderL: 'border-l-emerald-600', dot: 'bg-emerald-500', statusCompleted: 'bg-emerald-600', statusInProgress: 'bg-emerald-400', statusScheduled: 'bg-emerald-200', headerCompleted: 'bg-emerald-100 text-emerald-800 border-emerald-200', headerInProgress: 'bg-emerald-50 text-emerald-600 border-emerald-100', headerScheduled: 'bg-white text-emerald-500 border-slate-100', winnerBg: 'bg-emerald-50/80', winnerBorder: 'border-emerald-300', winnerText: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-700', badge: 'text-emerald-700 bg-emerald-100/90 border-emerald-200' },
  { name: 'fuchsia', borderL: 'border-l-fuchsia-600', dot: 'bg-fuchsia-500', statusCompleted: 'bg-fuchsia-600', statusInProgress: 'bg-fuchsia-400', statusScheduled: 'bg-fuchsia-200', headerCompleted: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', headerInProgress: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100', headerScheduled: 'bg-white text-fuchsia-500 border-slate-100', winnerBg: 'bg-fuchsia-50/80', winnerBorder: 'border-fuchsia-300', winnerText: 'text-fuchsia-600', bg: 'bg-fuchsia-50 text-fuchsia-700', badge: 'text-fuchsia-700 bg-fuchsia-100/90 border-fuchsia-200' },
  { name: 'amber', borderL: 'border-l-amber-500', dot: 'bg-amber-500', statusCompleted: 'bg-amber-600', statusInProgress: 'bg-amber-400', statusScheduled: 'bg-amber-200', headerCompleted: 'bg-amber-100 text-amber-800 border-amber-200', headerInProgress: 'bg-amber-50 text-amber-600 border-amber-100', headerScheduled: 'bg-white text-amber-500 border-slate-100', winnerBg: 'bg-amber-50/80', winnerBorder: 'border-amber-300', winnerText: 'text-amber-600', bg: 'bg-amber-50 text-amber-700', badge: 'text-amber-700 bg-amber-100/90 border-amber-200' },
  { name: 'purple', borderL: 'border-l-purple-600', dot: 'bg-purple-500', statusCompleted: 'bg-purple-600', statusInProgress: 'bg-purple-400', statusScheduled: 'bg-purple-200', headerCompleted: 'bg-purple-100 text-purple-800 border-purple-200', headerInProgress: 'bg-purple-50 text-purple-600 border-purple-100', headerScheduled: 'bg-white text-purple-500 border-slate-100', winnerBg: 'bg-purple-50/80', winnerBorder: 'border-purple-300', winnerText: 'text-purple-600', bg: 'bg-purple-50 text-purple-700', badge: 'text-purple-700 bg-purple-100/90 border-purple-200' },
  { name: 'teal', borderL: 'border-l-teal-600', dot: 'bg-teal-500', statusCompleted: 'bg-teal-600', statusInProgress: 'bg-teal-400', statusScheduled: 'bg-teal-200', headerCompleted: 'bg-teal-100 text-teal-800 border-teal-200', headerInProgress: 'bg-teal-50 text-teal-600 border-teal-100', headerScheduled: 'bg-white text-teal-500 border-slate-100', winnerBg: 'bg-teal-50/80', winnerBorder: 'border-teal-300', winnerText: 'text-teal-600', bg: 'bg-teal-50 text-teal-700', badge: 'text-teal-700 bg-teal-100/90 border-teal-200' },
  { name: 'rose', borderL: 'border-l-rose-600', dot: 'bg-rose-500', statusCompleted: 'bg-rose-600', statusInProgress: 'bg-rose-400', statusScheduled: 'bg-rose-200', headerCompleted: 'bg-rose-100 text-rose-800 border-rose-200', headerInProgress: 'bg-rose-50 text-rose-600 border-rose-100', headerScheduled: 'bg-white text-rose-500 border-slate-100', winnerBg: 'bg-rose-50/80', winnerBorder: 'border-rose-300', winnerText: 'text-rose-600', bg: 'bg-rose-50 text-rose-700', badge: 'text-rose-700 bg-rose-100/90 border-rose-200' },
  { name: 'indigo', borderL: 'border-l-indigo-600', dot: 'bg-indigo-500', statusCompleted: 'bg-indigo-600', statusInProgress: 'bg-indigo-400', statusScheduled: 'bg-indigo-200', headerCompleted: 'bg-indigo-100 text-indigo-800 border-indigo-200', headerInProgress: 'bg-indigo-50 text-indigo-600 border-indigo-100', headerScheduled: 'bg-white text-indigo-500 border-slate-100', winnerBg: 'bg-indigo-50/80', winnerBorder: 'border-indigo-300', winnerText: 'text-indigo-600', bg: 'bg-indigo-50 text-indigo-700', badge: 'text-indigo-700 bg-indigo-100/90 border-indigo-200' },
  { name: 'lime', borderL: 'border-l-lime-500', dot: 'bg-lime-500', statusCompleted: 'bg-lime-600', statusInProgress: 'bg-lime-400', statusScheduled: 'bg-lime-200', headerCompleted: 'bg-lime-100 text-lime-800 border-lime-200', headerInProgress: 'bg-lime-50 text-lime-600 border-lime-100', headerScheduled: 'bg-white text-lime-500 border-slate-100', winnerBg: 'bg-lime-50/80', winnerBorder: 'border-lime-300', winnerText: 'text-lime-600', bg: 'bg-lime-50 text-lime-700', badge: 'text-lime-700 bg-lime-100/90 border-lime-200' },
  { name: 'pink', borderL: 'border-l-pink-500', dot: 'bg-pink-500', statusCompleted: 'bg-pink-600', statusInProgress: 'bg-pink-400', statusScheduled: 'bg-pink-200', headerCompleted: 'bg-pink-100 text-pink-800 border-pink-200', headerInProgress: 'bg-pink-50 text-pink-600 border-pink-100', headerScheduled: 'bg-white text-pink-500 border-slate-100', winnerBg: 'bg-pink-50/80', winnerBorder: 'border-pink-300', winnerText: 'text-pink-600', bg: 'bg-pink-50 text-pink-700', badge: 'text-pink-700 bg-pink-100/90 border-pink-200' },
  { name: 'cyan', borderL: 'border-l-cyan-500', dot: 'bg-cyan-500', statusCompleted: 'bg-cyan-600', statusInProgress: 'bg-cyan-400', statusScheduled: 'bg-cyan-200', headerCompleted: 'bg-cyan-100 text-cyan-800 border-cyan-200', headerInProgress: 'bg-cyan-50 text-cyan-600 border-cyan-100', headerScheduled: 'bg-white text-cyan-500 border-slate-100', winnerBg: 'bg-cyan-50/80', winnerBorder: 'border-cyan-300', winnerText: 'text-cyan-600', bg: 'bg-cyan-50 text-cyan-700', badge: 'text-cyan-700 bg-cyan-100/90 border-cyan-200' },
  { name: 'violet', borderL: 'border-l-violet-600', dot: 'bg-violet-500', statusCompleted: 'bg-violet-600', statusInProgress: 'bg-violet-400', statusScheduled: 'bg-violet-200', headerCompleted: 'bg-violet-100 text-violet-800 border-violet-200', headerInProgress: 'bg-violet-50 text-violet-600 border-violet-100', headerScheduled: 'bg-white text-violet-500 border-slate-100', winnerBg: 'bg-violet-50/80', winnerBorder: 'border-violet-300', winnerText: 'text-violet-600', bg: 'bg-violet-50 text-violet-700', badge: 'text-violet-700 bg-violet-100/90 border-violet-200' },
  { name: 'yellow', borderL: 'border-l-yellow-500', dot: 'bg-yellow-500', statusCompleted: 'bg-yellow-600', statusInProgress: 'bg-yellow-400', statusScheduled: 'bg-yellow-200', headerCompleted: 'bg-yellow-100 text-yellow-800 border-yellow-200', headerInProgress: 'bg-yellow-50 text-yellow-600 border-yellow-100', headerScheduled: 'bg-white text-yellow-500 border-slate-100', winnerBg: 'bg-yellow-50/80', winnerBorder: 'border-yellow-300', winnerText: 'text-yellow-600', bg: 'bg-yellow-50 text-yellow-700', badge: 'text-yellow-700 bg-yellow-100/90 border-yellow-200' },
  { name: 'red', borderL: 'border-l-red-600', dot: 'bg-red-500', statusCompleted: 'bg-red-600', statusInProgress: 'bg-red-400', statusScheduled: 'bg-red-200', headerCompleted: 'bg-red-100 text-red-800 border-red-200', headerInProgress: 'bg-red-50 text-red-600 border-red-100', headerScheduled: 'bg-white text-red-500 border-slate-100', winnerBg: 'bg-red-50/80', winnerBorder: 'border-red-300', winnerText: 'text-red-600', bg: 'bg-red-50 text-red-700', badge: 'text-red-700 bg-red-100/90 border-red-200' },
  { name: 'slate', borderL: 'border-l-slate-700', dot: 'bg-slate-600', statusCompleted: 'bg-slate-700', statusInProgress: 'bg-slate-500', statusScheduled: 'bg-slate-300', headerCompleted: 'bg-slate-200 text-slate-800 border-slate-300', headerInProgress: 'bg-slate-100 text-slate-700 border-slate-200', headerScheduled: 'bg-white text-slate-600 border-slate-100', winnerBg: 'bg-slate-100/80', winnerBorder: 'border-slate-300', winnerText: 'text-slate-700', bg: 'bg-slate-100 text-slate-800', badge: 'text-slate-700 bg-slate-200 border-slate-300' }
];

export function getCategoryTheme(categoryId: string, index?: number) {
  if (typeof index === 'number' && index >= 0) {
    return THEMES[index % THEMES.length];
  }
  const hash = getHash(categoryId);
  return THEMES[hash % THEMES.length];
}

export function getCategoryColor(categoryId: string, index?: number) {
  return getCategoryTheme(categoryId, index).borderL;
}

export function getCategoryColorBg(categoryId: string, index?: number) {
  return getCategoryTheme(categoryId, index).bg;
}

export function getCategoryBadge(categoryId: string, index?: number) {
  return getCategoryTheme(categoryId, index).badge;
}

export function getCategoryDot(categoryId: string, index?: number) {
  return getCategoryTheme(categoryId, index).dot;
}
