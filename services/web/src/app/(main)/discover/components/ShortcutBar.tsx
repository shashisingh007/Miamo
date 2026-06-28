'use client';

// Customizable shortcut bar for the Discover page.
// Supports three chip kinds:
//   - 'mode': single-select among ranking modes (For You / New / Active...).
//   - 'bool': boolean filter toggle (Has photos, Active today...).
//   - 'cat':  category chip — tapping opens a portaled value-picker
//             popover with the available values for that filter
//             (Religion, Diet, Education, Looking For, etc.). Multi-select.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Sparkles, Zap, Shield, Eye, Brain, Camera, Flame,
  HeartHandshake, Salad, Wine, Cigarette, GraduationCap,
  Settings2, Plus, X, Check, ChevronDown, ScrollText, Briefcase,
  Globe, Star, Dog, Baby, Activity, Users, Plane, Music,
  Film, Hash, MessageCircle, Smile, Coffee, Moon, Home, Mountain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Filters } from './constants';

export type ShortcutKind = 'mode' | 'bool' | 'cat';

export interface ShortcutDef {
  id: string;
  label: string;
  icon: any;
  kind: ShortcutKind;
  modeId?: string;
  boolKey?: keyof Filters;
  catKey?: keyof Filters; // multi-select comma-list filter key
  options?: { value: string; label: string }[];
}

