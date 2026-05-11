'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake, Shield, CheckCircle, Users, Lock, Eye, EyeOff,
  Phone, Linkedin, Mail, FileText, Star, Crown, Sparkles,
  Search, Filter, ChevronRight, ChevronDown, X, Check,
  MapPin, Briefcase, GraduationCap, Heart, Home, Clock,
  Download, Palette, Send, AlertTriangle, UserCheck, Gem,
  ScrollText, Camera, Globe, ArrowRight, ArrowLeft, Info,
  Building, Utensils, Wine, Cigarette, Moon, Sun, Baby,
  Menu, MessageCircle, Settings, BarChart3, Upload, Zap,
  ChevronLeft, Hash, Percent, Activity, BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & DROPDOWN DATA
   ═══════════════════════════════════════════════════════════ */
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'Other'];
const CASTES_BY_RELIGION: Record<string, string[]> = {
  Hindu: ['Brahmin','Rajput','Marwari','Agarwal','Jat','Kayastha','Vaishya','Khatri','Yadav','Gupta','Sharma','Verma','Patel','Nair','Iyer','Iyengar','Reddy','Naidu','Lingayat','Vokkaliga','Kurmi','Baniya','Arora','Thakur','Other'],
  Muslim: ['Syed','Sheikh','Pathan','Mughal','Ansari','Khan','Qureshi','Bohra','Memon','Other'],
  Sikh: ['Jat Sikh','Khatri Sikh','Arora Sikh','Ramgarhia','Saini','Other'],
  Christian: ['Roman Catholic','Syrian Christian','Protestant','CSI','Other'],
  Jain: ['Digambar','Shwetambar','Other'],
  Buddhist: ['Mahayana','Theravada','Neo-Buddhist','Other'],
};
const MOTHER_TONGUES = ['Hindi','Bengali','Telugu','Marathi','Tamil','Urdu','Gujarati','Kannada','Malayalam','Odia','Punjabi','Assamese','Maithili','Sindhi','Konkani','Dogri','Kashmiri','Sanskrit','English','Other'];
const HEIGHTS = ["4'0\"","4'1\"","4'2\"","4'3\"","4'4\"","4'5\"","4'6\"","4'7\"","4'8\"","4'9\"","4'10\"","4'11\"","5'0\"","5'1\"","5'2\"","5'3\"","5'4\"","5'5\"","5'6\"","5'7\"","5'8\"","5'9\"","5'10\"","5'11\"","6'0\"","6'1\"","6'2\"","6'3\"","6'4\"","6'5\""];
const EDUCATION_LEVELS = ['High School','Diploma','B.A.','B.Sc.','B.Com.','B.Tech/B.E.','BBA','BCA','MBBS','BDS','B.Pharm','LLB','B.Ed.','M.A.','M.Sc.','M.Com.','M.Tech/M.E.','MBA','MCA','MD','MS','M.Phil.','Ph.D.','CA','CS','ICWA','IAS/IPS/IFS','Other'];
const INCOMES = ['Not specified','Below 2 Lakh','2-4 Lakh','4-6 Lakh','6-8 Lakh','8-10 Lakh','10-15 Lakh','15-20 Lakh','20-30 Lakh','30-50 Lakh','50-75 Lakh','75 Lakh - 1 Cr','1 Cr+','2 Cr+','5 Cr+'];
const FAMILY_TYPES = ['Nuclear','Joint','Extended'];
const FAMILY_STATUS = ['Middle Class','Upper Middle Class','Rich','Affluent'];
const FAMILY_VALUES = ['Orthodox','Traditional','Moderate','Liberal'];
const MARITAL_STATUSES = ['Never Married','Divorced','Widowed','Awaiting Divorce'];
const DIETS = ['Vegetarian','Non-Vegetarian','Eggetarian','Jain','Vegan'];
const MANGLIK_OPTIONS = ['No','Yes','Partial / Anshik',"Doesn't Matter"];
const COMPLEXIONS = ['Very Fair','Fair','Wheatish','Wheatish Brown','Dark'];
const BODY_TYPES = ['Slim','Average','Athletic','Heavy'];
const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const RAASHIS = ['Mesha (Aries)','Vrishabha (Taurus)','Mithuna (Gemini)','Karka (Cancer)','Simha (Leo)','Kanya (Virgo)','Tula (Libra)','Vrischika (Scorpio)','Dhanu (Sagittarius)','Makara (Capricorn)','Kumbha (Aquarius)','Meena (Pisces)'];

const TEMPLATES = [
  { id: 'royal-rajasthani', name: 'Royal Rajasthani', colors: ['#8B0000','#FFD700','#FFF8DC'], emoji: '🏰', motif: '🕉', premium: false },
  { id: 'south-indian-temple', name: 'South Indian Temple', colors: ['#006400','#FFD700','#FFF5E1'], emoji: '🛕', motif: '🪔', premium: false },
  { id: 'bengali-lal-paar', name: 'Bengali Lal Paar', colors: ['#DC143C','#FFFFFF','#FFE4E1'], emoji: '🌺', motif: '🕉', premium: false },
  { id: 'punjabi-phulkari', name: 'Punjabi Phulkari', colors: ['#FF6B00','#FFD700','#FF1493'], emoji: '🧵', motif: '☬', premium: false },
  { id: 'gujarati-bandhani', name: 'Gujarati Bandhani', colors: ['#FF0000','#008000','#FFD700'], emoji: '🪞', motif: '🕉', premium: false },
  { id: 'marathi-paithani', name: 'Marathi Paithani', colors: ['#FF8C00','#006400','#FFD700'], emoji: '🦚', motif: '🕉', premium: false },
  { id: 'kerala-kasavu', name: 'Kerala Kasavu', colors: ['#FFFFF0','#FFD700','#8B4513'], emoji: '🌴', motif: '🪔', premium: false },
  { id: 'lucknowi-chikan', name: 'Lucknowi Chikan', colors: ['#FFFFFF','#F0E6FF','#E8F5E9'], emoji: '🕌', motif: '☪', premium: false },
  { id: 'mughal-royal', name: 'Mughal Royal', colors: ['#000080','#FFD700','#F5F5DC'], emoji: '👑', motif: '☪', premium: true },
  { id: 'kashmiri-pashmina', name: 'Kashmiri Pashmina', colors: ['#800020','#C19A6B','#F5DEB3'], emoji: '🏔️', motif: '🕉', premium: true },
  { id: 'assamese-mekhela', name: 'Assamese Mekhela', colors: ['#B22222','#FFD700','#FFFAF0'], emoji: '🎋', motif: '🕉', premium: false },
  { id: 'odia-bomkai', name: 'Odia Bomkai', colors: ['#800000','#FF8C00','#FFFACD'], emoji: '🏛️', motif: '🕉', premium: false },
  { id: 'manipuri-phanek', name: 'Manipuri Phanek', colors: ['#FF69B4','#8B008B','#FFE4B5'], emoji: '🌸', motif: '🕉', premium: false },
  { id: 'hyderabadi-pearl', name: 'Hyderabadi Pearl', colors: ['#FFFFF0','#008080','#FFD700'], emoji: '💎', motif: '☪', premium: true },
  { id: 'goan-catholic', name: 'Goan Christian', colors: ['#FFFFFF','#4169E1','#FFD700'], emoji: '⛪', motif: '✝', premium: false },
  { id: 'sikh-golden', name: 'Sikh Golden Temple', colors: ['#FFD700','#FFFFFF','#FF8C00'], emoji: '☬', motif: '☬', premium: false },
  { id: 'jain-peaceful', name: 'Jain Shanti', colors: ['#FFFFFF','#FF8C00','#006400'], emoji: '☸️', motif: '☸', premium: false },
  { id: 'modern-minimal', name: 'Modern Minimal', colors: ['#2D3748','#EDF2F7','#A78BFA'], emoji: '✨', motif: '✨', premium: false },
  { id: 'rose-garden', name: 'Rose Garden', colors: ['#FFC0CB','#FF69B4','#FFE4E1'], emoji: '🌹', motif: '🌹', premium: true },
  { id: 'midnight-royal', name: 'Midnight Royal', colors: ['#1A1A2E','#FFD700','#E94560'], emoji: '🌙', motif: '🕉', premium: true },
  { id: 'vedic-sunrise', name: 'Vedic Sunrise', colors: ['#FF6600','#8B0000','#FFF5EE'], emoji: '🌅', motif: '🕉', premium: false },
  { id: 'lotus-pond', name: 'Lotus Pond', colors: ['#FFB6C1','#228B22','#FFF0F5'], emoji: '🪷', motif: '🌸', premium: false },
  { id: 'temple-gold', name: 'Temple Gold', colors: ['#B8860B','#2F1B0E','#FDF5E6'], emoji: '🛕', motif: '⚱️', premium: true },
  { id: 'peacock-pride', name: 'Peacock Pride', colors: ['#0047AB','#00A86B','#E0FFFF'], emoji: '🦚', motif: '🪶', premium: false },
  { id: 'bridal-red', name: 'Bridal Red', colors: ['#CC0000','#FFD700','#FFF0F0'], emoji: '💍', motif: '🔴', premium: false },
  { id: 'sandalwood', name: 'Sandalwood Classic', colors: ['#C19A6B','#E8B04B','#FAEBD7'], emoji: '🪵', motif: '🌿', premium: false },
  { id: 'celestial-blue', name: 'Celestial Blue', colors: ['#191970','#C0C0C0','#F0F8FF'], emoji: '🌌', motif: '⭐', premium: true },
  { id: 'marigold-festive', name: 'Marigold Festive', colors: ['#FFA500','#228B22','#FFFFF0'], emoji: '🌼', motif: '🎊', premium: false },
  { id: 'ivory-elegance', name: 'Ivory Elegance', colors: ['#FFFFF0','#F7E7CE','#D4AF37'], emoji: '✨', motif: '💫', premium: false },
  { id: 'rajwada-heritage', name: 'Rajwada Heritage', colors: ['#4B0082','#FFD700','#F8F0FF'], emoji: '🏯', motif: '👑', premium: true },
  { id: 'tulsi-green', name: 'Tulsi Green', colors: ['#2E8B57','#8B4513','#F0FFF0'], emoji: '🌱', motif: '🍃', premium: false },
  { id: 'diwali-lights', name: 'Diwali Lights', colors: ['#FF4500','#FFD700','#1A0033'], emoji: '🪔', motif: '✨', premium: true },
];

