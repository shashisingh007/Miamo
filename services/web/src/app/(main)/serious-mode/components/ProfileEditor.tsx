'use client';

import {
 FileText, Eye, Users, Clock, Moon, GraduationCap, Home, Sun,
 Lock, Shield, Phone, Linkedin, Mail, Check, Crown,
 ArrowRight, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 RELIGIONS, CASTES_BY_RELIGION, MOTHER_TONGUES, HEIGHTS, EDUCATION_LEVELS,
 INCOMES, FAMILY_TYPES, FAMILY_STATUS, FAMILY_VALUES, MARITAL_STATUSES,
 DIETS, MANGLIK_OPTIONS, COMPLEXIONS, BODY_TYPES, NAKSHATRAS, RAASHIS,
 TEMPLATES,
} from './constants';
import { Input, Select, Textarea } from './FormWidgets';

/* ─── Form Components ────────────────────────────── */
function Field({ label, icon: Icon, children, required }: { label: string; icon?: any; children: React.ReactNode; required?: boolean }) {
 return (
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
 {Icon && <Icon className="w-3.5 h-3.5" />} {label} {required && <span className="text-rose-light">*</span>}
 </label>
 {children}
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

/* ═══════════════════════════════════════════════════════════
 PROFILE EDITOR — Multi-step Bio Data Form
 ═══════════════════════════════════════════════════════════ */
export function ProfileEditor({
 myProfile, updateField, saveProfile, saving, profileCompletion,
 bioDataStep, setBioDataStep, setShowPreview, setPreviewTemplate,
}: {
 myProfile: any;
 updateField: (key: string, value: any) => void;
 saveProfile: () => void;
 saving: boolean;
 profileCompletion: number;
 bioDataStep: number;
 setBioDataStep: (step: number) => void;
 setShowPreview: (show: boolean) => void;
 setPreviewTemplate: (tmpl: string) => void;
}) {
 return (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> My Bio Data</h2>
 <div className="flex gap-2">
 <button onClick={saveProfile} disabled={saving}
 className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-text-primary hover:shadow-lg transition disabled:opacity-50">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 myProfile?.bioDataTemplate === t.id ? 'border-amber-500 bg-miamo-card shadow-md ring-2 ring-amber-200' : 'border-zinc-200 bg-miamo-card hover:border-amber-300')}>
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
 {myProfile?.bioDataTemplate === t.id && <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><span className="text-text-primary text-[9px]">✓</span></div>}
 </button>
 ))}
 </div>
 {myProfile?.bioDataTemplate && (
 <button onClick={() => { setPreviewTemplate(myProfile.bioDataTemplate); setShowPreview(true); }}
 className="w-full py-2.5 rounded-xl text-xs font-semibold text-amber-700 bg-miamo-card border border-amber-200 hover:bg-amber-50 transition flex items-center justify-center gap-2">
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
 <button onClick={saveProfile} disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-text-primary hover:shadow-lg transition disabled:opacity-50">
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
 );
}
