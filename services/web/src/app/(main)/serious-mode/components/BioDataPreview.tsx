'use client';

import { GraduationCap, Home, Sun, Shield } from 'lucide-react';
import { TEMPLATES } from './constants';

/* ─── Ganesh SVG for templates ────────────────────── */
const GaneshMotif = ({ color = '#FFD700', size = 48 }: { color?: string; size?: number }) => (
 <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
 <text x="50" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="60" fill={color} opacity="0.3">🕉</text>
 </svg>
);

/* ═══════════════════════════════════════════════════════════
 BIO DATA PREVIEW — Template-Based with Ganesh/Religious Motifs
 ═══════════════════════════════════════════════════════════ */
export function BioDataPreview({ profile, templateId }: { profile: any; templateId: string }) {
 const tmpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
 const [c1, c2, c3] = tmpl.colors;
 const Row = ({ l, v }: { l: string; v: any }) => v ? (
 <div className="flex justify-between px-3 py-2 rounded-lg" style={{ background: `${c1}15` }}>
 <span style={{ color: `${c1}CC` }} className="text-xs font-medium">{l}:</span>
 <span className="text-xs font-semibold" style={{ color: c2 === '#FFFFFF' ? c1 : c2 }}>{v}</span>
 </div>
 ) : null;
 const Section = ({ title, icon, children }: any) => (
 <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${c1}25` }}>
 <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: c2 === '#FFFFFF' ? c1 : c2 }}>{icon} {title}</h4>
 <div className="grid grid-cols-2 gap-2">{children}</div>
 </div>
 );
 const titleColor = c2 === '#FFFFFF' ? c1 : c2;

 return (
 <div className="relative overflow-hidden rounded-2xl print:rounded-none" style={{ background: `linear-gradient(135deg, ${c3} 0%, ${c3}E0 50%, ${c3}C0 100%)`, border: `3px solid ${c1}60` }}>
 {/* Decorative corner motifs */}
 <div className="absolute top-2 left-2 text-2xl opacity-20">{tmpl.motif}</div>
 <div className="absolute top-2 right-2 text-2xl opacity-20">{tmpl.motif}</div>
 <div className="absolute bottom-2 left-2 text-2xl opacity-20">{tmpl.motif}</div>
 <div className="absolute bottom-2 right-2 text-2xl opacity-20">{tmpl.motif}</div>
 {/* Border pattern */}
 <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${c1} 0, ${c1} 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, ${c1} 0, ${c1} 1px, transparent 0, transparent 50%)`, backgroundSize: '16px 16px' }} />

 <div className="relative p-6 space-y-4">
 {/* Header with Ganesh */}
 <div className="text-center space-y-2 pb-4" style={{ borderBottom: `2px dashed ${c1}40` }}>
 <div className="text-4xl mb-1">🕉</div>
 <h2 className="text-lg font-bold" style={{ color: titleColor }}>॥ श्री गणेशाय नमः ॥</h2>
 <p className="text-base font-semibold" style={{ color: c1 }}>{tmpl.name} Bio Data</p>
 <div className="w-24 h-0.5 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${titleColor}, transparent)` }} />
 </div>

 {/* Name & Photo placeholder */}
 <div className="text-center">
 <h3 className="text-2xl font-bold" style={{ color: c1 }}>{profile.fullName || 'Your Name'}</h3>
 {profile.dateOfBirth && <p className="text-sm mt-1" style={{ color: titleColor }}>DOB: {new Date(profile.dateOfBirth).toLocaleDateString('en-IN')}</p>}
 {profile.birthTime && <p className="text-xs" style={{ color: `${c1}99` }}>Birth Time: {profile.birthTime} • {profile.birthPlace || ''}</p>}
 </div>

 {/* Personal */}
 <div className="grid grid-cols-2 gap-2">
 <Row l="Religion" v={profile.religion} /><Row l="Caste" v={profile.caste} />
 <Row l="Sub Caste" v={profile.subCaste} /><Row l="Gotra" v={profile.gotra} />
 <Row l="Manglik" v={profile.manglik} /><Row l="Nakshatra" v={profile.star || profile.nakshatra} />
 <Row l="Raasi" v={profile.raasi} /><Row l="Mother Tongue" v={profile.motherTongue} />
 <Row l="Height" v={profile.height} /><Row l="Complexion" v={profile.complexion} />
 <Row l="Body Type" v={profile.bodyType} /><Row l="Blood Group" v={profile.bloodGroup} />
 </div>

 {(profile.education || profile.occupation) && (
 <Section title="Education & Career" icon={<GraduationCap className="w-4 h-4" />}>
 <Row l="Education" v={profile.education} /><Row l="College" v={profile.college} />
 <Row l="Occupation" v={profile.occupation} /><Row l="Company" v={profile.company} />
 <Row l="Income" v={profile.annualIncome} /><Row l="City" v={profile.workingCity} />
 </Section>
 )}

 {(profile.fatherName || profile.familyType) && (
 <Section title="Family Details" icon={<Home className="w-4 h-4" />}>
 <Row l="Father" v={profile.fatherName} /><Row l="Father's Work" v={profile.fatherOccupation} />
 <Row l="Mother" v={profile.motherName} /><Row l="Mother's Work" v={profile.motherOccupation} />
 <Row l="Brothers" v={profile.brothers > 0 ? `${profile.brothers} (${profile.brothersMarried} married)` : null} />
 <Row l="Sisters" v={profile.sisters > 0 ? `${profile.sisters} (${profile.sistersMarried} married)` : null} />
 <Row l="Family Type" v={profile.familyType} /><Row l="Family Status" v={profile.familyStatus} />
 <Row l="Family Values" v={profile.familyValues} /><Row l="Native Place" v={profile.nativePlace} />
 </Section>
 )}

 <Section title="Lifestyle" icon={<Sun className="w-4 h-4" />}>
 <Row l="Marital Status" v={profile.maritalStatus} /><Row l="Diet" v={profile.diet} />
 <Row l="Drinking" v={profile.drinking} /><Row l="Smoking" v={profile.smoking} />
 </Section>

 {(profile.aboutMe || profile.aboutFamily) && (
 <div className="space-y-3 pt-3" style={{ borderTop: `1px solid ${c1}25` }}>
 {profile.aboutMe && <div><h4 className="text-xs font-semibold mb-1" style={{ color: titleColor }}>About Me</h4><p className="text-xs leading-relaxed" style={{ color: `${c1}BB` }}>{profile.aboutMe}</p></div>}
 {profile.aboutFamily && <div><h4 className="text-xs font-semibold mb-1" style={{ color: titleColor }}>About Family</h4><p className="text-xs leading-relaxed" style={{ color: `${c1}BB` }}>{profile.aboutFamily}</p></div>}
 </div>
 )}

 <div className="text-center pt-4" style={{ borderTop: `2px dashed ${c1}40` }}>
 <div className="text-2xl mb-1">{tmpl.emoji}</div>
 <p className="text-[10px]" style={{ color: `${c1}77` }}>Generated by Miamo • Date to Marry</p>
 <div className="flex items-center justify-center gap-2 mt-1">
 <Shield className="w-3 h-3 text-rose-main" /><span className="text-[10px] text-rose-main">Verified by Miamo</span>
 </div>
 </div>
 </div>
 </div>
 );
}
