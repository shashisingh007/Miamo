'use client';

import { motion } from 'framer-motion';
import {
  X, CheckCircle, GraduationCap, Briefcase, Building, MapPin,
  Home, Users, Utensils, Lock, Shield, Phone, Linkedin, Mail,
  Camera, Moon, FileText, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
   PROFILE DETAIL MODAL
   ═══════════════════════════════════════════════════════════ */
export function ProfileDetailModal({ profile: p, onClose, onRequestAccess, onCheckCompat }: { profile: any; onClose: () => void; onRequestAccess: (type: string) => void; onCheckCompat: () => void }) {
  const photo = p.user?.photos?.[0]?.url;
  const up = p.user?.profile;
  const gradient = up?.avatarGradient || 'from-amber-400 to-rose-500';
  const grantedAccess = new Set((p.accessGrants || []).filter((a: any) => a.status === 'granted').map((a: any) => a.type));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl"
        onClick={(e: any) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-900">Profile Details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X className="w-4 h-4 text-zinc-600" /></button>
        </div>
        <div className="px-6 pb-2">
          <div className="relative h-64 rounded-2xl overflow-hidden -mt-1">
            {photo ? <img loading="lazy" src={photo} alt="" className="w-full h-full object-cover" /> : <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-60 flex items-center justify-center`}><span className="text-7xl font-bold text-white/80">{p.fullName?.[0] || '?'}</span></div>}
            <div className="absolute top-4 left-4 flex gap-2">
              {p.idVerified && <div className="bg-emerald-500/90 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Verified</div>}
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{p.fullName || p.user?.displayName}</h2>
            <p className="text-sm text-zinc-500 mt-1">{up?.age ? `${up.age} yrs` : ''} {p.height ? `• ${p.height}` : ''} {p.workingCity ? `• ${p.workingCity}` : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.religion && <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-3 py-1 font-semibold border border-amber-200">{p.religion}</span>}
            {p.caste && <span className="text-xs bg-rose-50 text-rose-700 rounded-full px-3 py-1 font-semibold border border-rose-200">{p.caste}</span>}
            {p.gotra && <span className="text-xs bg-purple-50 text-purple-700 rounded-full px-3 py-1 font-semibold border border-purple-200">Gotra: {p.gotra}</span>}
            {p.manglik === 'Yes' && <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-3 py-1 font-semibold border border-orange-200">Manglik</span>}
            {p.motherTongue && <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 font-semibold border border-blue-200">{p.motherTongue}</span>}
            {p.maritalStatus && <span className="text-xs bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 font-semibold border border-emerald-200">{p.maritalStatus}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: GraduationCap, l: 'Education', v: p.education }, { icon: Briefcase, l: 'Occupation', v: p.occupation },
              { icon: Building, l: 'Company', v: p.company }, { icon: Building, l: 'Income', v: p.annualIncome && p.annualIncome !== 'Not specified' ? `₹${p.annualIncome}` : null },
              { icon: MapPin, l: 'Working City', v: p.workingCity }, { icon: Home, l: 'Family Type', v: p.familyType },
              { icon: Users, l: 'Family Status', v: p.familyStatus }, { icon: Utensils, l: 'Diet', v: p.diet },
            ].filter(x => x.v).map(({ icon: Icon, l, v }) => (
              <div key={l} className="bg-zinc-50 rounded-xl p-3 flex items-start gap-2.5 border border-zinc-100">
                <Icon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div><p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">{l}</p><p className="text-sm text-zinc-800 font-medium mt-0.5">{v}</p></div>
              </div>
            ))}
          </div>
          {p.aboutMe && <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100"><h4 className="text-xs font-semibold text-amber-600 mb-2">About Me</h4><p className="text-sm text-zinc-700 leading-relaxed">{p.aboutMe}</p></div>}

          {/* Compatibility Check Button */}
          <button onClick={onCheckCompat} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-bold hover:shadow-lg transition flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4" /> Check Kundli & Numerology Compatibility
          </button>

          {/* Access Control */}
          {!p.isOwn && (
            <div className="space-y-3 pt-3 border-t border-zinc-200">
              <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" /> Request Access</h4>
              <p className="text-xs text-zinc-500">Contact info is protected. Request access and they&apos;ll decide.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'bioData', label: 'Bio Data', icon: FileText }, { type: 'phone', label: 'Phone', icon: Phone },
                  { type: 'linkedin', label: 'LinkedIn', icon: Linkedin }, { type: 'email', label: 'Email', icon: Mail },
                  { type: 'photos', label: 'All Photos', icon: Camera }, { type: 'horoscope', label: 'Horoscope', icon: Moon },
                ].map(item => {
                  const granted = grantedAccess.has(item.type);
                  return (
                    <button key={item.type} onClick={() => !granted && onRequestAccess(item.type)} disabled={granted}
                      className={cn('flex items-center gap-2 p-3 rounded-xl text-xs font-medium transition border',
                        granted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-zinc-600 hover:bg-amber-50 hover:text-amber-700 border-zinc-200 hover:border-amber-200'
                      )}><item.icon className="w-4 h-4" />{granted ? `${item.label} ✓` : `Request ${item.label}`}</button>
                  );
                })}
              </div>
              {(p.phoneNumber || p.linkedIn || p.contactEmail) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Shared Contact</h5>
                  {p.phoneNumber && <p className="text-sm text-zinc-800 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {p.phoneNumber}</p>}
                  {p.linkedIn && <p className="text-sm text-zinc-800 flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-blue-500" /> {p.linkedIn}</p>}
                  {p.contactEmail && <p className="text-sm text-zinc-800 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-amber-500" /> {p.contactEmail}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
