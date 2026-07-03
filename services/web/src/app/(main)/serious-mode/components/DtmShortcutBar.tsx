'use client';

// Category-based shortcut bar for the Date-to-Marry browse page.
// Each chip is a *category* (e.g. Religion, Diet, Education); tapping
// opens a portaled popover anchored to the chip where the user picks
// the value. Selecting a value sets filters[category.filterKey].
// Picker (gear) lets the user choose which category chips appear.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake, Salad, GraduationCap, Hash, Star,
  Briefcase, Settings2, Plus, Check, X, Languages,
  ScrollText, Sparkles, ChevronDown, Users, Home, Globe,
  Cigarette, Wine, Activity, Eye, Camera, Shield, Plane,
  Baby, Ruler, Crown, Palette, Heart, Calendar, Building,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DtmFilters = Record<string, string>;

export type DtmCatKind = 'single' | 'bool' | 'sort';

export interface DtmCategoryDef {
  id: string;
  label: string;
  icon: any;
  kind: DtmCatKind;
  filterKey: string;
  options?: { value: string; label: string }[];
  onValue?: string; // bool: value meaning "on" (default 'true')
}

export const DTM_CATEGORY_CATALOG: DtmCategoryDef[] = [
  {
    id: 'religion', label: 'Religion', icon: ScrollText, kind: 'single', filterKey: 'religion',
    options: [
      { value: 'Hindu', label: 'Hindu' },
      { value: 'Muslim', label: 'Muslim — Sunni' },
      { value: 'Muslim-Shia', label: 'Muslim — Shia' },
      { value: 'Muslim-Bohra', label: 'Muslim — Bohra' },
      { value: 'Christian', label: 'Christian — Catholic' },
      { value: 'Christian-Protestant', label: 'Christian — Protestant' },
      { value: 'Christian-Orthodox', label: 'Christian — Orthodox' },
      { value: 'Christian-Other', label: 'Christian — Other' },
      { value: 'Sikh', label: 'Sikh' },
      { value: 'Jain-Digambar', label: 'Jain — Digambar' },
      { value: 'Jain-Shwetambar', label: 'Jain — Shwetambar' },
      { value: 'Buddhist', label: 'Buddhist' },
      { value: 'Parsi', label: 'Parsi / Zoroastrian' },
      { value: 'Jewish', label: 'Jewish' },
      { value: 'Bahai', label: 'Baháʼí' },
      { value: 'Spiritual', label: 'Spiritual' },
      { value: 'Agnostic', label: 'Agnostic' },
      { value: 'Atheist', label: 'Atheist' },
      { value: 'Inter-faith', label: 'Inter-faith / Open' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'caste', label: 'Caste', icon: Users, kind: 'single', filterKey: 'caste',
    options: [
      { value: 'Brahmin', label: 'Brahmin' },
      { value: 'Brahmin-Saraswat', label: 'Brahmin — Saraswat' },
      { value: 'Brahmin-Gaur', label: 'Brahmin — Gaur' },
      { value: 'Brahmin-Iyer', label: 'Brahmin — Iyer' },
      { value: 'Brahmin-Iyengar', label: 'Brahmin — Iyengar' },
      { value: 'Brahmin-Madhwa', label: 'Brahmin — Madhwa' },
      { value: 'Brahmin-Smartha', label: 'Brahmin — Smartha' },
      { value: 'Brahmin-Kashmiri', label: 'Brahmin — Kashmiri Pandit' },
      { value: 'Kshatriya', label: 'Kshatriya' },
      { value: 'Rajput', label: 'Rajput' },
      { value: 'Vaishya', label: 'Vaishya' },
      { value: 'Bania', label: 'Bania' },
      { value: 'Khatri', label: 'Khatri' },
      { value: 'Arora', label: 'Arora' },
      { value: 'Agarwal', label: 'Agarwal' },
      { value: 'Aggarwal', label: 'Aggarwal' },
      { value: 'Gupta', label: 'Gupta' },
      { value: 'Goyal', label: 'Goyal' },
      { value: 'Mittal', label: 'Mittal' },
      { value: 'Bansal', label: 'Bansal' },
      { value: 'Maheshwari', label: 'Maheshwari' },
      { value: 'Oswal', label: 'Oswal' },
      { value: 'Marwari', label: 'Marwari' },
      { value: 'Jat', label: 'Jat' },
      { value: 'Jat-Sikh', label: 'Jat (Sikh)' },
      { value: 'Maratha', label: 'Maratha' },
      { value: 'Kunbi', label: 'Kunbi' },
      { value: 'Reddy', label: 'Reddy' },
      { value: 'Kamma', label: 'Kamma' },
      { value: 'Naidu', label: 'Naidu' },
      { value: 'Chettiar', label: 'Chettiar' },
      { value: 'Mudaliar', label: 'Mudaliar' },
      { value: 'Pillai', label: 'Pillai' },
      { value: 'Nair', label: 'Nair' },
      { value: 'Menon', label: 'Menon' },
      { value: 'Ezhava', label: 'Ezhava' },
      { value: 'Vokkaliga', label: 'Vokkaliga' },
      { value: 'Lingayat', label: 'Lingayat' },
      { value: 'Bunt', label: 'Bunt' },
      { value: 'Sindhi', label: 'Sindhi' },
      { value: 'Punjabi', label: 'Punjabi' },
      { value: 'Saini', label: 'Saini' },
      { value: 'Kayastha', label: 'Kayastha' },
      { value: 'Yadav', label: 'Yadav' },
      { value: 'Kurmi', label: 'Kurmi' },
      { value: 'Gowda', label: 'Gowda' },
      { value: 'Patel', label: 'Patel / Patidar' },
      { value: 'Sonar', label: 'Sonar' },
      { value: 'Vishwakarma', label: 'Vishwakarma' },
      { value: 'Kumawat', label: 'Kumawat' },
      { value: 'Teli', label: 'Teli' },
      { value: 'Kumhar', label: 'Kumhar' },
      { value: 'SC', label: 'Scheduled Caste' },
      { value: 'ST', label: 'Scheduled Tribe' },
      { value: 'OBC', label: 'OBC' },
      { value: 'Bengali-Brahmin', label: 'Bengali Brahmin' },
      { value: 'Bengali-Kayastha', label: 'Bengali Kayastha' },
      { value: 'Inter-caste', label: 'Inter-caste OK' },
      { value: 'Caste-no-bar', label: 'Caste no bar' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'diet', label: 'Diet', icon: Salad, kind: 'single', filterKey: 'diet',
    options: [
      { value: 'Vegetarian', label: 'Vegetarian' },
      { value: 'Strict-Veg', label: 'Strict Vegetarian' },
      { value: 'Non-Vegetarian', label: 'Non-Vegetarian' },
      { value: 'Occasionally-NonVeg', label: 'Occasionally Non-Veg' },
      { value: 'Eggetarian', label: 'Eggetarian' },
      { value: 'Vegan', label: 'Vegan' },
      { value: 'Jain', label: 'Jain' },
      { value: 'Pescatarian', label: 'Pescatarian' },
      { value: 'Halal', label: 'Halal only' },
      { value: 'Kosher', label: 'Kosher only' },
      { value: 'Raw-vegan', label: 'Raw vegan' },
      { value: 'Keto', label: 'Keto' },
      { value: 'Sattvic', label: 'Sattvic' },
      { value: 'No-onion-garlic', label: 'No onion / garlic' },
    ],
  },
  {
    id: 'maritalStatus', label: 'Marital status', icon: HeartHandshake, kind: 'single', filterKey: 'maritalStatus',
    options: [
      { value: 'Never Married', label: 'Never married' },
      { value: 'Divorced', label: 'Divorced' },
      { value: 'Widowed', label: 'Widowed' },
      { value: 'Awaiting Divorce', label: 'Awaiting divorce' },
      { value: 'Annulled', label: 'Annulled' },
    ],
  },
  {
    id: 'manglik', label: 'Manglik', icon: Star, kind: 'single', filterKey: 'manglik',
    options: [
      { value: 'No', label: 'Non-Manglik' },
      { value: 'Yes', label: 'Manglik' },
      { value: 'Anshik', label: 'Anshik (partial)' },
      { value: 'Don\'t know', label: 'Don\u2019t know' },
    ],
  },
  {
    id: 'education', label: 'Education', icon: GraduationCap, kind: 'single', filterKey: 'education',
    options: [
      { value: 'High School', label: 'High School (10+2)' },
      { value: 'Diploma', label: 'Diploma' },
      { value: 'Bachelor', label: 'Bachelor (general)' },
      { value: 'BA', label: 'BA' },
      { value: 'BSc', label: 'BSc' },
      { value: 'BCom', label: 'BCom' },
      { value: 'BBA', label: 'BBA' },
      { value: 'BTech', label: 'BTech / BE (Engineering)' },
      { value: 'BArch', label: 'BArch' },
      { value: 'BDes', label: 'BDes (Design)' },
      { value: 'LLB', label: 'LLB' },
      { value: 'MBBS', label: 'MBBS' },
      { value: 'BDS', label: 'BDS' },
      { value: 'BPharm', label: 'BPharm' },
      { value: 'BHM', label: 'BHM (Hospitality)' },
      { value: 'Master', label: 'Master (general)' },
      { value: 'MA', label: 'MA' },
      { value: 'MSc', label: 'MSc' },
      { value: 'MCom', label: 'MCom' },
      { value: 'MTech', label: 'MTech / ME' },
      { value: 'MBA', label: 'MBA / PGDM' },
      { value: 'MD', label: 'MD' },
      { value: 'MS', label: 'MS (Surgery)' },
      { value: 'MDS', label: 'MDS' },
      { value: 'LLM', label: 'LLM' },
      { value: 'MArch', label: 'MArch' },
      { value: 'MDes', label: 'MDes' },
      { value: 'MFA', label: 'MFA' },
      { value: 'PhD', label: 'PhD / Doctorate' },
      { value: 'CA', label: 'CA — Chartered Accountant' },
      { value: 'CS', label: 'CS — Company Secretary' },
      { value: 'CFA', label: 'CFA' },
      { value: 'CMA', label: 'CMA' },
      { value: 'CFP', label: 'CFP' },
      { value: 'IIT', label: 'IIT alumnus' },
      { value: 'IIM', label: 'IIM alumnus' },
      { value: 'NIT', label: 'NIT alumnus' },
      { value: 'AIIMS', label: 'AIIMS alumnus' },
      { value: 'Ivy-League', label: 'Ivy League' },
      { value: 'Oxbridge', label: 'Oxbridge' },
      { value: 'Self-taught', label: 'Self-taught / Bootcamp' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'profession', label: 'Profession', icon: Briefcase, kind: 'single', filterKey: 'profession',
    options: [
      { value: 'Software Engineer', label: 'Software Engineer' },
      { value: 'Data Scientist', label: 'Data Scientist / ML' },
      { value: 'Product Manager', label: 'Product Manager' },
      { value: 'Designer', label: 'Designer (UX/UI/Graphic)' },
      { value: 'Engineering Manager', label: 'Engineering Manager' },
      { value: 'Founder', label: 'Founder / Startup CEO' },
      { value: 'Doctor', label: 'Doctor (MBBS/MD)' },
      { value: 'Surgeon', label: 'Surgeon' },
      { value: 'Dentist', label: 'Dentist' },
      { value: 'Veterinarian', label: 'Veterinarian' },
      { value: 'Pharmacist', label: 'Pharmacist' },
      { value: 'Nurse', label: 'Nurse' },
      { value: 'Therapist', label: 'Therapist / Psychologist' },
      { value: 'Lawyer', label: 'Lawyer' },
      { value: 'Judge', label: 'Judge' },
      { value: 'CA', label: 'Chartered Accountant' },
      { value: 'CFA', label: 'CFA / Investment Analyst' },
      { value: 'Banker', label: 'Banker' },
      { value: 'Investment Banker', label: 'Investment Banker' },
      { value: 'Consultant', label: 'Management Consultant' },
      { value: 'Auditor', label: 'Auditor' },
      { value: 'Teacher', label: 'Teacher' },
      { value: 'Professor', label: 'Professor' },
      { value: 'Researcher', label: 'Researcher' },
      { value: 'Scientist', label: 'Scientist' },
      { value: 'Civil Services', label: 'IAS / IPS / IFS' },
      { value: 'PSU', label: 'PSU Officer' },
      { value: 'Defence', label: 'Defence / Armed Forces' },
      { value: 'Police', label: 'Police' },
      { value: 'Pilot', label: 'Pilot' },
      { value: 'Cabin Crew', label: 'Cabin Crew' },
      { value: 'Architect', label: 'Architect' },
      { value: 'Civil Engineer', label: 'Civil Engineer' },
      { value: 'Mechanical Engineer', label: 'Mechanical Engineer' },
      { value: 'Electrical Engineer', label: 'Electrical Engineer' },
      { value: 'Chemical Engineer', label: 'Chemical Engineer' },
      { value: 'Business Owner', label: 'Business Owner' },
      { value: 'Real Estate', label: 'Real Estate' },
      { value: 'Trader', label: 'Trader' },
      { value: 'Artist', label: 'Artist / Creative' },
      { value: 'Musician', label: 'Musician' },
      { value: 'Writer', label: 'Writer / Journalist' },
      { value: 'Filmmaker', label: 'Filmmaker / Director' },
      { value: 'Actor', label: 'Actor' },
      { value: 'Chef', label: 'Chef' },
      { value: 'Sportsperson', label: 'Sportsperson' },
      { value: 'Athlete', label: 'Athlete' },
      { value: 'Marketing', label: 'Marketing / Sales' },
      { value: 'HR', label: 'HR' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Finance', label: 'Finance / Accounts' },
      { value: 'Social Worker', label: 'Social Worker / NGO' },
      { value: 'Religious', label: 'Religious / Priest' },
      { value: 'Homemaker', label: 'Homemaker' },
      { value: 'Student', label: 'Student' },
      { value: 'Retired', label: 'Retired' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'occupationType', label: 'Occupation type', icon: Building, kind: 'single', filterKey: 'occupationType',
    options: [
      { value: 'Private', label: 'Private sector' },
      { value: 'Government', label: 'Government' },
      { value: 'Self-employed', label: 'Self-employed' },
      { value: 'Business', label: 'Business' },
      { value: 'Freelance', label: 'Freelance' },
      { value: 'Not working', label: 'Not working' },
    ],
  },
  {
    id: 'motherTongue', label: 'Mother tongue', icon: Languages, kind: 'single', filterKey: 'motherTongue',
    options: [
      { value: 'Hindi', label: 'Hindi' },
      { value: 'English', label: 'English' },
      { value: 'Punjabi', label: 'Punjabi' },
      { value: 'Gujarati', label: 'Gujarati' },
      { value: 'Marathi', label: 'Marathi' },
      { value: 'Bengali', label: 'Bengali' },
      { value: 'Tamil', label: 'Tamil' },
      { value: 'Telugu', label: 'Telugu' },
      { value: 'Kannada', label: 'Kannada' },
      { value: 'Malayalam', label: 'Malayalam' },
      { value: 'Urdu', label: 'Urdu' },
      { value: 'Odia', label: 'Odia' },
      { value: 'Assamese', label: 'Assamese' },
      { value: 'Sindhi', label: 'Sindhi' },
      { value: 'Konkani', label: 'Konkani' },
      { value: 'Kashmiri', label: 'Kashmiri' },
      { value: 'Bhojpuri', label: 'Bhojpuri' },
      { value: 'Maithili', label: 'Maithili' },
      { value: 'Magahi', label: 'Magahi' },
      { value: 'Awadhi', label: 'Awadhi' },
      { value: 'Rajasthani', label: 'Rajasthani' },
      { value: 'Marwari', label: 'Marwari' },
      { value: 'Haryanvi', label: 'Haryanvi' },
      { value: 'Dogri', label: 'Dogri' },
      { value: 'Tulu', label: 'Tulu' },
      { value: 'Kodava', label: 'Kodava' },
      { value: 'Nepali', label: 'Nepali' },
      { value: 'Manipuri', label: 'Manipuri' },
      { value: 'Mizo', label: 'Mizo' },
      { value: 'Khasi', label: 'Khasi' },
      { value: 'Naga', label: 'Naga' },
      { value: 'Bodo', label: 'Bodo' },
      { value: 'Garhwali', label: 'Garhwali' },
      { value: 'Kumaoni', label: 'Kumaoni' },
      { value: 'Santali', label: 'Santali' },
      { value: 'Spanish', label: 'Spanish' },
      { value: 'French', label: 'French' },
      { value: 'Mandarin', label: 'Mandarin' },
      { value: 'Arabic', label: 'Arabic' },
      { value: 'Persian', label: 'Persian / Farsi' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'minIncome', label: 'Min income', icon: Briefcase, kind: 'single', filterKey: 'minIncome',
    options: [
      { value: '3', label: '₹3L+' },
      { value: '5', label: '₹5L+' },
      { value: '10', label: '₹10L+' },
      { value: '15', label: '₹15L+' },
      { value: '20', label: '₹20L+' },
      { value: '30', label: '₹30L+' },
      { value: '50', label: '₹50L+' },
      { value: '75', label: '₹75L+' },
      { value: '100', label: '₹1Cr+' },
      { value: '200', label: '₹2Cr+' },
    ],
  },
  {
    id: 'minAge', label: 'Min age', icon: Calendar, kind: 'single', filterKey: 'minAge',
    options: Array.from({ length: 28 }, (_, i) => ({ value: String(21 + i), label: `${21 + i}+` })),
  },
  {
    id: 'maxAge', label: 'Max age', icon: Calendar, kind: 'single', filterKey: 'maxAge',
    options: Array.from({ length: 28 }, (_, i) => ({ value: String(25 + i), label: `up to ${25 + i}` })),
  },
  {
    id: 'minHeight', label: 'Min height', icon: Ruler, kind: 'single', filterKey: 'minHeight',
    options: [
      { value: '150', label: "4'11\"" },
      { value: '155', label: "5'1\"" },
      { value: '160', label: "5'3\"" },
      { value: '165', label: "5'5\"" },
      { value: '170', label: "5'7\"" },
      { value: '175', label: "5'9\"" },
      { value: '180', label: "5'11\"" },
      { value: '185', label: "6'1\"" },
      { value: '190', label: "6'3\"" },
    ],
  },
  {
    id: 'bodyType', label: 'Body type', icon: Activity, kind: 'single', filterKey: 'bodyType',
    options: [
      { value: 'Slim', label: 'Slim' },
      { value: 'Athletic', label: 'Athletic' },
      { value: 'Average', label: 'Average' },
      { value: 'Curvy', label: 'Curvy' },
      { value: 'Heavy', label: 'Heavy' },
    ],
  },
  {
    id: 'complexion', label: 'Complexion', icon: Palette, kind: 'single', filterKey: 'complexion',
    options: [
      { value: 'Very Fair', label: 'Very Fair' },
      { value: 'Fair', label: 'Fair' },
      { value: 'Wheatish', label: 'Wheatish' },
      { value: 'Wheatish Brown', label: 'Wheatish Brown' },
      { value: 'Dark', label: 'Dark' },
    ],
  },
  {
    id: 'familyType', label: 'Family type', icon: Home, kind: 'single', filterKey: 'familyType',
    options: [
      { value: 'Nuclear', label: 'Nuclear' },
      { value: 'Joint', label: 'Joint' },
      { value: 'Living alone', label: 'Living alone' },
    ],
  },
  {
    id: 'familyValues', label: 'Family values', icon: Heart, kind: 'single', filterKey: 'familyValues',
    options: [
      { value: 'Traditional', label: 'Traditional' },
      { value: 'Moderate', label: 'Moderate' },
      { value: 'Liberal', label: 'Liberal' },
      { value: 'Orthodox', label: 'Orthodox' },
    ],
  },
  {
    id: 'familyStatus', label: 'Family status', icon: Crown, kind: 'single', filterKey: 'familyStatus',
    options: [
      { value: 'Middle Class', label: 'Middle Class' },
      { value: 'Upper Middle Class', label: 'Upper Middle Class' },
      { value: 'Rich', label: 'Rich / Affluent' },
      { value: 'HNI', label: 'High Net Worth' },
    ],
  },
  {
    id: 'smoking', label: 'Smoking', icon: Cigarette, kind: 'single', filterKey: 'smoking',
    options: [
      { value: 'Never', label: 'Never' },
      { value: 'Occasionally', label: 'Occasionally' },
      { value: 'Regularly', label: 'Regularly' },
    ],
  },
  {
    id: 'drinking', label: 'Drinking', icon: Wine, kind: 'single', filterKey: 'drinking',
    options: [
      { value: 'Never', label: 'Never' },
      { value: 'Socially', label: 'Socially' },
      { value: 'Occasionally', label: 'Occasionally' },
      { value: 'Regularly', label: 'Regularly' },
    ],
  },
  {
    id: 'children', label: 'Children', icon: Baby, kind: 'single', filterKey: 'children',
    options: [
      { value: 'No children', label: 'No children' },
      { value: 'Has children, living together', label: 'Has children (with them)' },
      { value: 'Has children, living apart', label: 'Has children (apart)' },
      { value: 'Wants children', label: 'Wants children' },
      { value: "Doesn't want children", label: "Doesn\u2019t want children" },
    ],
  },
  {
    id: 'country', label: 'Country', icon: Globe, kind: 'single', filterKey: 'country',
    options: [
      { value: 'India', label: 'India' },
      { value: 'USA', label: 'USA' },
      { value: 'UK', label: 'United Kingdom' },
      { value: 'Canada', label: 'Canada' },
      { value: 'Australia', label: 'Australia' },
      { value: 'UAE', label: 'UAE' },
      { value: 'Singapore', label: 'Singapore' },
      { value: 'Germany', label: 'Germany' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'cityTier', label: 'City tier', icon: Building, kind: 'single', filterKey: 'cityTier',
    options: [
      { value: 'Metro', label: 'Metro (Mumbai/Delhi/BLR/...)' },
      { value: 'Tier 1', label: 'Tier 1' },
      { value: 'Tier 2', label: 'Tier 2' },
      { value: 'Tier 3', label: 'Tier 3' },
    ],
  },
  {
    id: 'nri', label: 'NRI / Citizenship', icon: Plane, kind: 'single', filterKey: 'nri',
    options: [
      { value: 'Indian Citizen', label: 'Indian Citizen' },
      { value: 'NRI', label: 'NRI' },
      { value: 'OCI', label: 'OCI / PIO' },
      { value: 'Foreign National', label: 'Foreign National' },
    ],
  },
  {
    id: 'rashi', label: 'Rashi (zodiac)', icon: Star, kind: 'single', filterKey: 'rashi',
    options: [
      { value: 'Mesh', label: 'Mesh (Aries)' },
      { value: 'Vrishabh', label: 'Vrishabh (Taurus)' },
      { value: 'Mithun', label: 'Mithun (Gemini)' },
      { value: 'Kark', label: 'Kark (Cancer)' },
      { value: 'Simha', label: 'Simha (Leo)' },
      { value: 'Kanya', label: 'Kanya (Virgo)' },
      { value: 'Tula', label: 'Tula (Libra)' },
      { value: 'Vrishchik', label: 'Vrishchik (Scorpio)' },
      { value: 'Dhanu', label: 'Dhanu (Sagittarius)' },
      { value: 'Makar', label: 'Makar (Capricorn)' },
      { value: 'Kumbh', label: 'Kumbh (Aquarius)' },
      { value: 'Meen', label: 'Meen (Pisces)' },
    ],
  },
  {
    id: 'gotra', label: 'Gotra match', icon: Hash, kind: 'single', filterKey: 'gotra',
    options: [
      { value: 'different', label: 'Different gotra' },
      { value: 'any', label: 'Any gotra' },
    ],
  },
  {
    id: 'gan', label: 'Gan', icon: Star, kind: 'single', filterKey: 'gan',
    options: [
      { value: 'Deva', label: 'Deva' },
      { value: 'Manushya', label: 'Manushya' },
      { value: 'Rakshasa', label: 'Rakshasa' },
    ],
  },
  {
    id: 'nadi', label: 'Nadi', icon: Star, kind: 'single', filterKey: 'nadi',
    options: [
      { value: 'Aadi', label: 'Aadi' },
      { value: 'Madhya', label: 'Madhya' },
      { value: 'Antya', label: 'Antya' },
    ],
  },
  {
    id: 'exercise', label: 'Exercise', icon: Activity, kind: 'single', filterKey: 'exercise',
    options: [
      { value: 'Daily', label: 'Daily' },
      { value: 'Often', label: 'Often' },
      { value: 'Sometimes', label: 'Sometimes' },
      { value: 'Rarely', label: 'Rarely' },
      { value: 'Never', label: 'Never' },
    ],
  },
  {
    id: 'pets', label: 'Pets', icon: Heart, kind: 'single', filterKey: 'pets',
    options: [
      { value: 'Dog', label: 'Has dog' },
      { value: 'Cat', label: 'Has cat' },
      { value: 'Other pet', label: 'Other pet' },
      { value: 'No pets', label: 'No pets' },
      { value: 'Wants pets', label: 'Wants pets' },
      { value: 'Allergic', label: 'Allergic / no pets' },
    ],
  },
  {
    id: 'politics', label: 'Politics', icon: Users, kind: 'single', filterKey: 'politics',
    options: [
      { value: 'Liberal', label: 'Liberal' },
      { value: 'Moderate', label: 'Moderate' },
      { value: 'Conservative', label: 'Conservative' },
      { value: 'Apolitical', label: 'Apolitical' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'religiousPractice', label: 'Religious practice', icon: ScrollText, kind: 'single', filterKey: 'religiousPractice',
    options: [
      { value: 'Devout', label: 'Devout' },
      { value: 'Practicing', label: 'Practicing' },
      { value: 'Spiritual', label: 'Spiritual' },
      { value: 'Cultural only', label: 'Cultural only' },
      { value: 'Non-practicing', label: 'Non-practicing' },
    ],
  },
  {
    id: 'sleepSchedule', label: 'Sleep schedule', icon: Calendar, kind: 'single', filterKey: 'sleepSchedule',
    options: [
      { value: 'Early bird', label: 'Early bird' },
      { value: 'Night owl', label: 'Night owl' },
      { value: 'Flexible', label: 'Flexible' },
    ],
  },
  {
    id: 'workMode', label: 'Work mode', icon: Building, kind: 'single', filterKey: 'workMode',
    options: [
      { value: 'Office', label: 'Office' },
      { value: 'Hybrid', label: 'Hybrid' },
      { value: 'Remote', label: 'Remote' },
      { value: 'Travel-heavy', label: 'Travel-heavy' },
    ],
  },
  {
    id: 'industry', label: 'Industry', icon: Briefcase, kind: 'single', filterKey: 'industry',
    options: [
      { value: 'Tech / IT', label: 'Tech / IT' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Education', label: 'Education' },
      { value: 'Engineering', label: 'Engineering' },
      { value: 'Manufacturing', label: 'Manufacturing' },
      { value: 'Media', label: 'Media' },
      { value: 'Law', label: 'Law' },
      { value: 'Government', label: 'Government' },
      { value: 'Non-profit', label: 'Non-profit' },
      { value: 'Hospitality', label: 'Hospitality' },
      { value: 'Retail', label: 'Retail' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'siblings', label: 'Siblings', icon: Users, kind: 'single', filterKey: 'siblings',
    options: [
      { value: 'Only child', label: 'Only child' },
      { value: '1 sibling', label: '1 sibling' },
      { value: '2 siblings', label: '2 siblings' },
      { value: '3+ siblings', label: '3+ siblings' },
    ],
  },
  {
    id: 'birthOrder', label: 'Birth order', icon: Users, kind: 'single', filterKey: 'birthOrder',
    options: [
      { value: 'Eldest', label: 'Eldest' },
      { value: 'Middle', label: 'Middle' },
      { value: 'Youngest', label: 'Youngest' },
      { value: 'Only child', label: 'Only child' },
    ],
  },
  {
    id: 'bloodGroup', label: 'Blood group', icon: Heart, kind: 'single', filterKey: 'bloodGroup',
    options: [
      { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
      { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
      { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
      { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
    ],
  },
  {
    id: 'maxIncome', label: 'Max income', icon: Briefcase, kind: 'single', filterKey: 'maxIncome',
    options: [
      { value: '10', label: 'up to ₹10L' },
      { value: '25', label: 'up to ₹25L' },
      { value: '50', label: 'up to ₹50L' },
      { value: '100', label: 'up to ₹1Cr' },
      { value: '500', label: 'no limit' },
    ],
  },
  {
    id: 'maxHeight', label: 'Max height', icon: Ruler, kind: 'single', filterKey: 'maxHeight',
    options: [
      { value: '160', label: "up to 5'3\"" },
      { value: '170', label: "up to 5'7\"" },
      { value: '175', label: "up to 5'9\"" },
      { value: '180', label: "up to 5'11\"" },
      { value: '185', label: "up to 6'1\"" },
      { value: '195', label: "up to 6'5\"" },
    ],
  },
  {
    id: 'ownsHouse', label: 'Owns home', icon: Home, kind: 'bool', filterKey: 'ownsHouse', onValue: 'true',
  },
  {
    id: 'ownsCar', label: 'Owns car', icon: Briefcase, kind: 'bool', filterKey: 'ownsCar', onValue: 'true',
  },
  {
    id: 'interCasteOk', label: 'Inter-caste OK', icon: HeartHandshake, kind: 'bool', filterKey: 'interCasteOk', onValue: 'true',
  },
  {
    id: 'interFaithOk', label: 'Inter-faith OK', icon: HeartHandshake, kind: 'bool', filterKey: 'interFaithOk', onValue: 'true',
  },
  {
    id: 'openToWidowed', label: 'Open to widowed', icon: HeartHandshake, kind: 'bool', filterKey: 'openToWidowed', onValue: 'true',
  },
  {
    id: 'openToDivorcee', label: 'Open to divorcee', icon: HeartHandshake, kind: 'bool', filterKey: 'openToDivorcee', onValue: 'true',
  },
  {
    id: 'openToSingleParent', label: 'Open to single parent', icon: Baby, kind: 'bool', filterKey: 'openToSingleParent', onValue: 'true',
  },
  {
    id: 'openToNonManglik', label: 'Open to non-Manglik', icon: Star, kind: 'bool', filterKey: 'openToNonManglik', onValue: 'true',
  },
  {
    id: 'hasBioData', label: 'Has bio-data', icon: ScrollText, kind: 'bool', filterKey: 'hasBioData', onValue: 'true',
  },
  {
    id: 'numerologyMatch', label: 'Numerology match', icon: Hash, kind: 'bool', filterKey: 'numerologyMatch', onValue: 'true',
  },
  {
    id: 'horoscopeMatch', label: 'Horoscope match', icon: Star, kind: 'bool', filterKey: 'horoscopeMatch', onValue: 'true',
  },
  {
    id: 'hasPhotos', label: 'Has photos', icon: Camera, kind: 'bool', filterKey: 'hasPhotos', onValue: 'true',
  },
  {
    id: 'photoVerified', label: 'Photo verified', icon: ShieldCheck, kind: 'bool', filterKey: 'photoVerified', onValue: 'true',
  },
  {
    id: 'verifiedOnly', label: 'Verified only', icon: Shield, kind: 'bool', filterKey: 'verifiedOnly', onValue: 'true',
  },
  {
    id: 'activeRecently', label: 'Active recently', icon: Eye, kind: 'bool', filterKey: 'activeRecently', onValue: 'true',
  },
  {
    id: 'willingToRelocate', label: 'Open to relocate', icon: Plane, kind: 'bool', filterKey: 'willingToRelocate', onValue: 'true',
  },
  {
    id: 'sortBy', label: 'Sort by', icon: Sparkles, kind: 'sort', filterKey: 'sortBy',
    options: [
      { value: 'compatibility', label: 'Compatibility (AI)' },
      { value: 'numerology', label: 'Numerology score' },
      { value: 'horoscope', label: 'Horoscope match' },
      { value: 'recent', label: 'Recently active' },
      { value: 'newest', label: 'Newest profiles' },
      { value: 'income-desc', label: 'Income (high to low)' },
      { value: 'age-asc', label: 'Age (young to old)' },
      { value: 'age-desc', label: 'Age (old to young)' },
    ],
  },
  {
    id: 'marriageTimeline', label: 'Marriage timeline', icon: Calendar, kind: 'single', filterKey: 'marriageTimeline',
    options: [
      { value: '0-3', label: 'Within 3 months' },
      { value: '3-6', label: '3 \u2013 6 months' },
      { value: '6-12', label: '6 \u2013 12 months' },
      { value: '1-2y', label: '1 \u2013 2 years' },
      { value: '2y+', label: '2+ years' },
      { value: 'unsure', label: 'Open / unsure' },
    ],
  },
  {
    id: 'weddingType', label: 'Wedding type', icon: HeartHandshake, kind: 'single', filterKey: 'weddingType',
    options: [
      { value: 'Religious', label: 'Religious / Traditional' },
      { value: 'Court', label: 'Court / Civil' },
      { value: 'Both', label: 'Both' },
      { value: 'Destination', label: 'Destination' },
      { value: 'Intimate', label: 'Intimate / Small' },
      { value: 'Grand', label: 'Grand / Big-fat' },
    ],
  },
  {
    id: 'dowryStance', label: 'Dowry stance', icon: Shield, kind: 'single', filterKey: 'dowryStance',
    options: [
      { value: 'No', label: 'No dowry' },
      { value: 'Symbolic', label: 'Symbolic gifts only' },
      { value: 'Open', label: 'Open to discuss' },
    ],
  },
  {
    id: 'partnerExpectation', label: 'Lives with parents', icon: Home, kind: 'single', filterKey: 'partnerLivesWithParents',
    options: [
      { value: 'Yes', label: 'Yes \u2014 lives with parents' },
      { value: 'No', label: 'No \u2014 lives separately' },
      { value: 'Open', label: 'Open to either' },
    ],
  },
  {
    id: 'kuldevta', label: 'Kuldevta', icon: ScrollText, kind: 'single', filterKey: 'kuldevtaCategory',
    options: [
      { value: 'Vishnu', label: 'Vishnu / Krishna / Ram' },
      { value: 'Shiva', label: 'Shiva' },
      { value: 'Devi', label: 'Devi (Durga / Kali / Lakshmi)' },
      { value: 'Ganesh', label: 'Ganesh' },
      { value: 'Hanuman', label: 'Hanuman' },
      { value: 'Murugan', label: 'Murugan / Kartikeya' },
      { value: 'Ayyappa', label: 'Ayyappa' },
      { value: 'Other', label: 'Other / Family deity' },
    ],
  },
  {
    id: 'sectDtm', label: 'Sect / Sampradaya', icon: ScrollText, kind: 'single', filterKey: 'sect',
    options: [
      { value: 'Vaishnav', label: 'Vaishnav' },
      { value: 'Shaiva', label: 'Shaiva' },
      { value: 'Shakta', label: 'Shakta' },
      { value: 'Smartha', label: 'Smartha' },
      { value: 'Arya-Samaj', label: 'Arya Samaj' },
      { value: 'ISKCON', label: 'ISKCON' },
      { value: 'Swaminarayan', label: 'Swaminarayan' },
      { value: 'Lingayat', label: 'Lingayat' },
      { value: 'Sunni', label: 'Sunni' },
      { value: 'Shia', label: 'Shia' },
      { value: 'Bohra', label: 'Bohra' },
      { value: 'Khoja', label: 'Khoja' },
      { value: 'Catholic', label: 'Catholic' },
      { value: 'Protestant', label: 'Protestant' },
      { value: 'Khalsa', label: 'Khalsa' },
      { value: 'Digambar', label: 'Digambar (Jain)' },
      { value: 'Shwetambar', label: 'Shwetambar (Jain)' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'hobbiesDtm', label: 'Hobbies', icon: Sparkles, kind: 'single', filterKey: 'hobbiesPrimary',
    options: [
      { value: 'reading', label: 'Reading' },
      { value: 'writing', label: 'Writing' },
      { value: 'travel', label: 'Travel' },
      { value: 'music', label: 'Music' },
      { value: 'singing', label: 'Singing' },
      { value: 'dancing', label: 'Dancing' },
      { value: 'cooking', label: 'Cooking' },
      { value: 'baking', label: 'Baking' },
      { value: 'painting', label: 'Painting / Art' },
      { value: 'photography', label: 'Photography' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'sports', label: 'Sports' },
      { value: 'cricket', label: 'Cricket' },
      { value: 'football', label: 'Football' },
      { value: 'badminton', label: 'Badminton' },
      { value: 'tennis', label: 'Tennis' },
      { value: 'gym', label: 'Gym / Fitness' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'hiking', label: 'Hiking / Trekking' },
      { value: 'gardening', label: 'Gardening' },
      { value: 'pets', label: 'Caring for pets' },
      { value: 'volunteering', label: 'Volunteering' },
      { value: 'spirituality', label: 'Spirituality' },
      { value: 'movies', label: 'Movies / TV' },
      { value: 'theatre', label: 'Theatre' },
      { value: 'astronomy', label: 'Astronomy' },
      { value: 'investing', label: 'Investing / Markets' },
      { value: 'tech', label: 'Tech tinkering' },
      { value: 'cars', label: 'Cars / Bikes' },
    ],
  },
  {
    id: 'fitnessLevel', label: 'Fitness level', icon: Activity, kind: 'single', filterKey: 'fitnessLevel',
    options: [
      { value: 'Athlete', label: 'Athlete' },
      { value: 'Active', label: 'Active' },
      { value: 'Moderate', label: 'Moderate' },
      { value: 'Light', label: 'Light' },
      { value: 'Sedentary', label: 'Sedentary' },
    ],
  },
  {
    id: 'partnerHeightPref', label: 'Partner height pref', icon: Ruler, kind: 'single', filterKey: 'partnerHeightPref',
    options: [
      { value: 'Taller', label: 'Taller than me' },
      { value: 'Same', label: 'Around my height' },
      { value: 'Shorter', label: 'Shorter is OK' },
      { value: 'Any', label: 'Any height' },
    ],
  },
  {
    id: 'partnerEducationPref', label: 'Partner education', icon: GraduationCap, kind: 'single', filterKey: 'partnerEducationPref',
    options: [
      { value: 'Bachelor+', label: 'Bachelor+' },
      { value: 'Master+', label: 'Master+' },
      { value: 'PhD', label: 'PhD / Doctorate' },
      { value: 'Tier1', label: 'IIT/IIM/AIIMS/Ivy' },
      { value: 'Any', label: 'Any' },
    ],
  },
  {
    id: 'incomeBand', label: 'Income band', icon: Briefcase, kind: 'single', filterKey: 'incomeBand',
    options: [
      { value: '0-5', label: 'Below \u20b95L' },
      { value: '5-10', label: '\u20b95 \u2013 10L' },
      { value: '10-25', label: '\u20b910 \u2013 25L' },
      { value: '25-50', label: '\u20b925 \u2013 50L' },
      { value: '50-100', label: '\u20b950L \u2013 1Cr' },
      { value: '100-200', label: '\u20b91 \u2013 2Cr' },
      { value: '200+', label: '\u20b92Cr+' },
    ],
  },
  {
    id: 'languagesKnown', label: 'Languages known', icon: Languages, kind: 'single', filterKey: 'languagesKnown',
    options: [
      { value: 'Hindi', label: 'Hindi' },
      { value: 'English', label: 'English' },
      { value: 'Punjabi', label: 'Punjabi' },
      { value: 'Gujarati', label: 'Gujarati' },
      { value: 'Marathi', label: 'Marathi' },
      { value: 'Bengali', label: 'Bengali' },
      { value: 'Tamil', label: 'Tamil' },
      { value: 'Telugu', label: 'Telugu' },
      { value: 'Kannada', label: 'Kannada' },
      { value: 'Malayalam', label: 'Malayalam' },
      { value: 'Urdu', label: 'Urdu' },
      { value: 'Sanskrit', label: 'Sanskrit' },
      { value: 'French', label: 'French' },
      { value: 'Spanish', label: 'Spanish' },
      { value: 'German', label: 'German' },
      { value: 'Mandarin', label: 'Mandarin' },
      { value: 'Japanese', label: 'Japanese' },
      { value: 'Arabic', label: 'Arabic' },
    ],
  },
  {
    id: 'travelStyle', label: 'Travel style', icon: Plane, kind: 'single', filterKey: 'travelStyle',
    options: [
      { value: 'Adventure', label: 'Adventure / Backpacker' },
      { value: 'Luxury', label: 'Luxury' },
      { value: 'Cultural', label: 'Cultural / Heritage' },
      { value: 'Beach', label: 'Beach / Relax' },
      { value: 'Foodie', label: 'Foodie travel' },
      { value: 'Spiritual', label: 'Spiritual / Pilgrimage' },
      { value: 'Homebody', label: 'Homebody (rarely travel)' },
    ],
  },
  {
    id: 'communicationStyle', label: 'Communication', icon: Sparkles, kind: 'single', filterKey: 'communicationStyle',
    options: [
      { value: 'Direct', label: 'Direct / Frank' },
      { value: 'Diplomatic', label: 'Diplomatic' },
      { value: 'Reserved', label: 'Reserved / Quiet' },
      { value: 'Expressive', label: 'Expressive / Talker' },
    ],
  },
  {
    id: 'attachmentStyle', label: 'Attachment style', icon: Heart, kind: 'single', filterKey: 'attachmentStyle',
    options: [
      { value: 'Secure', label: 'Secure' },
      { value: 'Anxious', label: 'Anxious' },
      { value: 'Avoidant', label: 'Avoidant' },
      { value: 'Mixed', label: 'Mixed / unsure' },
    ],
  },
  {
    id: 'loveLanguage', label: 'Love language', icon: Heart, kind: 'single', filterKey: 'loveLanguage',
    options: [
      { value: 'Words', label: 'Words of affirmation' },
      { value: 'Acts', label: 'Acts of service' },
      { value: 'Gifts', label: 'Receiving gifts' },
      { value: 'Time', label: 'Quality time' },
      { value: 'Touch', label: 'Physical touch' },
    ],
  },
  {
    id: 'mbti', label: 'MBTI', icon: Hash, kind: 'single', filterKey: 'mbti',
    options: [
      { value: 'INTJ', label: 'INTJ' }, { value: 'INTP', label: 'INTP' },
      { value: 'ENTJ', label: 'ENTJ' }, { value: 'ENTP', label: 'ENTP' },
      { value: 'INFJ', label: 'INFJ' }, { value: 'INFP', label: 'INFP' },
      { value: 'ENFJ', label: 'ENFJ' }, { value: 'ENFP', label: 'ENFP' },
      { value: 'ISTJ', label: 'ISTJ' }, { value: 'ISFJ', label: 'ISFJ' },
      { value: 'ESTJ', label: 'ESTJ' }, { value: 'ESFJ', label: 'ESFJ' },
      { value: 'ISTP', label: 'ISTP' }, { value: 'ISFP', label: 'ISFP' },
      { value: 'ESTP', label: 'ESTP' }, { value: 'ESFP', label: 'ESFP' },
    ],
  },
  {
    id: 'speaksWith', label: 'Decision-maker', icon: Users, kind: 'single', filterKey: 'decisionMaker',
    options: [
      { value: 'Self', label: 'I decide' },
      { value: 'Parents', label: 'Parents lead' },
      { value: 'Together', label: 'Together with family' },
    ],
  },
];

const DEFAULT_DTM_CATEGORIES = ['religion', 'diet', 'maritalStatus', 'manglik', 'education', 'numerologyMatch'];
const STORAGE_KEY = 'miamo:dtm:shortcuts:v2';
const MAX_CATEGORIES = 10;

function loadSelection(): string[] {
  if (typeof window === 'undefined') return DEFAULT_DTM_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DTM_CATEGORIES;
    const ids = JSON.parse(raw) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return DEFAULT_DTM_CATEGORIES;
    return ids.filter((id) => DTM_CATEGORY_CATALOG.some((c) => c.id === id)).slice(0, MAX_CATEGORIES);
  } catch { return DEFAULT_DTM_CATEGORIES; }
}

export function DtmShortcutBar({
  filters,
  onChangeFilters,
}: {
  filters: DtmFilters;
  onChangeFilters: (next: DtmFilters) => void;
}) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_DTM_CATEGORIES);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openCat, setOpenCat] = useState<{ id: string; rect: DOMRect } | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => { setMounted(true); setSelected(loadSelection()); }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [pickerOpen]);

  useEffect(() => {
    if (!openCat) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenCat(null); };
    const onScrollOrResize = () => setOpenCat(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [openCat]);

  const persist = (ids: string[]) => {
    setSelected(ids);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
  };

  const visible: DtmCategoryDef[] = useMemo(
    () => selected.map((id) => DTM_CATEGORY_CATALOG.find((c) => c.id === id)!).filter(Boolean),
    [selected],
  );

  const valueLabelFor = (cat: DtmCategoryDef): string | null => {
    const v = filters[cat.filterKey];
    if (!v) return null;
    if (cat.kind === 'bool') return v === (cat.onValue || 'true') ? 'On' : null;
    const opt = cat.options?.find((o) => o.value === v);
    return opt ? opt.label : v;
  };

  const onChipClick = (cat: DtmCategoryDef, btn: HTMLButtonElement | null) => {
    if (cat.kind === 'bool') {
      const cur = filters[cat.filterKey];
      const target = cat.onValue || 'true';
      const next = { ...filters };
      if (cur === target) delete next[cat.filterKey];
      else next[cat.filterKey] = target;
      onChangeFilters(next);
      return;
    }
    if (!btn) return;
    if (openCat?.id === cat.id) { setOpenCat(null); return; }
    setOpenCat({ id: cat.id, rect: btn.getBoundingClientRect() });
  };

  const setCatValue = (cat: DtmCategoryDef, value: string | null) => {
    const next = { ...filters };
    if (value === null) delete next[cat.filterKey];
    else next[cat.filterKey] = value;
    onChangeFilters(next);
    setOpenCat(null);
  };

  const togglePicker = (id: string) => {
    if (selected.includes(id)) persist(selected.filter((x) => x !== id));
    else if (selected.length < MAX_CATEGORIES) persist([...selected, id]);
  };

  const popoverCat = openCat ? DTM_CATEGORY_CATALOG.find((c) => c.id === openCat.id) : null;

  return (
    <>
      <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto no-scrollbar items-center justify-center">
        {visible.map((cat) => {
          const Icon = cat.icon;
          const valueLabel = valueLabelFor(cat);
          const active = valueLabel !== null;
          return (
            <motion.button
              key={cat.id}
              ref={(el) => { chipRefs.current[cat.id] = el; }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChipClick(cat, chipRefs.current[cat.id])}
              className={cn(
                'shrink-0 flex items-center gap-1.5 h-10 pl-3 pr-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border',
                active
                  ? 'bg-rose-soft text-rose-dark border-rose-light shadow-[0_2px_8px_rgba(201,120,86,0.18)]'
                  : 'bg-white text-text-muted border-[#C97856]/10 hover:border-[#C97856]/25 hover:text-[#C97856]',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>
                {cat.label}
                {valueLabel && cat.kind !== 'bool' && (
                  <span className="font-bold">: {valueLabel}</span>
                )}
              </span>
              {cat.kind === 'bool' ? (
                <span
                  className={cn(
                    'ml-1 inline-flex items-center justify-center text-[9px] font-extrabold rounded-full px-1.5 h-4 border',
                    active
                      ? 'bg-rose-main text-white border-rose-main'
                      : 'bg-white text-zinc-400 border-zinc-200',
                  )}
                >{active ? 'ON' : 'OFF'}</span>
              ) : active ? (
                <span
                  role="button"
                  aria-label="Clear"
                  onClick={(e) => { e.stopPropagation(); setCatValue(cat, null); }}
                  className="ml-1 inline-flex w-4 h-4 items-center justify-center rounded-full hover:bg-rose-main/15"
                >
                  <X className="w-3 h-3" />
                </span>
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              )}
            </motion.button>
          );
        })}
        <button
          onClick={() => setPickerOpen(true)}
          className="shrink-0 h-10 w-10 rounded-xl border border-[#C97856]/15 bg-white text-[#C97856] hover:bg-[#C97856]/5 flex items-center justify-center transition-all"
          title="Customize DTM shortcuts"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {mounted && popoverCat && openCat && createPortal(
        <CategoryPopover
          cat={popoverCat}
          rect={openCat.rect}
          currentValue={filters[popoverCat.filterKey]}
          onPick={(v) => setCatValue(popoverCat, v)}
          onClose={() => setOpenCat(null)}
        />,
        document.body,
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              key="dtm-shortcut-picker"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[100] flex items-center justify-center"
              onClick={() => setPickerOpen(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-[480px] max-w-[94vw] max-h-[80vh] overflow-y-auto rounded-2xl bg-white border border-rose-light shadow-2xl"
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-rose-light/60 px-5 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Customize DTM categories</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{selected.length}/{MAX_CATEGORIES} selected</p>
                  </div>
                  <button onClick={() => setPickerOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2">
                  {DTM_CATEGORY_CATALOG.map((cat) => {
                    const Icon = cat.icon;
                    const checked = selected.includes(cat.id);
                    const disabled = !checked && selected.length >= MAX_CATEGORIES;
                    return (
                      <button
                        key={cat.id}
                        disabled={disabled}
                        onClick={() => togglePicker(cat.id)}
                        className={cn(
                          'flex items-center gap-2 h-11 px-3 rounded-xl border text-[12px] font-semibold transition-all text-left',
                          checked
                            ? 'bg-rose-soft text-rose-dark border-rose-light'
                            : disabled
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-50 cursor-not-allowed'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-rose-light',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 truncate">{cat.label}</span>
                        {checked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-rose-light/60 px-5 py-3 flex items-center justify-between">
                  <button
                    onClick={() => persist(DEFAULT_DTM_CATEGORIES)}
                    className="text-[11px] text-zinc-500 hover:text-rose-dark"
                  >Reset to defaults</button>
                  <button
                    onClick={() => setPickerOpen(false)}
                    className="h-9 px-4 rounded-lg bg-rose-main text-white text-[12px] font-bold hover:bg-rose-dark"
                  >Done</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

function CategoryPopover({
  cat,
  rect,
  currentValue,
  onPick,
  onClose,
}: {
  cat: DtmCategoryDef;
  rect: DOMRect;
  currentValue: string | undefined;
  onPick: (value: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const PAD = 8;
    const W = 240;
    const node = ref.current;
    let left = rect.left;
    if (left + W + PAD > window.innerWidth) left = window.innerWidth - W - PAD;
    if (left < PAD) left = PAD;
    let top = rect.bottom + 6;
    const nodeH = node?.offsetHeight || 220;
    if (top + nodeH + PAD > window.innerHeight) top = Math.max(PAD, rect.top - nodeH - 6);
    setPos({ top, left });
  }, [rect]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [onClose]);

  if (!cat.options) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      style={pos ? { top: pos.top, left: pos.left, width: 240, position: 'fixed' } : { visibility: 'hidden', position: 'fixed' }}
      className="z-[120] rounded-xl bg-white border border-rose-light shadow-xl py-1.5 max-h-[320px] overflow-y-auto"
    >
      <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {cat.label}
      </div>
      {cat.options.map((opt) => {
        const sel = currentValue === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onPick(sel ? null : opt.value)}
            className={cn(
              'w-full text-left px-3 py-2 text-[12.5px] font-medium flex items-center justify-between transition-colors',
              sel ? 'bg-rose-soft text-rose-dark' : 'text-zinc-700 hover:bg-zinc-50',
            )}
          >
            <span>{opt.label}</span>
            {sel && <Check className="w-3.5 h-3.5 text-rose-dark" />}
          </button>
        );
      })}
      {currentValue && (
        <>
          <div className="my-1 mx-3 h-px bg-zinc-100" />
          <button
            onClick={() => onPick(null)}
            className="w-full text-left px-3 py-2 text-[11.5px] font-semibold text-zinc-500 hover:bg-zinc-50 flex items-center gap-1.5"
          >
            <X className="w-3 h-3" /> Clear selection
          </button>
        </>
      )}
    </motion.div>
  );
}
