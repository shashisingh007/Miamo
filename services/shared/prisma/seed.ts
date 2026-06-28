// ─── Miamo Seed Data ─────────────────────────────────
// 20 diverse users with full profiles, posts, stories, videos, creativity, messages, beats
// FULLY DETERMINISTIC: same data every run for consistent testing
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { recomputeAndPersistCompletion } from '../src/completion';
import { hashUid } from '../src/track/hash';

const prisma = new PrismaClient();

// Fixed base date: 2026-05-01T12:00:00Z — must be in the PAST so new messages sort after seed data
const SEED_DATE = new Date('2026-05-01T12:00:00.000Z').getTime();

// Simple seeded PRNG (mulberry32) — produces the same sequence every run
function createRng(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = createRng(42);
function randInt(min: number, max: number) { return Math.floor(rng() * (max - min + 1)) + min; }

// Password = username for easy testing (e.g. miamo1/miamo1)
function getPassword(username: string) { return username; }

// surface: which onboarding flow the user is in.
//   'discover' → swipe / Discover only (no DTM matrimonial profile)
//   'dtm'      → Date-to-Marry only (no Discover filter, has matrimonial profile)
//   'both'     → active in both surfaces
type Surface = 'discover' | 'dtm' | 'both';

interface UserSeed {
  num: number; displayName: string; username: string; age: number; gender: string;
  city: string; profession: string; bio: string; intent: string; seriousMode: boolean;
  profileScore: number; verified: boolean; online: boolean; interests: string[];
  prompts: { q: string; a: string }[]; creativity: string[]; category: string;
  avatarGradient: string;
  // Lifestyle fields
  height?: number; sexuality: string; lookingFor: string;
  smoking: string; drinking: string; exercise: string;
  education: string; religion: string; zodiac: string;
  languages: string; pets: string; children: string;
  // v3.3 — onboarding surface + profile completion (optional; defaults inferred for legacy 1..20)
  surface?: Surface;
  completionScore?: number; // 0..100
  completionMissing?: string[];
}

const USERS: UserSeed[] = [
  { num: 1, displayName: 'Aria Chen (miamo1)', username: 'miamo1', age: 26, gender: 'female', city: 'San Francisco', profession: 'Product Designer at Figma', bio: 'Designing the future, one pixel at a time. Weekend hiker, matcha enthusiast, and aspiring pottery maker.', intent: 'Long-term relationship', seriousMode: true, profileScore: 88, verified: true, online: true, interests: ['Design', 'Hiking', 'Coffee', 'Pottery', 'Photography'], prompts: [{ q: 'A perfect first date looks like…', a: 'Exploring a new neighborhood, finding a hidden café, and talking until they close.' }, { q: 'I geek out about…', a: 'Typography. Seriously, ask me about kerning.' }, { q: 'The way to win me over is…', a: 'Show me something you\'ve made with your hands.' }], creativity: ['Photography', 'Design'], category: 'serious relationship', avatarGradient: 'from-pink-400 to-violet-500', height: 165, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'active', education: 'bachelors', religion: '', zodiac: 'Libra', languages: 'English,Mandarin', pets: 'cat', children: 'want' },
  { num: 2, displayName: 'Marcus Rivera (miamo2)', username: 'miamo2', age: 29, gender: 'male', city: 'New York', profession: 'Jazz Musician & Producer', bio: 'Brooklyn nights and vinyl mornings. I write songs about strangers on the subway.', intent: 'Life partner', seriousMode: true, profileScore: 94, verified: true, online: false, interests: ['Music', 'Cooking', 'Writing', 'Concerts', 'Travel'], prompts: [{ q: 'I feel most alive when…', a: 'I\'m on stage, the crowd disappears, and it\'s just me and the keys.' }, { q: 'My controversial opinion…', a: 'Pineapple on pizza is necessary.' }, { q: 'Something that surprises people…', a: 'I have a degree in astrophysics.' }], creativity: ['Music Production', 'Songwriting'], category: 'music creator', avatarGradient: 'from-amber-400 to-orange-600', height: 183, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Scorpio', languages: 'English,Spanish', pets: 'none', children: 'want' },
  { num: 3, displayName: 'Sofia Andersen (miamo3)', username: 'miamo3', age: 24, gender: 'female', city: 'Copenhagen', profession: 'Architect & Illustrator', bio: 'I draw buildings during the day and dreams at night. Scandinavian minimalism meets chaotic creativity.', intent: 'Serious only', seriousMode: true, profileScore: 91, verified: true, online: true, interests: ['Art', 'Travel', 'Nature', 'Reading', 'Yoga'], prompts: [{ q: 'My ideal weekend…', a: 'Morning run by the harbor, brunch with friends, afternoon in my studio.' }, { q: 'I\'m looking for someone who…', a: 'Can sit in comfortable silence and also debate architecture.' }, { q: 'The key to my heart…', a: 'Thoughtfulness. It\'s the attention behind the gesture.' }], creativity: ['Architecture', 'Illustration'], category: 'artist', avatarGradient: 'from-sky-400 to-blue-600', height: 170, sexuality: 'bisexual', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'active', education: 'masters', religion: '', zodiac: 'Pisces', languages: 'Danish,English,Swedish', pets: 'none', children: 'maybe' },
  { num: 4, displayName: 'Kai Yamamoto (miamo4)', username: 'miamo4', age: 27, gender: 'male', city: 'Tokyo', profession: 'Software Engineer at Stripe', bio: 'Building things that matter. Weekend photographer, ramen critic, terrible at karaoke.', intent: 'Short-term, open to long', seriousMode: false, profileScore: 82, verified: false, online: true, interests: ['Tech', 'Photography', 'Gaming', 'Running', 'Coffee'], prompts: [{ q: 'A perfect first date…', a: 'Walk through Shimokitazawa, finding vinyl records, ending at ramen.' }, { q: 'I geek out about…', a: 'Mechanical keyboards. I have six.' }, { q: 'I\'m convinced that…', a: 'The best conversations happen after midnight over bad coffee.' }], creativity: ['Photography', 'Tech Projects'], category: 'tech professional', avatarGradient: 'from-emerald-400 to-teal-600', height: 175, sexuality: 'straight', lookingFor: 'open', smoking: 'never', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Gemini', languages: 'Japanese,English', pets: 'none', children: 'maybe' },
  { num: 5, displayName: 'Zara Okafor (miamo5)', username: 'miamo5', age: 28, gender: 'female', city: 'Lagos', profession: 'Fashion Designer & Entrepreneur', bio: 'Creating fashion that tells stories. Lagos-born, world-inspired.', intent: 'Casual dating', seriousMode: false, profileScore: 86, verified: true, online: true, interests: ['Fashion', 'Art', 'Dance', 'Business', 'Travel'], prompts: [{ q: 'My happy place is…', a: 'My studio at 3am with Afrobeats playing.' }, { q: 'I\'m looking for…', a: 'Someone who matches my energy and dreams big.' }, { q: 'The quickest way to my heart…', a: 'Genuine compliments about my work, not my looks.' }], creativity: ['Fashion Design', 'Dance'], category: 'fashion creator', avatarGradient: 'from-rose-400 to-pink-600', height: 168, sexuality: 'straight', lookingFor: 'casual', smoking: 'never', drinking: 'socially', exercise: 'active', education: 'bachelors', religion: '', zodiac: 'Aries', languages: 'English,Yoruba,French', pets: 'none', children: 'none' },
  { num: 6, displayName: 'Liam O\'Connor (miamo6)', username: 'miamo6', age: 31, gender: 'male', city: 'Dublin', profession: 'Chef & Food Writer', bio: 'Michelin-trained rebel. I believe food is love made visible.', intent: 'Long-term relationship', seriousMode: true, profileScore: 79, verified: false, online: false, interests: ['Cooking', 'Writing', 'Travel', 'Wine', 'Photography'], prompts: [{ q: 'I feel most alive when…', a: 'A dish comes together perfectly and I see someone smile tasting it.' }, { q: 'Unpopular opinion…', a: 'Truffle oil is a scam. Fight me.' }, { q: 'Date idea…', a: 'I cook you dinner. You pick the music. No phones.' }], creativity: ['Cooking', 'Food Photography'], category: 'foodie', avatarGradient: 'from-orange-400 to-red-500', height: 180, sexuality: 'straight', lookingFor: 'long-term', smoking: 'sometimes', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Taurus', languages: 'English,Irish,French', pets: 'dog', children: 'want' },
  { num: 7, displayName: 'Priya Sharma (miamo7)', username: 'miamo7', age: 25, gender: 'female', city: 'Mumbai', profession: 'Poet & Content Creator', bio: 'Writing shayari at midnight, chai by sunrise. Words are my love language.', intent: 'Friendship first', seriousMode: false, profileScore: 84, verified: true, online: true, interests: ['Poetry', 'Writing', 'Music', 'Travel', 'Spirituality'], prompts: [{ q: 'I\'m known for…', a: 'Writing poems on napkins at coffee shops.' }, { q: 'My simple pleasure…', a: 'Rain on a tin roof and a good book.' }, { q: 'I want to find someone who…', a: 'Appreciates the beauty in ordinary moments.' }], creativity: ['Poetry', 'Shayari'], category: 'poetry/shayari creator', avatarGradient: 'from-purple-400 to-indigo-600', height: 158, sexuality: 'straight', lookingFor: 'open', smoking: 'never', drinking: 'never', exercise: 'sometimes', education: 'masters', religion: 'Hindu', zodiac: 'Cancer', languages: 'Hindi,English,Urdu', pets: 'none', children: 'maybe' },
  { num: 8, displayName: 'Jake Morrison (miamo8)', username: 'miamo8', age: 30, gender: 'male', city: 'Sydney', profession: 'Fitness Coach & Nutritionist', bio: 'Helping people become their strongest. Beach runs, healthy meals, good vibes.', intent: 'Casual dating', seriousMode: false, profileScore: 76, verified: true, online: false, interests: ['Fitness', 'Nutrition', 'Surfing', 'Travel', 'Dogs'], prompts: [{ q: 'Weekend routine…', a: 'Sunrise surf, farmers market, meal prep, sunset run.' }, { q: 'Deal breaker…', a: 'If you think pineapple doesn\'t belong on pizza (kidding… mostly).' }, { q: 'I\'ll know it\'s real when…', a: 'We can be active together and also lazy on the couch.' }], creativity: ['Fitness', 'Nutrition Content'], category: 'fitness creator', avatarGradient: 'from-lime-400 to-green-600', height: 188, sexuality: 'straight', lookingFor: 'casual', smoking: 'never', drinking: 'socially', exercise: 'very-active', education: 'bachelors', religion: '', zodiac: 'Leo', languages: 'English', pets: 'dog', children: 'maybe' },
  { num: 9, displayName: 'Elena Petrova (miamo9)', username: 'miamo9', age: 27, gender: 'female', city: 'Berlin', profession: 'Photographer & Visual Artist', bio: 'Capturing light and shadow. Berlin underground art scene. Analog film devotee.', intent: 'Long-term relationship', seriousMode: true, profileScore: 90, verified: true, online: true, interests: ['Photography', 'Art', 'Film', 'Music', 'Nature'], prompts: [{ q: 'My art is about…', a: 'Finding beauty in abandoned places and forgotten stories.' }, { q: 'Best conversation starter…', a: 'Tell me about a photo that changed your perspective.' }, { q: 'I\'m looking for…', a: 'Someone whose mind is as beautiful as their smile.' }], creativity: ['Photography', 'Visual Art'], category: 'photography creator', avatarGradient: 'from-cyan-400 to-blue-500', height: 172, sexuality: 'bisexual', lookingFor: 'long-term', smoking: 'sometimes', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Aquarius', languages: 'Russian,German,English', pets: 'cat', children: 'want' },
  { num: 10, displayName: 'Dante Williams (miamo10)', username: 'miamo10', age: 26, gender: 'male', city: 'Atlanta', profession: 'Stand-up Comedian & Writer', bio: 'Making people laugh for a living. Serious about comedy, casual about everything else.', intent: 'Casual dating', seriousMode: false, profileScore: 78, verified: false, online: true, interests: ['Comedy', 'Writing', 'Movies', 'Gaming', 'Food'], prompts: [{ q: 'My opener at parties…', a: 'I don\'t tell jokes at parties. I am the joke at parties.' }, { q: 'Best trait…', a: 'I will make you laugh when you want to cry.' }, { q: 'Worst trait…', a: 'I will make you laugh when you want to cry (bad timing).' }], creativity: ['Comedy', 'Writing'], category: 'comedy creator', avatarGradient: 'from-yellow-400 to-amber-600', height: 178, sexuality: 'straight', lookingFor: 'casual', smoking: 'sometimes', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Sagittarius', languages: 'English', pets: 'none', children: 'none' },
  { num: 11, displayName: 'Yuki Tanaka (miamo11)', username: 'miamo11', age: 23, gender: 'female', city: 'Osaka', profession: 'Dance Student & Performer', bio: 'Contemporary dance is my prayer. Moving through life with grace and chaos.', intent: 'Friendship first', seriousMode: false, profileScore: 72, verified: false, online: false, interests: ['Dance', 'Music', 'Yoga', 'Fashion', 'Travel'], prompts: [{ q: 'I express myself through…', a: 'Movement. Words sometimes fail, but the body never lies.' }, { q: 'Dream collaboration…', a: 'A dance piece with Pina Bausch\'s spirit.' }, { q: 'I\'m happiest when…', a: 'I lose myself in choreography and time disappears.' }], creativity: ['Dance', 'Performance'], category: 'dancer', avatarGradient: 'from-fuchsia-400 to-pink-500', height: 160, sexuality: 'lesbian', lookingFor: 'open', smoking: 'never', drinking: 'socially', exercise: 'very-active', education: 'bachelors', religion: '', zodiac: 'Virgo', languages: 'Japanese,English', pets: 'none', children: 'none' },
  { num: 12, displayName: 'Omar Hassan (miamo12)', username: 'miamo12', age: 32, gender: 'male', city: 'Dubai', profession: 'Startup Founder & Angel Investor', bio: 'Building the future of fintech. Serial entrepreneur, mentor, and chai addict.', intent: 'Marriage open', seriousMode: true, profileScore: 92, verified: true, online: true, interests: ['Business', 'Tech', 'Travel', 'Golf', 'Reading'], prompts: [{ q: 'My biggest achievement…', a: 'Building a team of 50 from a napkin idea in a coffee shop.' }, { q: 'I value most…', a: 'Ambition paired with kindness. Either alone isn\'t enough.' }, { q: 'Free time means…', a: 'Reading about psychology or playing terrible golf.' }], creativity: ['Tech Projects', 'Career Highlights'], category: 'entrepreneur', avatarGradient: 'from-violet-400 to-purple-600', height: 185, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'never', exercise: 'active', education: 'masters', religion: 'Muslim', zodiac: 'Capricorn', languages: 'Arabic,English,Hindi', pets: 'none', children: 'want' },
  { num: 13, displayName: 'Maya Johnson (miamo13)', username: 'miamo13', age: 22, gender: 'female', city: 'London', profession: 'Literature Student at UCL', bio: 'Lost in fiction, found in conversation. Writing my thesis on love in modern lit.', intent: 'Short-term, open to long', seriousMode: false, profileScore: 68, verified: false, online: true, interests: ['Reading', 'Writing', 'Coffee', 'Theatre', 'History'], prompts: [{ q: 'Currently reading…', a: 'Rereading Normal People for the fifth time, no shame.' }, { q: 'If I could live in any era…', a: 'The 1920s Paris literary scene. Hemingway, Fitzgerald, absinthe.' }, { q: 'Ask me about…', a: 'My theory about why all great novels are secretly love stories.' }], creativity: ['Writing', 'Poetry'], category: 'book lover', avatarGradient: 'from-indigo-400 to-blue-500', height: 163, sexuality: 'straight', lookingFor: 'open', smoking: 'never', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Gemini', languages: 'English,French', pets: 'cat', children: 'maybe' },
  { num: 14, displayName: 'Arjun Patel (miamo14)', username: 'miamo14', age: 28, gender: 'male', city: 'Bangalore', profession: 'Full Stack Developer & Musician', bio: 'Code by day, guitar by night. Building apps and melodies with equal passion.', intent: 'Long-term relationship', seriousMode: true, profileScore: 85, verified: true, online: false, interests: ['Music', 'Tech', 'Coffee', 'Hiking', 'Photography'], prompts: [{ q: 'My dual life…', a: 'Debugging code at 3pm, jamming with my band at 3am.' }, { q: 'I\'m working on…', a: 'An app that connects local musicians. And my fingerpicking.' }, { q: 'I need someone who…', a: 'Gets that I\'ll be late because I was fixing one more bug.' }], creativity: ['Music', 'Tech Projects'], category: 'working professional', avatarGradient: 'from-teal-400 to-emerald-600', height: 176, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'sometimes', education: 'masters', religion: 'Hindu', zodiac: 'Scorpio', languages: 'Hindi,English,Kannada', pets: 'none', children: 'want' },
  { num: 15, displayName: 'Luna Martinez (miamo15)', username: 'miamo15', age: 25, gender: 'female', city: 'Barcelona', profession: 'Travel Blogger & Photographer', bio: 'Passport filled, heart open. Documenting the world one city at a time.', intent: 'Casual dating', seriousMode: false, profileScore: 80, verified: true, online: true, interests: ['Travel', 'Photography', 'Food', 'Languages', 'Surfing'], prompts: [{ q: 'Countries visited…', a: '47 and counting. Next: Bhutan.' }, { q: 'Best travel story…', a: 'Got lost in Marrakech, found the best mint tea of my life.' }, { q: 'Home is…', a: 'Wherever I can see the sunset and have good WiFi.' }], creativity: ['Photography', 'Travel Writing'], category: 'travel lover', avatarGradient: 'from-amber-400 to-yellow-500', height: 167, sexuality: 'bisexual', lookingFor: 'casual', smoking: 'sometimes', drinking: 'socially', exercise: 'active', education: 'bachelors', religion: '', zodiac: 'Sagittarius', languages: 'Spanish,English,Portuguese,French', pets: 'none', children: 'none' },
  { num: 16, displayName: 'Noah Kim (miamo16)', username: 'miamo16', age: 29, gender: 'male', city: 'Seoul', profession: 'UX Researcher & Meditation Guide', bio: 'Understanding minds professionally and personally. Zen in the chaos of tech.', intent: 'Serious only', seriousMode: true, profileScore: 87, verified: true, online: true, interests: ['Meditation', 'Psychology', 'Hiking', 'Tea', 'Design'], prompts: [{ q: 'My morning ritual…', a: '20 min meditation, green tea, journaling. Non-negotiable.' }, { q: 'I believe in…', a: 'Intentional living. Every choice is a vote for who you become.' }, { q: 'Looking for someone…', a: 'Who values inner growth as much as outer adventures.' }], creativity: ['Writing', 'Public Speaking'], category: 'spiritual/wellness lifestyle', avatarGradient: 'from-green-400 to-teal-500', height: 177, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'never', exercise: 'active', education: 'masters', religion: 'Buddhist', zodiac: 'Virgo', languages: 'Korean,English,Japanese', pets: 'none', children: 'want' },
  { num: 17, displayName: 'Chloe Dubois (miamo17)', username: 'miamo17', age: 24, gender: 'female', city: 'Paris', profession: 'Pastry Chef & Food Stylist', bio: 'Making art you can eat. Parisian by birth, creative by nature.', intent: 'Long-term relationship', seriousMode: false, profileScore: 83, verified: false, online: false, interests: ['Cooking', 'Art', 'Photography', 'Wine', 'Fashion'], prompts: [{ q: 'My love language…', a: 'I will bake you a cake that makes you reconsider your life.' }, { q: 'Best compliment I got…', a: '"Your croissants are better than my grandmother\'s." — from a French person.' }, { q: 'Ideal date…', a: 'Cooking together, wine, playlist wars, dessert I made earlier.' }], creativity: ['Cooking', 'Food Photography'], category: 'foodie', avatarGradient: 'from-rose-300 to-pink-500', height: 162, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'sometimes', education: 'bachelors', religion: '', zodiac: 'Libra', languages: 'French,English,Italian', pets: 'none', children: 'want' },
  { num: 18, displayName: 'Ryan Brooks (miamo18)', username: 'miamo18', age: 26, gender: 'male', city: 'Denver', profession: 'Nature Photographer & Guide', bio: 'Mountains are my church. Capturing wild places and wilder sunsets.', intent: 'Friendship first', seriousMode: false, profileScore: 75, verified: false, online: true, interests: ['Nature', 'Photography', 'Hiking', 'Camping', 'Dogs'], prompts: [{ q: 'Best sunset I\'ve seen…', a: 'Patagonia. Torres del Paine. Changed my life perspective.' }, { q: 'Weekend plans usually…', a: 'Driving to a trailhead before dawn. Always.' }, { q: 'I\'m looking for…', a: 'Someone who sees a mountain and says "let\'s climb it."' }], creativity: ['Photography', 'Nature Writing'], category: 'nature lover', avatarGradient: 'from-emerald-300 to-green-600', height: 182, sexuality: 'gay', lookingFor: 'open', smoking: 'never', drinking: 'socially', exercise: 'very-active', education: 'bachelors', religion: '', zodiac: 'Aries', languages: 'English', pets: 'dog', children: 'none' },
  { num: 19, displayName: 'Aaliya Khan (miamo19)', username: 'miamo19', age: 27, gender: 'female', city: 'Toronto', profession: 'Actress & Voice Artist', bio: 'Playing characters on screen, being myself everywhere else. Voice of three animated shows.', intent: 'Long-term relationship', seriousMode: true, profileScore: 89, verified: true, online: true, interests: ['Acting', 'Music', 'Yoga', 'Reading', 'Comedy'], prompts: [{ q: 'My hidden talent…', a: 'I can do 15 different accents. Try me.' }, { q: 'Best role I\'ve played…', a: 'A detective in a web series. I got way too into it.' }, { q: 'I want someone who…', a: 'Can handle my dramatic readings at dinner.' }], creativity: ['Acting', 'Voice Art'], category: 'actress', avatarGradient: 'from-violet-300 to-purple-500', height: 168, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'active', education: 'bachelors', religion: 'Muslim', zodiac: 'Pisces', languages: 'English,Hindi,Urdu,French', pets: 'cat', children: 'want' },
  { num: 20, displayName: 'Leo Santos (miamo20)', username: 'miamo20', age: 30, gender: 'male', city: 'São Paulo', profession: 'Sports Coach & Athlete', bio: 'Former pro soccer player turned coach. Teaching the beautiful game and living it.', intent: 'Marriage open', seriousMode: true, profileScore: 81, verified: true, online: false, interests: ['Sports', 'Fitness', 'Travel', 'Music', 'Cooking'], prompts: [{ q: 'My biggest lesson…', a: 'Sports taught me that losing well matters more than winning badly.' }, { q: 'Dream date…', a: 'Beach soccer, açaí, sunset, live samba.' }, { q: 'I\'m passionate about…', a: 'Coaching kids who have the same fire I had at their age.' }], creativity: ['Sports', 'Fitness Content'], category: 'sports enthusiast', avatarGradient: 'from-yellow-400 to-orange-500', height: 181, sexuality: 'straight', lookingFor: 'long-term', smoking: 'never', drinking: 'socially', exercise: 'very-active', education: 'bachelors', religion: 'Catholic', zodiac: 'Leo', languages: 'Portuguese,English,Spanish', pets: 'dog', children: 'want' },
];

// ─── Procedurally generated users 21–50 ──────────────────────────────────
//
// MEMORABLE PATTERN (applies to ALL 50 users, including 1–20):
//   • num % 10 === 0  (10, 20, 30, 40, 50)  → BOTH: full Discover + DTM
//                                              Casual ≥60, DTM ≥75.
//   • num %  5 === 0  (5, 15, 25, 35, 45)   → DTM ONLY: matrimonial profile,
//                                              no DiscoverFilter, sparse Profile
//                                              so Casual <60 but DTM ≥75.
//   • everything else (40 users)            → DISCOVER ONLY: full Profile,
//                                              DiscoverFilter, no MatrimonialProfile.
// No persona is forced to 100% complete — each just clears its own gate.
//
// Mnemonic: ends in 0 → Both. ends in 5 → DTM only. else → Discover only.
const EXTRA_NAMES: Array<{ first: string; last: string; gender: 'female' | 'male' }> = [
  { first: 'Ava',       last: 'Reyes',     gender: 'female' },
  { first: 'Ethan',     last: 'Walker',    gender: 'male'   },
  { first: 'Mia',       last: 'Bennett',   gender: 'female' },
  { first: 'Hiroshi',   last: 'Sato',      gender: 'male'   },
  { first: 'Olivia',    last: 'Carter',    gender: 'female' },
  { first: 'Rafael',    last: 'Diaz',      gender: 'male'   },
  { first: 'Anika',     last: 'Verma',     gender: 'female' },
  { first: 'Daniel',    last: 'Cohen',     gender: 'male'   },
  { first: 'Camille',   last: 'Laurent',   gender: 'female' },
  { first: 'Mateo',     last: 'Rossi',     gender: 'male'   },
  { first: 'Hannah',    last: 'Lewis',     gender: 'female' },
  { first: 'Aarav',     last: 'Mehta',     gender: 'male'   },
  { first: 'Ines',      last: 'Costa',     gender: 'female' },
  { first: 'Mikael',    last: 'Larsen',    gender: 'male'   },
  { first: 'Beatriz',   last: 'Silva',     gender: 'female' },
  { first: 'Rohan',     last: 'Iyer',      gender: 'male'   },
  { first: 'Saanvi',    last: 'Reddy',     gender: 'female' },
  { first: 'Tomas',     last: 'Novak',     gender: 'male'   },
  { first: 'Lakshmi',   last: 'Nair',      gender: 'female' },
  { first: 'Gabriel',   last: 'Souza',     gender: 'male'   },
  { first: 'Ishita',    last: 'Banerjee',  gender: 'female' },
  { first: 'Vikram',    last: 'Kapoor',    gender: 'male'   },
  { first: 'Naomi',     last: 'Goldberg',  gender: 'female' },
  { first: 'Sebastian', last: 'Müller',    gender: 'male'   },
  { first: 'Diya',      last: 'Joshi',     gender: 'female' },
  { first: 'Karthik',   last: 'Subramaniam', gender: 'male' },
  { first: 'Meera',     last: 'Gupta',     gender: 'female' },
  { first: 'Yusuf',     last: 'Demir',     gender: 'male'   },
  { first: 'Sienna',    last: 'Park',      gender: 'female' },
  { first: 'Harsh',     last: 'Agarwal',   gender: 'male'   },
];

const EXTRA_CITIES = [
  'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata',
  'Singapore', 'Dubai', 'Toronto', 'Berlin', 'Madrid', 'Lisbon',
  'Austin', 'Chicago', 'Vancouver', 'Melbourne', 'Auckland', 'Bangkok',
  'Bali', 'Stockholm', 'Amsterdam', 'Prague', 'Cape Town', 'Nairobi',
  'Mexico City', 'Buenos Aires', 'Tel Aviv', 'Istanbul', 'Manila', 'Jakarta',
];

const EXTRA_PROFESSIONS = [
  'Data Scientist', 'Yoga Instructor', 'Investment Banker', 'Teacher', 'Civil Engineer',
  'Pharmacist', 'Architect', 'Lawyer', 'Doctor', 'Marketing Manager',
  'Producer', 'Researcher', 'Therapist', 'Veterinarian', 'Pilot',
  'Chef de Cuisine', 'Journalist', 'Diplomat', 'Cinematographer', 'Game Designer',
  'Civil Servant', 'Financial Analyst', 'NGO Lead', 'Product Manager', 'Wedding Planner',
  'Public Health Officer', 'Climate Researcher', 'Fashion Buyer', 'Robotics Engineer', 'Artisan Baker',
];

const EXTRA_INTERESTS = [
  ['Yoga', 'Reading', 'Coffee', 'Travel', 'Cooking'],
  ['Football', 'Cars', 'Hiking', 'Cinema', 'Tech'],
  ['Painting', 'Tea', 'Books', 'Birdwatching', 'Slow Living'],
  ['Anime', 'Gaming', 'Coding', 'Ramen', 'Concerts'],
  ['Wine', 'Galleries', 'Travel', 'Languages', 'Theatre'],
  ['Salsa', 'Food', 'Beaches', 'Family', 'Football'],
  ['Bharatanatyam', 'Books', 'Festivals', 'Family', 'Vegetarian Cooking'],
  ['Cycling', 'Jazz', 'Whisky', 'History', 'Hiking'],
  ['Couture', 'Wine', 'Photography', 'Travel', 'Brunch'],
  ['Football', 'Espresso', 'Vintage Cars', 'Cooking', 'Music'],
];

function surfaceFor(num: number): Surface {
  if (num % 10 === 0) return 'both';
  if (num % 5 === 0) return 'dtm';
  return 'discover';
}
function isSeriousFor(num: number): boolean {
  // DTM-only users default to Serious mode so the Profile carries the DTM gate.
  // "Both" users default to Discover; they can toggle into Serious via Settings.
  return surfaceFor(num) === 'dtm';
}

for (let i = 0; i < 30; i++) {
  const num = 21 + i;
  const name = EXTRA_NAMES[i];
  const city = EXTRA_CITIES[i];
  const profession = EXTRA_PROFESSIONS[i];
  const interests = EXTRA_INTERESTS[i % EXTRA_INTERESTS.length];
  const surface = surfaceFor(num);
  const seriousMode = isSeriousFor(num);
  const isPower = num % 10 === 0; // power-user marker
  const age = 22 + (i % 12); // 22–33
  const gradients = [
    'from-pink-300 to-rose-500', 'from-sky-300 to-indigo-500', 'from-emerald-300 to-teal-500',
    'from-amber-300 to-orange-500', 'from-violet-300 to-fuchsia-500', 'from-lime-300 to-green-500',
  ];
  USERS.push({
    num,
    displayName: `${name.first} ${name.last} (miamo${num})`,
    username: `miamo${num}`,
    age,
    gender: name.gender,
    city,
    profession,
    bio: `${profession} based in ${city}. ${interests.slice(0, 2).join(' and ')} keep me grounded.`,
    intent: seriousMode ? 'Long-term relationship' : 'Casual dating',
    seriousMode,
    profileScore: 100,
    verified: isPower || i % 3 === 0,
    online: isPower || i % 4 === 0,
    interests,
    prompts: [
      { q: 'A perfect Sunday looks like…', a: `${interests[0]} in the morning, friends in the evening.` },
      { q: 'I geek out about…',         a: `${interests[1] ?? interests[0]}.` },
      { q: 'My love language is…',      a: 'Quality time and laughing at the same memes.' },
    ],
    creativity: [interests[0]],
    category: isPower ? 'power user (both surfaces)' : seriousMode ? 'serious + discover' : 'discover regular',
    avatarGradient: gradients[i % gradients.length],
    height: 158 + (i % 30), // 158–187
    sexuality: i % 7 === 0 ? 'bisexual' : 'straight',
    lookingFor: seriousMode ? 'long-term' : (i % 2 === 0 ? 'casual' : 'open'),
    smoking: i % 5 === 0 ? 'sometimes' : 'never',
    drinking: i % 3 === 0 ? 'never' : 'socially',
    exercise: ['active', 'sometimes', 'very-active'][i % 3],
    education: ['bachelors', 'masters', 'phd', 'bachelors'][i % 4],
    religion: ['', 'Hindu', 'Muslim', 'Christian', 'Buddhist', ''][i % 6],
    zodiac: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i % 12],
    languages: i % 4 === 0 ? 'English,Hindi' : i % 4 === 1 ? 'English,Spanish' : i % 4 === 2 ? 'English' : 'English,French',
    pets: ['none', 'cat', 'dog', 'none'][i % 4],
    children: seriousMode ? 'want' : ['maybe', 'none', 'want'][i % 3],
    surface,
    completionScore: 100,
    completionMissing: [],
  });
}

const CREATIVITY_CATEGORIES = [
  { name: 'Singing', icon: 'mic', color: '#EC4899' },
  { name: 'Dance', icon: 'music', color: '#8B5CF6' },
  { name: 'Poetry', icon: 'feather', color: '#6366F1' },
  { name: 'Photography', icon: 'camera', color: '#06B6D4' },
  { name: 'Art', icon: 'palette', color: '#F59E0B' },
  { name: 'Fashion', icon: 'shirt', color: '#EC4899' },
  { name: 'Fitness', icon: 'dumbbell', color: '#10B981' },
  { name: 'Cooking', icon: 'chef-hat', color: '#EF4444' },
  { name: 'Travel', icon: 'plane', color: '#3B82F6' },
  { name: 'Comedy', icon: 'laugh', color: '#F97316' },
  { name: 'Music', icon: 'headphones', color: '#A78BFA' },
  { name: 'Writing', icon: 'pen-tool', color: '#8B5CF6' },
  { name: 'Tech Projects', icon: 'cpu', color: '#14B8A6' },
  { name: 'Acting', icon: 'drama', color: '#F43F5E' },
  { name: 'Sports', icon: 'trophy', color: '#22C55E' },
  { name: 'Lifestyle', icon: 'heart', color: '#D946EF' },
  { name: 'Public Speaking', icon: 'megaphone', color: '#0EA5E9' },
  { name: 'Career Highlights', icon: 'briefcase', color: '#6366F1' },
  { name: 'Date Ideas', icon: 'sparkles', color: '#EC4899' },
  { name: 'Nature', icon: 'leaf', color: '#16A34A' },
];

// ─── v3.6 FEATURE DATA SEED HELPERS ──────────────────────────────────────
// Helpers shared by the additive v3.6 seeders below. Kept at module scope so
// each `seedX` function stays small and obvious.

// Approximate city-center coords for the cities we seed. Mumbai is the default
// fallback for cities not in the map. Coords are good enough for the v8
// FeatureSnapshot.cityCenter* fields (consumed by distance/Bayesian distance
// computations downstream, never shown to users).
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Mumbai:          { lat: 19.0760, lng: 72.8777 },
  Delhi:           { lat: 28.6139, lng: 77.2090 },
  Pune:            { lat: 18.5204, lng: 73.8567 },
  Hyderabad:       { lat: 17.3850, lng: 78.4867 },
  Chennai:         { lat: 13.0827, lng: 80.2707 },
  Kolkata:         { lat: 22.5726, lng: 88.3639 },
  Bangalore:       { lat: 12.9716, lng: 77.5946 },
  Singapore:       { lat:  1.3521, lng: 103.8198 },
  Dubai:           { lat: 25.2048, lng: 55.2708 },
  Toronto:         { lat: 43.6532, lng: -79.3832 },
  Berlin:          { lat: 52.5200, lng: 13.4050 },
  Madrid:          { lat: 40.4168, lng: -3.7038 },
  Lisbon:          { lat: 38.7223, lng: -9.1393 },
  Austin:          { lat: 30.2672, lng: -97.7431 },
  Chicago:         { lat: 41.8781, lng: -87.6298 },
  Vancouver:       { lat: 49.2827, lng: -123.1207 },
  Melbourne:       { lat: -37.8136, lng: 144.9631 },
  Auckland:        { lat: -36.8485, lng: 174.7633 },
  Bangkok:         { lat: 13.7563, lng: 100.5018 },
  Bali:            { lat: -8.4095, lng: 115.1889 },
  Stockholm:       { lat: 59.3293, lng: 18.0686 },
  Amsterdam:       { lat: 52.3676, lng:  4.9041 },
  Prague:          { lat: 50.0755, lng: 14.4378 },
  'Cape Town':     { lat: -33.9249, lng: 18.4241 },
  Nairobi:         { lat: -1.2921, lng: 36.8219 },
  'Mexico City':   { lat: 19.4326, lng: -99.1332 },
  'Buenos Aires':  { lat: -34.6037, lng: -58.3816 },
  'Tel Aviv':      { lat: 32.0853, lng: 34.7818 },
  Istanbul:        { lat: 41.0082, lng: 28.9784 },
  Manila:          { lat: 14.5995, lng: 120.9842 },
  Jakarta:         { lat: -6.2088, lng: 106.8456 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'New York':      { lat: 40.7128, lng: -74.0060 },
  Copenhagen:      { lat: 55.6761, lng: 12.5683 },
  Tokyo:           { lat: 35.6762, lng: 139.6503 },
  Lagos:           { lat:  6.5244, lng:  3.3792 },
  Dublin:          { lat: 53.3498, lng: -6.2603 },
  Sydney:          { lat: -33.8688, lng: 151.2093 },
  Atlanta:         { lat: 33.7490, lng: -84.3880 },
  Osaka:           { lat: 34.6937, lng: 135.5023 },
  London:          { lat: 51.5074, lng: -0.1278 },
  Barcelona:       { lat: 41.3851, lng:  2.1734 },
  Seoul:           { lat: 37.5665, lng: 126.9780 },
  Paris:           { lat: 48.8566, lng:  2.3522 },
  Denver:          { lat: 39.7392, lng: -104.9903 },
  'São Paulo':     { lat: -23.5505, lng: -46.6333 },
};
function cityCenter(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city] ?? CITY_COORDS.Mumbai;
}

// ISO-week string e.g. "2026W26". Pure function, no I/O.
function weekIsoOf(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}W${String(weekNo).padStart(2, '0')}`;
}
function floorToHourUtc(ms: number): Date {
  const d = new Date(ms);
  d.setUTCMinutes(0, 0, 0);
  return d;
}
function floorToDayUtc(ms: number): Date {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Activity action types used by the seed (matches the comment in
// schema.prisma UserActivity.action — keep in sync).
const ACTIVITY_ACTIONS: readonly string[] = [
  'view', 'like', 'pass', 'swipe', 'click', 'scroll', 'dwell',
  'share', 'comment', 'match', 'unmatch', 'block', 'move', 'search',
];
const ACTIVITY_TARGETS: readonly string[] = [
  'profile', 'feed', 'story', 'video', 'creativity', 'chat', 'notification',
];

// v8-style event keys we roll up into EventAggHourly/Daily (matches the
// event names emitted by ingest — see services/shared/src/track/events.ts).
const V8_EVENT_KEYS: readonly string[] = [
  'card.impression.50',
  'card.impression.100',
  'swipe.commit',
  'msg.send',
  'msg.read',
  'session.heartbeat',
];

type SeedUserRow = { id: string; username: string; _seed: UserSeed };

interface V36Summary {
  userActivityRows: number;
  eventAggHourlyRows: number;
  eventAggDailyRows: number;
  featureSnapshotRows: number;
  pairCompatCacheRows: number;
  userWeightProfileRows: number;
  spotlightLedgerRows: number;
  spotlightAwardRows: number;
  exposureLedgerRows: number;
  exposureCreditRows: number;
  weeklyTopMatchRows: number;
  premiumUsers: number;
  outboundMessageRows: number;
  firstMoveOutcomeRows: number;
  userMoveProfileRows: number;
  dtmMessageRows: number;
  familyBriefShareRows: number;
  consentEventRows: number;
  deferredItemRows: number;
  creativityExtraRows: number;
  spotlightBalanceMin: number;
  spotlightBalanceMax: number;
}

// ─── Category A — v8 tracking signals ──────────────────────────────────────
async function seedTrackingSignals(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  summary: V36Summary,
): Promise<void> {
  // 1. UserActivity — at least 30 events per user across 14 actions × 7 targets.
  for (const u of users) {
    const num = u._seed.num;
    for (let e = 0; e < 32; e++) {
      const action = ACTIVITY_ACTIONS[(num + e) % ACTIVITY_ACTIONS.length];
      const targetType = ACTIVITY_TARGETS[(num + e * 2) % ACTIVITY_TARGETS.length];
      const ageDaysAgo = (num + e) % 30;
      const createdAt = new Date(SEED_DATE - ageDaysAgo * 86400000 - e * 600000);
      const durationMs = action === 'dwell' || action === 'view'
        ? 800 + ((num + e) % 12) * 250
        : null;
      await prismaC.userActivity.create({
        data: {
          userId: u.id,
          action,
          targetType,
          targetId: targetType === 'profile' ? users[(e + 1) % users.length].id : `seed-${targetType}-${num}-${e}`,
          metadata: JSON.stringify({ source: 'v36-seed', sessionIdx: e % 5 }),
          durationMs,
          sessionId: `seed-session-${num}-${e % 5}`,
          createdAt,
        },
      });
      summary.userActivityRows++;
    }
  }

  // 2. EventAggHourly + EventAggDaily — synthetic rollups keyed by uidHash.
  for (const u of users) {
    const uidHash = hashUid(u.id);
    // 14 days × ~3 hourly buckets per day for each of 6 v8 events.
    for (let day = 0; day < 14; day++) {
      const dayMs = SEED_DATE - day * 86400000;
      for (let h = 0; h < 3; h++) {
        const hourMs = dayMs - h * 4 * 3600000;
        const bucket = floorToHourUtc(hourMs);
        for (let ei = 0; ei < V8_EVENT_KEYS.length; ei++) {
          const evt = V8_EVENT_KEYS[ei];
          const count = 1 + ((u._seed.num + day + h + ei) % 5);
          const durSum = count * (200 + ((u._seed.num + ei) % 800));
          await prismaC.eventAggHourly.upsert({
            where: { uidHash_evt_bucket: { uidHash, evt, bucket } },
            update: {},
            create: {
              uidHash,
              evt,
              bucket,
              count,
              durSum,
              durP50: Math.round(durSum / Math.max(count, 1)),
              durP95: Math.round(durSum / Math.max(count, 1) * 1.5),
              meta: { source: 'v36-seed' } as Prisma.InputJsonValue,
            },
          });
          summary.eventAggHourlyRows++;
        }
      }
      // Daily roll-up — one row per evt per day.
      const day0 = floorToDayUtc(dayMs);
      for (let ei = 0; ei < V8_EVENT_KEYS.length; ei++) {
        const evt = V8_EVENT_KEYS[ei];
        const count = 6 + ((u._seed.num + day + ei) % 12);
        const durSum = count * (300 + ((u._seed.num + ei) % 1200));
        await prismaC.eventAggDaily.upsert({
          where: { uidHash_evt_day: { uidHash, evt, day: day0 } },
          update: {},
          create: {
            uidHash,
            evt,
            day: day0,
            count,
            durSum,
            uniqTargets: Math.min(count, 8),
            meta: { source: 'v36-seed' } as Prisma.InputJsonValue,
          },
        });
        summary.eventAggDailyRows++;
      }
    }
  }

  // 3. FeatureSnapshot — one row per user.
  const chronotypes = ['morning', 'day', 'evening', 'night', 'mixed'] as const;
  const attentions  = ['reader', 'scanner', 'voice-first', 'visual'] as const;
  for (const u of users) {
    const uidHash = hashUid(u.id);
    const num = u._seed.num;
    const coord = cityCenter(u._seed.city);
    const chronotype = chronotypes[num % chronotypes.length];
    const attention  = attentions[num % attentions.length];
    const rage = 0.01 + (rng() * 0.04);          // 0.01..0.05
    const respRate = 0.4 + (rng() * 0.55);       // 0.4..0.95
    const replyP50 = 60_000 + Math.floor(rng() * 3_540_000); // 60s..3600s
    const replyP90 = replyP50 * 3;
    const swipeRight = 0.3 + (rng() * 0.4);      // 0.3..0.7

    const intentClasses = ['distraction_browse', 'intentional_browse', 'reply_mood', 'review_existing', 'serious_search', 'casual_scroll', 'decision_fatigued'];
    const intentVec: Record<string, number> = {};
    let intentSum = 0;
    for (const c of intentClasses) {
      const v = 0.05 + rng() * 0.2;
      intentVec[c] = v;
      intentSum += v;
    }
    for (const c of intentClasses) intentVec[c] = intentVec[c] / intentSum;

    const moodVec = {
      rage:      Math.min(1, rage * 8),
      calm:      0.4 + rng() * 0.4,
      curious:   0.3 + rng() * 0.5,
      receptive: 0.4 + rng() * 0.5,
      fatigued:  rng() * 0.3,
    };

    const senderVoiceV8 = {
      medianLengthChars: 20 + (num % 40),
      medianLengthWords: 4 + (num % 8),
      emojiRate:         0.05 + ((num % 10) * 0.03),
      topEmojis:         ['😊', '✨', '🙏'].slice(0, (num % 3) + 1),
      emDashRate:        (num % 5) * 0.01,
      exclamationRate:   0.1 + (num % 5) * 0.04,
      questionRate:      0.15 + (num % 5) * 0.03,
      commaPerWord:      0.04 + (num % 4) * 0.01,
      fragmentsPerMessage: 0.4 + (num % 5) * 0.1,
      lowercaseIRate:    0.4 + (num % 5) * 0.1,
      lowercaseStartRate:0.5 + (num % 5) * 0.08,
      typoRateApprox:    0.03 + (num % 5) * 0.005,
      contractionRate:   0.6 + (num % 4) * 0.05,
      laughTokenRate:    0.05 + (num % 5) * 0.02,
      sampleCount:       20 + (num % 30),
      confidence:        Math.min(1, (20 + (num % 30)) / 50),
    };

    const receiverResonanceV8 = {
      preferredKinds: ['text', 'voice', 'media'].slice(0, (num % 3) + 1),
      tonePrefs: { reflective: 0.25, casual: 0.4, tactile: 0.15, quick: 0.2 },
      archetype: (['wordsmith', 'voice_first', 'visual', 'fast_replier'] as const)[num % 4],
      replyMedianMs: replyP50,
      confidence: Math.min(1, (15 + (num % 25)) / 40),
    };

    await prismaC.featureSnapshot.upsert({
      where: { uidHash },
      update: {},
      create: {
        uidHash,
        chronotype,
        replyPersonaP50Ms: replyP50,
        replyPersonaP90Ms: replyP90,
        responseRate: Math.round(respRate * 100) / 100,
        rageClickRate: Math.round(rage * 1000) / 1000,
        deadClickRate: Math.round((rage * 0.5) * 1000) / 1000,
        dwellToDecisionP50: 1200 + (num % 10) * 150,
        swipeRightRatio: Math.round(swipeRight * 100) / 100,
        attentionProfile: attention,
        cityCenterLat: coord.lat,
        cityCenterLng: coord.lng,
        raw: {
          intentRightNow: intentVec,
          moodRightNow: moodVec,
          senderVoiceV8,
          receiverResonanceV8,
          seededAt: SEED_DATE,
        } as Prisma.InputJsonValue,
      },
    });
    summary.featureSnapshotRows++;
  }

  // 4. PairCompatCache — 10 nearest candidates per user (by num proximity).
  for (let i = 0; i < users.length; i++) {
    const a = users[i];
    const aHash = hashUid(a.id);
    // Pick 10 candidates closest in num (wrap around the user list).
    const candidates: SeedUserRow[] = [];
    for (let off = 1; candidates.length < 10 && off < users.length; off++) {
      const b = users[(i + off) % users.length];
      if (b.id === a.id) continue;
      candidates.push(b);
    }
    for (const b of candidates) {
      const bHash = hashUid(b.id);
      // Deterministic pair score from (numA + numB).
      const pairKey = (a._seed.num * 53 + b._seed.num * 13) % 1000;
      const finalScore = 0.5 + (pairKey / 1000) * 0.45;          // 0.5..0.95
      const interestCos  = 0.4 + ((pairKey + 17) % 600) / 1000;  // 0.4..1.0
      const vibeCos      = 0.4 + ((pairKey + 31) % 600) / 1000;
      const behaviorCos  = 0.3 + ((pairKey + 47) % 700) / 1000;
      const magnetCos    = 0.3 + ((pairKey + 71) % 700) / 1000;
      const ageDelta     = Math.abs(a._seed.age - b._seed.age);
      const coordA = cityCenter(a._seed.city);
      const coordB = cityCenter(b._seed.city);
      const cityKm = Math.round(
        Math.sqrt(Math.pow(coordA.lat - coordB.lat, 2) + Math.pow(coordA.lng - coordB.lng, 2)) * 111,
      );
      await prismaC.pairCompatCache.upsert({
        where: { aHash_bHash: { aHash, bHash } },
        update: {},
        create: {
          aHash,
          bHash,
          interestCos,
          vibeCos,
          behaviorCos,
          magnetCos,
          cityKm,
          ageDelta,
          intentMatch:           0.5 + (pairKey % 100) / 200,
          chronoOverlap:         0.4 + (pairKey % 100) / 250,
          cadenceOverlap:        0.4 + (pairKey % 100) / 250,
          priorInteractionScore: 0,
          finalScore,
          v6Score: finalScore + 0.01,
          v6BreakdownJson: {
            source: 'v36-seed',
            ingredients: { interestsOverlap: interestCos, vibeAlignment: vibeCos, behaviouralTwinIndex: behaviorCos },
          } as Prisma.InputJsonValue,
        },
      });
      summary.pairCompatCacheRows++;
    }
  }

  // 5. UserWeightProfile — one row per user with surface='discover'.
  const defaultWeights: Record<string, number> = {
    interestsOverlap: 0.18,
    vibeAlignment: 0.15,
    behaviouralTwinIndex: 0.15,
    reciprocalIntentScore: 0.10,
    attentionFit: 0.10,
    hesitationFit: 0.08,
    chronotypeOverlap: 0.07,
    ageSimilarity: 0.05,
    distanceFit: 0.05,
    communicationCadenceFit: 0.04,
    moveStyleCompat: 0.03,
  };
  const ones: Record<string, number> = Object.fromEntries(
    Object.keys(defaultWeights).map((k) => [k, 1]),
  );
  for (const u of users) {
    const uidHash = hashUid(u.id);
    await prismaC.userWeightProfile.upsert({
      where: { uidHash_surface: { uidHash, surface: 'discover' } },
      update: {},
      create: {
        uidHash,
        surface: 'discover',
        weights: defaultWeights as Prisma.InputJsonValue,
        noveltyBoost: 0.05,
        diversityBoost: 0.05,
        explorationRate: 0.05,
        banditAlpha: ones as Prisma.InputJsonValue,
        banditBeta:  ones as Prisma.InputJsonValue,
        schemaVersion: 1,
      },
    });
    summary.userWeightProfileRows++;
  }
}

// ─── Category B — Spotlight + v3.6 economy ────────────────────────────────
async function seedSpotlightEconomy(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  summary: V36Summary,
): Promise<void> {
  // Active-creator and premium-user sets — deterministic by num.
  const activeCreatorNums  = new Set<number>([3, 7, 14, 20, 30]);
  const premiumUserNums    = new Set<number>([5, 15, 25, 35, 45]);

  const balances: number[] = [];

  for (const u of users) {
    const num = u._seed.num;
    let balance = 0;

    // profile_100 — every user qualifies (existing seed runs
    // recomputeAndPersistCompletion which generally lands near 100).
    await prismaC.spotlightAward.upsert({
      where: { userId_kind: { userId: u.id, kind: 'profile_100' } },
      update: {},
      create: { userId: u.id, kind: 'profile_100', createdAt: new Date(SEED_DATE - 7 * 86400000) },
    });
    summary.spotlightAwardRows++;
    await prismaC.spotlightLedger.create({
      data: {
        userId: u.id,
        delta: 10,
        reason: 'profile_100',
        meta: { balanceAfter: balance + 10 } as Prisma.InputJsonValue,
        createdAt: new Date(SEED_DATE - 7 * 86400000),
      },
    });
    summary.spotlightLedgerRows++;
    balance += 10;

    // daily_login — 0..5 streak tier (deterministic by num).
    const streak = num % 6; // 0..5
    for (let d = 0; d < streak; d++) {
      const delta = 1; // +1 per daily login
      await prismaC.spotlightLedger.create({
        data: {
          userId: u.id,
          delta,
          reason: 'daily_login',
          meta: { streakDay: d + 1, balanceAfter: balance + delta } as Prisma.InputJsonValue,
          createdAt: new Date(SEED_DATE - (streak - d) * 86400000),
        },
      });
      summary.spotlightLedgerRows++;
      balance += delta;
    }

    // comment_left — 0..3
    const commentCount = num % 4;
    for (let c = 0; c < commentCount; c++) {
      await prismaC.spotlightLedger.create({
        data: {
          userId: u.id,
          delta: 1,
          reason: 'comment_left',
          meta: { commentIdx: c, balanceAfter: balance + 1 } as Prisma.InputJsonValue,
          createdAt: new Date(SEED_DATE - (c + 1) * 7200000),
        },
      });
      summary.spotlightLedgerRows++;
      balance += 1;
    }

    // weekly_top_creator — only for active creators (5 users).
    if (activeCreatorNums.has(num)) {
      // Rank by ordering within the set; deterministic.
      const rank = [...activeCreatorNums].sort((a, b) => a - b).indexOf(num) + 1;
      const award = rank === 1 ? 20 : rank === 2 ? 15 : 10;
      await prismaC.spotlightAward.upsert({
        where: { userId_kind: { userId: u.id, kind: `weekly_top_creator_rank_${rank}` } },
        update: {},
        create: { userId: u.id, kind: `weekly_top_creator_rank_${rank}`, createdAt: new Date(SEED_DATE - 2 * 86400000) },
      });
      summary.spotlightAwardRows++;
      await prismaC.spotlightLedger.create({
        data: {
          userId: u.id,
          delta: award,
          reason: 'weekly_top_creator',
          meta: { rank, balanceAfter: balance + award } as Prisma.InputJsonValue,
          createdAt: new Date(SEED_DATE - 2 * 86400000),
        },
      });
      summary.spotlightLedgerRows++;
      balance += award;
    }

    // post_spend — for 10 users (every 5th in the 50).
    if (num % 5 === 0) {
      const spend = -(5 + (num % 3) * 5); // -5, -10, or -15
      await prismaC.spotlightLedger.create({
        data: {
          userId: u.id,
          delta: spend,
          reason: 'post_spend',
          meta: { balanceAfter: balance + spend } as Prisma.InputJsonValue,
          createdAt: new Date(SEED_DATE - 6 * 3600000),
        },
      });
      summary.spotlightLedgerRows++;
      balance += spend;
    }

    balances.push(balance);
  }

  summary.spotlightBalanceMin = balances.reduce((m, b) => Math.min(m, b), Infinity);
  summary.spotlightBalanceMax = balances.reduce((m, b) => Math.max(m, b), -Infinity);

  // 3+4. ExposureLedger + ExposureCredit — per user.
  // Reasons enum per schema: 'sticky_like' | 'message_reply' | 'dtm_completed' | ...
  for (const u of users) {
    const num = u._seed.num;
    let slotsEarned = 0;
    let slotsSpent  = 0;
    const uidHash = hashUid(u.id);
    const surface = 'discover';
    const isHighEarner = activeCreatorNums.has(num) || premiumUserNums.has(num);

    // Base allocation for everyone: 5 sticky_like, 2 message_reply, 1 dtm_completed.
    const baseEvents: Array<{ reason: string; deltaSlots: number; count: number }> = [
      { reason: 'sticky_like',    deltaSlots: 1, count: 5 },
      { reason: 'message_reply',  deltaSlots: 3, count: 2 },
      { reason: 'dtm_completed',  deltaSlots: 5, count: 1 },
    ];
    // High earners get extras to cross the 30-credit Top-10 threshold.
    if (isHighEarner) {
      baseEvents.push({ reason: 'sticky_like',   deltaSlots: 1, count: 8 });
      baseEvents.push({ reason: 'message_reply', deltaSlots: 3, count: 3 });
      baseEvents.push({ reason: 'bio_expand',    deltaSlots: 1, count: 4 });
    }

    let ledgerIdx = 0;
    for (const evt of baseEvents) {
      for (let i = 0; i < evt.count; i++) {
        const createdAt = new Date(SEED_DATE - ledgerIdx * 3600000);
        await prismaC.exposureLedger.create({
          data: {
            uidHash,
            surface,
            deltaSlots: evt.deltaSlots,
            reason: evt.reason,
            refId: `seed-${num}-${ledgerIdx}`,
            meta: { source: 'v36-seed' } as Prisma.InputJsonValue,
            createdAt,
          },
        });
        summary.exposureLedgerRows++;
        slotsEarned += evt.deltaSlots;
        ledgerIdx++;
      }
    }

    // Spend a small amount for variety so the (earned, spent) rollup isn't trivial.
    if (slotsEarned >= 10) {
      const spend = Math.min(5, Math.floor(slotsEarned / 4));
      await prismaC.exposureLedger.create({
        data: {
          uidHash,
          surface,
          deltaSlots: -spend,
          reason: 'top10_filled',
          refId: `seed-${num}-spent`,
          meta: { source: 'v36-seed' } as Prisma.InputJsonValue,
          createdAt: new Date(SEED_DATE - 1800000),
        },
      });
      summary.exposureLedgerRows++;
      slotsSpent += spend;
    }

    await prismaC.exposureCredit.upsert({
      where: { uidHash_surface: { uidHash, surface } },
      update: { slotsEarned, slotsSpent, lastTopUp: new Date(SEED_DATE) },
      create: {
        uidHash,
        surface,
        slotsEarned,
        slotsSpent,
        lastTopUp: new Date(SEED_DATE),
      },
    });
    summary.exposureCreditRows++;
  }

  // 5. WeeklyTopMatch — top 10 entries for each active creator for this week.
  const weekIso = weekIsoOf(new Date(SEED_DATE));
  for (const u of users) {
    const num = u._seed.num;
    if (!activeCreatorNums.has(num)) continue;
    const uidHash = hashUid(u.id);
    // Pick 10 deterministic targets (next 10 in user list excluding self).
    const idx = users.findIndex((row) => row.id === u.id);
    let placed = 0;
    let off = 1;
    while (placed < 10 && off < users.length) {
      const target = users[(idx + off) % users.length];
      off++;
      if (target.id === u.id) continue;
      const targetHash = hashUid(target.id);
      await prismaC.weeklyTopMatch.upsert({
        where: { uidHash_weekIso_rank: { uidHash, weekIso, rank: placed + 1 } },
        update: {},
        create: {
          uidHash,
          weekIso,
          rank: placed + 1,
          targetHash,
          computedAt: new Date(SEED_DATE),
        },
      });
      summary.weeklyTopMatchRows++;
      placed++;
    }
  }

  // 6. User.premium — set true for nums 5, 15, 25, 35, 45.
  const premiumUntil = new Date(SEED_DATE + 30 * 86400000);
  for (const u of users) {
    if (!premiumUserNums.has(u._seed.num)) continue;
    await prismaC.user.update({
      where: { id: u.id },
      data: { premium: true, premiumUntil },
    });
    summary.premiumUsers++;
  }
}

// ─── Category C — Move v2 inputs ──────────────────────────────────────────
async function seedMoveV2(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  summary: V36Summary,
): Promise<void> {
  // 1. Pad outbound messages — every user needs ≥20. We satisfy this by
  //    seeding a synthetic self-chat-free monologue in the FirstMoveOutcome
  //    pipeline + per-pair messages below. The existing seed already created
  //    chats for the first 15 matches; we add 20 messages per user as
  //    UserActivity 'message_send' events so the v8 sender-voice extractor
  //    sees enough samples when it reads the Message table.
  //
  //    To keep matchmaking consistent, we attach the synthetic messages to
  //    the existing chats authored by each user when available; if a user has
  //    no chat, we skip — UserActivity above already supplies enough signal.
  const sampleSenderLines = [
    'hey, hope your day\'s going well',
    'just thought i\'d say hi',
    'that photo of yours is great — what camera?',
    'btw saw your post — loved it',
    'where in the city would you go for a slow saturday?',
    'okay this one\'s random, but: rain or sun?',
    'small thing — what are you reading right now?',
    'on a scale of cool to wow, your prompt was a wow',
    'wait, you cook too?? share a recipe sometime',
    'hot take incoming: morning > evening dates',
    'one of my favourite places: a tiny café near work, the chai is unreal',
    'i feel like you and i would survive a karaoke night',
    'no agenda — just curious how your week is',
    'okay i\'ll go first: weekend plans?',
    'totally fair to ignore, but… your laugh in that video',
    'i don\'t do this often, but i had to say hi',
    'genuine question: best book you\'ve read this year?',
    'today\'s mood: lazy sundays forever',
    'tell me a small thing that made you smile this week',
    'last one promise: tea or coffee?',
  ];

  // Find existing chats per user.
  const chats = await prismaC.chat.findMany({});
  const chatsByUser: Record<string, string[]> = {};
  for (const c of chats) {
    chatsByUser[c.user1Id] = chatsByUser[c.user1Id] || [];
    chatsByUser[c.user2Id] = chatsByUser[c.user2Id] || [];
    chatsByUser[c.user1Id].push(c.id);
    chatsByUser[c.user2Id].push(c.id);
  }

  // Add 20 synthetic outbound messages per user, distributed across their
  // chats. For users without chats, skip (UserActivity supplies the signal).
  for (const u of users) {
    const myChats = chatsByUser[u.id] ?? [];
    if (myChats.length === 0) continue;
    for (let m = 0; m < 20; m++) {
      const chatId = myChats[m % myChats.length];
      await prismaC.message.create({
        data: {
          chatId,
          senderId: u.id,
          content: sampleSenderLines[m % sampleSenderLines.length],
          type: 'text',
          read: true,
          createdAt: new Date(SEED_DATE - (200 + m) * 60000),
        },
      });
      summary.outboundMessageRows++;
    }
  }

  // 2. FirstMoveOutcome — for each matched pair, seed 1-3 outcomes.
  const matches = await prismaC.match.findMany({});
  const moveKinds = ['text', 'voice', 'media', 'reaction'] as const;
  for (let mi = 0; mi < matches.length; mi++) {
    const m = matches[mi];
    const aHash = hashUid(m.user1Id);
    const bHash = hashUid(m.user2Id);
    const count = 1 + (mi % 3); // 1..3
    for (let i = 0; i < count; i++) {
      const sentAt = new Date(SEED_DATE - (mi * 86400000 + i * 3600000));
      const kind = moveKinds[(mi + i) % moveKinds.length];
      const replied = (mi + i) % 2 === 0;
      const replyMs = replied ? (300_000 + ((mi + i) * 73 % 3_300_000)) : null; // <1h
      await prismaC.firstMoveOutcome.upsert({
        where: { aHash_bHash_sentAt: { aHash, bHash, sentAt } },
        update: {},
        create: {
          aHash,
          bHash,
          sentAt,
          kind,
          replied,
          replyMs,
          archetype: (['wordsmith', 'voice_first', 'visual', 'fast_replier'] as const)[(mi + i) % 4],
          meta: { source: 'v36-seed' } as Prisma.InputJsonValue,
        },
      });
      summary.firstMoveOutcomeRows++;
    }
  }

  // 3. UserMoveProfile — one row per user with deterministic archetype.
  const archetypes = ['wordsmith', 'voice_first', 'visual', 'fast_replier'] as const;
  for (const u of users) {
    const uidHash = hashUid(u.id);
    const archetype = archetypes[u._seed.num % 4];
    const probs: Record<string, number> = {};
    let sum = 0;
    for (const a of archetypes) {
      const p = a === archetype ? 0.55 : 0.15;
      probs[a] = p;
      sum += p;
    }
    for (const a of archetypes) probs[a] = probs[a] / sum;

    await prismaC.userMoveProfile.upsert({
      where: { uidHash },
      update: {},
      create: {
        uidHash,
        archetype,
        archetypeProbs: probs as Prisma.InputJsonValue,
        avgMoveLenChars: 25 + (u._seed.num % 40),
        voiceShare:      archetype === 'voice_first' ? 0.4 : 0.1,
        mediaShare:      archetype === 'visual'      ? 0.3 : 0.1,
        p50ReplyMinutes: archetype === 'fast_replier' ? 5 : 60,
        schemaVersion:   1,
      },
    });
    summary.userMoveProfileRows++;
  }
}

// ─── Category D — DTM, matrimonial, Family Brief ──────────────────────────
async function seedDtmFamilyBrief(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  summary: V36Summary,
): Promise<void> {
  // 1. MatrimonialProfile — already seeded for num % 5 === 0 by the existing
  //    seed. Nothing to add here (caste field already stays blank/"Open" per
  //    founder policy).

  // 2. DtmMessage — pick 5 matched pairs where at least one side is num%5===0.
  const matches = await prismaC.match.findMany({});
  const dtmExchanges = [
    'What does an ideal weekday evening look like for you, post-marriage?',
    'How involved do you imagine our families being in our day-to-day life?',
    'Are you open to relocating in the next 5 years?',
    'How do you handle conflict — talk it out same day, or take time?',
    'What\'s your relationship with money — saver, spender, or planner?',
    'How important is shared spirituality vs. independent practice?',
    'What did you learn from your parents\' marriage that you\'d keep — or change?',
    'Kids: timeline, count, parenting style — what feels right?',
    'How do you balance work, family, and your own hobbies today?',
    'On a hard day, what would feel like real support from a partner?',
  ];
  let dtmPairsUsed = 0;
  for (const m of matches) {
    if (dtmPairsUsed >= 5) break;
    const u1 = users.find((u) => u.id === m.user1Id);
    const u2 = users.find((u) => u.id === m.user2Id);
    if (!u1 || !u2) continue;
    if (u1._seed.num % 5 !== 0 && u2._seed.num % 5 !== 0) continue;
    const turns = 6 + (dtmPairsUsed % 5);
    for (let t = 0; t < turns; t++) {
      const senderId = t % 2 === 0 ? m.user1Id : m.user2Id;
      const recipientId = t % 2 === 0 ? m.user2Id : m.user1Id;
      await prismaC.dtmMessage.create({
        data: {
          senderId,
          recipientId,
          message: dtmExchanges[(t + dtmPairsUsed) % dtmExchanges.length],
          type: 'text',
          read: t < turns - 1,
          createdAt: new Date(SEED_DATE - (10 - t) * 3600000 - dtmPairsUsed * 86400000),
        },
      });
      summary.dtmMessageRows++;
    }
    dtmPairsUsed++;
  }

  // 3. FamilyBriefShare — 5 of the matrimonial users.
  const matriProfiles = await prismaC.matrimonialProfile.findMany({ take: 5 });
  const expiresAt = new Date(SEED_DATE + 7 * 86400000);
  for (let i = 0; i < matriProfiles.length; i++) {
    const mp = matriProfiles[i];
    // 22-char deterministic token from userId + index.
    const token = hashUid(`family-brief-${mp.userId}-${i}`);
    await prismaC.familyBriefShare.upsert({
      where: { token },
      update: {},
      create: {
        userId: mp.userId,
        token,
        format: 'image',
        generatedAt: new Date(SEED_DATE - i * 3600000),
        expiresAt,
        viewCount: i % 4, // 0..3
        trackViews: i % 2 === 0,
      },
    });
    summary.familyBriefShareRows++;
  }
}

// ─── Category E — Settings consent toggles + ConsentEvent ─────────────────
async function seedConsentAndSettings(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  summary: V36Summary,
): Promise<void> {
  for (const u of users) {
    // 25/50 get moodInferenceEnabled=true (random via rng).
    const moodOn = rng() < 0.5;
    await prismaC.settings.update({
      where: { userId: u.id },
      data: {
        moodInferenceEnabled:      moodOn,
        behavioralRankingEnabled:  true,
        crossUserInferenceEnabled: true,
        algorithmicTransparency:   true,
      },
    });

    // One ConsentEvent row per ON scope.
    const scopes: Array<{ scope: string; granted: boolean }> = [
      { scope: 'behavioral_ranking',   granted: true },
      { scope: 'cross_user_inference', granted: true },
      { scope: 'algorithmic_transparency', granted: true },
      { scope: 'mood_inference',       granted: moodOn },
    ];
    for (const s of scopes) {
      if (!s.granted) continue;
      await prismaC.consentEvent.create({
        data: {
          userId: u.id,
          did: `seed-device-${u._seed.num}`,
          scope: s.scope,
          granted: true,
          region: 'IN',
          source: 'settings',
          createdAt: new Date(SEED_DATE - 14 * 86400000),
        },
      });
      summary.consentEventRows++;
    }
  }
}

// ─── Category F — Creativity coverage (top-up reels) ──────────────────────
async function seedCreativityCoverage(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  categories: Record<string, { id: string; name: string }>,
  summary: V36Summary,
): Promise<void> {
  // Check counts per category; top up to at least 10 each.
  const allItems = await prismaC.creativityItem.findMany({ select: { categoryId: true } });
  const byCat: Record<string, number> = {};
  for (const it of allItems) byCat[it.categoryId] = (byCat[it.categoryId] ?? 0) + 1;

  let topUpIdx = 0;
  for (const catName of Object.keys(categories)) {
    const cat = categories[catName];
    const have = byCat[cat.id] ?? 0;
    if (have >= 10) continue;
    const need = 10 - have;
    for (let n = 0; n < need; n++) {
      const author = users[(topUpIdx + n) % users.length];
      await prismaC.creativityItem.create({
        data: {
          authorId: author.id,
          categoryId: cat.id,
          type: ['text', 'image', 'video'][n % 3],
          title: `v36_topup_${catName}_${n + 1}`,
          content: `Top-up creativity item for ${catName} (v3.6 seed). Author: ${author._seed.displayName}.`,
          views: 50 + ((topUpIdx + n) * 17 % 500),
          trendScore: 10 + ((topUpIdx + n) * 13 % 80),
          featured: false,
          createdAt: new Date(SEED_DATE - (topUpIdx * 600000 + n * 300000)),
        },
      });
      summary.creativityExtraRows++;
      topUpIdx++;
    }
  }
}

// ─── Category G — DeferredItem (see-later pile) ───────────────────────────
async function seedDeferredItems(
  prismaC: PrismaClient,
  users: SeedUserRow[],
  summary: V36Summary,
): Promise<void> {
  for (let i = 0; i < users.length; i++) {
    if (i >= 10) break; // 10 users only
    const u = users[i];
    const uidHash = hashUid(u.id);
    const numDeferred = 3 + (i % 3); // 3..5
    for (let d = 0; d < numDeferred; d++) {
      const target = users[(i + d + 1) % users.length];
      await prismaC.deferredItem.upsert({
        where: { uidHash_surface_targetId: { uidHash, surface: 'discover', targetId: target.id } },
        update: {},
        create: {
          uidHash,
          surface: 'discover',
          targetId: target.id,
          reason: (['not_now', 'thinking', 'unsure', 'other'])[d % 4],
          deferredAt: new Date(SEED_DATE - (d + 1) * 3600000),
          meta: { source: 'v36-seed', batchId: `b-${i}` } as Prisma.InputJsonValue,
        },
      });
      summary.deferredItemRows++;
    }
  }
}

async function main() {
  console.log('🌱 Seeding Miamo database...');

  // Clean existing data
  await prisma.$transaction([
    // v3.6 tables — not FK-cascaded from User (uidHash / standalone), so we
    // explicitly wipe them before re-seeding to keep counts honest across runs.
    prisma.familyBriefShare.deleteMany(),
    prisma.weeklyTopMatch.deleteMany(),
    prisma.exposureCredit.deleteMany(),
    prisma.exposureLedger.deleteMany(),
    prisma.deferredItem.deleteMany(),
    prisma.firstMoveOutcome.deleteMany(),
    prisma.userMoveProfile.deleteMany(),
    prisma.userWeightProfile.deleteMany(),
    prisma.pairCompatCache.deleteMany(),
    prisma.featureSnapshot.deleteMany(),
    prisma.eventAggDaily.deleteMany(),
    prisma.eventAggHourly.deleteMany(),
    prisma.consentEvent.deleteMany(),
    prisma.session.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.block.deleteMany(),
    prisma.report.deleteMany(),
    prisma.searchLog.deleteMany(),
    prisma.trend.deleteMany(),
    prisma.creativityComment.deleteMany(),
    prisma.creativityReaction.deleteMany(),
    prisma.creativityView.deleteMany(),
    prisma.creativityItem.deleteMany(),
    prisma.creativityCategory.deleteMany(),
    prisma.videoReaction.deleteMany(),
    prisma.videoComment.deleteMany(),
    prisma.video.deleteMany(),
    prisma.storyComment.deleteMany(),
    prisma.storyLike.deleteMany(),
    prisma.storyView.deleteMany(),
    prisma.story.deleteMany(),
    prisma.feedReaction.deleteMany(),
    prisma.feedComment.deleteMany(),
    prisma.feedPost.deleteMany(),
    prisma.beatEvent.deleteMany(),
    prisma.beat.deleteMany(),
    prisma.message.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.matchFeedback.deleteMany(),
    prisma.match.deleteMany(),
    prisma.miamoMove.deleteMany(),
    prisma.matchRequest.deleteMany(),
    prisma.like.deleteMany(),
    prisma.bioDataAccessRequest.deleteMany(),
    prisma.matrimonialProfile.deleteMany(),
    prisma.discoverFilter.deleteMany(),
    prisma.privacySettings.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.profileInterest.deleteMany(),
    prisma.profilePrompt.deleteMany(),
    prisma.profilePhoto.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('  ✓ Cleaned existing data');

  // Create creativity categories
  const categories: Record<string, any> = {};
  for (const cat of CREATIVITY_CATEGORIES) {
    const created = await prisma.creativityCategory.create({ data: cat });
    categories[cat.name] = created;
  }
  console.log('  ✓ Created creativity categories');

  // Create users (password = username)
  const userRecords: any[] = [];
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(getPassword(u.username), 12);
    // Persona is derived from the user number — single source of truth.
    //   'both'     → multiples of 10 (Discover + DTM eligible)
    //   'dtm'      → other multiples of 5 (DTM only — sparse Casual profile)
    //   'discover' → everything else (Discover only)
    const surface: Surface = surfaceFor(u.num);
    const isDtmOnly = surface === 'dtm';
    const isBoth = surface === 'both';
    const wantsDtm = surface !== 'discover';
    const seriousMode = isSeriousFor(u.num);

    // Persona B (DTM only) deliberately under-fills Casual buckets so its
    // Casual completion stays well below the 60 gate (it relies on the DTM
    // surface). Persona A and C keep the rich data from the USERS literal.
    const profileData: any = {
      age: u.age,
      gender: u.gender,
      city: u.city,
      datingIntent: u.intent,
      seriousMode,
      profileScore: 100,
      online: u.online,
      lastActive: new Date(SEED_DATE),
      avatarGradient: u.avatarGradient,
      // Lifestyle: Persona B keeps only height + languages (used by matri
      // motherTongue); the rest stays empty so the Casual lifestyle bucket
      // earns at most ~2 pts.
      height: u.height,
      sexuality: isDtmOnly ? '' : u.sexuality,
      smoking: isDtmOnly ? '' : u.smoking,
      drinking: isDtmOnly ? '' : u.drinking,
      exercise: isDtmOnly ? '' : u.exercise,
      education: isDtmOnly ? '' : u.education,
      religion: isDtmOnly ? '' : u.religion,
      zodiac: isDtmOnly ? '' : u.zodiac,
      languages: u.languages,
      pets: isDtmOnly ? '' : u.pets,
      children: isDtmOnly ? '' : u.children,
      // Discover-scoring fields suppressed for Persona B
      bio: isDtmOnly ? '' : u.bio,
      profession: isDtmOnly ? '' : u.profession,
      lookingFor: isDtmOnly ? 'open' : u.lookingFor,
    };
    const dtmFields = wantsDtm ? {
      familyBackground: `${u.city}-rooted family. Values education and warmth.`,
      educationLevel: u.education || 'bachelors',
      educationInstitution: 'Top-tier university',
      employer: u.profession.split(' at ')[1] || 'Independent',
      incomeBand: ['10-15 LPA', '15-25 LPA', '25-40 LPA', '40+ LPA'][u.num % 4],
      maritalStatus: 'Never Married',
      willingToRelocate: u.num % 2 === 0,
      familyInvolved: u.num % 3 !== 0,
      expectedTimeline: ['6-12 months', '1-2 years', '2+ years'][u.num % 3],
      kundliUrl: null,
    } : {};
    const user = await prisma.user.create({
      data: {
        email: `miamo${u.num}@miamo.test`,
        passwordHash,
        displayName: u.displayName,
        username: u.username,
        miamoId: `miamo${u.num}`,
        // Power users (Persona C) get email-verified to nudge their Casual
        // score above the gate; Persona A keeps the literal value from USERS.
        verified: isBoth ? true : (isDtmOnly ? false : u.verified),
        active: true,
        profile: {
          create: {
            ...profileData,
            ...dtmFields,
          },
        },
        settings: {
          create: {
            theme: 'dark',
            seriousModeEnabled: seriousMode,
          },
        },
        privacySettings: {
          create: {
            profileVisible: true,
            searchable: true,
            miamoIdSearchable: true,
            nameSearchable: true,
            citySearchable: true,
            disableSearch: false,
          },
        },
      },
    });

    // Photos: Persona B → 2, A → 3, C → 4 (so DTM photo bucket earns 5 pts)
    const photoCount = isDtmOnly ? 2 : isBoth ? 4 : 3;
    for (let p = 0; p < photoCount; p++) {
      await prisma.profilePhoto.create({
        data: {
          userId: user.id,
          url: `https://api.dicebear.com/7.x/lorelei/svg?seed=miamo${u.num}-${p}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
          position: p,
        },
      });
    }

    // Prompts (skipped for Persona B — Casual prompt bucket = 0)
    if (!isDtmOnly) {
      for (let pi = 0; pi < u.prompts.length; pi++) {
        await prisma.profilePrompt.create({
          data: { userId: user.id, question: u.prompts[pi].q, answer: u.prompts[pi].a, position: pi },
        });
      }
    }

    // Interests (skipped for Persona B — Casual interest bucket = 0)
    if (!isDtmOnly) {
      for (const interest of u.interests) {
        await prisma.profileInterest.create({
          data: { userId: user.id, name: interest },
        });
      }
    }

    userRecords.push({ ...user, _seed: u });
  }
  console.log(`  ✓ Created ${USERS.length} users with profiles`);

  // Create matches (15 matches)
  const matchPairs = [
    [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 6], [3, 7], [4, 8], [5, 9],
    [6, 10], [7, 11], [8, 12], [9, 13], [10, 14], [11, 15],
  ];
  const matchRecords: any[] = [];
  for (const [i, j] of matchPairs) {
    const match = await prisma.match.create({
      data: { user1Id: userRecords[i].id, user2Id: userRecords[j].id },
    });
    matchRecords.push(match);
  }
  console.log('  ✓ Created 15 matches');

  // Create chats for matches + seed messages
  const chatMessages = [
    ['Hey! Love your profile 💜', 'Thank you! Your photography is amazing!', 'Would you like to grab coffee sometime?'],
    ['Your music is incredible!', 'Thanks! What kind of music do you listen to?', 'Mostly jazz and indie. Your album is on repeat!'],
    ['I love Copenhagen! Dream city.', 'You should visit in summer! The harbor is magical.'],
    ['Fellow techie! What stack?', 'TypeScript + React mostly. You?', 'Same! Plus some Rust on weekends.'],
    ['Your designs are stunning 🎨', 'Thank you! I see you\'re into fashion too!'],
  ];
  for (let ci = 0; ci < matchRecords.length; ci++) {
    const match = matchRecords[ci];
    const chat = await prisma.chat.create({
      data: {
        matchId: match.id,
        user1Id: match.user1Id,
        user2Id: match.user2Id,
        pinned1: ci < 3,
      },
    });

    const msgs = chatMessages[ci % chatMessages.length];
    for (let mi = 0; mi < msgs.length; mi++) {
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: mi % 2 === 0 ? match.user1Id : match.user2Id,
          content: msgs[mi],
          type: 'text',
          read: mi < msgs.length - 1,
          createdAt: new Date(SEED_DATE - (msgs.length - mi) * 3600000),
        },
      });
    }
  }
  console.log('  ✓ Created chats with messages');

  // Create Beats (10 active, 5 weak, 5 lost)
  for (let bi = 0; bi < matchRecords.length; bi++) {
    const match = matchRecords[bi];
    let state = 'active';
    let count = randInt(5, 34);
    if (bi >= 10 && bi < 13) { state = 'weak'; count = randInt(1, 10); }
    if (bi >= 13) { state = 'lost'; count = 0; }

    const beat = await prisma.beat.create({
      data: {
        user1Id: match.user1Id,
        user2Id: match.user2Id,
        count,
        state,
        lastUser1: state !== 'lost' ? new Date(SEED_DATE) : null,
        lastUser2: state === 'active' ? new Date(SEED_DATE) : null,
      },
    });

    // Add beat events
    if (state !== 'lost') {
      for (let e = 0; e < Math.min(count, 5); e++) {
        await prisma.beatEvent.create({
          data: {
            beatId: beat.id,
            userId: e % 2 === 0 ? match.user1Id : match.user2Id,
            type: ['snap', 'text', 'mood', 'voice'][e % 4],
            content: ['Good morning! ☀️', 'Thinking of you', '😊', 'Check this out!', 'Daily beat!'][e % 5],
            createdAt: new Date(SEED_DATE - e * 86400000),
          },
        });
      }
    }
  }
  console.log('  ✓ Created beats (10 active, 5 weak, 5 lost)');

  // Create feed posts (50+)
  const postTypes = ['thought', 'image', 'date-idea', 'mood', 'milestone'] as const;
  const postContents = [
    'Just had the most amazing sunset walk. Sometimes the best dates are the ones you go on alone. 🌅',
    'Coffee shop discovery: the barista remembered my order. Is this what love feels like? ☕',
    'Hot take: the best relationships start from genuine friendships.',
    'Finally finished my side project! Who else codes at 3am? 💻',
    'Date idea: Museum hopping followed by street food. Simple but perfect.',
    'Morning meditation hit different today. Grateful for the stillness. 🧘',
    'Just booked a solo trip to Japan! Adventure awaits 🗾',
    'Cooked dinner for 6 tonight. Full hearts, full stomachs.',
    'That moment when a song perfectly captures how you feel...',
    'What\'s your go-to comfort food? Mine is homemade ramen. 🍜',
    'Trying pottery for the first time. My bowl looks like a sad hat but I love it.',
    'Unpopular opinion: breakfast dates > dinner dates',
    'Reading in the park is severely underrated as a date idea 📚',
    'Just ran my first half marathon! 21km of questioning life choices then pure joy.',
    'The city looks different at golden hour. Everything looks warm and possible.',
  ];
  for (let pi = 0; pi < 50; pi++) {
    const authorIdx = pi % 20;
    await prisma.feedPost.create({
      data: {
        authorId: userRecords[authorIdx].id,
        type: postTypes[pi % postTypes.length],
        content: postContents[pi % postContents.length],
        visibility: 'everyone',
        createdAt: new Date(SEED_DATE - pi * 1800000),
      },
    });
  }
  console.log('  ✓ Created 50 feed posts');

  // Create stories (40)
  const storyTexts = [
    'Morning vibes ☀️', 'Working late 🌙', 'Coffee time ☕', 'Good night 🌑',
    'Exploring the city', 'Studio session', 'Beach day 🏖️', 'Book corner 📖',
  ];
  for (let si = 0; si < 40; si++) {
    const authorIdx = si % 20;
    await prisma.story.create({
      data: {
        authorId: userRecords[authorIdx].id,
        type: si % 3 === 0 ? 'text' : 'photo',
        content: storyTexts[si % storyTexts.length],
        visibility: 'everyone',
        expiresAt: new Date(SEED_DATE + 24 * 3600000),
        createdAt: new Date(SEED_DATE - si * 900000),
      },
    });
  }
  console.log('  ✓ Created 40 stories');

  // Create videos (40)
  const videoTitles = [
    'My morning routine', 'Quick recipe: 5-min pasta', 'Sunset timelapse',
    'Dance practice', '3 photography tips', 'My workspace tour',
    'Travel vlog: Tokyo', 'Fitness challenge', 'Poetry reading', 'Comedy sketch',
  ];
  for (let vi = 0; vi < 40; vi++) {
    const authorIdx = vi % 20;
    await prisma.video.create({
      data: {
        authorId: userRecords[authorIdx].id,
        title: videoTitles[vi % videoTitles.length],
        description: `A short video by ${USERS[authorIdx].displayName}`,
        category: USERS[authorIdx].interests[0] || 'general',
        visibility: 'everyone',
        views: randInt(10, 509),
        createdAt: new Date(SEED_DATE - vi * 1200000),
      },
    });
  }
  console.log('  ✓ Created 40 videos');

  // Create creativity items (60)
  const creativityTitles = [
    'Golden hour portrait', 'Handmade ceramic bowl', 'Jazz improv session',
    'Midnight shayari', 'Street photography series', 'Fashion collection preview',
    'Morning yoga flow', 'Sourdough bread journey', 'Mountain sunrise capture',
    'Stand-up bit: Dating apps', 'Guitar cover: Clair de Lune', 'Short story: Cafe',
    'AI side project demo', 'Monologue delivery', 'Soccer skills montage',
    'Minimalist living tips', 'Career talk: Tech startups', 'Perfect date blueprint',
    'Forest hike timelapse', 'Wellness journal excerpt',
  ];
  for (let ci = 0; ci < 60; ci++) {
    const authorIdx = ci % 20;
    const catName = USERS[authorIdx].creativity[0] || USERS[authorIdx].interests[0];
    const matchedCat = Object.values(categories).find((c: any) => c.name === catName) || Object.values(categories)[0];
    await prisma.creativityItem.create({
      data: {
        authorId: userRecords[authorIdx].id,
        categoryId: (matchedCat as any).id,
        type: ['text', 'image', 'project', 'poem', 'performance'][ci % 5],
        title: creativityTitles[ci % creativityTitles.length],
        content: `A creative piece by ${USERS[authorIdx].displayName}. Category: ${catName}. Showcasing talent and passion.`,
        views: randInt(20, 1019),
        trendScore: rng() * 100,
        featured: ci < 10,
        createdAt: new Date(SEED_DATE - ci * 600000),
      },
    });
  }
  console.log('  ✓ Created 60 creativity items');

  // ── DUMMY ITEMS PER CATEGORY (for filter testing) ──
  // Creates 3 items per category named "dummy_<CategoryName>" so filters can be tested
  const allCategoryNames = CREATIVITY_CATEGORIES.map(c => c.name);
  let dummyCount = 0;
  for (const catName of allCategoryNames) {
    const cat = categories[catName];
    if (!cat) continue;
    for (let d = 1; d <= 3; d++) {
      const authorIdx = (dummyCount + d) % 20;
      await prisma.creativityItem.create({
        data: {
          authorId: userRecords[authorIdx].id,
          categoryId: cat.id,
          type: ['image', 'video', 'text'][d % 3],
          title: `dummy_${catName}${d > 1 ? `_${d}` : ''}`,
          content: `This is test content for the ${catName} category. Item ${d} of 3 for filter testing.`,
          views: randInt(50, 349),
          trendScore: rng() * 80 + 20,
          featured: d === 1,
          createdAt: new Date(SEED_DATE - dummyCount * 300000),
        },
      });
      dummyCount++;
    }
  }
  console.log(`  ✓ Created ${dummyCount} dummy items (3 per category for filter testing)`);

  // Create reactions/likes (100)
  const feedPosts = await prisma.feedPost.findMany({ take: 50 });
  for (let ri = 0; ri < Math.min(100, feedPosts.length * 2); ri++) {
    const postIdx = ri % feedPosts.length;
    const userIdx = (ri + 3) % 20;
    try {
      await prisma.feedReaction.create({
        data: {
          postId: feedPosts[postIdx].id,
          userId: userRecords[userIdx].id,
          type: ['like', 'love', 'fire', 'haha', 'wow'][ri % 5],
        },
      });
    } catch { /* skip duplicates */ }
  }
  console.log('  ✓ Created reactions');

  // Create comments (50)
  const commentTexts = [
    'Love this! 💜', 'So relatable!', 'Beautiful ✨', 'This made my day!',
    'Couldn\'t agree more', 'You inspire me!', 'Wow, stunning!', 'Need more of this',
    'This is everything 🙌', 'Can we be friends?',
  ];
  for (let ci = 0; ci < Math.min(50, feedPosts.length); ci++) {
    const postIdx = ci % feedPosts.length;
    const userIdx = (ci + 5) % 20;
    await prisma.feedComment.create({
      data: {
        postId: feedPosts[postIdx].id,
        authorId: userRecords[userIdx].id,
        content: commentTexts[ci % commentTexts.length],
        createdAt: new Date(SEED_DATE - ci * 300000),
      },
    });
  }
  console.log('  ✓ Created 50 comments');

  // ── Story Views, Comments, Likes ──
  const allStories = await prisma.story.findMany({ orderBy: { createdAt: 'desc' } });
  for (let sv = 0; sv < allStories.length; sv++) {
    const story = allStories[sv];
    // Each story gets 3-8 views from random users (not the author)
    const numViews = 3 + (sv % 6);
    for (let v = 0; v < numViews; v++) {
      const viewerIdx = (sv + v + 1) % 20;
      if (userRecords[viewerIdx].id === story.authorId) continue;
      try {
        await prisma.storyView.create({
          data: {
            storyId: story.id,
            viewerId: userRecords[viewerIdx].id,
            reaction: v % 3 === 0 ? ['❤️', '😂', '🔥', '😮', '👏'][v % 5] : null,
            createdAt: new Date(SEED_DATE - sv * 900000 + v * 60000),
          },
        });
      } catch { /* skip duplicate */ }
    }
    // Half of stories get 1-2 comments
    if (sv % 2 === 0) {
      const commentCount = 1 + (sv % 2);
      for (let c = 0; c < commentCount; c++) {
        const commenterIdx = (sv + c + 3) % 20;
        if (userRecords[commenterIdx].id === story.authorId) continue;
        const storyCommentTexts = ['Love this! 💜', 'So pretty! ✨', 'Amazing vibes', 'This made my day!', 'Where is this?', 'Goals! 🙌', 'Beautiful!', 'Need more of this 🔥'];
        await prisma.storyComment.create({
          data: {
            storyId: story.id,
            authorId: userRecords[commenterIdx].id,
            content: storyCommentTexts[(sv + c) % storyCommentTexts.length],
            createdAt: new Date(SEED_DATE - sv * 900000 + c * 120000),
          },
        });
      }
    }
    // 60% of stories get likes
    if (sv % 5 < 3) {
      const likeCount = 2 + (sv % 4);
      for (let l = 0; l < likeCount; l++) {
        const likerIdx = (sv + l + 5) % 20;
        if (userRecords[likerIdx].id === story.authorId) continue;
        try {
          await prisma.storyLike.create({
            data: {
              storyId: story.id,
              userId: userRecords[likerIdx].id,
              createdAt: new Date(SEED_DATE - sv * 900000 + l * 30000),
            },
          });
        } catch { /* skip duplicate */ }
      }
    }
  }
  console.log('  ✓ Created story views, comments, and likes');

  // ── Video Comments & Reactions ──
  const allVideos = await prisma.video.findMany({ orderBy: { createdAt: 'desc' } });
  const videoCommentTexts = [
    'This is so good! 🔥', 'Loved it!', 'More like this please', 'Incredible work!',
    'How do you do this?', 'Subscribed!', 'Best one yet', 'Pure talent 👏',
    'This is everything', 'Can\'t stop watching', 'So inspiring!', 'Absolutely beautiful',
  ];
  for (let vi = 0; vi < allVideos.length; vi++) {
    const video = allVideos[vi];
    // Each video gets 2-5 comments
    const numComments = 2 + (vi % 4);
    for (let c = 0; c < numComments; c++) {
      const commenterIdx = (vi + c + 2) % 20;
      if (userRecords[commenterIdx].id === video.authorId) continue;
      await prisma.videoComment.create({
        data: {
          videoId: video.id,
          authorId: userRecords[commenterIdx].id,
          content: videoCommentTexts[(vi + c) % videoCommentTexts.length],
          createdAt: new Date(SEED_DATE - vi * 1200000 + c * 180000),
        },
      });
    }
    // Each video gets 3-8 reactions
    const numReactions = 3 + (vi % 6);
    for (let r = 0; r < numReactions; r++) {
      const reactorIdx = (vi + r + 4) % 20;
      if (userRecords[reactorIdx].id === video.authorId) continue;
      try {
        await prisma.videoReaction.create({
          data: {
            videoId: video.id,
            userId: userRecords[reactorIdx].id,
            type: ['like', 'love', 'fire', 'wow', 'haha'][r % 5],
            createdAt: new Date(SEED_DATE - vi * 1200000 + r * 60000),
          },
        });
      } catch { /* skip duplicate */ }
    }
  }
  console.log('  ✓ Created video comments and reactions');

  // ── Creativity Comments, Reactions, Views ──
  const allCreativity = await prisma.creativityItem.findMany({ orderBy: { createdAt: 'desc' } });
  const creativityCommentTexts = [
    'This is breathtaking!', 'I need to learn how you do this', 'Amazing talent 🎨',
    'Inspiration goals!', 'Can we collab?', 'This belongs in a gallery',
    'So much passion here', 'You make it look effortless', 'Absolutely stunning work',
    'This gives me goosebumps', 'Take my heart ❤️', 'Next level creativity',
  ];
  for (let ci = 0; ci < allCreativity.length; ci++) {
    const item = allCreativity[ci];
    // Comments: 1-3 per item
    const numComments = 1 + (ci % 3);
    for (let c = 0; c < numComments; c++) {
      const commenterIdx = (ci + c + 7) % 20;
      if (userRecords[commenterIdx].id === item.authorId) continue;
      await prisma.creativityComment.create({
        data: {
          itemId: item.id,
          authorId: userRecords[commenterIdx].id,
          content: creativityCommentTexts[(ci + c) % creativityCommentTexts.length],
          createdAt: new Date(SEED_DATE - ci * 600000 + c * 120000),
        },
      });
    }
    // Reactions: 2-6 per item
    const numReactions = 2 + (ci % 5);
    for (let r = 0; r < numReactions; r++) {
      const reactorIdx = (ci + r + 3) % 20;
      if (userRecords[reactorIdx].id === item.authorId) continue;
      try {
        await prisma.creativityReaction.create({
          data: {
            itemId: item.id,
            userId: userRecords[reactorIdx].id,
            type: ['like', 'love', 'fire', 'wow'][r % 4],
            createdAt: new Date(SEED_DATE - ci * 600000 + r * 30000),
          },
        });
      } catch { /* skip duplicate */ }
    }
    // Views: 4-10 per item
    const numViews = 4 + (ci % 7);
    for (let v = 0; v < numViews; v++) {
      const viewerIdx = (ci + v + 1) % 20;
      if (userRecords[viewerIdx].id === item.authorId) continue;
      try {
        await prisma.creativityView.create({
          data: {
            itemId: item.id,
            viewerId: userRecords[viewerIdx].id,
            createdAt: new Date(SEED_DATE - ci * 600000 + v * 15000),
          },
        });
      } catch { /* skip duplicate */ }
    }
  }
  console.log('  ✓ Created creativity comments, reactions, and views');

  // ── Likes (profile likes from various users) ──
  const likePairs = [
    [0,1],[0,3],[0,6],[1,0],[1,2],[1,5],[2,0],[2,4],[2,8],
    [3,1],[3,7],[4,0],[4,2],[4,9],[5,1],[5,3],[5,10],
    [6,2],[6,4],[7,0],[7,5],[7,11],[8,3],[8,6],[8,12],
    [9,1],[9,4],[9,7],[10,0],[10,2],[10,5],[10,13],
    [11,3],[11,6],[12,1],[12,7],[12,14],[13,0],[13,8],
    [14,2],[14,5],[14,15],[15,1],[15,9],[15,16],
    [16,3],[16,7],[17,0],[17,4],[17,18],[18,2],[18,6],
    [19,1],[19,5],[19,8],
  ];
  for (const [from, to] of likePairs) {
    try {
      await prisma.like.create({
        data: {
          fromUserId: userRecords[from].id,
          toUserId: userRecords[to].id,
          targetType: 'profile',
          createdAt: new Date(SEED_DATE - (from + to) * 1800000),
        },
      });
    } catch { /* skip duplicate */ }
  }
  console.log(`  ✓ Created ${likePairs.length} profile likes`);

  // ── Match Requests (pending, accepted, declined) ──
  const matchRequestData = [
    { from: 12, to: 0, type: 'comment', message: 'Your design work is incredible! Would love to connect.', status: 'pending' },
    { from: 13, to: 1, type: 'like', message: 'Fellow creative soul! Let\'s chat.', status: 'pending' },
    { from: 14, to: 3, type: 'comment', message: 'We both love tech and music!', status: 'pending' },
    { from: 15, to: 2, type: 'super-like', message: 'Your architecture sketches are amazing.', status: 'accepted' },
    { from: 16, to: 4, type: 'comment', message: 'Meditation and tech — we have a lot in common.', status: 'accepted' },
    { from: 17, to: 6, type: 'like', message: 'A fellow foodie! I must try your recipes.', status: 'accepted' },
    { from: 18, to: 9, type: 'comment', message: 'Your nature photography is breathtaking.', status: 'pending' },
    { from: 19, to: 7, type: 'super-like', message: 'Your shayari gives me chills!', status: 'pending' },
    { from: 0, to: 12, type: 'comment', message: 'Your startup journey is inspiring.', status: 'declined' },
    { from: 1, to: 14, type: 'like', message: 'Music connects us all ♪', status: 'declined' },
    { from: 5, to: 16, type: 'comment', message: 'Love your meditation guides.', status: 'pending' },
    { from: 8, to: 15, type: 'like', message: 'Travel buddies?', status: 'pending' },
    { from: 10, to: 17, type: 'comment', message: 'Your pastry art is next level!', status: 'pending' },
    { from: 11, to: 18, type: 'super-like', message: 'Fellow nature lover here!', status: 'pending' },
    { from: 7, to: 19, type: 'comment', message: 'I love your performances!', status: 'accepted' },
  ];
  for (const mr of matchRequestData) {
    await prisma.matchRequest.create({
      data: {
        fromUserId: userRecords[mr.from].id,
        toUserId: userRecords[mr.to].id,
        type: mr.type,
        message: mr.message,
        status: mr.status,
        createdAt: new Date(SEED_DATE - randInt(1, 100) * 3600000),
      },
    });
  }
  console.log(`  ✓ Created ${matchRequestData.length} match requests`);

  // ── Miamo Moves (conversation starters) ──
  const miamoMoveData = [
    { from: 0, to: 5, message: 'Your fashion sense is on another level! What\'s your inspiration?', status: 'pending' },
    { from: 1, to: 7, message: 'I\'d love to set your shayari to music. Interested?', status: 'accepted' },
    { from: 2, to: 8, message: 'Your fitness journey is inspiring! Any tips for a beginner?', status: 'pending' },
    { from: 3, to: 9, message: 'Your Berlin photography captures the city\'s soul.', status: 'accepted' },
    { from: 4, to: 11, message: 'Your dance videos are mesmerizing!', status: 'pending' },
    { from: 5, to: 12, message: 'I\'d love to hear about your startup journey over coffee.', status: 'pending' },
    { from: 6, to: 13, message: 'Fellow book lover! What are you reading right now?', status: 'accepted' },
    { from: 7, to: 14, message: 'Your guitar covers are amazing! Do you play live?', status: 'pending' },
    { from: 8, to: 15, message: 'Fellow traveler! What\'s been your favorite destination?', status: 'accepted' },
    { from: 9, to: 16, message: 'I\'d love to photograph your meditation sessions.', status: 'pending' },
    { from: 10, to: 17, message: 'Can you teach me to make those incredible pastries?', status: 'pending' },
    { from: 11, to: 18, message: 'Your mountain photography is breathtaking!', status: 'accepted' },
    { from: 13, to: 19, message: 'Your acting range is incredible. Would love to chat!', status: 'pending' },
    { from: 14, to: 0, message: 'Your design portfolio blew my mind!', status: 'pending' },
    { from: 15, to: 1, message: 'Your jazz improv video gave me chills!', status: 'accepted' },
    { from: 16, to: 2, message: 'Your architecture sketches are gallery worthy.', status: 'pending' },
    { from: 17, to: 3, message: 'We should compare Tokyo vs Osaka food scenes!', status: 'pending' },
    { from: 18, to: 4, message: 'Fellow keyboard enthusiast! Which switch do you prefer?', status: 'accepted' },
    { from: 19, to: 6, message: 'I can do all the accents for your cooking show! 🎭', status: 'pending' },
    { from: 12, to: 10, message: 'Your comedy sets look hilarious. Do you tour?', status: 'pending' },
  ];
  for (const mm of miamoMoveData) {
    try {
      await prisma.miamoMove.create({
        data: {
          fromUserId: userRecords[mm.from].id,
          toUserId: userRecords[mm.to].id,
          message: mm.message,
          status: mm.status,
          createdAt: new Date(SEED_DATE - randInt(1, 200) * 3600000),
        },
      });
    } catch { /* skip duplicate */ }
  }
  console.log(`  ✓ Created ${miamoMoveData.length} Miamo Moves`);

  // ── Match Feedback ──
  for (let mfi = 0; mfi < matchRecords.length; mfi++) {
    const match = matchRecords[mfi];
    if (mfi % 3 === 0) {
      // Every 3rd match gets positive feedback from user1
      await prisma.matchFeedback.create({
        data: {
          matchId: match.id,
          userId: match.user1Id,
          targetUserId: match.user2Id,
          type: 'positive',
          reason: ['great_conversation', 'shared_interests', 'genuine_person', 'funny', 'kind'][mfi % 5],
          details: ['Really enjoyed our conversations!', 'We have so much in common.', 'Such a genuine and warm person.', 'Made me laugh every time.', 'One of the kindest people on the app.'][mfi % 5],
          createdAt: new Date(SEED_DATE - mfi * 7200000),
        },
      });
    }
    if (mfi % 4 === 0) {
      // Every 4th match gets feedback from user2 too
      await prisma.matchFeedback.create({
        data: {
          matchId: match.id,
          userId: match.user2Id,
          targetUserId: match.user1Id,
          type: mfi >= 12 ? 'negative' : 'positive',
          reason: mfi >= 12 ? 'inactive' : 'amazing_match',
          details: mfi >= 12 ? 'Haven\'t heard back in a while.' : 'Best match on the app so far!',
          createdAt: new Date(SEED_DATE - mfi * 5400000),
        },
      });
    }
  }
  console.log('  ✓ Created match feedback');

  // ── Discover Filters ──
  // Persona A and C are Discover-eligible. Persona B (DTM only) is skipped
  // so they don't appear in the Discover feed.
  let discoverFilterCount = 0;
  for (let dfi = 0; dfi < USERS.length; dfi++) {
    const u = USERS[dfi];
    if (surfaceFor(u.num) === 'dtm') continue;
    const oppositeGender = u.gender === 'female' ? 'male' : u.gender === 'male' ? 'female' : 'male,female';
    await prisma.discoverFilter.create({
      data: {
        userId: userRecords[dfi].id,
        minAge: Math.max(18, u.age - 5),
        maxAge: u.age + 7,
        distance: [25, 50, 100, 200][dfi % 4],
        city: u.city,
        genders: u.sexuality === 'bisexual' ? 'male,female' : u.sexuality === 'lesbian' ? 'female' : u.sexuality === 'gay' ? 'male' : oppositeGender,
        lookingFor: u.lookingFor,
        verified: u.verified,
        hasPhotos: true,
        activeToday: dfi % 3 === 0,
        newHere: dfi % 5 === 0,
      },
    });
    discoverFilterCount++;
  }
  console.log(`  ✓ Created ${discoverFilterCount} discover filters (Persona A + C)`);

  // ── Search Logs ──
  const searchQueries = [
    { user: 0, query: 'musician', type: 'user', results: 3 },
    { user: 0, query: 'photographer', type: 'user', results: 5 },
    { user: 1, query: 'designer', type: 'user', results: 4 },
    { user: 2, query: 'travel', type: 'user', results: 6 },
    { user: 3, query: 'yoga', type: 'user', results: 2 },
    { user: 4, query: 'fashion', type: 'user', results: 3 },
    { user: 5, query: 'engineer', type: 'user', results: 4 },
    { user: 6, query: 'poetry', type: 'user', results: 2 },
    { user: 7, query: 'fitness', type: 'user', results: 3 },
    { user: 8, query: 'art', type: 'user', results: 7 },
    { user: 9, query: 'comedy', type: 'user', results: 2 },
    { user: 10, query: 'cooking', type: 'user', results: 4 },
    { user: 11, query: 'tech', type: 'user', results: 5 },
    { user: 12, query: 'dance', type: 'user', results: 2 },
    { user: 13, query: 'music production', type: 'user', results: 3 },
    { user: 14, query: 'nature', type: 'user', results: 4 },
    { user: 15, query: 'writing', type: 'user', results: 5 },
    { user: 16, query: 'meditation', type: 'user', results: 2 },
    { user: 17, query: 'sports', type: 'user', results: 3 },
    { user: 18, query: 'hiking', type: 'user', results: 4 },
    { user: 19, query: 'acting', type: 'user', results: 2 },
    { user: 0, query: 'San Francisco', type: 'location', results: 1 },
    { user: 1, query: 'New York', type: 'location', results: 1 },
    { user: 2, query: 'Tokyo', type: 'location', results: 2 },
    { user: 3, query: 'London', type: 'location', results: 1 },
    { user: 4, query: 'Mumbai', type: 'location', results: 2 },
    { user: 5, query: 'Berlin', type: 'location', results: 1 },
    { user: 6, query: 'Paris', type: 'location', results: 1 },
    { user: 7, query: 'Seoul', type: 'location', results: 1 },
    { user: 8, query: 'Barcelona', type: 'location', results: 1 },
  ];
  for (const sl of searchQueries) {
    await prisma.searchLog.create({
      data: {
        userId: userRecords[sl.user].id,
        query: sl.query,
        type: sl.type,
        results: sl.results,
        createdAt: new Date(SEED_DATE - randInt(1, 500) * 3600000),
      },
    });
  }
  console.log(`  ✓ Created ${searchQueries.length} search log entries`);

  // ── Matrimonial Profiles (all 20 users) ──
  const matriData = [
    { num: 0, fullName: 'Aria Chen', dob: '1999-09-15', religion: 'Buddhist', caste: '', education: 'B.Des (NID)', occupation: 'Product Designer', company: 'Figma', income: '25-35 LPA', city: 'San Francisco', country: 'USA', mother: 'Lin Chen', father: 'Wei Chen', fOcc: 'Professor', mOcc: 'Doctor', brothers: 0, sisters: 1, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Creative soul with a passion for design and meaningful connections.', aboutFamily: 'Close-knit family that values education and creativity.' },
    { num: 1, fullName: 'Marcus Rivera', dob: '1997-11-05', religion: 'Christian', caste: '', education: 'B.S. Astrophysics', occupation: 'Jazz Musician & Producer', company: 'Independent', income: '15-25 LPA', city: 'New York', country: 'USA', mother: 'Carmen Rivera', father: 'Diego Rivera', fOcc: 'Teacher', mOcc: 'Nurse', brothers: 1, sisters: 0, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Music is my language. Looking for someone who appreciates art and depth.', aboutFamily: 'Warm Puerto Rican family that celebrates through music and food.' },
    { num: 2, fullName: 'Sofia Andersen', dob: '2002-03-10', religion: '', caste: '', education: 'M.Arch', occupation: 'Architect & Illustrator', company: 'BIG (Bjarke Ingels Group)', income: '20-30 LPA', city: 'Copenhagen', country: 'Denmark', mother: 'Ingrid Andersen', father: 'Lars Andersen', fOcc: 'Architect', mOcc: 'Interior Designer', brothers: 1, sisters: 1, familyType: 'Nuclear', diet: 'Vegetarian', maritalStatus: 'Never Married', about: 'Architecture is frozen music. I design spaces that inspire.', aboutFamily: 'A family of creatives who believe in sustainable living.' },
    { num: 3, fullName: 'Kai Yamamoto', dob: '1999-06-02', religion: 'Shinto', caste: '', education: 'B.Tech (CS)', occupation: 'Software Engineer', company: 'Stripe', income: '40-50 LPA', city: 'Tokyo', country: 'Japan', mother: 'Yumi Yamamoto', father: 'Hiroshi Yamamoto', fOcc: 'Bank Manager', mOcc: 'Homemaker', brothers: 0, sisters: 2, familyType: 'Joint', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Tech enthusiast who believes in building things that matter.', aboutFamily: 'Traditional Japanese family that balances modernity with heritage.' },
    { num: 4, fullName: 'Zara Okafor', dob: '1998-04-01', religion: 'Christian', caste: '', education: 'B.Des (Fashion)', occupation: 'Fashion Designer', company: 'Zara Atelier (Own Brand)', income: '20-30 LPA', city: 'Lagos', country: 'Nigeria', mother: 'Amara Okafor', father: 'Chinedu Okafor', fOcc: 'Business Owner', mOcc: 'School Principal', brothers: 2, sisters: 1, familyType: 'Joint', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Fashion tells stories. Mine is about African heritage meeting global style.', aboutFamily: 'Large, loving Nigerian family rooted in faith and entrepreneurship.' },
    { num: 5, fullName: 'Liam O\'Connor', dob: '1995-05-14', religion: 'Catholic', caste: '', education: 'Culinary Arts (Le Cordon Bleu)', occupation: 'Chef & Food Writer', company: 'The Kitchen Table (Own)', income: '15-20 LPA', city: 'Dublin', country: 'Ireland', mother: 'Siobhan O\'Connor', father: 'Patrick O\'Connor', fOcc: 'Pub Owner', mOcc: 'Florist', brothers: 2, sisters: 0, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Michelin-trained rebel who believes food is love made visible.', aboutFamily: 'Classic Irish family: loud, loving, and always cooking together.' },
    { num: 6, fullName: 'Priya Sharma', dob: '2001-07-20', religion: 'Hindu', caste: 'Brahmin', education: 'M.A. English Literature', occupation: 'Poet & Content Creator', company: 'Independent', income: '10-15 LPA', city: 'Mumbai', country: 'India', mother: 'Sunita Sharma', father: 'Rajesh Sharma', fOcc: 'Government Officer', mOcc: 'Teacher', brothers: 1, sisters: 0, familyType: 'Joint', diet: 'Vegetarian', maritalStatus: 'Never Married', about: 'Words are my love language. Shayari, poetry, and midnight chai.', aboutFamily: 'Traditional Indian family with modern values. Strong cultural roots.' },
    { num: 7, fullName: 'Jake Morrison', dob: '1996-08-10', religion: '', caste: '', education: 'B.Sc (Sports Science)', occupation: 'Fitness Coach', company: 'Morrison Fitness', income: '15-20 LPA', city: 'Sydney', country: 'Australia', mother: 'Sarah Morrison', father: 'Tom Morrison', fOcc: 'Carpenter', mOcc: 'Real Estate Agent', brothers: 0, sisters: 1, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Beach runs, healthy meals, good vibes. Helping people be their strongest.', aboutFamily: 'Relaxed Aussie family that loves the outdoors.' },
    { num: 8, fullName: 'Elena Petrova', dob: '1999-01-25', religion: '', caste: '', education: 'B.A. Fine Arts', occupation: 'Photographer & Visual Artist', company: 'Petrova Studio', income: '15-25 LPA', city: 'Berlin', country: 'Germany', mother: 'Natasha Petrova', father: 'Dmitri Petrov', fOcc: 'Engineer', mOcc: 'Classical Musician', brothers: 0, sisters: 0, familyType: 'Nuclear', diet: 'Vegetarian', maritalStatus: 'Never Married', about: 'Finding beauty in abandoned places and forgotten stories.', aboutFamily: 'Small Russian-German family with deep appreciation for arts.' },
    { num: 9, fullName: 'Dante Williams', dob: '2000-12-08', religion: 'Christian', caste: '', education: 'B.A. Communications', occupation: 'Stand-up Comedian', company: 'Laugh Factory (Resident)', income: '10-15 LPA', city: 'Atlanta', country: 'USA', mother: 'Grace Williams', father: 'Jerome Williams', fOcc: 'Pastor', mOcc: 'Social Worker', brothers: 1, sisters: 2, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Serious about comedy, casual about everything else.', aboutFamily: 'Southern family with big hearts and bigger laughs.' },
    { num: 10, fullName: 'Yuki Tanaka', dob: '2003-09-12', religion: '', caste: '', education: 'B.A. Performing Arts', occupation: 'Dance Student & Performer', company: 'Osaka Dance Company', income: '5-10 LPA', city: 'Osaka', country: 'Japan', mother: 'Keiko Tanaka', father: 'Takeshi Tanaka', fOcc: 'Salaryman', mOcc: 'Dance Teacher', brothers: 0, sisters: 1, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Contemporary dance is my prayer, movement is my language.', aboutFamily: 'Artistic family that encouraged creativity from childhood.' },
    { num: 11, fullName: 'Omar Hassan', dob: '1994-01-15', religion: 'Muslim', caste: '', education: 'MBA (INSEAD)', occupation: 'Startup Founder', company: 'FinFlow Technologies', income: '50+ LPA', city: 'Dubai', country: 'UAE', mother: 'Fatima Hassan', father: 'Ahmed Hassan', fOcc: 'Businessman', mOcc: 'Homemaker', brothers: 1, sisters: 1, familyType: 'Joint', diet: 'Halal', maritalStatus: 'Never Married', about: 'Building the future of fintech. Ambitious + kind = my formula.', aboutFamily: 'Respected business family with roots in Egypt and UAE.' },
    { num: 12, fullName: 'Maya Johnson', dob: '2004-06-15', religion: '', caste: '', education: 'B.A. English Literature (UCL)', occupation: 'Literature Student', company: 'UCL', income: '< 5 LPA', city: 'London', country: 'UK', mother: 'Helen Johnson', father: 'Richard Johnson', fOcc: 'Barrister', mOcc: 'Librarian', brothers: 0, sisters: 0, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Lost in fiction, found in conversation. Writing my thesis on love.', aboutFamily: 'London family of bookworms. Our home is 80% bookshelves.' },
    { num: 13, fullName: 'Arjun Patel', dob: '1998-11-03', religion: 'Hindu', caste: 'Patel', education: 'M.Tech (IIT Bangalore)', occupation: 'Full Stack Developer & Musician', company: 'Razorpay', income: '30-40 LPA', city: 'Bangalore', country: 'India', mother: 'Nalini Patel', father: 'Suresh Patel', fOcc: 'Doctor', mOcc: 'Professor', brothers: 0, sisters: 1, familyType: 'Nuclear', diet: 'Vegetarian', maritalStatus: 'Never Married', about: 'Code by day, guitar by night. Building apps and melodies.', aboutFamily: 'Progressive Gujarati family that values education and music.' },
    { num: 14, fullName: 'Luna Martinez', dob: '2001-12-06', religion: 'Catholic', caste: '', education: 'B.A. Journalism', occupation: 'Travel Blogger & Photographer', company: 'LunaExplores (Own)', income: '15-25 LPA', city: 'Barcelona', country: 'Spain', mother: 'Isabella Martinez', father: 'Carlos Martinez', fOcc: 'Wine Maker', mOcc: 'Chef', brothers: 1, sisters: 1, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Passport filled, heart open. 47 countries and counting.', aboutFamily: 'Catalonian family that lives for good food and travel.' },
    { num: 15, fullName: 'Noah Kim', dob: '1997-09-22', religion: 'Buddhist', caste: '', education: 'M.Sc. Cognitive Psychology', occupation: 'UX Researcher & Meditation Guide', company: 'Samsung Design', income: '30-40 LPA', city: 'Seoul', country: 'South Korea', mother: 'Jisoo Kim', father: 'Minho Kim', fOcc: 'Professor', mOcc: 'Buddhist Teacher', brothers: 1, sisters: 0, familyType: 'Nuclear', diet: 'Vegetarian', maritalStatus: 'Never Married', about: 'Understanding minds professionally and personally. Zen in tech.', aboutFamily: 'Family rooted in Buddhist practice and academic pursuit.' },
    { num: 16, fullName: 'Chloe Dubois', dob: '2002-10-08', religion: 'Catholic', caste: '', education: 'Culinary Arts (Ferrandi Paris)', occupation: 'Pastry Chef & Food Stylist', company: 'Pierre Hermé Paris', income: '15-20 LPA', city: 'Paris', country: 'France', mother: 'Camille Dubois', father: 'Jean Dubois', fOcc: 'Sommelier', mOcc: 'Art Gallery Owner', brothers: 0, sisters: 1, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Making art you can eat. Parisian by birth, creative by nature.', aboutFamily: 'A Parisian family living among wine, art, and croissants.' },
    { num: 17, fullName: 'Ryan Brooks', dob: '2000-04-03', religion: '', caste: '', education: 'B.A. Environmental Science', occupation: 'Nature Photographer & Guide', company: 'Wild Brooks Media', income: '10-15 LPA', city: 'Denver', country: 'USA', mother: 'Lisa Brooks', father: 'Michael Brooks', fOcc: 'Park Ranger', mOcc: 'Veterinarian', brothers: 1, sisters: 0, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Mountains are my church. Capturing wild places and wilder sunsets.', aboutFamily: 'Outdoor family — grew up camping, hiking, and chasing sunsets.' },
    { num: 18, fullName: 'Aaliya Khan', dob: '1999-03-12', religion: 'Muslim', caste: '', education: 'B.A. Theater Arts', occupation: 'Actress & Voice Artist', company: 'CBC / Independent', income: '20-30 LPA', city: 'Toronto', country: 'Canada', mother: 'Nadia Khan', father: 'Imran Khan', fOcc: 'Surgeon', mOcc: 'University Professor', brothers: 0, sisters: 2, familyType: 'Nuclear', diet: 'Halal', maritalStatus: 'Never Married', about: 'Playing characters on screen, being myself everywhere else.', aboutFamily: 'Supportive Pakistani-Canadian family that champions arts and education.' },
    { num: 19, fullName: 'Leo Santos', dob: '1996-08-01', religion: 'Catholic', caste: '', education: 'B.Sc. Physical Education', occupation: 'Sports Coach & Athlete', company: 'São Paulo FC Academy', income: '15-25 LPA', city: 'São Paulo', country: 'Brazil', mother: 'Ana Santos', father: 'Roberto Santos', fOcc: 'Football Coach', mOcc: 'School Teacher', brothers: 1, sisters: 1, familyType: 'Nuclear', diet: 'Non-Vegetarian', maritalStatus: 'Never Married', about: 'Former pro soccer player turned coach. Teaching the beautiful game.', aboutFamily: 'Brazilian family that lives and breathes football and samba.' },
  ];
  let matriHandCount = 0;
  for (const md of matriData) {
    // Only create matri profiles for users where num % 5 === 0
    // (the new universal pattern — "DTM enabled" only on multiples of 5).
    const u = USERS[md.num];
    if (u.num % 5 !== 0) continue;
    // Long-form aboutMe (≥120 chars) so the DTM aboutMe bucket scores full.
    const aboutMeLong = `${md.about} I value sincerity over performance and prefer slow conversations to flashy first dates. ${md.fullName.split(' ')[0]} from ${md.city}.`;
    await prisma.matrimonialProfile.create({
      data: {
        userId: userRecords[md.num].id,
        fullName: md.fullName,
        dateOfBirth: new Date(md.dob),
        religion: md.religion || 'Spiritual',
        caste: md.caste || 'Open',
        manglik: ['No', 'Yes', "Don't Know"][md.num % 3],
        education: md.education,
        educationDetail: md.education.split(' ').slice(0, 3).join(' ') || 'Bachelors',
        college: md.company || 'Top-tier University',
        occupation: md.occupation,
        company: md.company,
        annualIncome: md.income,
        workingCity: md.city,
        workingCountry: md.country,
        motherName: md.mother,
        fatherName: md.father,
        fatherOccupation: md.fOcc,
        motherOccupation: md.mOcc,
        brothers: md.brothers,
        sisters: md.sisters ?? 0,
        familyType: md.familyType,
        diet: md.diet,
        maritalStatus: md.maritalStatus,
        aboutMe: aboutMeLong,
        aboutFamily: md.aboutFamily,
        // Partner preferences — age range + 3+ deal-breakers → DTM partner bucket full.
        partnerAgeMin: Math.max(21, USERS[md.num].age - 4),
        partnerAgeMax: USERS[md.num].age + 6,
        partnerReligion: md.religion || 'Open',
        partnerEducation: 'Graduate or above',
        partnerOccupation: 'Working professional',
        partnerDiet: md.diet,
        bioDataGenerated: true,
        bioDataTemplate: ['royal-rajasthani', 'modern-minimal', 'elegant-floral', 'classic-gold'][md.num % 4],
        motherTongue: USERS[md.num].languages.split(',')[0],
        height: USERS[md.num].height ? `${Math.floor(USERS[md.num].height! / 30.48)}'${Math.round((USERS[md.num].height! % 30.48) / 2.54)}"` : '',
        smoking: USERS[md.num].smoking === 'never' ? 'No' : 'Occasionally',
        drinking: USERS[md.num].drinking === 'never' ? 'No' : USERS[md.num].drinking === 'socially' ? 'Socially' : 'Yes',
        idVerified: USERS[md.num].verified,
        photoVerified: USERS[md.num].verified,
      },
    });
    matriHandCount++;
  }
  console.log(`  ✓ Created ${matriHandCount} matrimonial profiles (users 1–20 where num % 5 === 0)`);

  // ── Matrimonial profiles for new DTM users (num 21–50) ──
  // Universal rule: matri profile exists only when num % 5 === 0.
  let extraMatriCount = 0;
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    if (u.num <= 20) continue; // existing matri loop already covered these
    if (u.num % 5 !== 0) continue;
    const dobYear = 2026 - u.age;
    const heightStr = u.height ? `${Math.floor(u.height / 30.48)}'${Math.round((u.height % 30.48) / 2.54)}"` : '';
    const firstName = u.displayName.replace(/ \(miamo\d+\)$/, '').split(' ')[0];
    const aboutMeLong = `${u.profession || 'Working professional'} from ${u.city}. I value honesty, ambition, and a quiet sense of humour. Looking for a partner who treats marriage as a long conversation, not a finish line.`;
    const aboutFamilyLong = `Warm, supportive family in ${u.city}. We talk often, eat together, and back each other through every season of life.`;
    await prisma.matrimonialProfile.create({
      data: {
        userId: userRecords[i].id,
        fullName: u.displayName.replace(/ \(miamo\d+\)$/, ''),
        dateOfBirth: new Date(`${dobYear}-06-15`),
        religion: u.religion || 'Spiritual',
        caste: 'Open',
        manglik: ['No', 'Yes', "Don't Know"][u.num % 3],
        education: u.education || 'bachelors',
        educationDetail: (u.education || 'Bachelors') + ' degree',
        college: 'Reputed Institute',
        occupation: u.profession || 'Working professional',
        company: u.profession.includes(' at ') ? u.profession.split(' at ')[1] : 'Independent',
        annualIncome: ['10-15 LPA', '15-25 LPA', '25-40 LPA', '40+ LPA'][u.num % 4],
        workingCity: u.city,
        workingCountry: '',
        motherName: `${firstName}'s Mother`,
        fatherName: `${firstName}'s Father`,
        fatherOccupation: ['Engineer', 'Doctor', 'Teacher', 'Businessman', 'Retired'][u.num % 5],
        motherOccupation: ['Homemaker', 'Teacher', 'Doctor', 'Artist', 'Retired'][u.num % 5],
        brothers: u.num % 3,
        sisters: (u.num + 1) % 3,
        familyType: u.num % 2 === 0 ? 'Nuclear' : 'Joint',
        diet: u.num % 4 === 0 ? 'Vegetarian' : 'Non-Vegetarian',
        maritalStatus: 'Never Married',
        aboutMe: aboutMeLong,
        aboutFamily: aboutFamilyLong,
        // Partner preferences — age range + 3+ deal-breakers
        partnerAgeMin: Math.max(21, u.age - 4),
        partnerAgeMax: u.age + 6,
        partnerReligion: u.religion || 'Open',
        partnerEducation: 'Graduate or above',
        partnerOccupation: 'Working professional',
        partnerDiet: u.num % 4 === 0 ? 'Vegetarian' : 'Non-Vegetarian',
        bioDataGenerated: true,
        bioDataTemplate: ['royal-rajasthani', 'modern-minimal', 'elegant-floral', 'classic-gold'][u.num % 4],
        motherTongue: (u.languages || 'English').split(',')[0],
        height: heightStr,
        smoking: u.smoking === 'never' ? 'No' : 'Occasionally',
        drinking: u.drinking === 'never' ? 'No' : u.drinking === 'socially' ? 'Socially' : 'Yes',
        idVerified: u.verified,
        photoVerified: u.verified,
      },
    });
    extraMatriCount++;
  }
  console.log(`  ✓ Created ${extraMatriCount} additional matrimonial profiles (users 21–50 where num % 5 === 0)`);

  // ── Bio Data Access Requests ──
  const matriProfiles = await prisma.matrimonialProfile.findMany();
  const matriProfileMap: Record<string, string> = {};
  for (const mp of matriProfiles) { matriProfileMap[mp.userId] = mp.id; }

  const bioAccessData = [
    { ownerIdx: 6, reqIdx: 13, type: 'biodata', status: 'approved' },   // Priya's biodata requested by Arjun
    { ownerIdx: 13, reqIdx: 6, type: 'biodata', status: 'approved' },    // Arjun's biodata requested by Priya
    { ownerIdx: 6, reqIdx: 11, type: 'phone', status: 'pending' },       // Priya's phone requested by Omar
    { ownerIdx: 18, reqIdx: 11, type: 'biodata', status: 'approved' },   // Aaliya's biodata requested by Omar
    { ownerIdx: 11, reqIdx: 18, type: 'biodata', status: 'pending' },    // Omar's biodata requested by Aaliya
    { ownerIdx: 19, reqIdx: 6, type: 'phone', status: 'pending' },       // Leo's phone requested by Priya
    { ownerIdx: 13, reqIdx: 11, type: 'contact', status: 'approved' },   // Arjun's contact requested by Omar
    { ownerIdx: 6, reqIdx: 19, type: 'biodata', status: 'declined' },    // Priya's biodata requested by Leo (declined)
    { ownerIdx: 18, reqIdx: 13, type: 'biodata', status: 'pending' },    // Aaliya's biodata requested by Arjun
    { ownerIdx: 11, reqIdx: 6, type: 'linkedin', status: 'approved' },   // Omar's linkedin requested by Priya
  ];
  for (const ba of bioAccessData) {
    const ownerId = matriProfileMap[userRecords[ba.ownerIdx].id];
    const requesterId = matriProfileMap[userRecords[ba.reqIdx].id];
    if (!ownerId || !requesterId) continue;
    try {
      await prisma.bioDataAccessRequest.create({
        data: {
          ownerId,
          requesterId,
          accessType: ba.type,
          status: ba.status,
          message: `Requesting access to ${ba.type} information.`,
          grantedAt: ba.status === 'approved' ? new Date(SEED_DATE) : null,
          createdAt: new Date(SEED_DATE - randInt(1, 300) * 3600000),
        },
      });
    } catch { /* skip duplicate */ }
  }
  console.log('  ✓ Created bio data access requests');

  // ── Audit Logs ──
  const auditActions = [
    'login', 'profile_update', 'settings_change', 'password_change', 'photo_upload',
    'match_action', 'message_sent', 'story_posted', 'video_uploaded', 'report_filed',
    'block_user', 'privacy_update', 'search', 'creativity_posted', 'beat_sent',
  ];
  for (let ai = 0; ai < 60; ai++) {
    const userIdx = ai % 20;
    const action = auditActions[ai % auditActions.length];
    await prisma.auditLog.create({
      data: {
        userId: userRecords[userIdx].id,
        action,
        details: JSON.stringify({ action, timestamp: new Date(SEED_DATE - ai * 3600000).toISOString(), ip: '127.0.0.1' }),
        createdAt: new Date(SEED_DATE - ai * 3600000),
      },
    });
  }
  console.log('  ✓ Created 60 audit log entries');

  // ── Sessions (login sessions for first 10 users) ──
  const devices = [
    { deviceType: 'mobile', browser: 'Safari', os: 'iOS 17.4' },
    { deviceType: 'desktop', browser: 'Chrome', os: 'Mac OS X 14.3' },
    { deviceType: 'mobile', browser: 'Chrome', os: 'Android 14' },
    { deviceType: 'tablet', browser: 'Safari', os: 'iPadOS 17.4' },
    { deviceType: 'desktop', browser: 'Firefox', os: 'Windows 11' },
  ];
  for (let si = 0; si < 20; si++) {
    const userIdx = si % 10;
    const device = devices[si % devices.length];
    await prisma.session.create({
      data: {
        userId: userRecords[userIdx].id,
        token: `seed-session-token-${si}-${Date.now()}`,
        ...device,
        ipAddress: `192.168.1.${100 + si}`,
        userAgent: `Mozilla/5.0 (${device.os}) ${device.browser}`,
        lastActiveAt: new Date(SEED_DATE - si * 3600000),
        revoked: si > 14,
        createdAt: new Date(SEED_DATE - si * 86400000),
      },
    });
  }
  console.log('  ✓ Created 20 sessions');

  // ── Bookmarks (users bookmarking profiles) ──
  const bookmarkPairs = [
    { from: 0, to: 5, note: 'Interesting profile!' },
    { from: 0, to: 8, note: '' },
    { from: 1, to: 3, note: 'Great photos' },
    { from: 2, to: 7, note: 'Similar interests' },
    { from: 3, to: 0, note: 'Want to match later' },
    { from: 4, to: 1, note: '' },
    { from: 5, to: 9, note: 'Funny prompts' },
    { from: 6, to: 2, note: '' },
    { from: 7, to: 4, note: 'Creative person' },
    { from: 8, to: 6, note: '' },
    { from: 9, to: 0, note: 'Beautiful photos' },
    { from: 10, to: 3, note: '' },
  ];
  for (const bp of bookmarkPairs) {
    await prisma.bookmark.create({
      data: {
        userId: userRecords[bp.from].id,
        targetId: userRecords[bp.to].id,
        targetType: 'profile',
        note: bp.note,
      },
    });
  }
  console.log('  ✓ Created 12 bookmarks');

  // ── Notifications (for all 20 users) ──
  const notifTypes = ['match', 'message', 'like', 'comment', 'beat', 'story', 'system'];
  for (let ni = 0; ni < 60; ni++) {
    const userIdx = ni % 20;
    const type = notifTypes[ni % notifTypes.length];
    await prisma.notification.create({
      data: {
        userId: userRecords[userIdx].id,
        type,
        title: type === 'match' ? 'New Match! 🎉' : type === 'message' ? 'New Message' : type === 'like' ? 'Someone liked your profile' : type === 'comment' ? 'New comment on your post' : type === 'beat' ? 'Beat reminder ⚡' : type === 'story' ? 'Someone viewed your story' : 'Welcome to Miamo!',
        body: type === 'match' ? 'You matched with someone special!' : type === 'message' ? 'You have a new message waiting' : type === 'like' ? 'Check who liked your profile' : type === 'comment' ? 'Someone commented on your post' : type === 'beat' ? 'Don\'t lose your streak!' : type === 'story' ? 'Your story is getting attention' : 'Explore and connect!',
        read: ni > 40,
        createdAt: new Date(SEED_DATE - ni * 1800000),
      },
    });
  }
  console.log('  ✓ Created 60 notifications');

  // ── Reports & Blocks ──
  const reportData = [
    { reporter: 0, reported: 19, reason: 'spam', details: 'Suspicious account activity', status: 'pending' },
    { reporter: 2, reported: 10, reason: 'harassment', details: 'Inappropriate messages', status: 'reviewed' },
    { reporter: 5, reported: 9, reason: 'fake-profile', details: 'Photos seem to be stolen', status: 'pending' },
  ];
  for (const rd of reportData) {
    await prisma.report.create({
      data: {
        reporterId: userRecords[rd.reporter].id,
        reportedId: userRecords[rd.reported].id,
        reason: rd.reason,
        details: rd.details,
        status: rd.status,
      },
    });
  }
  // Block relationships
  const blockPairs = [[0, 19], [2, 10]];
  for (const [blocker, blocked] of blockPairs) {
    await prisma.block.create({
      data: {
        blockerId: userRecords[blocker].id,
        blockedId: userRecords[blocked].id,
      },
    });
  }
  console.log('  ✓ Created reports and blocks');

  // Update trend scores for creativity items
  const creativityItems = await prisma.creativityItem.findMany({
    include: { reactions: true, comments: true, viewRecords: true, category: true },
  });
  for (const item of creativityItems) {
    const likes = item.reactions.length;
    const comments = item.comments.length;
    const views = item.views;
    const recencyBoost = Math.max(0, 50 - (SEED_DATE - item.createdAt.getTime()) / 3600000);
    const score = views * 1 + likes * 3 + comments * 5 + recencyBoost;
    await prisma.trend.create({
      data: {
        itemId: item.id,
        itemType: 'creativity',
        category: item.category.name,
        score,
        views,
        likes,
        comments,
        rank: 0,
        categoryRank: 0,
      },
    });
    await prisma.creativityItem.update({
      where: { id: item.id },
      data: { trendScore: score },
    });
  }

  // Calculate ranks
  const trends = await prisma.trend.findMany({ orderBy: { score: 'desc' } });
  for (let i = 0; i < trends.length; i++) {
    await prisma.trend.update({
      where: { id: trends[i].id },
      data: { rank: i + 1 },
    });
  }
  // Category ranks
  const catNames = [...new Set(trends.map(t => t.category))];
  for (const catName of catNames) {
    const catTrends = trends.filter(t => t.category === catName).sort((a, b) => b.score - a.score);
    for (let i = 0; i < catTrends.length; i++) {
      await prisma.trend.update({
        where: { id: catTrends[i].id },
        data: { categoryRank: i + 1 },
      });
    }
  }
  console.log('  ✓ Calculated trend scores and ranks');

  // ── Compute & persist real completion scores per user ──
  // Replaces the placeholder profileScore=100 with the actual bucket-based
  // score so the Discover (≥60) and DTM (≥75) gates behave the same as in
  // production.
  let casualPass = 0, dtmPass = 0, dtmOnly = 0, both = 0, discoverOnly = 0;
  for (const ur of userRecords) {
    const r = await recomputeAndPersistCompletion(prisma, ur.id);
    if (r.dtm) {
      if (r.score >= 75) dtmPass++;
    } else {
      if (r.score >= 60) casualPass++;
    }
    const num = parseInt(ur.username.replace('miamo', ''), 10);
    if (num % 10 === 0) both++;
    else if (num % 5 === 0) dtmOnly++;
    else discoverOnly++;
  }
  console.log(`  ✓ Recomputed completion: ${casualPass} pass Casual gate, ${dtmPass} pass DTM gate`);
  console.log(`     Personas — Discover only: ${discoverOnly}, DTM only: ${dtmOnly}, Both: ${both}`);

  // ─── v3.6 FEATURE DATA SEED ─────────────────────────────────────────────
  // Additive: every existing row above is untouched. The functions below add
  // v3.6 tracking signals, Spotlight economy, Move v2 inputs, DTM/Family
  // Brief data, consent toggles, creativity coverage, and DeferredItems.
  const v36Users: SeedUserRow[] = userRecords.map((ur) => ({
    id: ur.id,
    username: ur.username,
    _seed: ur._seed,
  }));
  const v36: V36Summary = {
    userActivityRows: 0,
    eventAggHourlyRows: 0,
    eventAggDailyRows: 0,
    featureSnapshotRows: 0,
    pairCompatCacheRows: 0,
    userWeightProfileRows: 0,
    spotlightLedgerRows: 0,
    spotlightAwardRows: 0,
    exposureLedgerRows: 0,
    exposureCreditRows: 0,
    weeklyTopMatchRows: 0,
    premiumUsers: 0,
    outboundMessageRows: 0,
    firstMoveOutcomeRows: 0,
    userMoveProfileRows: 0,
    dtmMessageRows: 0,
    familyBriefShareRows: 0,
    consentEventRows: 0,
    deferredItemRows: 0,
    creativityExtraRows: 0,
    spotlightBalanceMin: 0,
    spotlightBalanceMax: 0,
  };

  await seedTrackingSignals(prisma, v36Users, v36);
  console.log(`  ✓ v3.6 tracking — UserActivity:${v36.userActivityRows}, EventAggHourly:${v36.eventAggHourlyRows}, EventAggDaily:${v36.eventAggDailyRows}`);
  console.log(`  ✓ v3.6 tracking — FeatureSnapshot:${v36.featureSnapshotRows}, PairCompatCache:${v36.pairCompatCacheRows}, UserWeightProfile:${v36.userWeightProfileRows}`);

  await seedSpotlightEconomy(prisma, v36Users, v36);
  console.log(`  ✓ v3.6 Spotlight — Ledger:${v36.spotlightLedgerRows}, Awards:${v36.spotlightAwardRows}, ExposureLedger:${v36.exposureLedgerRows}, ExposureCredit:${v36.exposureCreditRows}, WeeklyTopMatch:${v36.weeklyTopMatchRows}, Premium:${v36.premiumUsers}`);

  await seedMoveV2(prisma, v36Users, v36);
  console.log(`  ✓ v3.6 Move v2 — outbound msgs:${v36.outboundMessageRows}, FirstMoveOutcome:${v36.firstMoveOutcomeRows}, UserMoveProfile:${v36.userMoveProfileRows}`);

  await seedDtmFamilyBrief(prisma, v36Users, v36);
  console.log(`  ✓ v3.6 DTM/FamilyBrief — DtmMessages:${v36.dtmMessageRows}, FamilyBriefShare:${v36.familyBriefShareRows}`);

  await seedConsentAndSettings(prisma, v36Users, v36);
  console.log(`  ✓ v3.6 Consent — ConsentEvent rows:${v36.consentEventRows}`);

  await seedCreativityCoverage(prisma, v36Users, categories as Record<string, { id: string; name: string }>, v36);
  console.log(`  ✓ v3.6 Creativity top-up — extra items:${v36.creativityExtraRows}`);

  await seedDeferredItems(prisma, v36Users, v36);
  console.log(`  ✓ v3.6 Deferred (see-later) — DeferredItem rows:${v36.deferredItemRows}`);

  console.log('');
  console.log('─── v3.6 seed summary ───');
  console.log(`  UserActivity rows:      ${v36.userActivityRows}`);
  console.log(`  EventAggHourly rows:    ${v36.eventAggHourlyRows}`);
  console.log(`  EventAggDaily rows:     ${v36.eventAggDailyRows}`);
  console.log(`  FeatureSnapshot rows:   ${v36.featureSnapshotRows}`);
  console.log(`  PairCompatCache rows:   ${v36.pairCompatCacheRows}`);
  console.log(`  UserWeightProfile rows: ${v36.userWeightProfileRows}`);
  console.log(`  SpotlightLedger rows:   ${v36.spotlightLedgerRows}  (balances ${v36.spotlightBalanceMin}..${v36.spotlightBalanceMax} min)`);
  console.log(`  SpotlightAward rows:    ${v36.spotlightAwardRows}`);
  console.log(`  ExposureLedger rows:    ${v36.exposureLedgerRows}`);
  console.log(`  ExposureCredit rows:    ${v36.exposureCreditRows}`);
  console.log(`  WeeklyTopMatch rows:    ${v36.weeklyTopMatchRows} (5 creators × 10)`);
  console.log(`  Premium users:          ${v36.premiumUsers} (miamo5, miamo15, miamo25, miamo35, miamo45)`);
  console.log(`  outbound messages:      ${v36.outboundMessageRows}`);
  console.log(`  FirstMoveOutcome rows:  ${v36.firstMoveOutcomeRows}`);
  console.log(`  UserMoveProfile rows:   ${v36.userMoveProfileRows}`);
  console.log(`  DtmMessage rows:        ${v36.dtmMessageRows}`);
  console.log(`  FamilyBriefShare rows:  ${v36.familyBriefShareRows}`);
  console.log(`  ConsentEvent rows:      ${v36.consentEventRows}`);
  console.log(`  Creativity top-ups:     ${v36.creativityExtraRows}`);
  console.log(`  DeferredItem rows:      ${v36.deferredItemRows}`);
  console.log('');
  console.log('✅ Seeding complete!');
  console.log(`   ${USERS.length} users: miamo1@miamo.test … miamo${USERS.length}@miamo.test`);
  console.log('   Password = username (miamo1/miamo1, miamo50/miamo50, …)');
  console.log('   Pattern (memorise this):');
  console.log('     • num % 10 === 0  (10,20,30,40,50) → BOTH: Discover ≥60, DTM ≥75');
  console.log('     • num %  5 === 0  (5,15,25,35,45)  → DTM ONLY: matri profile, no Discover');
  console.log('     • everything else (40 users)        → DISCOVER ONLY');
  console.log('   15 matches, 50 posts, 40 stories, 40 videos, 120 creativity items');
  console.log('   Story views/comments/likes, video comments/reactions');
  console.log('   Creativity comments/reactions/views, 54 profile likes');
  console.log('   15 match requests, 20 Miamo Moves, match feedback');
  console.log('   Discover filters (Discover + Both), matrimonial profiles (DTM + Both)');
  console.log('   30 search logs, 60 audit logs, 60 notifications, 3 reports, 2 blocks');
  console.log('   Dummy items: "dummy_Sports", "dummy_Music", etc. (3 per category)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Seed error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
