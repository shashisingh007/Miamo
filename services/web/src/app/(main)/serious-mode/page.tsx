'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake, Shield, CheckCircle, Users, Lock, Eye, EyeOff,
  Phone, Linkedin, Mail, FileText, Star, Crown, Sparkles,
  Search, Filter, ChevronRight, ChevronDown, X, Check,
  MapPin, Briefcase, GraduationCap, Heart, Home, Clock,
  Download, Palette, Send, AlertTriangle, UserCheck, Gem,
  ScrollText, Camera, Globe, ArrowRight, ArrowLeft, Info,
  Building, Utensils, Wine, Cigarette, Moon, Sun, Baby,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
   BIO DATA TEMPLATES — 20 Indian Regional Themes
   ═══════════════════════════════════════════════════════════ */
const TEMPLATES = [
  { id: 'royal-rajasthani', name: 'Royal Rajasthani', colors: ['#8B0000', '#FFD700', '#FFF8DC'], emoji: '🏰', premium: false },
  { id: 'south-indian-temple', name: 'South Indian Temple', colors: ['#006400', '#FFD700', '#FFF5E1'], emoji: '🛕', premium: false },
  { id: 'bengali-lal-paar', name: 'Bengali Lal Paar', colors: ['#DC143C', '#FFFFFF', '#FFE4E1'], emoji: '🌺', premium: false },
  { id: 'punjabi-phulkari', name: 'Punjabi Phulkari', colors: ['#FF6B00', '#FFD700', '#FF1493'], emoji: '🧵', premium: false },
  { id: 'gujarati-bandhani', name: 'Gujarati Bandhani', colors: ['#FF0000', '#008000', '#FFD700'], emoji: '🪞', premium: false },
  { id: 'marathi-paithani', name: 'Marathi Paithani', colors: ['#FF8C00', '#006400', '#FFD700'], emoji: '🦚', premium: false },
  { id: 'kerala-kasavu', name: 'Kerala Kasavu', colors: ['#FFFFF0', '#FFD700', '#8B4513'], emoji: '🌴', premium: false },
  { id: 'lucknowi-chikan', name: 'Lucknowi Chikan', colors: ['#FFFFFF', '#F0E6FF', '#E8F5E9'], emoji: '🕌', premium: false },
  { id: 'mughal-royal', name: 'Mughal Royal', colors: ['#000080', '#FFD700', '#F5F5DC'], emoji: '👑', premium: true },
  { id: 'kashmiri-pashmina', name: 'Kashmiri Pashmina', colors: ['#800020', '#C19A6B', '#F5DEB3'], emoji: '🏔️', premium: true },
  { id: 'assamese-mekhela', name: 'Assamese Mekhela', colors: ['#B22222', '#FFD700', '#FFFAF0'], emoji: '🎋', premium: false },
  { id: 'odia-bomkai', name: 'Odia Bomkai', colors: ['#800000', '#FF8C00', '#FFFACD'], emoji: '🏛️', premium: false },
  { id: 'manipuri-phanek', name: 'Manipuri Phanek', colors: ['#FF69B4', '#8B008B', '#FFE4B5'], emoji: '🌸', premium: false },
  { id: 'hyderabadi-pearl', name: 'Hyderabadi Pearl', colors: ['#FFFFF0', '#008080', '#FFD700'], emoji: '💎', premium: true },
  { id: 'goan-catholic', name: 'Goan Christian', colors: ['#FFFFFF', '#4169E1', '#FFD700'], emoji: '⛪', premium: false },
  { id: 'sikh-golden', name: 'Sikh Golden Temple', colors: ['#FFD700', '#FFFFFF', '#FF8C00'], emoji: '☬', premium: false },
  { id: 'jain-peaceful', name: 'Jain Shanti', colors: ['#FFFFFF', '#FF8C00', '#006400'], emoji: '☸️', premium: false },
  { id: 'modern-minimal', name: 'Modern Minimal', colors: ['#2D3748', '#EDF2F7', '#A78BFA'], emoji: '✨', premium: false },
  { id: 'rose-garden', name: 'Rose Garden', colors: ['#FFC0CB', '#FF69B4', '#FFE4E1'], emoji: '🌹', premium: true },
  { id: 'midnight-royal', name: 'Midnight Royal', colors: ['#1A1A2E', '#FFD700', '#E94560'], emoji: '🌙', premium: true },
];

/* ─── Dropdown data ──────────────────────────────────── */
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'Other'];
const CASTES_BY_RELIGION: Record<string, string[]> = {
  Hindu: ['Brahmin', 'Rajput', 'Marwari', 'Agarwal', 'Jat', 'Kayastha', 'Vaishya', 'Khatri', 'Yadav', 'Gupta', 'Sharma', 'Verma', 'Patel', 'Nair', 'Iyer', 'Iyengar', 'Reddy', 'Naidu', 'Lingayat', 'Vokkaliga', 'Kurmi', 'Baniya', 'Arora', 'Thakur', 'Other'],
  Muslim: ['Syed', 'Sheikh', 'Pathan', 'Mughal', 'Ansari', 'Khan', 'Qureshi', 'Bohra', 'Memon', 'Other'],
  Sikh: ['Jat Sikh', 'Khatri Sikh', 'Arora Sikh', 'Ramgarhia', 'Saini', 'Other'],
  Christian: ['Roman Catholic', 'Syrian Christian', 'Protestant', 'CSI', 'Other'],
  Jain: ['Digambar', 'Shwetambar', 'Other'],
  Buddhist: ['Mahayana', 'Theravada', 'Neo-Buddhist', 'Other'],
};
const MOTHER_TONGUES = ['Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Punjabi', 'Assamese', 'Maithili', 'Sindhi', 'Konkani', 'Dogri', 'Kashmiri', 'Sanskrit', 'English', 'Other'];
const HEIGHTS = ['4\'0"', '4\'1"', '4\'2"', '4\'3"', '4\'4"', '4\'5"', '4\'6"', '4\'7"', '4\'8"', '4\'9"', '4\'10"', '4\'11"', '5\'0"', '5\'1"', '5\'2"', '5\'3"', '5\'4"', '5\'5"', '5\'6"', '5\'7"', '5\'8"', '5\'9"', '5\'10"', '5\'11"', '6\'0"', '6\'1"', '6\'2"', '6\'3"', '6\'4"', '6\'5"'];
const EDUCATION_LEVELS = ['High School', 'Diploma', 'B.A.', 'B.Sc.', 'B.Com.', 'B.Tech/B.E.', 'BBA', 'BCA', 'MBBS', 'BDS', 'B.Pharm', 'LLB', 'B.Ed.', 'M.A.', 'M.Sc.', 'M.Com.', 'M.Tech/M.E.', 'MBA', 'MCA', 'MD', 'MS', 'M.Phil.', 'Ph.D.', 'CA', 'CS', 'ICWA', 'IAS/IPS/IFS', 'Other'];
const INCOMES = ['Not specified', 'Below 2 Lakh', '2-4 Lakh', '4-6 Lakh', '6-8 Lakh', '8-10 Lakh', '10-15 Lakh', '15-20 Lakh', '20-30 Lakh', '30-50 Lakh', '50-75 Lakh', '75 Lakh - 1 Cr', '1 Cr+', '2 Cr+', '5 Cr+'];
const FAMILY_TYPES = ['Nuclear', 'Joint', 'Extended'];
const FAMILY_STATUS = ['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent'];
const FAMILY_VALUES = ['Orthodox', 'Traditional', 'Moderate', 'Liberal'];
const MARITAL_STATUSES = ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'];
const DIETS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Jain', 'Vegan'];
const MANGLIK_OPTIONS = ['No', 'Yes', 'Partial / Anshik', "Doesn't Matter"];
const COMPLEXIONS = ['Very Fair', 'Fair', 'Wheatish', 'Wheatish Brown', 'Dark'];
const BODY_TYPES = ['Slim', 'Average', 'Athletic', 'Heavy'];

