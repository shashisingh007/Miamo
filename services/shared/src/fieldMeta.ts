// ─── v3.2 Field Meta Registry ──────────────────────────────────
// Single source of truth for every profile field's icon + display
// metadata. The shared module deliberately stores icon NAMES (strings)
// rather than components so it can be imported from both Node services
// (no React) and web. The web side maps name → lucide-react component in
// services/web/src/components/FieldIcon.tsx.
//
// Used by:
//   • onboarding cards — per-field icon next to each input label
//   • discover ProfileCard — iconified attribute strip
//   • DTM card — iconified attribute strip + visibility badge
//   • compatibility breakdown rows
//
// Icon names must exist in lucide-react. Verify with the FieldIcon map.

export type IconName =
  | 'User' | 'Users' | 'MapPin' | 'Briefcase' | 'Building2' | 'GraduationCap'
  | 'Heart' | 'HeartHandshake' | 'Sparkles' | 'Star' | 'Moon' | 'Sun'
  | 'Cake' | 'Ruler' | 'Languages' | 'BookOpen' | 'Globe'
  | 'Cigarette' | 'Wine' | 'Dumbbell' | 'Salad' | 'Baby' | 'Dog' | 'Cat' | 'PawPrint'
  | 'Camera' | 'MessageCircle' | 'Tag' | 'CheckCircle2' | 'Shield'
  | 'Coins' | 'Wallet' | 'Banknote' | 'TrendingUp'
  | 'Flame' | 'Home' | 'Hand' | 'Handshake'
  | 'Crown' | 'Gem' | 'Flower2' | 'Music' | 'Mic'
  | 'CalendarDays' | 'Clock' | 'Map' | 'Plane' | 'Mountain' | 'Trees'
  | 'Hash' | 'FileText' | 'Link2' | 'Phone' | 'Mail'
  | 'Compass' | 'Target' | 'Filter' | 'Settings' | 'Eye' | 'EyeOff'
  | 'Scroll' | 'Trophy' | 'Footprints' | 'Bike' | 'Waves' | 'Snowflake'
  | 'Film' | 'Drama' | 'Palette' | 'PenTool' | 'Landmark'
  | 'Cpu' | 'Rocket' | 'Gamepad2' | 'Dice5'
  | 'Megaphone' | 'Leaf' | 'CircleSlash' | 'Droplet'
  | 'Fish' | 'Cross' | 'HelpCircle' | 'School' | 'Wrench'
  | 'Coffee' | 'Utensils' | 'ChefHat' | 'Activity' | 'BatteryLow'
  | 'Image' | 'Video' | 'Paintbrush' | 'Award' | 'Zap'
  | 'Flag' | 'Bookmark' | 'Send';

export interface FieldMeta {
  key: string;
  label: string;       // short human label for chips & form rows
  icon: IconName;      // lucide-react icon name
  group?: 'identity' | 'lifestyle' | 'work' | 'family' | 'partner' | 'horoscope' | 'about';
  format?: (v: any) => string;     // value → display string (optional)
}

const FMT_HEIGHT_CM = (v: any) => v ? `${v} cm` : '';
const FMT_INCOME = (v: any) => v || '';
const FMT_BOOL_YN = (v: any) => v === true ? 'Yes' : v === false ? 'No' : '';

// ─── CASUAL / Discover fields ─────────────────────────────────
export const CASUAL_FIELDS: Record<string, FieldMeta> = {
  age:            { key: 'age',            label: 'Age',           icon: 'Cake',          group: 'identity' },
  gender:         { key: 'gender',         label: 'Gender',        icon: 'User',          group: 'identity' },
  city:           { key: 'city',           label: 'City',          icon: 'MapPin',        group: 'identity' },
  profession:     { key: 'profession',     label: 'Profession',    icon: 'Briefcase',     group: 'work' },
  bio:            { key: 'bio',            label: 'Bio',           icon: 'FileText',      group: 'about' },
  photos:         { key: 'photos',         label: 'Photos',        icon: 'Camera',        group: 'about' },
  prompts:        { key: 'prompts',        label: 'Prompts',       icon: 'MessageCircle', group: 'about' },
  interests:      { key: 'interests',      label: 'Interests',     icon: 'Tag',           group: 'about' },
  height:         { key: 'height',         label: 'Height',        icon: 'Ruler',         group: 'lifestyle', format: FMT_HEIGHT_CM },
  education:      { key: 'education',      label: 'Education',     icon: 'GraduationCap', group: 'lifestyle' },
  languages:      { key: 'languages',      label: 'Languages',     icon: 'Languages',     group: 'lifestyle' },
  diet:           { key: 'diet',           label: 'Diet',          icon: 'Salad',         group: 'lifestyle' },
  drinking:       { key: 'drinking',       label: 'Drinking',      icon: 'Wine',          group: 'lifestyle' },
  smoking:        { key: 'smoking',        label: 'Smoking',       icon: 'Cigarette',     group: 'lifestyle' },
  exercise:       { key: 'exercise',       label: 'Exercise',      icon: 'Dumbbell',      group: 'lifestyle' },
  religion:       { key: 'religion',       label: 'Religion',      icon: 'Flower2',       group: 'lifestyle' },
  pets:           { key: 'pets',           label: 'Pets',          icon: 'Dog',           group: 'lifestyle' },
  children:       { key: 'children',       label: 'Children',      icon: 'Baby',          group: 'lifestyle' },
  zodiac:         { key: 'zodiac',         label: 'Zodiac',        icon: 'Moon',          group: 'lifestyle' },
  lookingFor:     { key: 'lookingFor',     label: 'Looking for',   icon: 'HeartHandshake',group: 'about' },
  sexuality:      { key: 'sexuality',      label: 'Sexuality',     icon: 'Heart',         group: 'identity' },
  politicalViews: { key: 'politicalViews', label: 'Politics',      icon: 'Scroll',        group: 'lifestyle' },
  verification:   { key: 'verification',   label: 'Verified',      icon: 'Shield',        group: 'identity' },
};

