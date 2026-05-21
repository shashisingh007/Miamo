'use client';

import { motion } from 'framer-motion';
import { X, Hash, AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
 COMPATIBILITY RESULTS MODAL
 ═══════════════════════════════════════════════════════════ */
export function CompatibilityModal({ data, onClose }: { data: any; onClose: () => void }) {
 if (!data) return null;
 const { compositeScore, kundli, numerology, partnerName } = data;
 const scoreColor = compositeScore >= 75 ? 'text-emerald-500' : compositeScore >= 55 ? 'text-amber-500' : compositeScore >= 40 ? 'text-orange-500' : 'text-red-500';
 const scoreBg = compositeScore >= 75 ? 'from-emerald-500' : compositeScore >= 55 ? 'from-amber-500' : compositeScore >= 40 ? 'from-orange-500' : 'from-red-500';

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
 <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
 className="bg-miamo-card rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl"
 onClick={(e: any) => e.stopPropagation()}>
 <div className="p-6 space-y-5">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-500" /> Compatibility Report</h2>
 <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X className="w-4 h-4 text-zinc-600" /></button>
 </div>
 <p className="text-sm text-zinc-500">Match with <span className="font-semibold text-zinc-800">{partnerName}</span></p>

 {/* Composite Score */}
 <div className="text-center py-6 bg-zinc-50 rounded-2xl border border-zinc-100">
 <div className={`text-5xl font-black ${scoreColor}`}>{compositeScore}%</div>
 <p className="text-sm text-zinc-500 mt-2">Overall Compatibility</p>
 <div className="w-48 h-2 bg-zinc-200 rounded-full mx-auto mt-3 overflow-hidden">
 <div className={`h-full rounded-full bg-gradient-to-r ${scoreBg} to-transparent`} style={{ width: `${compositeScore}%` }} />
 </div>
 </div>

 {/* Ashtakoota */}
 {kundli && (
 <div className="space-y-3">
 <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">🕉 Ashtakoota — {kundli.totalPoints}/{kundli.maxPoints} Points</h3>
 <p className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg inline-block',
 kundli.level === 'excellent' ? 'bg-emerald-50 text-emerald-700' : kundli.level === 'good' ? 'bg-amber-50 text-amber-700' : kundli.level === 'average' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
 )}>{kundli.verdict}</p>
 <div className="space-y-2">
 {kundli.koots?.map((k: any) => (
 <div key={k.name} className="flex items-center gap-3">
 <span className="text-xs font-semibold text-zinc-700 w-24">{k.name}</span>
 <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${(k.score / k.max) * 100}%` }} />
 </div>
 <span className="text-xs font-bold text-zinc-600 w-10 text-right">{k.score}/{k.max}</span>
 </div>
 ))}
 </div>

 {/* Insights from Ashtakoota analysis */}
 {kundli.insights && kundli.insights.length > 0 && (
 <div className="mt-3 space-y-2">
 <h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">💡 Insights</h4>
 {kundli.insights.map((insight: string, idx: number) => {
 const isWarning = insight.startsWith('⚠️');
 const isPositive = insight.startsWith('✨');
 return (
 <div key={idx} className={cn('flex items-start gap-2 rounded-xl p-3 border',
 isWarning ? 'bg-orange-50 border-orange-200' : isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-100'
 )}>
 <span className={cn('text-xs mt-0.5', isWarning ? 'text-orange-500' : isPositive ? 'text-emerald-500' : 'text-indigo-500')}>{isWarning ? '⚠️' : isPositive ? '✨' : '•'}</span>
 <p className={cn('text-xs leading-relaxed', isWarning ? 'text-orange-700' : isPositive ? 'text-emerald-700' : 'text-indigo-700')}>{isWarning || isPositive ? insight.slice(2).trim() : insight}</p>
 </div>
 );
 })}
 </div>
 )}

 {kundli.manglikWarning && (
 <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
 <p className="text-xs text-orange-700"><span className="font-bold">Manglik Dosha:</span> One partner is Manglik. Consider remedies.</p>
 </div>
 )}
 {kundli.gotraConflict && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
 <p className="text-xs text-red-700"><span className="font-bold">Same Gotra:</span> Marriage within same gotra is traditionally not recommended.</p>
 </div>
 )}
 </div>
 )}

 {/* Numerology */}
 {numerology && (
 <div className="space-y-3 pt-3 border-t border-zinc-200">
 <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Hash className="w-4 h-4 text-purple-500" /> Numerology Match — {numerology.score}%</h3>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
 <p className="text-2xl font-black text-purple-600">{numerology.myNumber}</p>
 <p className="text-[10px] text-purple-500 font-semibold mt-1">Your Life Path</p>
 </div>
 <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
 <p className="text-2xl font-black text-indigo-600">{numerology.partnerNumber}</p>
 <p className="text-[10px] text-indigo-500 font-semibold mt-1">Partner Life Path</p>
 </div>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 );
}
