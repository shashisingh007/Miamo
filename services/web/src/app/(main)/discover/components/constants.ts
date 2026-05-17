export interface DiscoverProfile {
  id: string;
  displayName: string;
  verified?: boolean;
  photos: any[];
  profile?: any;
  interests?: any[];
  prompts?: any[];
  commonInterests?: string[];
  compatibilityScore?: number;
}

export interface AiData {
  score: number;
  whyThisMatch: string[];
  moveRecommendations: { text: string; type: string; confidence: number }[];
  commonInterests: string[];
  breakdown?: Record<string, number>;
}

export interface Filters {
  minAge: number;
  maxAge: number;
  minHeight: number | null;
  maxHeight: number | null;
  distance: number;
  city: string;
  genders: string;
  sexualities: string;
  lookingFor: string;
  smoking: string;
  drinking: string;
  exercise: string;
  education: string;
  religion: string;
  zodiac: string;
  pets: string;
  children: string;
  activeToday: boolean;
  newHere: boolean;
  verified: boolean;
  hasPhotos: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  minAge: 18, maxAge: 99, minHeight: null, maxHeight: null, distance: 50,
  city: '', genders: '', sexualities: '', lookingFor: '', smoking: '',
  drinking: '', exercise: '', education: '', religion: '', zodiac: '',
  pets: '', children: '', activeToday: false, newHere: false,
  verified: false, hasPhotos: false,
};