// ─── DTM / Matrimonial fields ─────────────────────────────────
export const DTM_FIELDS: Record<string, FieldMeta> = {
  fullName:        { key: 'fullName',        label: 'Full name',      icon: 'User',          group: 'identity' },
  dateOfBirth:     { key: 'dateOfBirth',     label: 'Date of birth',  icon: 'CalendarDays',  group: 'identity' },
  birthTime:       { key: 'birthTime',       label: 'Birth time',     icon: 'Clock',         group: 'horoscope' },
  birthPlace:      { key: 'birthPlace',      label: 'Birth place',    icon: 'Map',           group: 'horoscope' },
  height:          { key: 'height',          label: 'Height',         icon: 'Ruler',         group: 'identity' },
  weight:          { key: 'weight',          label: 'Weight',         icon: 'Ruler',         group: 'identity' },
  complexion:      { key: 'complexion',      label: 'Complexion',     icon: 'Sun',           group: 'identity' },
  bodyType:        { key: 'bodyType',        label: 'Body type',      icon: 'User',          group: 'identity' },
  bloodGroup:      { key: 'bloodGroup',      label: 'Blood group',    icon: 'Heart',         group: 'identity' },
  physicalStatus:  { key: 'physicalStatus',  label: 'Physical status',icon: 'Shield',        group: 'identity' },
  maritalStatus:   { key: 'maritalStatus',   label: 'Marital status', icon: 'HeartHandshake',group: 'identity' },

  religion:        { key: 'religion',        label: 'Religion',       icon: 'Flower2',       group: 'identity' },
  caste:           { key: 'caste',           label: 'Caste',          icon: 'Crown',         group: 'identity' },
  subCaste:        { key: 'subCaste',        label: 'Sub-caste',      icon: 'Crown',         group: 'identity' },
  gotra:           { key: 'gotra',           label: 'Gotra',          icon: 'Crown',         group: 'horoscope' },
  manglik:         { key: 'manglik',         label: 'Manglik',        icon: 'Flame',         group: 'horoscope' },
  motherTongue:    { key: 'motherTongue',    label: 'Mother tongue',  icon: 'Languages',     group: 'identity' },
  nakshatra:       { key: 'nakshatra',       label: 'Nakshatra',      icon: 'Star',          group: 'horoscope' },
  raasi:           { key: 'raasi',           label: 'Raasi',          icon: 'Moon',          group: 'horoscope' },
  kundliUrl:       { key: 'kundliUrl',       label: 'Kundli',         icon: 'FileText',      group: 'horoscope' },

  education:       { key: 'education',       label: 'Education',      icon: 'GraduationCap', group: 'work' },
  educationDetail: { key: 'educationDetail', label: 'Specialisation', icon: 'BookOpen',      group: 'work' },
  college:         { key: 'college',         label: 'College',        icon: 'GraduationCap', group: 'work' },
  occupation:      { key: 'occupation',      label: 'Occupation',     icon: 'Briefcase',     group: 'work' },
  company:         { key: 'company',         label: 'Company',        icon: 'Building2',     group: 'work' },
  annualIncome:    { key: 'annualIncome',    label: 'Annual income',  icon: 'Banknote',      group: 'work', format: FMT_INCOME },
  workingCity:     { key: 'workingCity',     label: 'Working city',   icon: 'MapPin',        group: 'work' },
  workingCountry:  { key: 'workingCountry',  label: 'Country',        icon: 'Globe',         group: 'work' },

  fatherName:      { key: 'fatherName',      label: 'Father',         icon: 'User',          group: 'family' },
  fatherOccupation:{ key: 'fatherOccupation',label: 'Father\'s work', icon: 'Briefcase',     group: 'family' },
  motherName:      { key: 'motherName',      label: 'Mother',         icon: 'User',          group: 'family' },
  motherOccupation:{ key: 'motherOccupation',label: 'Mother\'s work', icon: 'Briefcase',     group: 'family' },
  brothers:        { key: 'brothers',        label: 'Brothers',       icon: 'Users',         group: 'family' },
  sisters:         { key: 'sisters',         label: 'Sisters',        icon: 'Users',         group: 'family' },
  familyType:      { key: 'familyType',      label: 'Family type',    icon: 'Home',          group: 'family' },
  familyStatus:    { key: 'familyStatus',    label: 'Family status',  icon: 'Gem',           group: 'family' },
  familyValues:    { key: 'familyValues',    label: 'Family values',  icon: 'Hand',          group: 'family' },
  nativePlace:     { key: 'nativePlace',     label: 'Native place',   icon: 'Home',          group: 'family' },
  familyIncome:    { key: 'familyIncome',    label: 'Family income',  icon: 'Coins',         group: 'family' },

  diet:            { key: 'diet',            label: 'Diet',           icon: 'Salad',         group: 'lifestyle' },
  drinking:        { key: 'drinking',        label: 'Drinking',       icon: 'Wine',          group: 'lifestyle' },
  smoking:         { key: 'smoking',         label: 'Smoking',        icon: 'Cigarette',     group: 'lifestyle' },

  aboutMe:         { key: 'aboutMe',         label: 'About me',       icon: 'FileText',      group: 'about' },
  aboutFamily:     { key: 'aboutFamily',     label: 'About family',   icon: 'Home',          group: 'about' },

  // Partner preferences (everything below is what the user *wants*)
  partnerAgeMin:        { key: 'partnerAgeMin',        label: 'Min age',          icon: 'Cake',          group: 'partner' },
  partnerAgeMax:        { key: 'partnerAgeMax',        label: 'Max age',          icon: 'Cake',          group: 'partner' },
  partnerHeightMin:     { key: 'partnerHeightMin',     label: 'Min height',       icon: 'Ruler',         group: 'partner' },
  partnerHeightMax:     { key: 'partnerHeightMax',     label: 'Max height',       icon: 'Ruler',         group: 'partner' },
  partnerReligion:      { key: 'partnerReligion',      label: 'Religion',         icon: 'Flower2',       group: 'partner' },
  partnerCaste:         { key: 'partnerCaste',         label: 'Caste',            icon: 'Crown',         group: 'partner' },
  partnerEducation:     { key: 'partnerEducation',     label: 'Education',        icon: 'GraduationCap', group: 'partner' },
  partnerOccupation:    { key: 'partnerOccupation',    label: 'Occupation',       icon: 'Briefcase',     group: 'partner' },
  partnerIncome:        { key: 'partnerIncome',        label: 'Income',           icon: 'Banknote',      group: 'partner' },
  partnerCity:          { key: 'partnerCity',          label: 'City',             icon: 'MapPin',        group: 'partner' },
  partnerManglik:       { key: 'partnerManglik',       label: 'Manglik',          icon: 'Flame',         group: 'partner' },
  partnerMaritalStatus: { key: 'partnerMaritalStatus', label: 'Marital status',   icon: 'HeartHandshake',group: 'partner' },
  partnerMotherTongue:  { key: 'partnerMotherTongue',  label: 'Mother tongue',    icon: 'Languages',     group: 'partner' },
  partnerDiet:          { key: 'partnerDiet',          label: 'Diet',             icon: 'Salad',         group: 'partner' },
  partnerSmoking:       { key: 'partnerSmoking',       label: 'Smoking',          icon: 'Cigarette',     group: 'partner' },
  partnerDrinking:      { key: 'partnerDrinking',      label: 'Drinking',         icon: 'Wine',          group: 'partner' },
  partnerFamilyType:    { key: 'partnerFamilyType',    label: 'Family type',      icon: 'Home',          group: 'partner' },
  partnerFamilyValues:  { key: 'partnerFamilyValues',  label: 'Family values',    icon: 'Hand',          group: 'partner' },
  partnerLocations:     { key: 'partnerLocations',     label: 'Preferred cities', icon: 'Map',           group: 'partner' },
  partnerRelocate:      { key: 'partnerRelocate',      label: 'Open to relocate', icon: 'Plane',         group: 'partner', format: (v) => v ?? '' },
  partnerChildren:      { key: 'partnerChildren',      label: 'Kids stance',      icon: 'Baby',          group: 'partner' },
  partnerExpectation:   { key: 'partnerExpectation',   label: 'Expectations',     icon: 'FileText',      group: 'partner' },
};

/** Lookup helper that falls back gracefully to a no-icon meta. */
export function getFieldMeta(kind: 'casual' | 'dtm', key: string): FieldMeta {
  const map = kind === 'dtm' ? DTM_FIELDS : CASUAL_FIELDS;
  return map[key] ?? { key, label: key, icon: 'Tag' };
}

/** Render-time list of fields suitable for an attribute strip (filled only). */
export function attributeListFor(kind: 'casual' | 'dtm', profile: Record<string, any>): Array<{ meta: FieldMeta; value: string }> {
  const map = kind === 'dtm' ? DTM_FIELDS : CASUAL_FIELDS;
  const out: Array<{ meta: FieldMeta; value: string }> = [];
  for (const key of Object.keys(map)) {
    const v = profile[key];
    if (v === undefined || v === null || v === '' || v === 'Not set' || v === 'Unknown' || v === 0) continue;
    const meta = map[key];
    const display = meta.format ? meta.format(v) : String(v);
    if (!display) continue;
    out.push({ meta, value: display });
  }
  return out;
}