/* ─── Form Field Component ───────────────────────────── */
function Field({ label, icon: Icon, children, required }: { label: string; icon?: any; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: any) {
  return (
    <input type={type} value={value || ''} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 outline-none transition disabled:opacity-50" />
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value || ''} onChange={(e: any) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 outline-none transition appearance-none cursor-pointer">
      <option value="" className="bg-gray-900">{placeholder || 'Select...'}</option>
      {options.map(o => <option key={o} value={o} className="bg-gray-900">{o}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: any) {
  return (
    <textarea value={value || ''} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 outline-none transition resize-none" />
  );
}

/* ═══════════════════════════════════════════════════════════
   BIO DATA PREVIEW — Template-Based Visual Card
   ═══════════════════════════════════════════════════════════ */
function BioDataPreview({ profile, templateId }: { profile: any; templateId: string }) {
  const tmpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const [c1, c2, c3] = tmpl.colors;

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${c1}20 0%, ${c2}10 50%, ${c3}08 100%)`, border: `2px solid ${c1}40` }}>
      {/* Decorative border pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(45deg, ${c2} 0, ${c2} 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, ${c2} 0, ${c2} 1px, transparent 0, transparent 50%)`,
        backgroundSize: '20px 20px',
      }} />

      <div className="relative p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2 pb-4" style={{ borderBottom: `2px dashed ${c1}30` }}>
          <div className="text-3xl mb-1">{tmpl.emoji}</div>
          <h2 className="text-xl font-bold" style={{ color: c2 }}>॥ श्री गणेशाय नमः ॥</h2>
          <p className="text-lg font-semibold text-white">{tmpl.name} Bio Data</p>
          <div className="w-24 h-0.5 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${c2}, transparent)` }} />
        </div>

        {/* Name */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white">{profile.fullName || 'Your Name'}</h3>
          {profile.dateOfBirth && <p className="text-sm mt-1" style={{ color: c2 }}>Date of Birth: {new Date(profile.dateOfBirth).toLocaleDateString('en-IN')}</p>}
        </div>

        {/* Personal Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { l: 'Religion', v: profile.religion },
            { l: 'Caste', v: profile.caste },
            { l: 'Sub Caste', v: profile.subCaste },
            { l: 'Gotra', v: profile.gotra },
            { l: 'Manglik', v: profile.manglik },
            { l: 'Mother Tongue', v: profile.motherTongue },
            { l: 'Height', v: profile.height },
            { l: 'Complexion', v: profile.complexion },
            { l: 'Body Type', v: profile.bodyType },
            { l: 'Blood Group', v: profile.bloodGroup },
          ].filter(x => x.v).map(({ l, v }) => (
            <div key={l} className="flex justify-between px-3 py-2 rounded-lg" style={{ background: `${c1}10` }}>
              <span className="text-gray-400">{l}:</span>
              <span className="font-medium text-white">{v}</span>
            </div>
          ))}
        </div>

        {/* Education & Career */}
        {(profile.education || profile.occupation) && (
          <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${c1}20` }}>
            <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: c2 }}>
              <GraduationCap className="w-4 h-4" /> Education & Career
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { l: 'Education', v: profile.education },
                { l: 'College', v: profile.college },
                { l: 'Occupation', v: profile.occupation },
                { l: 'Company', v: profile.company },
                { l: 'Annual Income', v: profile.annualIncome },
                { l: 'Working City', v: profile.workingCity },
              ].filter(x => x.v).map(({ l, v }) => (
                <div key={l} className="flex justify-between px-3 py-2 rounded-lg" style={{ background: `${c1}10` }}>
                  <span className="text-gray-400">{l}:</span>
                  <span className="font-medium text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family Details */}
        {(profile.fatherName || profile.familyType) && (
          <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${c1}20` }}>
            <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: c2 }}>
              <Home className="w-4 h-4" /> Family Details
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { l: "Father's Name", v: profile.fatherName },
                { l: "Father's Occupation", v: profile.fatherOccupation },
                { l: "Mother's Name", v: profile.motherName },
                { l: "Mother's Occupation", v: profile.motherOccupation },
                { l: 'Brothers', v: profile.brothers > 0 ? `${profile.brothers} (${profile.brothersMarried} married)` : null },
                { l: 'Sisters', v: profile.sisters > 0 ? `${profile.sisters} (${profile.sistersMarried} married)` : null },
                { l: 'Family Type', v: profile.familyType },
                { l: 'Family Status', v: profile.familyStatus },
                { l: 'Family Values', v: profile.familyValues },
                { l: 'Native Place', v: profile.nativePlace },
              ].filter(x => x.v).map(({ l, v }) => (
                <div key={l} className="flex justify-between px-3 py-2 rounded-lg" style={{ background: `${c1}10` }}>
                  <span className="text-gray-400">{l}:</span>
                  <span className="font-medium text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lifestyle */}
        <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${c1}20` }}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: c2 }}>
            <Sun className="w-4 h-4" /> Lifestyle
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { l: 'Marital Status', v: profile.maritalStatus },
              { l: 'Diet', v: profile.diet },
              { l: 'Drinking', v: profile.drinking },
              { l: 'Smoking', v: profile.smoking },
            ].filter(x => x.v).map(({ l, v }) => (
              <div key={l} className="flex justify-between px-3 py-2 rounded-lg" style={{ background: `${c1}10` }}>
                <span className="text-gray-400">{l}:</span>
                <span className="font-medium text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        {(profile.aboutMe || profile.aboutFamily) && (
          <div className="space-y-3 pt-3" style={{ borderTop: `1px solid ${c1}20` }}>
            {profile.aboutMe && (
              <div>
                <h4 className="text-xs font-semibold mb-1" style={{ color: c2 }}>About Me</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{profile.aboutMe}</p>
              </div>
            )}
            {profile.aboutFamily && (
              <div>
                <h4 className="text-xs font-semibold mb-1" style={{ color: c2 }}>About Family</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{profile.aboutFamily}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4" style={{ borderTop: `2px dashed ${c1}30` }}>
          <p className="text-xs text-gray-500">Generated by Miamo • Date to Marry</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400">Verified by Miamo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE CARD — For browse & matches
   ═══════════════════════════════════════════════════════════ */
function MatrimonialCard({ profile: p, onView }: { profile: any; onView: () => void }) {
  const photo = p.user?.photos?.[0]?.url;
  const userProfile = p.user?.profile;
  const gradient = userProfile?.avatarGradient || 'from-amber-400 to-rose-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-2xl border border-white/10 overflow-hidden hover:border-amber-500/30 transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      {/* Photo or gradient avatar */}
      <div className="relative h-48 overflow-hidden">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-60 flex items-center justify-center`}>
            <span className="text-5xl font-bold text-white/80">{p.fullName?.[0] || p.user?.displayName?.[0] || '?'}</span>
          </div>
        )}
        {/* Verification badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.idVerified && (
            <div className="bg-emerald-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">ID Verified</span>
            </div>
          )}
          {p.photoVerified && (
            <div className="bg-blue-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
              <Camera className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">Photo ✓</span>
            </div>
          )}
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-bold text-white truncate">{p.fullName || p.user?.displayName}</h3>
          <p className="text-xs text-gray-300">{userProfile?.age ? `${userProfile.age} yrs` : ''} {p.height ? `• ${p.height}` : ''}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {p.religion && <span className="text-[10px] bg-amber-500/10 text-amber-400 rounded-full px-2 py-0.5 font-medium">{p.religion}</span>}
          {p.caste && <span className="text-[10px] bg-rose-500/10 text-rose-400 rounded-full px-2 py-0.5 font-medium">{p.caste}</span>}
          {p.motherTongue && <span className="text-[10px] bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5 font-medium">{p.motherTongue}</span>}
          {p.manglik === 'Yes' && <span className="text-[10px] bg-orange-500/10 text-orange-400 rounded-full px-2 py-0.5 font-medium">Manglik</span>}
        </div>

        <div className="space-y-1.5 text-xs text-gray-400">
          {p.education && <div className="flex items-center gap-1.5"><GraduationCap className="w-3 h-3 text-amber-400/60" /> {p.education}</div>}
          {p.occupation && <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-amber-400/60" /> {p.occupation}{p.company ? ` at ${p.company}` : ''}</div>}
          {p.workingCity && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-amber-400/60" /> {p.workingCity}</div>}
          {p.annualIncome && p.annualIncome !== 'Not specified' && <div className="flex items-center gap-1.5"><Building className="w-3 h-3 text-amber-400/60" /> ₹{p.annualIncome}</div>}
        </div>

        {/* Access indicators */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1 text-[10px]">
            <Phone className={`w-3 h-3 ${p.hasPhone ? 'text-emerald-400' : 'text-gray-600'}`} />
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Linkedin className={`w-3 h-3 ${p.hasLinkedIn ? 'text-blue-400' : 'text-gray-600'}`} />
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Mail className={`w-3 h-3 ${p.hasEmail ? 'text-amber-400' : 'text-gray-600'}`} />
          </div>
          <div className="flex-1" />
          <button onClick={(e) => { e.stopPropagation(); onView(); }}
            className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
            View Profile <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE DETAIL MODAL
   ═══════════════════════════════════════════════════════════ */
function ProfileDetailModal({ profile: p, onClose, onRequestAccess }: { profile: any; onClose: () => void; onRequestAccess: (type: string) => void }) {
  const photo = p.user?.photos?.[0]?.url;
  const userProfile = p.user?.profile;
  const gradient = userProfile?.avatarGradient || 'from-amber-400 to-rose-500';
  const grantedAccess = new Set((p.accessGrants || []).filter((a: any) => a.status === 'granted').map((a: any) => a.type));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
        className="bg-[#0F0F14] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
        onClick={(e: any) => e.stopPropagation()}>
        {/* Close */}
        <div className="sticky top-0 z-10 flex justify-end p-4">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Photo */}
        <div className="px-6 -mt-4">
          <div className="relative h-64 rounded-2xl overflow-hidden">
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-60 flex items-center justify-center`}>
                <span className="text-7xl font-bold text-white/80">{p.fullName?.[0] || '?'}</span>
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {p.idVerified && <div className="bg-emerald-500/90 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> ID Verified</div>}
              {p.educationVerified && <div className="bg-blue-500/90 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Education ✓</div>}
              {p.incomeVerified && <div className="bg-amber-500/90 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Income ✓</div>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">{p.fullName || p.user?.displayName}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {userProfile?.age ? `${userProfile.age} yrs` : ''} {p.height ? `• ${p.height}` : ''} {p.workingCity ? `• ${p.workingCity}` : ''}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {p.religion && <span className="text-xs bg-amber-500/10 text-amber-400 rounded-full px-3 py-1 font-medium">{p.religion}</span>}
            {p.caste && <span className="text-xs bg-rose-500/10 text-rose-400 rounded-full px-3 py-1 font-medium">{p.caste}</span>}
            {p.subCaste && <span className="text-xs bg-pink-500/10 text-pink-400 rounded-full px-3 py-1 font-medium">{p.subCaste}</span>}
            {p.gotra && <span className="text-xs bg-purple-500/10 text-purple-400 rounded-full px-3 py-1 font-medium">Gotra: {p.gotra}</span>}
            {p.manglik === 'Yes' && <span className="text-xs bg-orange-500/10 text-orange-400 rounded-full px-3 py-1 font-medium">Manglik</span>}
            {p.motherTongue && <span className="text-xs bg-blue-500/10 text-blue-400 rounded-full px-3 py-1 font-medium">{p.motherTongue}</span>}
            {p.maritalStatus && <span className="text-xs bg-emerald-500/10 text-emerald-400 rounded-full px-3 py-1 font-medium">{p.maritalStatus}</span>}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: GraduationCap, l: 'Education', v: p.education },
              { icon: Briefcase, l: 'Occupation', v: p.occupation },
              { icon: Building, l: 'Company', v: p.company },
              { icon: Building, l: 'Income', v: p.annualIncome && p.annualIncome !== 'Not specified' ? `₹${p.annualIncome}` : null },
              { icon: MapPin, l: 'Working City', v: p.workingCity },
              { icon: Home, l: 'Family Type', v: p.familyType },
              { icon: Users, l: 'Family Status', v: p.familyStatus },
              { icon: Utensils, l: 'Diet', v: p.diet },
              { icon: Wine, l: 'Drinking', v: p.drinking },
              { icon: Cigarette, l: 'Smoking', v: p.smoking },
            ].filter(x => x.v).map(({ icon: Icon, l, v }) => (
              <div key={l} className="bg-white/5 rounded-xl p-3 flex items-start gap-2.5">
                <Icon className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{l}</p>
                  <p className="text-sm text-white font-medium mt-0.5">{v}</p>
                </div>
              </div>
            ))}
          </div>

          {/* About */}
          {p.aboutMe && (
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-amber-400 mb-2">About Me</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{p.aboutMe}</p>
            </div>
          )}
          {p.aboutFamily && (
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-amber-400 mb-2">About Family</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{p.aboutFamily}</p>
            </div>
          )}

          {/* Access Control */}
          {!p.isOwn && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400" /> Request Access</h4>
              <p className="text-xs text-gray-500">This person&apos;s contact info is protected. Request access and they&apos;ll decide whether to share.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'bioData', label: 'Bio Data', icon: FileText, color: 'amber' },
                  { type: 'phone', label: 'Phone Number', icon: Phone, color: 'emerald' },
                  { type: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'blue' },
                  { type: 'email', label: 'Email', icon: Mail, color: 'purple' },
                  { type: 'photos', label: 'All Photos', icon: Camera, color: 'pink' },
                  { type: 'horoscope', label: 'Horoscope', icon: Moon, color: 'indigo' },
                ].map(item => {
                  const granted = grantedAccess.has(item.type);
                  return (
                    <button key={item.type} onClick={() => !granted && onRequestAccess(item.type)} disabled={granted}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl text-xs font-medium transition',
                        granted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-gray-400 hover:bg-amber-500/10 hover:text-amber-400 border border-white/5 hover:border-amber-500/20'
                      )}>
                      <item.icon className="w-4 h-4" />
                      {granted ? `${item.label} ✓` : `Request ${item.label}`}
                    </button>
                  );
                })}
              </div>

              {/* Show contact info if granted */}
              {(p.phoneNumber || p.linkedIn || p.contactEmail) && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Shared Contact Info</h5>
                  {p.phoneNumber && <p className="text-sm text-white flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {p.phoneNumber}</p>}
                  {p.linkedIn && <p className="text-sm text-white flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-blue-400" /> {p.linkedIn}</p>}
                  {p.contactEmail && <p className="text-sm text-white flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-amber-400" /> {p.contactEmail}</p>}
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
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'home', label: 'Home', icon: HeartHandshake },
  { id: 'biodata', label: 'My Bio Data', icon: ScrollText },
  { id: 'browse', label: 'Browse', icon: Search },
  { id: 'access', label: 'Access Control', icon: Shield },
  { id: 'preferences', label: 'Partner Pref', icon: Heart },
] as const;

type TabId = typeof TABS[number]['id'];

export default function DateToMarryPage() {
  const [tab, setTab] = useState<TabId>('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [browseProfiles, setBrowseProfiles] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState('');
  const [bioDataStep, setBioDataStep] = useState(0);

  // Load initial data
  useEffect(() => {
    Promise.all([
      api.getMatrimonialProfile().catch(() => ({ data: null })),
      api.getMatrimonialMatches().catch(() => ({ data: [] })),
      api.browseMatrimonial().catch(() => ({ data: [] })),
      api.getIncomingAccessRequests().catch(() => ({ data: [] })),
      api.getSentAccessRequests().catch(() => ({ data: [] })),
    ]).then(([profileRes, matchRes, browseRes, incomingRes, sentRes]) => {
      if (profileRes.data) setMyProfile(profileRes.data);
      setMatches(matchRes.data || []);
      setBrowseProfiles(browseRes.data || []);
      setIncomingRequests(incomingRes.data || []);
      setSentRequests(sentRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const updateField = useCallback((key: string, value: any) => {
    setMyProfile((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!myProfile || saving) return;
    setSaving(true);
    try {
      const res = await api.updateMatrimonialProfile(myProfile);
      if (res.data) setMyProfile(res.data);
      setSaveMsg('Profile saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg('Failed to save. Try again.');
    } finally { setSaving(false); }
  }, [myProfile, saving]);

  const handleAccessAction = useCallback(async (id: string, action: 'grant' | 'deny' | 'revoke') => {
    try {
      await api.handleAccessRequest(id, action);
      setIncomingRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'grant' ? 'granted' : action === 'deny' ? 'denied' : 'revoked' } : r));
    } catch {}
  }, []);

  const handleRequestAccess = useCallback(async (type: string) => {
    if (!selectedProfile) return;
    try {
      await api.requestAccess(selectedProfile.user?.id || selectedProfile.userId, type, 'I would like to view your ' + type);
      setSaveMsg('Access request sent!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {}
  }, [selectedProfile]);

  const applyFilters = useCallback(async () => {
    try {
      const res = await api.browseMatrimonial(filters);
      setBrowseProfiles(res.data || []);
    } catch {}
  }, [filters]);

  const viewFullProfile = useCallback(async (userId: string) => {
    try {
      const res = await api.getMatrimonialUserProfile(userId);
      setSelectedProfile(res.data);
    } catch {}
  }, []);

  if (loading) return <MiamoLoader text="Loading Date to Marry..." />;

  /* ─── Bio Data Multi-Step Form ───────────────────── */
  const BIO_DATA_STEPS = [
    { title: 'Personal Details', icon: Users },
    { title: 'Religion & Caste', icon: Moon },
    { title: 'Education & Career', icon: GraduationCap },
    { title: 'Family Details', icon: Home },
    { title: 'Lifestyle & About', icon: Sun },
    { title: 'Contact & Privacy', icon: Lock },
  ];

  return (
    <div className="min-h-screen">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-rose-900/10 to-purple-900/10" />
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #FFD700 1px, transparent 1px), radial-gradient(circle at 80% 50%, #FFD700 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="relative px-6 pt-8 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Date to Marry</h1>
                <p className="text-xs text-gray-400">Find your life partner • Indian Matrimonial</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="relative px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                    tab === t.id ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save message toast */}
      <AnimatePresence>
        {saveMsg && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl">
            <CheckCircle className="w-4 h-4 inline mr-2" />{saveMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* ═══ HOME TAB ═══════════════════════════════ */}
        {tab === 'home' && (
          <div className="space-y-6">
            {/* Profile Completion Card */}
            {myProfile && (
              <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/5 rounded-2xl border border-amber-500/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400" /> Your Matrimonial Profile</h3>
                  <span className="text-xs text-amber-400 font-medium">
                    {Math.min(100, [myProfile.fullName, myProfile.religion, myProfile.caste, myProfile.education, myProfile.occupation, myProfile.fatherName].filter(Boolean).length * 16)}% Complete
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, [myProfile.fullName, myProfile.religion, myProfile.caste, myProfile.education, myProfile.occupation, myProfile.fatherName].filter(Boolean).length * 16)}%` }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTab('biodata')} className="text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition font-medium">
                    {myProfile.fullName ? 'Edit Bio Data' : 'Create Bio Data'} →
                  </button>
                  {myProfile.fullName && (
                    <button onClick={() => setShowPreview(true)} className="text-xs bg-white/5 text-gray-400 hover:bg-white/10 px-3 py-1.5 rounded-lg transition font-medium">
                      Preview Bio Data
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Trust & Security */}
            <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl border border-emerald-500/20 p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-emerald-400" /> Trust & Security</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: Lock, text: 'No Direct Number Sharing', desc: 'Numbers only shared via controlled access grants' },
                  { icon: Shield, text: 'ID Verification', desc: 'Verify your identity for trusted badge' },
                  { icon: Eye, text: 'Access Control', desc: 'You decide who sees your contact info' },
                  { icon: UserCheck, text: 'Verified Profiles', desc: 'Photo, education & income verification' },
                  { icon: AlertTriangle, text: 'Report & Block', desc: 'Instant reporting for suspicious profiles' },
                  { icon: FileText, text: 'Bio Data Privacy', desc: 'Your bio data is shared only with permission' },
                ].map(item => (
                  <div key={item.text} className="bg-white/5 rounded-xl p-3 space-y-1">
                    <item.icon className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-semibold text-white">{item.text}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Matches (same caste/religion) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Heart className="w-4 h-4 text-rose-400" /> Recommended for You</h3>
                <button onClick={() => setTab('browse')} className="text-xs text-amber-400 hover:text-amber-300 transition">View All →</button>
              </div>
              {matches.length === 0 ? (
                <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-white/5">
                  <HeartHandshake className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-1">No matches yet</p>
                  <p className="text-xs text-gray-600">Complete your profile to find compatible matches</p>
                  <button onClick={() => setTab('biodata')} className="mt-3 text-xs bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition">
                    Complete Profile →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.slice(0, 6).map(p => (
                    <MatrimonialCard key={p.id} profile={p} onView={() => viewFullProfile(p.user?.id || p.userId)} />
                  ))}
                </div>
              )}
            </div>

            {/* Pending access requests */}
            {incomingRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Lock className="w-4 h-4 text-amber-400" /> Pending Access Requests ({incomingRequests.filter(r => r.status === 'pending').length})</h3>
                <button onClick={() => setTab('access')} className="text-xs text-amber-400 hover:text-amber-300 transition">Review Requests →</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ BIO DATA TAB ═══════════════════════════ */}
        {tab === 'biodata' && myProfile && (
          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {BIO_DATA_STEPS.map((step, i) => (
                <button key={i} onClick={() => setBioDataStep(i)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap border',
                    i === bioDataStep ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : i < bioDataStep ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-gray-500 border-white/5 hover:border-white/10'
                  )}>
                  <step.icon className="w-3.5 h-3.5" />
                  {step.title}
                </button>
              ))}
            </div>

            {/* Step 0: Personal Details */}
            {bioDataStep === 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Users className="w-4 h-4" /> Personal Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" icon={Users} required><Input value={myProfile.fullName} onChange={(v: string) => updateField('fullName', v)} placeholder="Enter your full name" /></Field>
                    <Field label="Date of Birth" icon={Clock} required><Input type="date" value={myProfile.dateOfBirth ? new Date(myProfile.dateOfBirth).toISOString().split('T')[0] : ''} onChange={(v: string) => updateField('dateOfBirth', v ? new Date(v).toISOString() : null)} /></Field>
                    <Field label="Birth Time"><Input value={myProfile.birthTime} onChange={(v: string) => updateField('birthTime', v)} placeholder="e.g., 10:30 AM" /></Field>
                    <Field label="Birth Place"><Input value={myProfile.birthPlace} onChange={(v: string) => updateField('birthPlace', v)} placeholder="City of birth" /></Field>
                    <Field label="Height" required><Select value={myProfile.height} onChange={(v: string) => updateField('height', v)} options={HEIGHTS} placeholder="Select height" /></Field>
                    <Field label="Weight"><Input value={myProfile.weight} onChange={(v: string) => updateField('weight', v)} placeholder="e.g., 65 kg" /></Field>
                    <Field label="Complexion"><Select value={myProfile.complexion} onChange={(v: string) => updateField('complexion', v)} options={COMPLEXIONS} /></Field>
                    <Field label="Body Type"><Select value={myProfile.bodyType} onChange={(v: string) => updateField('bodyType', v)} options={BODY_TYPES} /></Field>
                    <Field label="Blood Group"><Select value={myProfile.bloodGroup} onChange={(v: string) => updateField('bloodGroup', v)} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} /></Field>
                    <Field label="Physical Status"><Select value={myProfile.physicalStatus} onChange={(v: string) => updateField('physicalStatus', v)} options={['Normal', 'Physically Challenged']} /></Field>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Religion & Caste */}
            {bioDataStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Moon className="w-4 h-4" /> Religion & Caste</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Religion" icon={Moon} required><Select value={myProfile.religion} onChange={(v: string) => updateField('religion', v)} options={RELIGIONS} placeholder="Select religion" /></Field>
                    <Field label="Caste" icon={Users} required>
                      <Select value={myProfile.caste} onChange={(v: string) => updateField('caste', v)}
                        options={myProfile.religion ? (CASTES_BY_RELIGION[myProfile.religion] || ['Other']) : []} placeholder="Select caste" />
                    </Field>
                    <Field label="Sub Caste"><Input value={myProfile.subCaste} onChange={(v: string) => updateField('subCaste', v)} placeholder="Enter sub-caste" /></Field>
                    <Field label="Gotra"><Input value={myProfile.gotra} onChange={(v: string) => updateField('gotra', v)} placeholder="Enter gotra" /></Field>
                    <Field label="Manglik"><Select value={myProfile.manglik} onChange={(v: string) => updateField('manglik', v)} options={MANGLIK_OPTIONS} /></Field>
                    <Field label="Mother Tongue" required><Select value={myProfile.motherTongue} onChange={(v: string) => updateField('motherTongue', v)} options={MOTHER_TONGUES} placeholder="Select mother tongue" /></Field>
                    <Field label="Star / Nakshatra"><Input value={myProfile.star} onChange={(v: string) => updateField('star', v)} placeholder="e.g., Ashwini" /></Field>
                    <Field label="Raasi"><Input value={myProfile.raasi} onChange={(v: string) => updateField('raasi', v)} placeholder="e.g., Mesha" /></Field>
                    <Field label="Dosham"><Select value={myProfile.dosham} onChange={(v: string) => updateField('dosham', v)} options={['No', 'Yes']} /></Field>
                    <Field label="Horoscope Match Required">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={myProfile.horoscopeMatch || false} onChange={(e: any) => updateField('horoscopeMatch', e.target.checked)}
                          className="w-4 h-4 rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500/40" />
                        <span className="text-sm text-gray-300">Horoscope matching required</span>
                      </label>
                    </Field>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Education & Career */}
            {bioDataStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Education & Career</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Highest Education" icon={GraduationCap} required><Select value={myProfile.education} onChange={(v: string) => updateField('education', v)} options={EDUCATION_LEVELS} placeholder="Select education" /></Field>
                    <Field label="Education Details"><Input value={myProfile.educationDetail} onChange={(v: string) => updateField('educationDetail', v)} placeholder="e.g., B.Tech in CSE from IIT Delhi" /></Field>
                    <Field label="College / University"><Input value={myProfile.college} onChange={(v: string) => updateField('college', v)} placeholder="University name" /></Field>
                    <Field label="Occupation" icon={Briefcase} required><Input value={myProfile.occupation} onChange={(v: string) => updateField('occupation', v)} placeholder="Job title" /></Field>
                    <Field label="Company / Organization"><Input value={myProfile.company} onChange={(v: string) => updateField('company', v)} placeholder="Company name" /></Field>
                    <Field label="Annual Income"><Select value={myProfile.annualIncome} onChange={(v: string) => updateField('annualIncome', v)} options={INCOMES} placeholder="Select income" /></Field>
                    <Field label="Working City"><Input value={myProfile.workingCity} onChange={(v: string) => updateField('workingCity', v)} placeholder="e.g., Mumbai" /></Field>
                    <Field label="Working Country"><Input value={myProfile.workingCountry} onChange={(v: string) => updateField('workingCountry', v)} placeholder="e.g., India" /></Field>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Family Details */}
            {bioDataStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Home className="w-4 h-4" /> Family Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Father's Name" icon={Users}><Input value={myProfile.fatherName} onChange={(v: string) => updateField('fatherName', v)} placeholder="Father's name" /></Field>
                    <Field label="Father's Occupation"><Input value={myProfile.fatherOccupation} onChange={(v: string) => updateField('fatherOccupation', v)} placeholder="e.g., Government Officer" /></Field>
                    <Field label="Mother's Name" icon={Users}><Input value={myProfile.motherName} onChange={(v: string) => updateField('motherName', v)} placeholder="Mother's name" /></Field>
                    <Field label="Mother's Occupation"><Input value={myProfile.motherOccupation} onChange={(v: string) => updateField('motherOccupation', v)} placeholder="e.g., Homemaker" /></Field>
                    <Field label="Brothers"><Input type="number" value={myProfile.brothers} onChange={(v: string) => updateField('brothers', parseInt(v) || 0)} /></Field>
                    <Field label="Brothers Married"><Input type="number" value={myProfile.brothersMarried} onChange={(v: string) => updateField('brothersMarried', parseInt(v) || 0)} /></Field>
                    <Field label="Sisters"><Input type="number" value={myProfile.sisters} onChange={(v: string) => updateField('sisters', parseInt(v) || 0)} /></Field>
                    <Field label="Sisters Married"><Input type="number" value={myProfile.sistersMarried} onChange={(v: string) => updateField('sistersMarried', parseInt(v) || 0)} /></Field>
                    <Field label="Family Type"><Select value={myProfile.familyType} onChange={(v: string) => updateField('familyType', v)} options={FAMILY_TYPES} /></Field>
                    <Field label="Family Status"><Select value={myProfile.familyStatus} onChange={(v: string) => updateField('familyStatus', v)} options={FAMILY_STATUS} /></Field>
                    <Field label="Family Values"><Select value={myProfile.familyValues} onChange={(v: string) => updateField('familyValues', v)} options={FAMILY_VALUES} /></Field>
                    <Field label="Native Place"><Input value={myProfile.nativePlace} onChange={(v: string) => updateField('nativePlace', v)} placeholder="Village/Town" /></Field>
                    <Field label="Family Annual Income"><Select value={myProfile.familyIncome} onChange={(v: string) => updateField('familyIncome', v)} options={INCOMES} /></Field>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Lifestyle */}
            {bioDataStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Sun className="w-4 h-4" /> Lifestyle & About</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Marital Status"><Select value={myProfile.maritalStatus} onChange={(v: string) => updateField('maritalStatus', v)} options={MARITAL_STATUSES} /></Field>
                    <Field label="Diet"><Select value={myProfile.diet} onChange={(v: string) => updateField('diet', v)} options={DIETS} /></Field>
                    <Field label="Drinking"><Select value={myProfile.drinking} onChange={(v: string) => updateField('drinking', v)} options={['No', 'Occasionally', 'Yes']} /></Field>
                    <Field label="Smoking"><Select value={myProfile.smoking} onChange={(v: string) => updateField('smoking', v)} options={['No', 'Occasionally', 'Yes']} /></Field>
                  </div>
                  <div className="space-y-4 pt-2">
                    <Field label="About Me"><Textarea value={myProfile.aboutMe} onChange={(v: string) => updateField('aboutMe', v)} placeholder="Write about yourself, your interests, values, what makes you unique..." rows={4} /></Field>
                    <Field label="About Family"><Textarea value={myProfile.aboutFamily} onChange={(v: string) => updateField('aboutFamily', v)} placeholder="Describe your family background, values, traditions..." rows={4} /></Field>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Contact & Privacy */}
            {bioDataStep === 5 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Lock className="w-4 h-4" /> Contact Info & Privacy</h3>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-2">
                    <p className="text-xs text-amber-200 flex items-start gap-2">
                      <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Your contact information is never shared publicly. Other users must request access, and you approve each request individually.</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Phone Number" icon={Phone}><Input value={myProfile.phoneNumber} onChange={(v: string) => updateField('phoneNumber', v)} placeholder="+91 XXXXXXXXXX" /></Field>
                    <Field label="Alternate Phone"><Input value={myProfile.alternatePhone} onChange={(v: string) => updateField('alternatePhone', v)} placeholder="+91 XXXXXXXXXX" /></Field>
                    <Field label="LinkedIn Profile" icon={Linkedin}><Input value={myProfile.linkedIn} onChange={(v: string) => updateField('linkedIn', v)} placeholder="linkedin.com/in/yourname" /></Field>
                    <Field label="Contact Email" icon={Mail}><Input value={myProfile.contactEmail} onChange={(v: string) => updateField('contactEmail', v)} placeholder="your@email.com" /></Field>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <h4 className="text-xs font-semibold text-gray-400">Privacy Defaults</h4>
                    {[
                      { key: 'bioDataPublic', label: 'Make bio data visible to everyone', desc: 'If off, users must request access' },
                      { key: 'phonePublic', label: 'Show phone number to everyone', desc: 'Not recommended — use access control instead' },
                      { key: 'linkedInPublic', label: 'Show LinkedIn to everyone', desc: 'If off, users must request access' },
                      { key: 'emailPublic', label: 'Show email to everyone', desc: 'If off, users must request access' },
                      { key: 'photosPublic', label: 'Show all photos to everyone', desc: 'If off, some photos are hidden' },
                    ].map(item => (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer bg-white/5 rounded-xl p-3 hover:bg-white/[0.07] transition">
                        <input type="checkbox" checked={myProfile[item.key] || false} onChange={(e: any) => updateField(item.key, e.target.checked)}
                          className="w-4 h-4 rounded mt-0.5 bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500/40" />
                        <div>
                          <p className="text-sm text-white">{item.label}</p>
                          <p className="text-[10px] text-gray-500">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Template Selection */}
                <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Palette className="w-4 h-4" /> Bio Data Template</h3>
                  <p className="text-xs text-gray-500">Choose a regional theme for your bio data design</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => updateField('bioDataTemplate', t.id)}
                        className={cn(
                          'relative rounded-xl p-3 text-left transition border overflow-hidden',
                          myProfile.bioDataTemplate === t.id ? 'border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/20' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        )}>
                        {t.premium && <div className="absolute top-1.5 right-1.5"><Crown className="w-3 h-3 text-amber-500" /></div>}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm"
                            style={{ background: `linear-gradient(135deg, ${t.colors[0]}40, ${t.colors[1]}40)` }}>{t.emoji}</div>
                          {myProfile.bioDataTemplate === t.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <p className="text-xs font-medium text-white truncate">{t.name}</p>
                        <div className="flex gap-1 mt-1.5">
                          {t.colors.map((c, i) => <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation & Save */}
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setBioDataStep(Math.max(0, bioDataStep - 1))} disabled={bioDataStep === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg hover:shadow-amber-500/20 transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                {myProfile.fullName && (
                  <button onClick={() => setShowPreview(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
                {bioDataStep < 5 && (
                  <button onClick={() => setBioDataStep(bioDataStep + 1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/20 transition">
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ BROWSE TAB ═════════════════════════════ */}
        {tab === 'browse' && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Filter className="w-4 h-4 text-amber-400" /> Filters</h3>
                <button onClick={() => { setFilters({}); applyFilters(); }} className="text-xs text-gray-500 hover:text-gray-300 transition">Clear All</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Select value={filters.religion || ''} onChange={(v: string) => setFilters(f => ({ ...f, religion: v }))} options={RELIGIONS} placeholder="Religion" />
                <Select value={filters.caste || ''} onChange={(v: string) => setFilters(f => ({ ...f, caste: v }))}
                  options={filters.religion ? (CASTES_BY_RELIGION[filters.religion] || ['Other']) : []} placeholder="Caste" />
                <Select value={filters.motherTongue || ''} onChange={(v: string) => setFilters(f => ({ ...f, motherTongue: v }))} options={MOTHER_TONGUES} placeholder="Mother Tongue" />
                <Select value={filters.manglik || ''} onChange={(v: string) => setFilters(f => ({ ...f, manglik: v }))} options={['Yes', 'No', 'any']} placeholder="Manglik" />
                <Select value={filters.maritalStatus || ''} onChange={(v: string) => setFilters(f => ({ ...f, maritalStatus: v }))} options={MARITAL_STATUSES} placeholder="Marital Status" />
                <Select value={filters.education || ''} onChange={(v: string) => setFilters(f => ({ ...f, education: v }))} options={EDUCATION_LEVELS} placeholder="Education" />
                <Select value={filters.diet || ''} onChange={(v: string) => setFilters(f => ({ ...f, diet: v }))} options={DIETS} placeholder="Diet" />
                <Input value={filters.city || ''} onChange={(v: string) => setFilters(f => ({ ...f, city: v }))} placeholder="City" />
              </div>
              <button onClick={applyFilters}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg transition">
                <Search className="w-3.5 h-3.5 inline mr-1.5" /> Search Profiles
              </button>
            </div>

            {/* Results */}
            {browseProfiles.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/5">
                <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No profiles found</p>
                <p className="text-xs text-gray-600 mt-1">Try adjusting your filters or complete your profile first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseProfiles.map(p => (
                  <MatrimonialCard key={p.id} profile={p} onView={() => viewFullProfile(p.user?.id || p.userId)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ACCESS CONTROL TAB ═════════════════════ */}
        {tab === 'access' && (
          <div className="space-y-6">
            {/* Incoming requests */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400" /> Incoming Access Requests</h3>
              {incomingRequests.length === 0 ? (
                <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-white/5">
                  <Shield className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No access requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map(req => {
                    const user = req.requester?.user;
                    const photo = user?.photos?.[0]?.url;
                    const gradient = user?.profile?.avatarGradient || 'from-amber-400 to-rose-500';
                    return (
                      <div key={req.id} className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                          {photo ? (
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                              <span className="text-lg font-bold text-white/80">{user?.displayName?.[0] || '?'}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{user?.displayName || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">
                            Wants access to <span className="text-amber-400 font-medium">{req.accessType}</span>
                          </p>
                          {req.message && <p className="text-xs text-gray-500 mt-0.5 italic">&ldquo;{req.message}&rdquo;</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {req.status === 'pending' ? (
                            <>
                              <button onClick={() => handleAccessAction(req.id, 'grant')}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition">Grant</button>
                              <button onClick={() => handleAccessAction(req.id, 'deny')}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">Deny</button>
                            </>
                          ) : (
                            <span className={cn('text-xs font-medium px-3 py-1.5 rounded-lg',
                              req.status === 'granted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            )}>
                              {req.status === 'granted' ? 'Granted' : req.status === 'denied' ? 'Denied' : 'Revoked'}
                            </span>
                          )}
                          {req.status === 'granted' && (
                            <button onClick={() => handleAccessAction(req.id, 'revoke')}
                              className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition">
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sent requests */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Send className="w-4 h-4 text-blue-400" /> Your Sent Requests</h3>
              {sentRequests.length === 0 ? (
                <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-white/5">
                  <Send className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No sent requests</p>
                  <p className="text-xs text-gray-600 mt-1">Browse profiles and request access to contact info</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map(req => {
                    const user = req.owner?.user;
                    return (
                      <div key={req.id} className="bg-white/[0.03] rounded-xl border border-white/10 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0">
                          <span className="text-base font-bold text-white/80">{user?.displayName?.[0] || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{user?.displayName || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">Requested: <span className="text-amber-400">{req.accessType}</span></p>
                        </div>
                        <span className={cn('text-xs font-medium px-3 py-1.5 rounded-lg',
                          req.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                          req.status === 'granted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        )}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PARTNER PREFERENCES TAB ═════════════════ */}
        {tab === 'preferences' && myProfile && (
          <div className="space-y-5">
            <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Heart className="w-4 h-4" /> Partner Preferences</h3>
              <p className="text-xs text-gray-500">Set your ideal partner criteria. Profiles matching these preferences will be prioritized.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Age Range (Min)"><Input type="number" value={myProfile.partnerAgeMin} onChange={(v: string) => updateField('partnerAgeMin', parseInt(v) || 21)} /></Field>
                <Field label="Age Range (Max)"><Input type="number" value={myProfile.partnerAgeMax} onChange={(v: string) => updateField('partnerAgeMax', parseInt(v) || 35)} /></Field>
                <Field label="Preferred Height (Min)"><Select value={myProfile.partnerHeightMin} onChange={(v: string) => updateField('partnerHeightMin', v)} options={HEIGHTS} placeholder="Min height" /></Field>
                <Field label="Preferred Height (Max)"><Select value={myProfile.partnerHeightMax} onChange={(v: string) => updateField('partnerHeightMax', v)} options={HEIGHTS} placeholder="Max height" /></Field>
                <Field label="Preferred Religion"><Select value={myProfile.partnerReligion} onChange={(v: string) => updateField('partnerReligion', v)} options={RELIGIONS} placeholder="Any" /></Field>
                <Field label="Preferred Caste">
                  <Select value={myProfile.partnerCaste} onChange={(v: string) => updateField('partnerCaste', v)}
                    options={myProfile.partnerReligion ? (CASTES_BY_RELIGION[myProfile.partnerReligion] || ['Other']) : (myProfile.religion ? (CASTES_BY_RELIGION[myProfile.religion] || ['Other']) : [])} placeholder="Any" />
                </Field>
                <Field label="Preferred Education"><Select value={myProfile.partnerEducation} onChange={(v: string) => updateField('partnerEducation', v)} options={EDUCATION_LEVELS} placeholder="Any" /></Field>
                <Field label="Preferred Occupation"><Input value={myProfile.partnerOccupation} onChange={(v: string) => updateField('partnerOccupation', v)} placeholder="Any" /></Field>
                <Field label="Preferred Min Income"><Select value={myProfile.partnerIncome} onChange={(v: string) => updateField('partnerIncome', v)} options={INCOMES} placeholder="Any" /></Field>
                <Field label="Preferred City"><Input value={myProfile.partnerCity} onChange={(v: string) => updateField('partnerCity', v)} placeholder="Any city" /></Field>
                <Field label="Preferred Manglik"><Select value={myProfile.partnerManglik} onChange={(v: string) => updateField('partnerManglik', v)} options={MANGLIK_OPTIONS} placeholder="Any" /></Field>
                <Field label="Preferred Marital Status"><Select value={myProfile.partnerMaritalStatus} onChange={(v: string) => updateField('partnerMaritalStatus', v)} options={MARITAL_STATUSES} placeholder="Any" /></Field>
                <Field label="Preferred Mother Tongue"><Select value={myProfile.partnerMotherTongue} onChange={(v: string) => updateField('partnerMotherTongue', v)} options={MOTHER_TONGUES} placeholder="Any" /></Field>
                <Field label="Preferred Diet"><Select value={myProfile.partnerDiet} onChange={(v: string) => updateField('partnerDiet', v)} options={DIETS} placeholder="Any" /></Field>
              </div>

              <Field label="Partner Expectations">
                <Textarea value={myProfile.partnerExpectation} onChange={(v: string) => updateField('partnerExpectation', v)}
                  placeholder="Describe what you're looking for in your life partner..." rows={4} />
              </Field>
            </div>

            <button onClick={saveProfile} disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:shadow-lg hover:shadow-amber-500/20 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}
      </div>

      {/* ═══ BIO DATA PREVIEW MODAL ═══════════════════ */}
      <AnimatePresence>
        {showPreview && myProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              className="bg-[#0F0F14] rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-white/10 p-6"
              onClick={(e: any) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><ScrollText className="w-5 h-5 text-amber-400" /> Bio Data Preview</h2>
                <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
              </div>
              <BioDataPreview profile={myProfile} templateId={myProfile.bioDataTemplate || 'royal-rajasthani'} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PROFILE DETAIL MODAL ═════════════════════ */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileDetailModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} onRequestAccess={handleRequestAccess} />
        )}
      </AnimatePresence>
    </div>
  );
}