/* ─── Ganesh SVG for templates ────────────────────── */
const GaneshMotif = ({ color = '#FFD700', size = 48 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <text x="50" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="60" fill={color} opacity="0.3">🕉</text>
  </svg>
);

/* ─── Form Components ────────────────────────────── */
function Field({ label, icon: Icon, children, required }: { label: string; icon?: any; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: any) {
  return (
    <input type={type} value={value || ''} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 outline-none transition disabled:opacity-50" />
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value || ''} onChange={(e: any) => onChange(e.target.value)}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 outline-none transition appearance-none cursor-pointer">
      <option value="" className="bg-white text-zinc-400">{placeholder || 'Select...'}</option>
      {options.map(o => <option key={o} value={o} className="bg-white text-zinc-900">{o}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: any) {
  return (
    <textarea value={value || ''} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 outline-none transition resize-none" />
  );
}

/* ═══════════════════════════════════════════════════════════
   BIO DATA PREVIEW — Template-Based with Ganesh/Religious Motifs
   ═══════════════════════════════════════════════════════════ */
function BioDataPreview({ profile, templateId }: { profile: any; templateId: string }) {
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
            <Shield className="w-3 h-3 text-emerald-500" /><span className="text-[10px] text-emerald-500">Verified by Miamo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE CARD — Discover-style for Browse
   ═══════════════════════════════════════════════════════════ */
function MatrimonialCard({ profile: p, onView }: { profile: any; onView: () => void }) {
  const photo = p.user?.photos?.[0]?.url;
  const up = p.user?.profile;
  const gradient = up?.avatarGradient || 'from-amber-400 to-rose-500';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:shadow-amber-100 transition-all duration-300 cursor-pointer"
      onClick={onView}>
      <div className="relative h-56 overflow-hidden">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-70 flex items-center justify-center`}>
            <span className="text-5xl font-bold text-white/80">{p.fullName?.[0] || '?'}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.idVerified && <div className="bg-emerald-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-white" /><span className="text-[10px] font-bold text-white">Verified</span></div>}
        </div>
        {p.numerologyScore && p.numerologyScore >= 70 && (
          <div className="absolute top-3 right-3 bg-purple-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <Hash className="w-3 h-3 text-white" /><span className="text-[10px] font-bold text-white">{p.numerologyScore}%</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white truncate">{p.fullName || p.user?.displayName}</h3>
          <p className="text-xs text-zinc-300">{up?.age ? `${up.age} yrs` : ''} {p.height ? `• ${p.height}` : ''} {p.workingCity ? `• ${p.workingCity}` : ''}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {p.religion && <span className="text-[10px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 font-semibold border border-amber-200">{p.religion}</span>}
          {p.caste && <span className="text-[10px] bg-rose-50 text-rose-700 rounded-full px-2 py-0.5 font-semibold border border-rose-200">{p.caste}</span>}
          {p.motherTongue && <span className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-semibold border border-blue-200">{p.motherTongue}</span>}
          {p.manglik === 'Yes' && <span className="text-[10px] bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 font-semibold border border-orange-200">Manglik</span>}
        </div>
        <div className="space-y-1 text-xs text-zinc-500">
          {p.education && <div className="flex items-center gap-1.5"><GraduationCap className="w-3 h-3 text-amber-500" /> <span className="text-zinc-700">{p.education}</span></div>}
          {p.occupation && <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-amber-500" /> <span className="text-zinc-700">{p.occupation}{p.company ? ` at ${p.company}` : ''}</span></div>}
          {p.annualIncome && p.annualIncome !== 'Not specified' && <div className="flex items-center gap-1.5"><Building className="w-3 h-3 text-amber-500" /> <span className="text-zinc-700">₹{p.annualIncome}</span></div>}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
          <Phone className={`w-3.5 h-3.5 ${p.hasPhone ? 'text-emerald-500' : 'text-zinc-300'}`} />
          <Linkedin className={`w-3.5 h-3.5 ${p.hasLinkedIn ? 'text-blue-500' : 'text-zinc-300'}`} />
          <Mail className={`w-3.5 h-3.5 ${p.hasEmail ? 'text-amber-500' : 'text-zinc-300'}`} />
          <div className="flex-1" />
          <span className="text-[10px] font-semibold text-amber-600 group-hover:text-amber-500 flex items-center gap-1">View <ChevronRight className="w-3 h-3" /></span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE DETAIL MODAL
   ═══════════════════════════════════════════════════════════ */
function ProfileDetailModal({ profile: p, onClose, onRequestAccess, onCheckCompat }: { profile: any; onClose: () => void; onRequestAccess: (type: string) => void; onCheckCompat: () => void }) {
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
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-60 flex items-center justify-center`}><span className="text-7xl font-bold text-white/80">{p.fullName?.[0] || '?'}</span></div>}
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

/* ═══════════════════════════════════════════════════════════
   COMPATIBILITY RESULTS MODAL
   ═══════════════════════════════════════════════════════════ */
function CompatibilityModal({ data, onClose }: { data: any; onClose: () => void }) {
  if (!data) return null;
  const { compositeScore, kundli, numerology, partnerName } = data;
  const scoreColor = compositeScore >= 75 ? 'text-emerald-500' : compositeScore >= 55 ? 'text-amber-500' : compositeScore >= 40 ? 'text-orange-500' : 'text-red-500';
  const scoreBg = compositeScore >= 75 ? 'from-emerald-500' : compositeScore >= 55 ? 'from-amber-500' : compositeScore >= 40 ? 'from-orange-500' : 'from-red-500';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl"
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

/* ═══════════════════════════════════════════════════════════
   SIDEBAR MENU — DTM sections (3-bar menu)
   ═══════════════════════════════════════════════════════════ */
const DTM_SECTIONS = [
  { id: 'browse', label: 'Browse Profiles', icon: Search, color: 'text-amber-500' },
  { id: 'profile', label: 'My Profile / Bio Data', icon: FileText, color: 'text-blue-500' },
  { id: 'matches', label: 'My Matches', icon: Heart, color: 'text-rose-500' },
  { id: 'numerology', label: 'Numerology', icon: Hash, color: 'text-purple-500' },
  { id: 'kundli', label: 'Kundli / Horoscope', icon: Moon, color: 'text-indigo-500' },
  { id: 'chat', label: 'DTM Chat', icon: MessageCircle, color: 'text-emerald-500' },
  { id: 'access', label: 'Access Control', icon: Shield, color: 'text-teal-500' },
  { id: 'preferences', label: 'Partner Preferences', icon: Heart, color: 'text-pink-500' },
  { id: 'privacy', label: 'Privacy & Security', icon: Lock, color: 'text-zinc-500' },
  { id: 'templates', label: 'Bio Data Templates', icon: Palette, color: 'text-orange-500' },
] as const;
type SectionId = typeof DTM_SECTIONS[number]['id'];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function DateToMarryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [section, setSection] = useState<SectionId>('browse');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileEnabled, setProfileEnabled] = useState(false);

  // Data
  const [myProfile, setMyProfile] = useState<any>(null);
  const [browseProfiles, setBrowseProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [compatData, setCompatData] = useState<any>(null);
  const [numerologyData, setNumerologyData] = useState<any>(null);
  const [dtmChats, setDtmChats] = useState<any[]>([]);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState('');

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [bioDataStep, setBioDataStep] = useState(0);
  const [matchTab, setMatchTab] = useState<'matches' | 'incoming' | 'hold'>('matches');

  // Profile completion check
  const profileCompletion = myProfile ? Math.min(100, [myProfile.fullName, myProfile.religion, myProfile.caste, myProfile.education, myProfile.occupation, myProfile.fatherName, myProfile.dateOfBirth, myProfile.height, myProfile.motherTongue, myProfile.maritalStatus].filter(Boolean).length * 10) : 0;

  // Load data
  useEffect(() => {
    Promise.all([
      api.getMatrimonialProfile().catch(() => ({ data: null })),
      api.browseMatrimonialAdvanced().catch(() => api.browseMatrimonial().catch(() => ({ data: [] }))),
      api.getMatrimonialMatches().catch(() => ({ data: [] })),
      api.getIncomingAccessRequests().catch(() => ({ data: [] })),
      api.getSentAccessRequests().catch(() => ({ data: [] })),
      api.getDtmChats().catch(() => ({ data: [] })),
    ]).then(([profileRes, browseRes, matchRes, incRes, sentRes, chatRes]) => {
      if (profileRes.data) {
        setMyProfile(profileRes.data);
        setProfileEnabled(!!profileRes.data.fullName);
      }
      setBrowseProfiles(browseRes.data || []);
      setMatches(matchRes.data || []);
      setIncomingRequests(incRes.data || []);
      setSentRequests(sentRes.data || []);
      setDtmChats(chatRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const updateField = useCallback((key: string, value: any) => {
    setMyProfile((prev: any) => prev ? { ...prev, [key]: value } : prev);
  }, []);

  const saveProfile = useCallback(async () => {
    if (!myProfile || saving) return;
    setSaving(true);
    try {
      const res = await api.updateMatrimonialProfile(myProfile);
      if (res.data) { setMyProfile(res.data); setProfileEnabled(!!res.data.fullName); }
      setSaveMsg('Profile saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('Failed to save'); }
    finally { setSaving(false); }
  }, [myProfile, saving]);

  const applyFilters = useCallback(async () => {
    try {
      const res = await api.browseMatrimonialAdvanced(filters).catch(() => api.browseMatrimonial(filters));
      setBrowseProfiles(res.data || []);
    } catch {}
  }, [filters]);

  const viewProfile = useCallback(async (userId: string) => {
    try { const res = await api.getMatrimonialUserProfile(userId); setSelectedProfile(res.data); } catch {}
  }, []);

  const checkCompatibility = useCallback(async (userId: string) => {
    try { const res = await api.getMatrimonialCompatibility(userId); setCompatData(res.data); } catch { setSaveMsg('Need DOB for compatibility'); setTimeout(() => setSaveMsg(''), 3000); }
  }, []);

  const handleAccessAction = useCallback(async (id: string, action: 'grant' | 'deny' | 'revoke') => {
    try { await api.handleAccessRequest(id, action); setIncomingRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'grant' ? 'granted' : action === 'deny' ? 'denied' : 'revoked' } : r)); } catch {}
  }, []);

  const requestAccess = useCallback(async (type: string) => {
    if (!selectedProfile) return;
    try { await api.requestAccess(selectedProfile.user?.id || selectedProfile.userId, type, 'I would like to view your ' + type); setSaveMsg('Access request sent!'); setTimeout(() => setSaveMsg(''), 3000); } catch {}
  }, [selectedProfile]);

  const loadNumerology = useCallback(async () => {
    try { const res = await api.getMatrimonialNumerology(); setNumerologyData(res.data); } catch {}
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !activeChatUserId) return;
    try {
      const res = await api.sendDtmMessage(activeChatUserId, chatInput.trim());
      if (res.data) setChatMessages(prev => [...prev, res.data]);
      setChatInput('');
    } catch {}
  }, [chatInput, activeChatUserId]);

  const openChat = useCallback(async (userId: string) => {
    setActiveChatUserId(userId);
    try { const res = await api.getDtmChatMessages(userId); setChatMessages(res.data || []); } catch {}
    setSection('chat');
  }, []);

  if (loading) return <MiamoLoader text="Loading Date to Marry..." />;

  // First time — enable profile gate
  if (!profileEnabled && section !== 'browse') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-zinc-200 shadow-xl max-w-md w-full p-8 text-center space-y-5">
          <div className="text-5xl">🕉</div>
          <h2 className="text-xl font-bold text-zinc-900">Welcome to Date to Marry</h2>
          <p className="text-sm text-zinc-500">Build your matrimonial profile to access all features. Complete at least 60% to enable browsing & matching.</p>
          <div className="w-full bg-zinc-100 rounded-full h-3">
            <div className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
          </div>
          <p className="text-xs text-zinc-400">{profileCompletion}% complete • Need 60% minimum</p>
          <button onClick={() => { setProfileEnabled(true); setSection('profile'); }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-sm hover:shadow-lg transition">
            {profileCompletion >= 60 ? 'Enter Date to Marry' : 'Build Your Profile First'} →
          </button>
          <button onClick={() => { setProfileEnabled(true); setSection('browse'); }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition">or browse profiles first →</button>
        </motion.div>
      </div>
    );
  }

  const BIO_DATA_STEPS = [
    { title: 'Personal', icon: Users },
    { title: 'Religion & Caste', icon: Moon },
    { title: 'Education & Career', icon: GraduationCap },
    { title: 'Family', icon: Home },
    { title: 'Lifestyle & About', icon: Sun },
    { title: 'Contact & Privacy', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-rose-50/50">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition">
            <Menu className="w-5 h-5 text-zinc-700" />
          </button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-200">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900">Date to Marry</h1>
              <p className="text-[10px] text-zinc-400">Find your life partner</p>
            </div>
          </div>
          {profileCompletion < 60 && (
            <button onClick={() => setSection('profile')} className="text-[10px] bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-semibold border border-amber-200 hover:bg-amber-100 transition">
              Complete Profile ({profileCompletion}%)
            </button>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white border-r border-zinc-200 shadow-2xl overflow-y-auto">
              <div className="p-5 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center">
                      <HeartHandshake className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Date to Marry</h3>
                      <p className="text-[10px] text-zinc-400">Matrimonial Platform</p>
                    </div>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X className="w-4 h-4 text-zinc-500" /></button>
                </div>
              </div>
              <div className="p-3 space-y-1">
                {DTM_SECTIONS.map(s => (
                  <button key={s.id} onClick={() => { setSection(s.id); setSidebarOpen(false); }}
                    className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition', section === s.id ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900')}>
                    <s.icon className={cn('w-4.5 h-4.5', section === s.id ? 'text-amber-500' : s.color)} />
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="p-4 mx-3 mb-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 font-semibold mb-2">PROFILE COMPLETION</p>
                <div className="w-full bg-zinc-200 rounded-full h-2 mb-1">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
                </div>
                <p className="text-[10px] text-zinc-500">{profileCompletion}%</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {saveMsg && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl">
            <CheckCircle className="w-4 h-4 inline mr-2" />{saveMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ═══ BROWSE SECTION (DEFAULT) ═══════════════ */}
        {section === 'browse' && (
          <div className="space-y-5">
            {/* Filters Toggle */}
            <div className="flex items-center justify-end">
              <button onClick={() => setShowFilters(!showFilters)}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition border',
                  showFilters ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50')}>
                <Filter className="w-3.5 h-3.5" /> Filters {Object.values(filters).filter(Boolean).length > 0 && `(${Object.values(filters).filter(Boolean).length})`}
              </button>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Select value={filters.religion || ''} onChange={v => setFilters(f => ({ ...f, religion: v }))} options={RELIGIONS} placeholder="Religion" />
                      <Select value={filters.caste || ''} onChange={v => setFilters(f => ({ ...f, caste: v }))} options={filters.religion ? (CASTES_BY_RELIGION[filters.religion] || ['Other']) : []} placeholder="Caste" />
                      <Select value={filters.motherTongue || ''} onChange={v => setFilters(f => ({ ...f, motherTongue: v }))} options={MOTHER_TONGUES} placeholder="Mother Tongue" />
                      <Select value={filters.manglik || ''} onChange={v => setFilters(f => ({ ...f, manglik: v }))} options={['Yes','No','any']} placeholder="Manglik" />
                      <Select value={filters.maritalStatus || ''} onChange={v => setFilters(f => ({ ...f, maritalStatus: v }))} options={MARITAL_STATUSES} placeholder="Marital Status" />
                      <Select value={filters.education || ''} onChange={v => setFilters(f => ({ ...f, education: v }))} options={EDUCATION_LEVELS} placeholder="Education" />
                      <Select value={filters.diet || ''} onChange={v => setFilters(f => ({ ...f, diet: v }))} options={DIETS} placeholder="Diet" />
                      <Input value={filters.city || ''} onChange={(v: string) => setFilters(f => ({ ...f, city: v }))} placeholder="City" />
                      <Select value={filters.complexion || ''} onChange={v => setFilters(f => ({ ...f, complexion: v }))} options={COMPLEXIONS} placeholder="Complexion" />
                      <Select value={filters.bodyType || ''} onChange={v => setFilters(f => ({ ...f, bodyType: v }))} options={BODY_TYPES} placeholder="Body Type" />
                      <Input value={filters.minAge || ''} onChange={(v: string) => setFilters(f => ({ ...f, minAge: v }))} placeholder="Min Age" type="number" />
                      <Input value={filters.maxAge || ''} onChange={(v: string) => setFilters(f => ({ ...f, maxAge: v }))} placeholder="Max Age" type="number" />
                      <Select value={filters.minHeight || ''} onChange={v => setFilters(f => ({ ...f, minHeight: v }))} options={HEIGHTS} placeholder="Min Height" />
                      <Select value={filters.maxHeight || ''} onChange={v => setFilters(f => ({ ...f, maxHeight: v }))} options={HEIGHTS} placeholder="Max Height" />
                      <Input value={filters.minWeight || ''} onChange={(v: string) => setFilters(f => ({ ...f, minWeight: v }))} placeholder="Min Weight (kg)" type="number" />
                      <Input value={filters.maxWeight || ''} onChange={(v: string) => setFilters(f => ({ ...f, maxWeight: v }))} placeholder="Max Weight (kg)" type="number" />
                    </div>
                    {/* Special Filters */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setFilters(f => ({ ...f, numerologyMatch: f.numerologyMatch === 'true' ? '' : 'true' }))}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                          filters.numerologyMatch === 'true' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-zinc-500 border-zinc-200')}>
                        <Hash className="w-3 h-3 inline mr-1" /> Numerology Match
                      </button>
                      <button onClick={() => setFilters(f => ({ ...f, sortBy: f.sortBy === 'numerology' ? '' : 'numerology' }))}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                          filters.sortBy === 'numerology' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-zinc-500 border-zinc-200')}>
                        Sort by Numerology
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={applyFilters} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition">
                        <Search className="w-3.5 h-3.5 inline mr-1.5" /> Search
                      </button>
                      <button onClick={() => { setFilters({}); }} className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition">Clear</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Profile Grid */}
            {browseProfiles.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200">
                <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-sm text-zinc-500 font-medium">No profiles found</p>
                <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {browseProfiles.map(p => (
                  <MatrimonialCard key={p.id} profile={p} onView={() => viewProfile(p.user?.id || p.userId)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ MY PROFILE / BIO DATA ═════════════════ */}
        {section === 'profile' && myProfile && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> My Bio Data</h2>
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                {myProfile.fullName && (
                  <button onClick={() => { setPreviewTemplate(myProfile.bioDataTemplate || 'royal-rajasthani'); setShowPreview(true); }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
              </div>
            </div>

            {/* Step Nav */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {BIO_DATA_STEPS.map((step, i) => (
                <button key={i} onClick={() => setBioDataStep(i)}
                  className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap border',
                    i === bioDataStep ? 'bg-amber-50 text-amber-700 border-amber-200' : i < bioDataStep ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-zinc-500 border-zinc-200 hover:border-zinc-300')}>
                  <step.icon className="w-3.5 h-3.5" /> {step.title}
                </button>
              ))}
            </div>

            {/* Step 0: Personal */}
            {bioDataStep === 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Users className="w-4 h-4 text-amber-500" /> Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" icon={Users} required><Input value={myProfile.fullName} onChange={(v: string) => updateField('fullName', v)} placeholder="Enter full name" /></Field>
                  <Field label="Date of Birth" icon={Clock} required><Input type="date" value={myProfile.dateOfBirth ? new Date(myProfile.dateOfBirth).toISOString().split('T')[0] : ''} onChange={(v: string) => updateField('dateOfBirth', v ? new Date(v).toISOString() : null)} /></Field>
                  <Field label="Birth Time"><Input value={myProfile.birthTime} onChange={(v: string) => updateField('birthTime', v)} placeholder="e.g., 10:30 AM" /></Field>
                  <Field label="Birth Place"><Input value={myProfile.birthPlace} onChange={(v: string) => updateField('birthPlace', v)} placeholder="City of birth" /></Field>
                  <Field label="Height" required><Select value={myProfile.height} onChange={(v: string) => updateField('height', v)} options={HEIGHTS} placeholder="Select height" /></Field>
                  <Field label="Weight"><Input value={myProfile.weight} onChange={(v: string) => updateField('weight', v)} placeholder="e.g., 65 kg" /></Field>
                  <Field label="Complexion"><Select value={myProfile.complexion} onChange={(v: string) => updateField('complexion', v)} options={COMPLEXIONS} /></Field>
                  <Field label="Body Type"><Select value={myProfile.bodyType} onChange={(v: string) => updateField('bodyType', v)} options={BODY_TYPES} /></Field>
                  <Field label="Blood Group"><Select value={myProfile.bloodGroup} onChange={(v: string) => updateField('bloodGroup', v)} options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} /></Field>
                  <Field label="Physical Status"><Select value={myProfile.physicalStatus} onChange={(v: string) => updateField('physicalStatus', v)} options={['Normal','Physically Challenged']} /></Field>
                </div>
              </div>
            )}

            {/* Step 1: Religion */}
            {bioDataStep === 1 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Moon className="w-4 h-4 text-amber-500" /> Religion & Caste</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Religion" icon={Moon} required><Select value={myProfile.religion} onChange={(v: string) => updateField('religion', v)} options={RELIGIONS} /></Field>
                  <Field label="Caste" required><Select value={myProfile.caste} onChange={(v: string) => updateField('caste', v)} options={myProfile.religion ? (CASTES_BY_RELIGION[myProfile.religion] || ['Other']) : []} /></Field>
                  <Field label="Sub Caste"><Input value={myProfile.subCaste} onChange={(v: string) => updateField('subCaste', v)} placeholder="Sub-caste" /></Field>
                  <Field label="Gotra"><Input value={myProfile.gotra} onChange={(v: string) => updateField('gotra', v)} placeholder="Gotra" /></Field>
                  <Field label="Manglik"><Select value={myProfile.manglik} onChange={(v: string) => updateField('manglik', v)} options={MANGLIK_OPTIONS} /></Field>
                  <Field label="Mother Tongue" required><Select value={myProfile.motherTongue} onChange={(v: string) => updateField('motherTongue', v)} options={MOTHER_TONGUES} /></Field>
                  <Field label="Nakshatra"><Select value={myProfile.star || myProfile.nakshatra} onChange={(v: string) => updateField('star', v)} options={NAKSHATRAS} placeholder="Select Nakshatra" /></Field>
                  <Field label="Raasi"><Select value={myProfile.raasi} onChange={(v: string) => updateField('raasi', v)} options={RAASHIS} placeholder="Select Raasi" /></Field>
                  <Field label="Dosham"><Select value={myProfile.dosham} onChange={(v: string) => updateField('dosham', v)} options={['No','Yes']} /></Field>
                  <Field label="Horoscope Match Required">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={myProfile.horoscopeMatch || false} onChange={(e: any) => updateField('horoscopeMatch', e.target.checked)} className="w-4 h-4 rounded bg-zinc-200 text-amber-500 focus:ring-amber-500/40" />
                      <span className="text-sm text-zinc-700">Required</span>
                    </label>
                  </Field>
                </div>
              </div>
            )}

            {/* Step 2: Education */}
            {bioDataStep === 2 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-amber-500" /> Education & Career</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Highest Education" required><Select value={myProfile.education} onChange={(v: string) => updateField('education', v)} options={EDUCATION_LEVELS} /></Field>
                  <Field label="Education Detail"><Input value={myProfile.educationDetail} onChange={(v: string) => updateField('educationDetail', v)} placeholder="e.g., B.Tech CSE from IIT" /></Field>
                  <Field label="College"><Input value={myProfile.college} onChange={(v: string) => updateField('college', v)} placeholder="University" /></Field>
                  <Field label="Occupation" required><Input value={myProfile.occupation} onChange={(v: string) => updateField('occupation', v)} placeholder="Job title" /></Field>
                  <Field label="Company"><Input value={myProfile.company} onChange={(v: string) => updateField('company', v)} placeholder="Company" /></Field>
                  <Field label="Annual Income"><Select value={myProfile.annualIncome} onChange={(v: string) => updateField('annualIncome', v)} options={INCOMES} /></Field>
                  <Field label="Working City"><Input value={myProfile.workingCity} onChange={(v: string) => updateField('workingCity', v)} placeholder="e.g., Mumbai" /></Field>
                  <Field label="Working Country"><Input value={myProfile.workingCountry} onChange={(v: string) => updateField('workingCountry', v)} placeholder="e.g., India" /></Field>
                </div>
              </div>
            )}

            {/* Step 3: Family */}
            {bioDataStep === 3 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Home className="w-4 h-4 text-amber-500" /> Family Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Father's Name"><Input value={myProfile.fatherName} onChange={(v: string) => updateField('fatherName', v)} placeholder="Father's name" /></Field>
                  <Field label="Father's Occupation"><Input value={myProfile.fatherOccupation} onChange={(v: string) => updateField('fatherOccupation', v)} placeholder="e.g., Government Officer" /></Field>
                  <Field label="Mother's Name"><Input value={myProfile.motherName} onChange={(v: string) => updateField('motherName', v)} placeholder="Mother's name" /></Field>
                  <Field label="Mother's Occupation"><Input value={myProfile.motherOccupation} onChange={(v: string) => updateField('motherOccupation', v)} placeholder="e.g., Homemaker" /></Field>
                  <Field label="Brothers"><Input type="number" value={myProfile.brothers} onChange={(v: string) => updateField('brothers', parseInt(v) || 0)} /></Field>
                  <Field label="Brothers Married"><Input type="number" value={myProfile.brothersMarried} onChange={(v: string) => updateField('brothersMarried', parseInt(v) || 0)} /></Field>
                  <Field label="Sisters"><Input type="number" value={myProfile.sisters} onChange={(v: string) => updateField('sisters', parseInt(v) || 0)} /></Field>
                  <Field label="Sisters Married"><Input type="number" value={myProfile.sistersMarried} onChange={(v: string) => updateField('sistersMarried', parseInt(v) || 0)} /></Field>
                  <Field label="Family Type"><Select value={myProfile.familyType} onChange={(v: string) => updateField('familyType', v)} options={FAMILY_TYPES} /></Field>
                  <Field label="Family Status"><Select value={myProfile.familyStatus} onChange={(v: string) => updateField('familyStatus', v)} options={FAMILY_STATUS} /></Field>
                  <Field label="Family Values"><Select value={myProfile.familyValues} onChange={(v: string) => updateField('familyValues', v)} options={FAMILY_VALUES} /></Field>
                  <Field label="Native Place"><Input value={myProfile.nativePlace} onChange={(v: string) => updateField('nativePlace', v)} placeholder="Village/Town" /></Field>
                  <Field label="Family Income"><Select value={myProfile.familyIncome} onChange={(v: string) => updateField('familyIncome', v)} options={INCOMES} /></Field>
                </div>
              </div>
            )}

            {/* Step 4: Lifestyle */}
            {bioDataStep === 4 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500" /> Lifestyle & About</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Marital Status"><Select value={myProfile.maritalStatus} onChange={(v: string) => updateField('maritalStatus', v)} options={MARITAL_STATUSES} /></Field>
                  <Field label="Diet"><Select value={myProfile.diet} onChange={(v: string) => updateField('diet', v)} options={DIETS} /></Field>
                  <Field label="Drinking"><Select value={myProfile.drinking} onChange={(v: string) => updateField('drinking', v)} options={['No','Occasionally','Yes']} /></Field>
                  <Field label="Smoking"><Select value={myProfile.smoking} onChange={(v: string) => updateField('smoking', v)} options={['No','Occasionally','Yes']} /></Field>
                </div>
                <div className="space-y-4 pt-2">
                  <Field label="About Me"><Textarea value={myProfile.aboutMe} onChange={(v: string) => updateField('aboutMe', v)} placeholder="Write about yourself..." rows={4} /></Field>
                  <Field label="About Family"><Textarea value={myProfile.aboutFamily} onChange={(v: string) => updateField('aboutFamily', v)} placeholder="Describe family..." rows={4} /></Field>
                </div>
              </div>
            )}

            {/* Step 5: Contact & Privacy */}
            {bioDataStep === 5 && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" /> Contact & Privacy</h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700 flex items-start gap-2"><Shield className="w-4 h-4 shrink-0 mt-0.5" /> Your contact info is never shown publicly. Others must request access.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Phone" icon={Phone}><Input value={myProfile.phoneNumber} onChange={(v: string) => updateField('phoneNumber', v)} placeholder="+91 XXXXXXXXXX" /></Field>
                    <Field label="Alternate Phone"><Input value={myProfile.alternatePhone} onChange={(v: string) => updateField('alternatePhone', v)} placeholder="+91 XXXXXXXXXX" /></Field>
                    <Field label="LinkedIn" icon={Linkedin}><Input value={myProfile.linkedIn} onChange={(v: string) => updateField('linkedIn', v)} placeholder="linkedin.com/in/..." /></Field>
                    <Field label="Email" icon={Mail}><Input value={myProfile.contactEmail} onChange={(v: string) => updateField('contactEmail', v)} placeholder="email@example.com" /></Field>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-zinc-100">
                    <h4 className="text-xs font-semibold text-zinc-500">Privacy Defaults</h4>
                    {[
                      { key: 'bioDataPublic', label: 'Bio data visible to everyone' },
                      { key: 'phonePublic', label: 'Phone visible to everyone (not recommended)' },
                      { key: 'linkedInPublic', label: 'LinkedIn visible to everyone' },
                      { key: 'emailPublic', label: 'Email visible to everyone' },
                      { key: 'photosPublic', label: 'All photos visible to everyone' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer bg-zinc-50 rounded-xl p-3 hover:bg-zinc-100 transition border border-zinc-100">
                        <input type="checkbox" checked={myProfile[item.key] || false} onChange={(e: any) => updateField(item.key, e.target.checked)} className="w-4 h-4 rounded bg-zinc-200 text-amber-500 focus:ring-amber-500/40" />
                        <span className="text-sm text-zinc-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Template Selection (shown when profile >= 60% complete AND on step 5) */}
            {profileCompletion >= 60 && bioDataStep === 5 && (
              <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl border border-amber-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">🎨 Choose Your BioData Template</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Profile {profileCompletion}% complete</span>
                </div>
                <p className="text-xs text-zinc-500">Your profile is 60%+ complete! Choose a template to preview your Bio Data:</p>
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto scrollbar-none">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => { updateField('bioDataTemplate', t.id); setPreviewTemplate(t.id); setShowPreview(true); }}
                      className={cn('relative p-3 rounded-xl border-2 text-left transition-all hover:shadow-md',
                        myProfile?.bioDataTemplate === t.id ? 'border-amber-500 bg-white shadow-md ring-2 ring-amber-200' : 'border-zinc-200 bg-white hover:border-amber-300')}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` }}>
                          <span className="text-xs">{t.emoji}</span>
                        </div>
                        {t.premium && <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">⭐</span>}
                      </div>
                      <p className="text-[11px] font-semibold text-zinc-800 truncate">{t.name}</p>
                      <div className="flex gap-1 mt-1">
                        {t.colors.map((c, i) => <div key={i} className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />)}
                      </div>
                      {myProfile?.bioDataTemplate === t.id && <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><span className="text-white text-[9px]">✓</span></div>}
                    </button>
                  ))}
                </div>
                {myProfile?.bioDataTemplate && (
                  <button onClick={() => { setPreviewTemplate(myProfile.bioDataTemplate); setShowPreview(true); }}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-amber-700 bg-white border border-amber-200 hover:bg-amber-50 transition flex items-center justify-center gap-2">
                    <Eye className="w-3.5 h-3.5" /> Preview &ldquo;{TEMPLATES.find(t => t.id === myProfile.bioDataTemplate)?.name}&rdquo;
                  </button>
                )}
              </div>
            )}

            {/* Nav Buttons */}
            <div className="flex items-center justify-between">
              <button onClick={() => setBioDataStep(Math.max(0, bioDataStep - 1))} disabled={bioDataStep === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition disabled:opacity-30">
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {bioDataStep < 5 && (
                  <button onClick={() => setBioDataStep(bioDataStep + 1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition">
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MATCHES (3 TABS) ═══════════════════════════════ */}
        {section === 'matches' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500" /> My Matches</h2>
            {/* Tab bar */}
            <div className="flex gap-1 bg-amber-50/60 rounded-xl p-1 border border-amber-100">
              {([['matches', 'My Matches', matches.length], ['incoming', 'Incoming', incomingRequests.filter(r => r.status === 'pending').length], ['hold', 'On Hold', 0]] as const).map(([key, label, count]) => (
                <button key={key} onClick={() => setMatchTab(key as any)} className={cn('flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all', matchTab === key ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200' : 'text-zinc-500 hover:text-zinc-700')}>
                  {label} {count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">{count}</span>}
                </button>
              ))}
            </div>

            {/* Tab: Matches */}
            {matchTab === 'matches' && (
              matches.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
                  <Heart className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-sm text-zinc-500">No matches yet</p>
                  <p className="text-xs text-zinc-400 mt-1">Complete your profile for better matching</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {matches.map(p => <MatrimonialCard key={p.id} profile={p} onView={() => viewProfile(p.user?.id || p.userId)} />)}
                </div>
              )
            )}

            {/* Tab: Incoming Requests */}
            {matchTab === 'incoming' && (
              incomingRequests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
                  <Shield className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-sm text-zinc-500">No incoming requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map(req => {
                    const user = req.requester?.user;
                    return (
                      <div key={req.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-sm">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0">
                          <span className="text-base font-bold text-white">{user?.displayName?.[0] || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900">{user?.displayName || 'User'}</p>
                          <p className="text-xs text-zinc-500">Wants: <span className="text-amber-600 font-medium">{req.accessType}</span></p>
                          {req.message && <p className="text-xs text-zinc-400 mt-0.5 truncate">&ldquo;{req.message}&rdquo;</p>}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {req.status === 'pending' ? (
                            <>
                              <button onClick={() => handleAccessAction(req.id, 'grant')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">✓ Grant</button>
                              <button onClick={() => handleAccessAction(req.id, 'deny')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">✕ Deny</button>
                            </>
                          ) : req.status === 'granted' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">Granted</span>
                              <button onClick={() => handleAccessAction(req.id, 'revoke')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 transition-colors">Revoke</button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700">Denied</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Tab: On Hold */}
            {matchTab === 'hold' && (
              <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
                <Send className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-sm text-zinc-500">Profiles you put on hold will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ NUMEROLOGY ════════════════════════════ */}
        {section === 'numerology' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Hash className="w-5 h-5 text-purple-500" /> Numerology</h2>
            {!numerologyData ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <div className="text-5xl mb-4">🔢</div>
                <h3 className="text-base font-bold text-zinc-900 mb-2">Discover Your Numbers</h3>
                <p className="text-sm text-zinc-500 mb-5">Calculate your Life Path, Destiny & Soul numbers using Pythagorean + Vedic analysis.</p>
                <button onClick={loadNumerology} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-bold hover:shadow-lg transition">
                  Calculate My Numerology
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 4-Card Grid: Life Path, Destiny, Soul, Personal Year */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-purple-50 rounded-2xl p-5 text-center border border-purple-100">
                    <p className="text-4xl font-black text-purple-600">{numerologyData.lifePath}</p>
                    <p className="text-xs text-purple-500 font-semibold mt-2">Life Path</p>
                  </div>
                  <div className="bg-indigo-50 rounded-2xl p-5 text-center border border-indigo-100">
                    <p className="text-4xl font-black text-indigo-600">{numerologyData.destiny}</p>
                    <p className="text-xs text-indigo-500 font-semibold mt-2">Destiny</p>
                  </div>
                  <div className="bg-violet-50 rounded-2xl p-5 text-center border border-violet-100">
                    <p className="text-4xl font-black text-violet-600">{numerologyData.soul}</p>
                    <p className="text-xs text-violet-500 font-semibold mt-2">Soul</p>
                  </div>
                  <div className="bg-fuchsia-50 rounded-2xl p-5 text-center border border-fuchsia-100">
                    <p className="text-4xl font-black text-fuchsia-600">{numerologyData.personalYear || '—'}</p>
                    <p className="text-xs text-fuchsia-500 font-semibold mt-2">Personal Year</p>
                  </div>
                </div>

                {/* Info Rows */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-zinc-900 mb-3 flex items-center gap-2">🕉 Vedic Numerology Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Ruling Planet</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.rulingPlanet}</span></div>
                    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Lucky Gem</span><span className="text-sm text-zinc-800 font-medium">💎 {numerologyData.luckyGem || '—'}</span></div>
                    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Mantra</span><span className="text-sm text-zinc-800 font-medium italic">{numerologyData.mantra || '—'}</span></div>
                    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Hora Lord</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.horaLord || '—'}</span></div>
                    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Elemental Energy</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.elementalEnergy || '—'}</span></div>
                    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Lucky Day</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.luckyDay || '—'}</span></div>
                  </div>
                </div>

                {/* Karmic Debt Warning */}
                {numerologyData.hasKarmicDebt && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-orange-500 text-lg mt-0.5">⚠️</span>
                    <div>
                      <p className="text-sm font-bold text-orange-800">Karmic Debt Detected</p>
                      <p className="text-xs text-orange-600 mt-1">{numerologyData.karmicLesson || 'Past-life lessons require attention in this lifetime.'}</p>
                    </div>
                  </div>
                )}

                {/* Compatible Numbers */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
                  <div>
                    <p className="text-xs text-zinc-500 font-semibold mb-2">Compatible Numbers</p>
                    <div className="flex gap-2">
                      {numerologyData.compatibleNumbers?.map((n: number) => (
                        <span key={n} className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200">{n}</span>
                      ))}
                    </div>
                  </div>

                  {/* Lucky Colors as dots */}
                  <div>
                    <p className="text-xs text-zinc-500 font-semibold mb-2">Lucky Colors</p>
                    <div className="flex gap-2">
                      {numerologyData.luckyColors?.map((color: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full border border-zinc-200 shadow-sm" style={{ backgroundColor: color.toLowerCase().includes('gold') ? '#FFD700' : color.toLowerCase().includes('red') ? '#DC2626' : color.toLowerCase().includes('orange') ? '#EA580C' : color.toLowerCase().includes('yellow') ? '#EAB308' : color.toLowerCase().includes('green') ? '#16A34A' : color.toLowerCase().includes('blue') ? '#2563EB' : color.toLowerCase().includes('purple') ? '#9333EA' : color.toLowerCase().includes('white') ? '#F8FAFC' : color.toLowerCase().includes('pink') ? '#EC4899' : '#6B7280' }} />
                          <span className="text-xs text-zinc-600">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Traits as badges */}
                  <div>
                    <p className="text-xs text-zinc-500 font-semibold mb-2">Traits</p>
                    <div className="flex flex-wrap gap-2">
                      {numerologyData.traits?.map((t: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-100">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={() => { setFilters({ numerologyMatch: 'true', sortBy: 'numerology' }); setSection('browse'); applyFilters(); }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-bold hover:shadow-lg transition">
                  Browse Numerology-Compatible Profiles →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ KUNDLI / HOROSCOPE ══════════════════ */}
        {section === 'kundli' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Moon className="w-5 h-5 text-indigo-500" /> Kundli / Horoscope</h2>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900">Upload Your Kundli</h3>
              <p className="text-xs text-zinc-500">Upload your kundli/horoscope data. When both partners have kundli data, AI will analyze match compatibility using Ashtakoota system.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Kundli URL / Image Link"><Input value={myProfile?.kundliUrl} onChange={(v: string) => updateField('kundliUrl', v)} placeholder="https://...kundli.pdf" /></Field>
                <Field label="Nakshatra"><Select value={myProfile?.star || myProfile?.nakshatra} onChange={(v: string) => updateField('star', v)} options={NAKSHATRAS} placeholder="Select" /></Field>
                <Field label="Raasi"><Select value={myProfile?.raasi} onChange={(v: string) => updateField('raasi', v)} options={RAASHIS} placeholder="Select" /></Field>
                <Field label="Gotra"><Input value={myProfile?.gotra} onChange={(v: string) => updateField('gotra', v)} placeholder="Gotra" /></Field>
              </div>
              <button onClick={async () => { await saveProfile(); setSaveMsg('Kundli data saved!'); setTimeout(() => setSaveMsg(''), 3000); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg transition">
                Save Kundli Data
              </button>
            </div>
            <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5">
              <h3 className="text-sm font-bold text-zinc-700 mb-2">About Ashtakoota Matching</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">The traditional Ashtakoota system evaluates 8 aspects: <strong>Varna</strong> (spiritual), <strong>Vashya</strong> (attraction), <strong>Tara</strong> (health), <strong>Yoni</strong> (physical), <strong>Graha Maitri</strong> (mental), <strong>Gana</strong> (temperament), <strong>Bhakoot</strong> (love), and <strong>Nadi</strong> (progeny). Total 36 points. 18+ is considered acceptable.</p>
            </div>
          </div>
        )}

        {/* ═══ DTM CHAT ═══════════════════════════════ */}
        {section === 'chat' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-emerald-500" /> DTM Chat</h2>
            {!activeChatUserId ? (
              <div className="space-y-3">
                {dtmChats.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
                    <MessageCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <p className="text-sm text-zinc-500">No DTM chats yet</p>
                    <p className="text-xs text-zinc-400 mt-1">Browse profiles and start a conversation</p>
                  </div>
                ) : dtmChats.map(c => (
                  <button key={c.userId} onClick={() => openChat(c.userId)}
                    className="w-full bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4 hover:bg-zinc-50 transition text-left">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0">
                      <span className="text-base font-bold text-white">?</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{c.userId.slice(0, 8)}...</p>
                      <p className="text-xs text-zinc-500 truncate">{c.lastMessage?.message || 'No messages'}</p>
                    </div>
                    {c.unreadCount > 0 && <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">{c.unreadCount}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-100">
                  <button onClick={() => setActiveChatUserId(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><ChevronLeft className="w-4 h-4 text-zinc-600" /></button>
                  <p className="text-sm font-semibold text-zinc-900">Chat</p>
                </div>
                <div className="h-80 overflow-y-auto p-4 space-y-3 bg-zinc-50">
                  {chatMessages.length === 0 && <p className="text-center text-xs text-zinc-400 py-10">No messages yet. Say hello!</p>}
                  {chatMessages.map(m => (
                    <div key={m.id} className={cn('max-w-[75%] rounded-2xl p-3', m.senderId === myProfile?.userId ? 'ml-auto bg-amber-500 text-white' : 'bg-white border border-zinc-200 text-zinc-800')}>
                      <p className="text-sm">{m.message}</p>
                      <p className={cn('text-[10px] mt-1', m.senderId === myProfile?.userId ? 'text-amber-100' : 'text-zinc-400')}>{new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-zinc-100 flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                    className="flex-1 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" placeholder="Type a message..." />
                  <button onClick={sendChatMessage} className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 flex items-center justify-center hover:shadow-lg transition">
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ACCESS CONTROL (3-way: Grant / Deny / Revoke) ══════════════════════════ */}
        {section === 'access' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Shield className="w-5 h-5 text-teal-500" /> Access Control</h2>
            <p className="text-xs text-zinc-500 -mt-3">Manage who can see your biodata, photos, and contact details</p>

            {/* Incoming Requests */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">📥 Incoming Requests <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{incomingRequests.filter(r => r.status === 'pending').length} pending</span></h3>
              {incomingRequests.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-zinc-200"><Shield className="w-10 h-10 text-zinc-300 mx-auto mb-3" /><p className="text-sm text-zinc-500">No incoming requests</p></div>
              ) : incomingRequests.map(req => {
                const user = req.requester?.user;
                return (
                  <div key={req.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0">
                      <span className="text-base font-bold text-white">{user?.displayName?.[0] || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-zinc-500">Wants: <span className="text-amber-600 font-medium">{req.accessType}</span></p>
                      {req.message && <p className="text-xs text-zinc-400 mt-0.5 truncate italic">&ldquo;{req.message}&rdquo;</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {req.status === 'pending' ? (
                        <>
                          <button onClick={() => handleAccessAction(req.id, 'grant')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">✓ Grant</button>
                          <button onClick={() => handleAccessAction(req.id, 'deny')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">✕ Deny</button>
                        </>
                      ) : req.status === 'granted' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Granted</span>
                          <button onClick={() => handleAccessAction(req.id, 'revoke')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors">⟲ Revoke</button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">✕ Denied</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sent Requests */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">📤 Sent Requests <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{sentRequests.filter(r => r.status === 'pending').length} awaiting</span></h3>
              {sentRequests.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-zinc-200"><Send className="w-10 h-10 text-zinc-300 mx-auto mb-3" /><p className="text-sm text-zinc-500">No sent requests</p></div>
              ) : sentRequests.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0"><span className="text-base font-bold text-white">{req.owner?.user?.displayName?.[0] || '?'}</span></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-zinc-900">{req.owner?.user?.displayName || 'User'}</p><p className="text-xs text-zinc-500">Requested: <span className="text-amber-600 font-medium">{req.accessType}</span></p></div>
                  <span className={cn('text-xs font-medium px-3 py-1.5 rounded-lg border', req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : req.status === 'granted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')}>
                    {req.status === 'pending' ? '⏳ Awaiting' : req.status === 'granted' ? '✓ Granted' : '✕ Denied'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PARTNER PREFERENCES ════════════════════ */}
        {section === 'preferences' && myProfile && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Heart className="w-5 h-5 text-pink-500" /> Partner Preferences</h2>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Min Age"><Input type="number" value={myProfile.partnerAgeMin} onChange={(v: string) => updateField('partnerAgeMin', parseInt(v) || 21)} /></Field>
                <Field label="Max Age"><Input type="number" value={myProfile.partnerAgeMax} onChange={(v: string) => updateField('partnerAgeMax', parseInt(v) || 35)} /></Field>
                <Field label="Min Height"><Select value={myProfile.partnerHeightMin} onChange={(v: string) => updateField('partnerHeightMin', v)} options={HEIGHTS} placeholder="Any" /></Field>
                <Field label="Max Height"><Select value={myProfile.partnerHeightMax} onChange={(v: string) => updateField('partnerHeightMax', v)} options={HEIGHTS} placeholder="Any" /></Field>
                <Field label="Religion"><Select value={myProfile.partnerReligion} onChange={(v: string) => updateField('partnerReligion', v)} options={RELIGIONS} placeholder="Any" /></Field>
                <Field label="Caste"><Select value={myProfile.partnerCaste} onChange={(v: string) => updateField('partnerCaste', v)} options={myProfile.partnerReligion ? (CASTES_BY_RELIGION[myProfile.partnerReligion] || ['Other']) : []} placeholder="Any" /></Field>
                <Field label="Education"><Select value={myProfile.partnerEducation} onChange={(v: string) => updateField('partnerEducation', v)} options={EDUCATION_LEVELS} placeholder="Any" /></Field>
                <Field label="Occupation"><Input value={myProfile.partnerOccupation} onChange={(v: string) => updateField('partnerOccupation', v)} placeholder="Any" /></Field>
                <Field label="Min Income"><Select value={myProfile.partnerIncome} onChange={(v: string) => updateField('partnerIncome', v)} options={INCOMES} placeholder="Any" /></Field>
                <Field label="City"><Input value={myProfile.partnerCity} onChange={(v: string) => updateField('partnerCity', v)} placeholder="Any" /></Field>
                <Field label="Manglik"><Select value={myProfile.partnerManglik} onChange={(v: string) => updateField('partnerManglik', v)} options={MANGLIK_OPTIONS} placeholder="Any" /></Field>
                <Field label="Mother Tongue"><Select value={myProfile.partnerMotherTongue} onChange={(v: string) => updateField('partnerMotherTongue', v)} options={MOTHER_TONGUES} placeholder="Any" /></Field>
              </div>
              <Field label="What you expect in a life partner"><Textarea value={myProfile.partnerExpectation} onChange={(v: string) => updateField('partnerExpectation', v)} placeholder="Describe ideal partner..." rows={4} /></Field>
            </div>
            <button onClick={saveProfile} disabled={saving} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* ═══ PRIVACY & SECURITY ═════════════════════ */}
        {section === 'privacy' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Lock className="w-5 h-5 text-zinc-600" /> Privacy & Security</h2>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900">Who can see your info</h3>
              {[
                { key: 'bioDataPublic', label: 'Bio Data', desc: 'Allow everyone to view your bio data' },
                { key: 'phonePublic', label: 'Phone Number', desc: 'Allow everyone to see your phone (not recommended)' },
                { key: 'linkedInPublic', label: 'LinkedIn', desc: 'Allow everyone to see your LinkedIn' },
                { key: 'emailPublic', label: 'Email Address', desc: 'Allow everyone to see your email' },
                { key: 'photosPublic', label: 'All Photos', desc: 'Show all photos to everyone' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-zinc-50 last:border-0">
                  <div><p className="text-sm text-zinc-800 font-medium">{item.label}</p><p className="text-[10px] text-zinc-400">{item.desc}</p></div>
                  <button onClick={() => updateField(item.key, !myProfile?.[item.key])}
                    className={cn('w-12 h-7 rounded-full transition-colors relative', myProfile?.[item.key] ? 'bg-amber-500' : 'bg-zinc-200')}>
                    <div className={cn('w-5 h-5 rounded-full bg-white shadow-sm absolute top-1 transition-all', myProfile?.[item.key] ? 'right-1' : 'left-1')} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={saveProfile} disabled={saving} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Privacy Settings'}
            </button>
          </div>
        )}

        {/* ═══ TEMPLATES ══════════════════════════════ */}
        {section === 'templates' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Palette className="w-5 h-5 text-orange-500" /> Bio Data Templates</h2>
            <p className="text-sm text-zinc-500">Choose a template theme. Preview will use the selected template with your profile data.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { updateField('bioDataTemplate', t.id); setPreviewTemplate(t.id); }}
                  className={cn('relative rounded-2xl p-4 text-left transition border overflow-hidden',
                    (myProfile?.bioDataTemplate || previewTemplate) === t.id ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200' : 'border-zinc-200 hover:border-zinc-300 bg-white')}>
                  {t.premium && <div className="absolute top-2 right-2"><Crown className="w-3.5 h-3.5 text-amber-500" /></div>}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `linear-gradient(135deg, ${t.colors[0]}40, ${t.colors[1]}40)` }}>{t.emoji}</div>
                    {(myProfile?.bioDataTemplate || previewTemplate) === t.id && <Check className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 truncate">{t.name}</p>
                  <div className="flex gap-1 mt-2">{t.colors.map((c, i) => <div key={i} className="w-4 h-4 rounded-full border border-zinc-200" style={{ background: c }} />)}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={saveProfile} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition">Save Template</button>
              {myProfile?.fullName && (
                <button onClick={() => { setPreviewTemplate(myProfile.bioDataTemplate || previewTemplate || 'royal-rajasthani'); setShowPreview(true); }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Preview with this Template
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ BIO DATA PREVIEW MODAL ═══════════════════ */}
      <AnimatePresence>
        {showPreview && myProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl p-6"
              onClick={(e: any) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><ScrollText className="w-5 h-5 text-amber-500" /> Bio Data Preview</h2>
                <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X className="w-4 h-4 text-zinc-600" /></button>
              </div>
              <BioDataPreview profile={myProfile} templateId={previewTemplate || myProfile.bioDataTemplate || 'royal-rajasthani'} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PROFILE DETAIL MODAL ═════════════════════ */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileDetailModal
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onRequestAccess={requestAccess}
            onCheckCompat={() => checkCompatibility(selectedProfile.user?.id || selectedProfile.userId)}
          />
        )}
      </AnimatePresence>

      {/* ═══ COMPATIBILITY MODAL ═════════════════════ */}
      <AnimatePresence>
        {compatData && <CompatibilityModal data={compatData} onClose={() => setCompatData(null)} />}
      </AnimatePresence>
    </div>
  );
}
