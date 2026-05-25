'use client';

import { motion } from 'framer-motion';
import {
 CheckCircle, Hash, GraduationCap, Briefcase, Building,
 Phone, Linkedin, Mail, ChevronRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
 PROFILE CARD — Discover-style for Browse
 ═══════════════════════════════════════════════════════════ */
export function MatrimonialCard({ profile: p, onView }: { profile: any; onView: () => void }) {
 const photo = p.user?.photos?.[0]?.url;
 const up = p.user?.profile;
 const gradient = up?.avatarGradient || 'from-rose-alt to-rose-main';

 return (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
 className="group relative bg-miamo-card rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:shadow-rose-soft transition-all duration-300 cursor-pointer"
 onClick={onView}>
 <div className="relative h-56 overflow-hidden">
 {photo ? (
 <img loading="lazy" src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
 ) : (
 <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-70 flex items-center justify-center`}>
 <span className="text-5xl font-bold text-text-primary/80">{p.fullName?.[0] || '?'}</span>
 </div>
 )}
 <div className="absolute top-3 left-3 flex gap-1.5">
 {p.idVerified && <div className="bg-rose-main/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-text-primary" /><span className="text-[10px] font-bold text-text-primary">Verified</span></div>}
 </div>
 {p.numerologyScore && p.numerologyScore >= 70 && (
 <div className="absolute top-3 right-3 bg-rose-main/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
 <Hash className="w-3 h-3 text-text-primary" /><span className="text-[10px] font-bold text-text-primary">{p.numerologyScore}%</span>
 </div>
 )}
 <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent" />
 <div className="absolute bottom-3 left-3 right-3">
 <h3 className="text-lg font-bold text-text-primary truncate">{p.fullName || p.user?.displayName}</h3>
 <p className="text-xs text-zinc-300">{up?.age ? `${up.age} yrs` : ''} {p.height ? `• ${p.height}` : ''} {p.workingCity ? `• ${p.workingCity}` : ''}</p>
 </div>
 </div>
 <div className="p-4 space-y-3">
 <div className="flex flex-wrap gap-1.5">
 {p.religion && <span className="text-[10px] bg-rose-soft text-rose-dark rounded-full px-2 py-0.5 font-semibold border border-rose-light">{p.religion}</span>}
 {p.caste && <span className="text-[10px] bg-miamo-surface text-rose-dark rounded-full px-2 py-0.5 font-semibold border border-rose-light">{p.caste}</span>}
 {p.motherTongue && <span className="text-[10px] bg-rose-soft text-rose-dark rounded-full px-2 py-0.5 font-semibold border border-rose-light">{p.motherTongue}</span>}
 {p.manglik === 'Yes' && <span className="text-[10px] bg-rose-soft text-rose-dark rounded-full px-2 py-0.5 font-semibold border border-rose-light">Manglik</span>}
 </div>
 <div className="space-y-1 text-xs text-zinc-500">
 {p.education && <div className="flex items-center gap-1.5"><GraduationCap className="w-3 h-3 text-rose-main" /> <span className="text-zinc-700">{p.education}</span></div>}
 {p.occupation && <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-rose-main" /> <span className="text-zinc-700">{p.occupation}{p.company ? ` at ${p.company}` : ''}</span></div>}
 {p.annualIncome && p.annualIncome !== 'Not specified' && <div className="flex items-center gap-1.5"><Building className="w-3 h-3 text-rose-main" /> <span className="text-zinc-700">₹{p.annualIncome}</span></div>}
 </div>
 <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
 <Phone className={`w-3.5 h-3.5 ${p.hasPhone ? 'text-rose-main' : 'text-zinc-300'}`} />
 <Linkedin className={`w-3.5 h-3.5 ${p.hasLinkedIn ? 'text-rose-main' : 'text-zinc-300'}`} />
 <Mail className={`w-3.5 h-3.5 ${p.hasEmail ? 'text-rose-main' : 'text-zinc-300'}`} />
 <div className="flex-1" />
 <span className="text-[10px] font-semibold text-rose-main group-hover:text-rose-main flex items-center gap-1">View <ChevronRight className="w-3 h-3" /></span>
 </div>
 </div>
 </motion.div>
 );
}
