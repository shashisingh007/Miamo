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
 cityLat: number | null;
 cityLng: number | null;
 genders: string;
 sexualities: string;
 lookingFor: string;
 smoking: string;
 drinking: string;
 exercise: string;
 diet: string;
 education: string;
 religion: string;
 politics: string;
 zodiac: string;
 pets: string;
 children: string;
 languages: string;
 maritalStatus: string;
 incomeBand: string;
 // Personality / lifestyle (extended)
 hobbies: string;
 music: string;
 movieGenres: string;
 fitnessLevel: string;
 attachmentStyle: string;
 loveLanguage: string;
 communicationStyle: string;
 conflictStyle: string;
 socialStyle: string;
 introvertExtrovert: string;
 mbti: string;
 enneagram: string;
 datingExperience: string;
 datingIntent: string;
 kidsTimeline: string;
 wantsKids: string;
 livingSituation: string;
 travelStyle: string;
 nightlife: string;
 socialMediaUse: string;
 // Bool flags
 willingToRelocate: boolean;
 activeToday: boolean;
 newHere: boolean;
 verified: boolean;
 hasPhotos: boolean;
 photoVerified: boolean;
 hasBio: boolean;
 hasPrompts: boolean;
 sameCity: boolean;
 openToLDR: boolean;
 wantsAdventure: boolean;
}

export const DEFAULT_FILTERS: Filters = {
 minAge: 18, maxAge: 99, minHeight: null, maxHeight: null, distance: 50,
 city: '', cityLat: null, cityLng: null,
 genders: '', sexualities: '', lookingFor: '', smoking: '',
 drinking: '', exercise: '', diet: '', education: '', religion: '',
 politics: '', zodiac: '', pets: '', children: '', languages: '',
 maritalStatus: '', incomeBand: '',
 hobbies: '', music: '', movieGenres: '', fitnessLevel: '',
 attachmentStyle: '', loveLanguage: '', communicationStyle: '',
 conflictStyle: '', socialStyle: '', introvertExtrovert: '',
 mbti: '', enneagram: '', datingExperience: '', datingIntent: '',
 kidsTimeline: '', wantsKids: '', livingSituation: '', travelStyle: '',
 nightlife: '', socialMediaUse: '',
 willingToRelocate: false, activeToday: false, newHere: false,
 verified: false, hasPhotos: false, photoVerified: false,
 hasBio: false, hasPrompts: false, sameCity: false,
 openToLDR: false, wantsAdventure: false,
};