export const SHORTCUT_CATALOG: ShortcutDef[] = [
  // Modes (mutually exclusive ranking)
  { id: 'all', label: 'For You', icon: Heart, kind: 'mode', modeId: 'all' },
  { id: 'new', label: 'New', icon: Sparkles, kind: 'mode', modeId: 'new' },
  { id: 'nearby', label: 'Active', icon: Zap, kind: 'mode', modeId: 'nearby' },
  { id: 'verified-mode', label: 'Verified', icon: Shield, kind: 'mode', modeId: 'verified' },
  { id: 'serious', label: 'Serious', icon: Eye, kind: 'mode', modeId: 'serious' },
  { id: 'ai', label: 'AI Picks', icon: Brain, kind: 'mode', modeId: 'ai' },
  // Boolean toggles
  { id: 'has-photos', label: 'Has photos', icon: Camera, kind: 'bool', boolKey: 'hasPhotos' },
  { id: 'active-today', label: 'Active today', icon: Flame, kind: 'bool', boolKey: 'activeToday' },
  { id: 'new-here', label: 'New here', icon: Sparkles, kind: 'bool', boolKey: 'newHere' },
  { id: 'verified-bool', label: 'Verified only', icon: Shield, kind: 'bool', boolKey: 'verified' },
  { id: 'willing-relocate', label: 'Open to relocate', icon: Plane, kind: 'bool', boolKey: 'willingToRelocate' },
  // Category chips (multi-select)
  {
    id: 'lookingFor', label: 'Looking for', icon: HeartHandshake, kind: 'cat', catKey: 'lookingFor',
    options: [
      { value: 'marriage', label: 'Marriage' },
      { value: 'engagement', label: 'Engagement first' },
      { value: 'long-term', label: 'Long-term partner' },
      { value: 'long-term-open', label: 'Long-term, open to short' },
      { value: 'short-term-open', label: 'Short-term, open to long' },
      { value: 'short-term', label: 'Short-term fun' },
      { value: 'casual', label: 'Casual dating' },
      { value: 'situationship', label: 'Situationship' },
      { value: 'friends-with-benefits', label: 'Friends with benefits' },
      { value: 'friendship', label: 'Friendship' },
      { value: 'networking', label: 'Networking' },
      { value: 'open', label: 'Open / Exploring' },
      { value: 'ethical-non-monogamy', label: 'Ethical non-monogamy' },
      { value: 'polyamory', label: 'Polyamory' },
      { value: 'still-figuring-out', label: 'Still figuring it out' },
    ],
  },
  {
    id: 'genders', label: 'Gender', icon: Users, kind: 'cat', catKey: 'genders',
    options: [
      { value: 'man', label: 'Man' },
      { value: 'woman', label: 'Woman' },
      { value: 'non-binary', label: 'Non-binary' },
      { value: 'agender', label: 'Agender' },
      { value: 'bigender', label: 'Bigender' },
      { value: 'trans-man', label: 'Trans man' },
      { value: 'trans-woman', label: 'Trans woman' },
      { value: 'genderqueer', label: 'Genderqueer' },
      { value: 'genderfluid', label: 'Genderfluid' },
      { value: 'two-spirit', label: 'Two-spirit' },
      { value: 'questioning', label: 'Questioning' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'sexualities', label: 'Sexuality', icon: Heart, kind: 'cat', catKey: 'sexualities',
    options: [
      { value: 'straight', label: 'Straight' },
      { value: 'gay', label: 'Gay' },
      { value: 'lesbian', label: 'Lesbian' },
      { value: 'bisexual', label: 'Bisexual' },
      { value: 'pansexual', label: 'Pansexual' },
      { value: 'omnisexual', label: 'Omnisexual' },
      { value: 'asexual', label: 'Asexual' },
      { value: 'demisexual', label: 'Demisexual' },
      { value: 'graysexual', label: 'Graysexual' },
      { value: 'sapiosexual', label: 'Sapiosexual' },
      { value: 'queer', label: 'Queer' },
      { value: 'questioning', label: 'Questioning' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'diet', label: 'Diet', icon: Salad, kind: 'cat', catKey: 'diet',
    options: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'eggetarian', label: 'Eggetarian' },
      { value: 'pescatarian', label: 'Pescatarian' },
      { value: 'flexitarian', label: 'Flexitarian' },
      { value: 'non-vegetarian', label: 'Non-Vegetarian' },
      { value: 'jain', label: 'Jain' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'halal', label: 'Halal' },
      { value: 'keto', label: 'Keto' },
      { value: 'paleo', label: 'Paleo' },
      { value: 'gluten-free', label: 'Gluten-free' },
      { value: 'raw-vegan', label: 'Raw vegan' },
      { value: 'sattvic', label: 'Sattvic' },
      { value: 'carnivore', label: 'Carnivore' },
    ],
  },
  {
    id: 'smoking', label: 'Smoking', icon: Cigarette, kind: 'cat', catKey: 'smoking',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'often', label: 'Often' },
      { value: 'trying-to-quit', label: 'Trying to quit' },
    ],
  },
  {
    id: 'drinking', label: 'Drinking', icon: Wine, kind: 'cat', catKey: 'drinking',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'socially', label: 'Socially' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'often', label: 'Often' },
    ],
  },
  {
    id: 'exercise', label: 'Exercise', icon: Activity, kind: 'cat', catKey: 'exercise',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'often', label: 'Often' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'never', label: 'Never' },
    ],
  },
  {
    id: 'education', label: 'Education', icon: GraduationCap, kind: 'cat', catKey: 'education',
    options: [
      { value: 'high-school', label: 'High School' },
      { value: 'diploma', label: 'Diploma' },
      { value: 'graduate', label: 'Graduate' },
      { value: 'post-graduate', label: 'Post-graduate' },
      { value: 'mba', label: 'MBA' },
      { value: 'law', label: 'Law degree' },
      { value: 'medicine', label: 'Medicine (MBBS/MD)' },
      { value: 'engineering', label: 'Engineering (BTech/MTech)' },
      { value: 'phd', label: 'PhD / Doctorate' },
      { value: 'iit', label: 'IIT alumnus' },
      { value: 'iim', label: 'IIM alumnus' },
      { value: 'aiims', label: 'AIIMS alumnus' },
      { value: 'ivy', label: 'Ivy League / Oxbridge' },
      { value: 'self-taught', label: 'Self-taught / Bootcamp' },
      { value: 'student', label: 'Currently studying' },
    ],
  },
  {
    id: 'religion', label: 'Religion', icon: ScrollText, kind: 'cat', catKey: 'religion',
    options: [
      { value: 'hindu', label: 'Hindu' },
      { value: 'muslim-sunni', label: 'Muslim — Sunni' },
      { value: 'muslim-shia', label: 'Muslim — Shia' },
      { value: 'christian-catholic', label: 'Christian — Catholic' },
      { value: 'christian-protestant', label: 'Christian — Protestant' },
      { value: 'christian-orthodox', label: 'Christian — Orthodox' },
      { value: 'sikh', label: 'Sikh' },
      { value: 'jain', label: 'Jain' },
      { value: 'buddhist', label: 'Buddhist' },
      { value: 'parsi', label: 'Parsi / Zoroastrian' },
      { value: 'jewish', label: 'Jewish' },
      { value: 'bahai', label: 'Baháʼí' },
      { value: 'spiritual', label: 'Spiritual' },
      { value: 'agnostic', label: 'Agnostic' },
      { value: 'atheist', label: 'Atheist' },
      { value: 'pagan', label: 'Pagan / Wicca' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'maritalStatus', label: 'Marital status', icon: HeartHandshake, kind: 'cat', catKey: 'maritalStatus',
    options: [
      { value: 'single', label: 'Single' },
      { value: 'never-married', label: 'Never married' },
      { value: 'divorced', label: 'Divorced' },
      { value: 'widowed', label: 'Widowed' },
      { value: 'separated', label: 'Separated' },
    ],
  },
  {
    id: 'incomeBand', label: 'Income', icon: Briefcase, kind: 'cat', catKey: 'incomeBand',
    options: [
      { value: '0-5', label: '< ₹5L' },
      { value: '5-10', label: '₹5–10L' },
      { value: '10-25', label: '₹10–25L' },
      { value: '25-50', label: '₹25–50L' },
      { value: '50-100', label: '₹50L–1Cr' },
      { value: '100+', label: '₹1Cr+' },
    ],
  },
  {
    id: 'languages', label: 'Languages', icon: Globe, kind: 'cat', catKey: 'languages',
    options: [
      { value: 'hindi', label: 'Hindi' },
      { value: 'english', label: 'English' },
      { value: 'punjabi', label: 'Punjabi' },
      { value: 'gujarati', label: 'Gujarati' },
      { value: 'marathi', label: 'Marathi' },
      { value: 'bengali', label: 'Bengali' },
      { value: 'tamil', label: 'Tamil' },
      { value: 'telugu', label: 'Telugu' },
      { value: 'kannada', label: 'Kannada' },
      { value: 'malayalam', label: 'Malayalam' },
      { value: 'urdu', label: 'Urdu' },
      { value: 'odia', label: 'Odia' },
      { value: 'assamese', label: 'Assamese' },
      { value: 'sindhi', label: 'Sindhi' },
      { value: 'konkani', label: 'Konkani' },
      { value: 'kashmiri', label: 'Kashmiri' },
      { value: 'nepali', label: 'Nepali' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'french', label: 'French' },
      { value: 'german', label: 'German' },
      { value: 'italian', label: 'Italian' },
      { value: 'portuguese', label: 'Portuguese' },
      { value: 'mandarin', label: 'Mandarin' },
      { value: 'cantonese', label: 'Cantonese' },
      { value: 'japanese', label: 'Japanese' },
      { value: 'korean', label: 'Korean' },
      { value: 'arabic', label: 'Arabic' },
      { value: 'persian', label: 'Persian / Farsi' },
      { value: 'turkish', label: 'Turkish' },
      { value: 'russian', label: 'Russian' },
      { value: 'dutch', label: 'Dutch' },
      { value: 'swahili', label: 'Swahili' },
    ],
  },
  {
    id: 'zodiac', label: 'Zodiac', icon: Star, kind: 'cat', catKey: 'zodiac',
    options: [
      { value: 'aries', label: 'Aries' },
      { value: 'taurus', label: 'Taurus' },
      { value: 'gemini', label: 'Gemini' },
      { value: 'cancer', label: 'Cancer' },
      { value: 'leo', label: 'Leo' },
      { value: 'virgo', label: 'Virgo' },
      { value: 'libra', label: 'Libra' },
      { value: 'scorpio', label: 'Scorpio' },
      { value: 'sagittarius', label: 'Sagittarius' },
      { value: 'capricorn', label: 'Capricorn' },
      { value: 'aquarius', label: 'Aquarius' },
      { value: 'pisces', label: 'Pisces' },
    ],
  },
  {
    id: 'politics', label: 'Politics', icon: Users, kind: 'cat', catKey: 'politics',
    options: [
      { value: 'liberal', label: 'Liberal' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'conservative', label: 'Conservative' },
      { value: 'apolitical', label: 'Apolitical' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'pets', label: 'Pets', icon: Dog, kind: 'cat', catKey: 'pets',
    options: [
      { value: 'dog', label: 'Has dog' },
      { value: 'cat', label: 'Has cat' },
      { value: 'other', label: 'Other pet' },
      { value: 'none', label: 'No pets' },
      { value: 'wants', label: 'Wants pets' },
      { value: 'allergic', label: 'Allergic / no pets' },
    ],
  },
  {
    id: 'children', label: 'Children', icon: Baby, kind: 'cat', catKey: 'children',
    options: [
      { value: 'no-have-want', label: 'No, but want' },
      { value: 'no-not-want', label: 'No, don’t want' },
      { value: 'no-not-sure', label: 'Not sure' },
      { value: 'have-want-more', label: 'Have, want more' },
      { value: 'have-no-more', label: 'Have, no more' },
    ],
  },
  // Personality & lifestyle (extended)
  {
    id: 'datingIntent', label: 'Dating intent', icon: HeartHandshake, kind: 'cat', catKey: 'datingIntent',
    options: [
      { value: 'serious-only', label: 'Serious only' },
      { value: 'serious-leaning', label: 'Serious-leaning' },
      { value: 'open', label: 'Open / Exploring' },
      { value: 'casual-leaning', label: 'Casual-leaning' },
      { value: 'casual-only', label: 'Casual only' },
      { value: 'figuring-out', label: 'Still figuring out' },
    ],
  },
  {
    id: 'wantsKids', label: 'Wants kids', icon: Baby, kind: 'cat', catKey: 'wantsKids',
    options: [
      { value: 'definitely', label: 'Definitely want' },
      { value: 'someday', label: 'Someday' },
      { value: 'open', label: 'Open' },
      { value: 'not-sure', label: 'Not sure' },
      { value: 'no', label: 'Don’t want' },
      { value: 'have', label: 'Already have' },
    ],
  },
  {
    id: 'kidsTimeline', label: 'Kids timeline', icon: Baby, kind: 'cat', catKey: 'kidsTimeline',
    options: [
      { value: '0-2y', label: 'Within 2 years' },
      { value: '2-5y', label: '2 – 5 years' },
      { value: '5y+', label: '5+ years' },
      { value: 'someday', label: 'Someday' },
      { value: 'never', label: 'Never' },
    ],
  },
  {
    id: 'fitnessLevel', label: 'Fitness level', icon: Activity, kind: 'cat', catKey: 'fitnessLevel',
    options: [
      { value: 'athlete', label: 'Athlete' },
      { value: 'active', label: 'Active' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'light', label: 'Light' },
      { value: 'sedentary', label: 'Sedentary' },
    ],
  },
  {
    id: 'hobbies', label: 'Hobbies', icon: Sparkles, kind: 'cat', catKey: 'hobbies',
    options: [
      { value: 'reading', label: 'Reading' },
      { value: 'writing', label: 'Writing' },
      { value: 'travel', label: 'Travel' },
      { value: 'photography', label: 'Photography' },
      { value: 'cooking', label: 'Cooking' },
      { value: 'baking', label: 'Baking' },
      { value: 'painting', label: 'Painting / Art' },
      { value: 'singing', label: 'Singing' },
      { value: 'dancing', label: 'Dancing' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'tabletop', label: 'Board games' },
      { value: 'gym', label: 'Gym / Fitness' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'running', label: 'Running' },
      { value: 'cycling', label: 'Cycling' },
      { value: 'swimming', label: 'Swimming' },
      { value: 'hiking', label: 'Hiking / Trekking' },
      { value: 'climbing', label: 'Climbing' },
      { value: 'surfing', label: 'Surfing' },
      { value: 'martial-arts', label: 'Martial arts' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'volunteering', label: 'Volunteering' },
      { value: 'gardening', label: 'Gardening' },
      { value: 'movies', label: 'Movies / TV' },
      { value: 'theatre', label: 'Theatre' },
      { value: 'standup', label: 'Stand-up comedy' },
      { value: 'concerts', label: 'Concerts' },
      { value: 'museums', label: 'Museums / Art' },
      { value: 'cars', label: 'Cars / Bikes' },
      { value: 'tech', label: 'Tech tinkering' },
      { value: 'investing', label: 'Investing / Markets' },
      { value: 'astrology', label: 'Astrology' },
      { value: 'astronomy', label: 'Astronomy' },
      { value: 'thrifting', label: 'Thrifting' },
      { value: 'wine-tasting', label: 'Wine tasting' },
      { value: 'coffee', label: 'Coffee culture' },
      { value: 'foodie', label: 'Foodie tours' },
    ],
  },
  {
    id: 'music', label: 'Music', icon: Music, kind: 'cat', catKey: 'music',
    options: [
      { value: 'pop', label: 'Pop' },
      { value: 'rock', label: 'Rock' },
      { value: 'indie', label: 'Indie' },
      { value: 'metal', label: 'Metal' },
      { value: 'punk', label: 'Punk' },
      { value: 'rnb', label: 'R&B / Soul' },
      { value: 'hiphop', label: 'Hip-hop / Rap' },
      { value: 'edm', label: 'EDM / Electronic' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'blues', label: 'Blues' },
      { value: 'classical', label: 'Classical' },
      { value: 'hindustani', label: 'Hindustani classical' },
      { value: 'carnatic', label: 'Carnatic classical' },
      { value: 'bollywood', label: 'Bollywood' },
      { value: 'sufi', label: 'Sufi / Qawwali' },
      { value: 'ghazal', label: 'Ghazal' },
      { value: 'punjabi', label: 'Punjabi' },
      { value: 'tamil-cinema', label: 'Tamil cinema' },
      { value: 'kpop', label: 'K-pop' },
      { value: 'jpop', label: 'J-pop' },
      { value: 'latin', label: 'Latin / Reggaeton' },
      { value: 'country', label: 'Country' },
      { value: 'folk', label: 'Folk' },
      { value: 'lofi', label: 'Lo-fi' },
      { value: 'devotional', label: 'Devotional / Bhajan' },
    ],
  },
  {
    id: 'movieGenres', label: 'Movie genres', icon: Film, kind: 'cat', catKey: 'movieGenres',
    options: [
      { value: 'action', label: 'Action' },
      { value: 'comedy', label: 'Comedy' },
      { value: 'drama', label: 'Drama' },
      { value: 'romance', label: 'Romance' },
      { value: 'romcom', label: 'Rom-com' },
      { value: 'thriller', label: 'Thriller' },
      { value: 'horror', label: 'Horror' },
      { value: 'mystery', label: 'Mystery' },
      { value: 'scifi', label: 'Sci-fi' },
      { value: 'fantasy', label: 'Fantasy' },
      { value: 'anime', label: 'Anime' },
      { value: 'animation', label: 'Animation' },
      { value: 'documentary', label: 'Documentary' },
      { value: 'biopic', label: 'Biopic' },
      { value: 'crime', label: 'Crime' },
      { value: 'noir', label: 'Noir' },
      { value: 'arthouse', label: 'Arthouse / Indie' },
      { value: 'bollywood', label: 'Bollywood' },
      { value: 'tamil-cinema', label: 'Tamil / Telugu cinema' },
      { value: 'kdrama', label: 'K-drama' },
      { value: 'reality', label: 'Reality TV' },
      { value: 'sitcom', label: 'Sitcom' },
    ],
  },
  {
    id: 'travelStyle', label: 'Travel style', icon: Plane, kind: 'cat', catKey: 'travelStyle',
    options: [
      { value: 'backpacker', label: 'Backpacker / Adventure' },
      { value: 'luxury', label: 'Luxury' },
      { value: 'budget', label: 'Budget' },
      { value: 'cultural', label: 'Cultural / Heritage' },
      { value: 'beach', label: 'Beach / Relax' },
      { value: 'mountains', label: 'Mountains' },
      { value: 'roadtrip', label: 'Road trips' },
      { value: 'solo', label: 'Solo travel' },
      { value: 'group', label: 'Group trips' },
      { value: 'foodie', label: 'Foodie travel' },
      { value: 'spiritual', label: 'Spiritual / Pilgrimage' },
      { value: 'workation', label: 'Workation / Digital nomad' },
      { value: 'homebody', label: 'Homebody (rare traveler)' },
    ],
  },
  {
    id: 'attachmentStyle', label: 'Attachment style', icon: Heart, kind: 'cat', catKey: 'attachmentStyle',
    options: [
      { value: 'secure', label: 'Secure' },
      { value: 'anxious', label: 'Anxious' },
      { value: 'avoidant', label: 'Avoidant' },
      { value: 'fearful-avoidant', label: 'Fearful-avoidant' },
      { value: 'mixed', label: 'Mixed / unsure' },
    ],
  },
  {
    id: 'loveLanguage', label: 'Love language', icon: Heart, kind: 'cat', catKey: 'loveLanguage',
    options: [
      { value: 'words', label: 'Words of affirmation' },
      { value: 'acts', label: 'Acts of service' },
      { value: 'gifts', label: 'Receiving gifts' },
      { value: 'time', label: 'Quality time' },
      { value: 'touch', label: 'Physical touch' },
    ],
  },
  {
    id: 'communicationStyle', label: 'Communication', icon: MessageCircle, kind: 'cat', catKey: 'communicationStyle',
    options: [
      { value: 'direct', label: 'Direct / Frank' },
      { value: 'diplomatic', label: 'Diplomatic' },
      { value: 'reserved', label: 'Reserved / Quiet' },
      { value: 'expressive', label: 'Expressive / Talker' },
      { value: 'thoughtful', label: 'Thoughtful / Slow' },
    ],
  },
  {
    id: 'conflictStyle', label: 'Conflict style', icon: Flame, kind: 'cat', catKey: 'conflictStyle',
    options: [
      { value: 'discuss', label: 'Discuss it out' },
      { value: 'space-then-talk', label: 'Need space then talk' },
      { value: 'avoid', label: 'Avoid conflict' },
      { value: 'compromise', label: 'Compromise quickly' },
      { value: 'mediate', label: 'Mediate / write it out' },
    ],
  },
  {
    id: 'socialStyle', label: 'Social style', icon: Users, kind: 'cat', catKey: 'socialStyle',
    options: [
      { value: 'introvert', label: 'Introvert' },
      { value: 'extrovert', label: 'Extrovert' },
      { value: 'ambivert', label: 'Ambivert' },
      { value: 'homebody', label: 'Homebody' },
      { value: 'social-butterfly', label: 'Social butterfly' },
    ],
  },
  {
    id: 'mbti', label: 'MBTI', icon: Hash, kind: 'cat', catKey: 'mbti',
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
    id: 'enneagram', label: 'Enneagram', icon: Hash, kind: 'cat', catKey: 'enneagram',
    options: [
      { value: '1', label: 'Type 1 — Reformer' },
      { value: '2', label: 'Type 2 — Helper' },
      { value: '3', label: 'Type 3 — Achiever' },
      { value: '4', label: 'Type 4 — Individualist' },
      { value: '5', label: 'Type 5 — Investigator' },
      { value: '6', label: 'Type 6 — Loyalist' },
      { value: '7', label: 'Type 7 — Enthusiast' },
      { value: '8', label: 'Type 8 — Challenger' },
      { value: '9', label: 'Type 9 — Peacemaker' },
    ],
  },
  {
    id: 'datingExperience', label: 'Dating experience', icon: Heart, kind: 'cat', catKey: 'datingExperience',
    options: [
      { value: 'first-time', label: 'First time dating' },
      { value: 'casual', label: 'Some casual' },
      { value: 'few-relationships', label: 'A few relationships' },
      { value: 'many', label: 'Many relationships' },
      { value: 'returning', label: 'Returning after break' },
    ],
  },
  {
    id: 'livingSituation', label: 'Living situation', icon: Home, kind: 'cat', catKey: 'livingSituation',
    options: [
      { value: 'alone', label: 'Live alone' },
      { value: 'roommates', label: 'With roommates' },
      { value: 'partner', label: 'With partner' },
      { value: 'parents', label: 'With parents' },
      { value: 'kids', label: 'With kids' },
      { value: 'pg', label: 'In a PG / Hostel' },
      { value: 'travel', label: 'Travel / Nomad' },
    ],
  },
  {
    id: 'nightlife', label: 'Nightlife', icon: Moon, kind: 'cat', catKey: 'nightlife',
    options: [
      { value: 'love-it', label: 'Love it' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rare', label: 'Rare' },
      { value: 'not-my-thing', label: 'Not my thing' },
    ],
  },
  {
    id: 'socialMediaUse', label: 'Social media', icon: Smile, kind: 'cat', catKey: 'socialMediaUse',
    options: [
      { value: 'addict', label: 'Always online' },
      { value: 'active', label: 'Active' },
      { value: 'casual', label: 'Casual' },
      { value: 'lurker', label: 'Lurker' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'off-grid', label: 'Off-grid' },
    ],
  },
  // Boolean toggles (extended)
  { id: 'photo-verified-bool', label: 'Photo verified', icon: Shield, kind: 'bool', boolKey: 'photoVerified' },
  { id: 'has-bio-bool', label: 'Has bio', icon: ScrollText, kind: 'bool', boolKey: 'hasBio' },
  { id: 'has-prompts-bool', label: 'Has prompts', icon: ScrollText, kind: 'bool', boolKey: 'hasPrompts' },
  { id: 'same-city-bool', label: 'Same city', icon: Home, kind: 'bool', boolKey: 'sameCity' },
  { id: 'open-ldr-bool', label: 'Open to LDR', icon: Plane, kind: 'bool', boolKey: 'openToLDR' },
  { id: 'wants-adventure-bool', label: 'Wants adventure', icon: Mountain, kind: 'bool', boolKey: 'wantsAdventure' },
];

const DEFAULT_SHORTCUTS = ['all', 'new', 'nearby', 'verified-mode', 'serious', 'ai'];
const STORAGE_KEY = 'miamo:discover:shortcuts:v2';
const MAX_SHORTCUTS = 10;

function loadSelection(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const ids = JSON.parse(raw) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return DEFAULT_SHORTCUTS;
    return ids.filter((id) => SHORTCUT_CATALOG.some((c) => c.id === id)).slice(0, MAX_SHORTCUTS);
  } catch { return DEFAULT_SHORTCUTS; }
}

function getCatValues(filters: Filters, key: keyof Filters): string[] {
  const v = filters[key];
  if (typeof v !== 'string' || !v) return [];
  return v.split(',').filter(Boolean);
}

function setCatValues(filters: Filters, key: keyof Filters, values: string[]): Filters {
  return { ...filters, [key]: values.join(',') } as Filters;
}

export function ShortcutBar({
  filters,
  onChangeFilters,
  activeMode,
  onChangeMode,
}: {
  filters: Filters;
  onChangeFilters: (f: Filters) => void;
  activeMode: string;
  onChangeMode: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SHORTCUTS);
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

  const visible: ShortcutDef[] = useMemo(
    () => selected.map((id) => SHORTCUT_CATALOG.find((c) => c.id === id)!).filter(Boolean),
    [selected],
  );

  const isActive = (s: ShortcutDef): boolean => {
    if (s.kind === 'mode') return activeMode === s.modeId;
    if (s.kind === 'bool' && s.boolKey) return Boolean(filters[s.boolKey]);
    if (s.kind === 'cat' && s.catKey) return getCatValues(filters, s.catKey).length > 0;
    return false;
  };

  const catChipLabel = (s: ShortcutDef): string | null => {
    if (s.kind !== 'cat' || !s.catKey || !s.options) return null;
    const vals = getCatValues(filters, s.catKey);
    if (vals.length === 0) return null;
    if (vals.length === 1) {
      const opt = s.options.find((o) => o.value === vals[0]);
      return opt ? opt.label : vals[0];
    }
    return `${vals.length} selected`;
  };

  const onChipClick = (s: ShortcutDef, btn: HTMLButtonElement | null) => {
    if (s.kind === 'mode' && s.modeId) { onChangeMode(s.modeId); return; }
    if (s.kind === 'bool' && s.boolKey) {
      onChangeFilters({ ...filters, [s.boolKey]: !filters[s.boolKey] } as Filters);
      return;
    }
    if (s.kind === 'cat' && btn) {
      if (openCat?.id === s.id) { setOpenCat(null); return; }
      setOpenCat({ id: s.id, rect: btn.getBoundingClientRect() });
    }
  };

  const toggleCatValue = (s: ShortcutDef, value: string) => {
    if (s.kind !== 'cat' || !s.catKey) return;
    const cur = getCatValues(filters, s.catKey);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    onChangeFilters(setCatValues(filters, s.catKey, next));
  };

  const clearCat = (s: ShortcutDef) => {
    if (s.kind !== 'cat' || !s.catKey) return;
    onChangeFilters(setCatValues(filters, s.catKey, []));
  };

  const togglePicker = (id: string) => {
    if (selected.includes(id)) persist(selected.filter((x) => x !== id));
    else if (selected.length < MAX_SHORTCUTS) persist([...selected, id]);
  };

  const popoverDef = openCat ? SHORTCUT_CATALOG.find((c) => c.id === openCat.id) : null;

  return (
    <>
      <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto no-scrollbar items-center justify-center">
        {visible.map((s) => {
          const Icon = s.icon;
          const active = isActive(s);
          const catLabel = catChipLabel(s);
          return (
            <motion.button
              key={s.id}
              ref={(el) => { chipRefs.current[s.id] = el; }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChipClick(s, chipRefs.current[s.id])}
              className={cn(
                'shrink-0 flex items-center gap-1.5 h-10 pl-3 pr-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border',
                active ? 'chip-glass-active' : 'chip-glass text-text-muted',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>
                {s.label}
                {catLabel && <span className="font-bold">: {catLabel}</span>}
              </span>
              {s.kind === 'cat' ? (
                active ? (
                  <span
                    role="button"
                    aria-label="Clear"
                    onClick={(e) => { e.stopPropagation(); clearCat(s); }}
                    className="ml-1 inline-flex w-4 h-4 items-center justify-center rounded-full hover:bg-rose-main/15"
                  >
                    <X className="w-3 h-3" />
                  </span>
                ) : (
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                )
              ) : s.kind === 'bool' ? (
                <span
                  className={cn(
                    'ml-1 inline-flex items-center justify-center text-[9px] font-extrabold rounded-full px-1.5 h-4 border',
                    active
                      ? 'bg-rose-main text-white border-rose-main'
                      : 'bg-white/60 text-text-muted border-border',
                  )}
                >{active ? 'ON' : 'OFF'}</span>
              ) : null}
            </motion.button>
          );
        })}
        <button
          onClick={() => setPickerOpen(true)}
          className="shrink-0 h-10 w-10 rounded-xl border border-[#C97856]/15 bg-white text-[#C97856] hover:bg-[#C97856]/5 flex items-center justify-center transition-all"
          title="Customize shortcuts"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {mounted && popoverDef && popoverDef.kind === 'cat' && popoverDef.catKey && popoverDef.options && openCat && createPortal(
        <CategoryMultiPopover
          label={popoverDef.label}
          rect={openCat.rect}
          options={popoverDef.options}
          selected={getCatValues(filters, popoverDef.catKey)}
          onToggle={(v) => toggleCatValue(popoverDef, v)}
          onClear={() => { clearCat(popoverDef); setOpenCat(null); }}
          onClose={() => setOpenCat(null)}
        />,
        document.body,
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              key="shortcut-picker"
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
                className="relative w-[480px] max-w-[94vw] max-h-[80vh] overflow-y-auto rounded-2xl bg-miamo-card border border-border shadow-2xl"
              >
                <div className="sticky top-0 bg-miamo-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Customize shortcuts</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">{selected.length}/{MAX_SHORTCUTS} selected</p>
                  </div>
                  <button onClick={() => setPickerOpen(false)} className="text-text-muted hover:text-text-primary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2">
                  {SHORTCUT_CATALOG.map((s) => {
                    const Icon = s.icon;
                    const checked = selected.includes(s.id);
                    const disabled = !checked && selected.length >= MAX_SHORTCUTS;
                    return (
                      <button
                        key={s.id}
                        disabled={disabled}
                        onClick={() => togglePicker(s.id)}
                        className={cn(
                          'flex items-center gap-2 h-11 px-3 rounded-xl border text-[12px] font-semibold transition-all text-left',
                          checked
                            ? 'bg-rose-main/10 border-rose-main/40 text-rose-main'
                            : disabled
                              ? 'bg-miamo-surface border-border text-text-muted opacity-40 cursor-not-allowed'
                              : 'bg-miamo-surface border-border text-text-secondary hover:border-rose-main/30',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 truncate">{s.label}</span>
                        {checked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
                <div className="sticky bottom-0 bg-miamo-card/95 backdrop-blur-xl border-t border-border px-5 py-3 flex items-center justify-between">
                  <button
                    onClick={() => persist(DEFAULT_SHORTCUTS)}
                    className="text-[11px] text-text-muted hover:text-rose-main"
                  >Reset to defaults</button>
                  <button
                    onClick={() => setPickerOpen(false)}
                    className="h-9 px-4 rounded-lg bg-rose-main text-white text-[12px] font-bold hover:bg-rose-main/90"
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

function CategoryMultiPopover({
  label,
  rect,
  options,
  selected,
  onToggle,
  onClear,
  onClose,
}: {
  label: string;
  rect: DOMRect;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
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
    const nodeH = node?.offsetHeight || 240;
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

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      style={pos ? { top: pos.top, left: pos.left, width: 240, position: 'fixed' } : { visibility: 'hidden', position: 'fixed' }}
      className="z-[120] rounded-xl bg-miamo-card border border-border shadow-xl py-1.5 max-h-[320px] overflow-y-auto"
    >
      <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {label} <span className="font-normal opacity-60">· multi-select</span>
      </div>
      {options.map((opt) => {
        const sel = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={cn(
              'w-full text-left px-3 py-2 text-[12.5px] font-medium flex items-center justify-between transition-colors',
              sel ? 'bg-rose-main/10 text-rose-main' : 'text-text-secondary hover:bg-miamo-surface',
            )}
          >
            <span>{opt.label}</span>
            {sel && <Check className="w-3.5 h-3.5" />}
          </button>
        );
      })}
      {selected.length > 0 && (
        <>
          <div className="my-1 mx-3 h-px bg-border" />
          <button
            onClick={onClear}
            className="w-full text-left px-3 py-2 text-[11.5px] font-semibold text-text-muted hover:bg-miamo-surface flex items-center gap-1.5"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        </>
      )}
    </motion.div>
  );
}
