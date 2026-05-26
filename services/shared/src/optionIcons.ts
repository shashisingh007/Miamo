// v3.2 — Icon catalogs for selectable options (interests, lifestyle).
// Lives in shared so backend + web both reference the same string keys.
// Web maps these icon NAMES to lucide-react via FieldIcon.tsx.
import type { IconName } from './fieldMeta';

// ─── Interest icons ───────────────────────────────────────────
export interface InterestOption { value: string; icon: IconName }

export const INTEREST_ICONS: InterestOption[] = [
  // Travel & outdoors
  { value: 'Travel', icon: 'Plane' },
  { value: 'Road trips', icon: 'Map' },
  { value: 'Beaches', icon: 'Sun' },
  { value: 'Mountains', icon: 'Mountain' },
  { value: 'Hiking', icon: 'Mountain' },
  { value: 'Trekking', icon: 'Mountain' },
  { value: 'Nature', icon: 'Trees' },
  { value: 'Astronomy', icon: 'Star' },

  // Food & drink
  { value: 'Foodie', icon: 'Utensils' },
  { value: 'Coffee', icon: 'Coffee' },
  { value: 'Tea', icon: 'Coffee' },
  { value: 'Wine', icon: 'Wine' },
  { value: 'Cocktails', icon: 'Wine' },
  { value: 'Brunch', icon: 'Utensils' },
  { value: 'Street food', icon: 'Utensils' },
  { value: 'Cooking', icon: 'ChefHat' },
  { value: 'Baking', icon: 'Cake' },

  // Fitness & sports
  { value: 'Gym', icon: 'Dumbbell' },
  { value: 'Yoga', icon: 'Flower2' },
  { value: 'Running', icon: 'Footprints' },
  { value: 'Cycling', icon: 'Bike' },
  { value: 'Football', icon: 'Trophy' },        // soccer / NFL
  { value: 'Cricket', icon: 'Trophy' },
  { value: 'Tennis', icon: 'Trophy' },
  { value: 'Basketball', icon: 'Trophy' },
  { value: 'Volleyball', icon: 'Trophy' },
  { value: 'Badminton', icon: 'Trophy' },
  { value: 'Swimming', icon: 'Waves' },
  { value: 'Surfing', icon: 'Waves' },
  { value: 'Skiing', icon: 'Snowflake' },
  { value: 'Snowboarding', icon: 'Snowflake' },

  // Arts & culture
  { value: 'Music', icon: 'Music' },
  { value: 'Singing', icon: 'Mic' },
  { value: 'Dance', icon: 'Music' },
  { value: 'Theatre', icon: 'Drama' },
  { value: 'Movies', icon: 'Film' },
  { value: 'Photography', icon: 'Camera' },
  { value: 'Painting', icon: 'Palette' },
  { value: 'Writing', icon: 'PenTool' },
  { value: 'Poetry', icon: 'PenTool' },
  { value: 'Reading', icon: 'BookOpen' },
  { value: 'Books', icon: 'BookOpen' },
  { value: 'Museums', icon: 'Landmark' },
  { value: 'History', icon: 'Scroll' },

  // Tech & games
  { value: 'Tech', icon: 'Cpu' },
  { value: 'Startups', icon: 'Rocket' },
  { value: 'Design', icon: 'Palette' },
  { value: 'Architecture', icon: 'Building2' },
  { value: 'Gaming', icon: 'Gamepad2' },
  { value: 'Board games', icon: 'Dice5' },
  { value: 'Chess', icon: 'Crown' },
  { value: 'Anime', icon: 'Sparkles' },
  { value: 'Manga', icon: 'BookOpen' },

  // Lifestyle & values
  { value: 'Pets', icon: 'PawPrint' },
  { value: 'Dogs', icon: 'Dog' },
  { value: 'Cats', icon: 'Cat' },
  { value: 'Volunteering', icon: 'HeartHandshake' },
  { value: 'Activism', icon: 'Megaphone' },
  { value: 'Sustainability', icon: 'Leaf' },
  { value: 'Spirituality', icon: 'Flower2' },
  { value: 'Meditation', icon: 'Flower2' },
  { value: 'Astrology', icon: 'Moon' },
  { value: 'Languages', icon: 'Languages' },
];

// ─── Lifestyle option icons (single-select) ───────────────────
// Used for drinking/smoking/diet/exercise/pets/children/education
export const LIFESTYLE_OPTION_ICONS: Record<string, Record<string, IconName>> = {
  drinking: {
    never: 'CircleSlash', rarely: 'Droplet', socially: 'Wine',
    often: 'Wine', 'prefer not to say': 'EyeOff',
  },
  smoking: {
    never: 'CircleSlash', rarely: 'Cigarette', socially: 'Cigarette',
    often: 'Cigarette', 'prefer not to say': 'EyeOff',
  },
  exercise: {
    rarely: 'BatteryLow', sometimes: 'Activity', often: 'Dumbbell', daily: 'Flame',
  },
  diet: {
    everything: 'Utensils', vegetarian: 'Salad', vegan: 'Leaf',
    pescatarian: 'Fish', halal: 'Moon', kosher: 'Star', jain: 'Flower2',
  },
  pets: {
    dogs: 'Dog', cats: 'Cat', both: 'PawPrint', none: 'CircleSlash', 'want some day': 'Heart',
  },
  children: {
    'want some day': 'Baby',
    "don't want": 'CircleSlash',
    'have & want more': 'Baby',
    "have & don't want more": 'Users',
    open: 'HeartHandshake',
  },
  religion: {
    agnostic: 'HelpCircle', atheist: 'CircleSlash', spiritual: 'Sparkles',
    hindu: 'Flower2', muslim: 'Moon', christian: 'Cross',
    sikh: 'Crown', jain: 'Flower2', buddhist: 'Sun',
    jewish: 'Star', other: 'Globe',
  },
  education: {
    'high school': 'School', 'some college': 'GraduationCap',
    "bachelor's": 'GraduationCap', "master's": 'GraduationCap',
    phd: 'GraduationCap', 'trade school': 'Wrench',
  },
  lookingFor: {
    casual: 'Sparkles', 'long-term': 'Heart', marriage: 'HeartHandshake',
    open: 'Compass', 'not sure yet': 'HelpCircle',
    friendship: 'Users', networking: 'Briefcase',
  },
};

export function iconForOption(group: string, value: string): IconName {
  return LIFESTYLE_OPTION_ICONS[group]?.[value] ?? 'Tag';
}
