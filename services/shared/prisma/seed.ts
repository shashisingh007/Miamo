// ─── Miamo Seed Data ─────────────────────────────────
// 20 diverse users with full profiles, posts, stories, videos, creativity, messages, beats
// FULLY DETERMINISTIC: same data every run for consistent testing
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
// Buckets:
//   21–30 (10): Discover-only, completion 100%
//   31–35 ( 5): Discover-only, completion partial
//   36–40 ( 5): DTM-only,      completion 100%
//   41–45 ( 5): DTM-only,      completion partial
//   46–50 ( 5): Both surfaces, completion 100%
//
// Names / cities / professions are deterministic (driven by index, not rng()).
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
  if (num <= 35) return 'discover';
  if (num <= 45) return 'dtm';
  return 'both';
}
function completionFor(num: number): { score: number; missing: string[] } {
  // 21–30 + 36–40 + 46–50: full (100, [])
  // 31–35: partial Discover
  // 41–45: partial DTM
  if (num >= 31 && num <= 35) {
    const missingPool = ['photos', 'bio', 'prompts', 'interests', 'lifestyle'];
    const missing = missingPool.slice(0, ((num - 31) % missingPool.length) + 1);
    const score = 90 - (num - 31) * 10; // 90, 80, 70, 60, 50
    return { score, missing };
  }
  if (num >= 41 && num <= 45) {
    const missingPool = ['familyBackground', 'employer', 'incomeBand', 'expectedTimeline', 'kundliUrl'];
    const missing = missingPool.slice(0, ((num - 41) % missingPool.length) + 2);
    const score = 85 - (num - 41) * 5; // 85, 80, 75, 70, 65
    return { score, missing };
  }
  return { score: 100, missing: [] };
}

for (let i = 0; i < 30; i++) {
  const num = 21 + i;
  const name = EXTRA_NAMES[i];
  const city = EXTRA_CITIES[i];
  const profession = EXTRA_PROFESSIONS[i];
  const interests = EXTRA_INTERESTS[i % EXTRA_INTERESTS.length];
  const surface = surfaceFor(num);
  const seriousMode = surface !== 'discover'; // dtm or both
  const { score, missing } = completionFor(num);
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
    bio: missing.includes('bio')
      ? ''
      : `${profession} based in ${city}. ${interests.slice(0, 2).join(' and ')} keep me grounded.`,
    intent: seriousMode ? (surface === 'dtm' ? 'Marriage open' : 'Long-term relationship') : 'Casual dating',
    seriousMode,
    profileScore: score,
    verified: i % 3 === 0,
    online: i % 4 === 0,
    interests: missing.includes('interests') ? interests.slice(0, 1) : interests,
    prompts: missing.includes('prompts')
      ? []
      : [
          { q: 'A perfect Sunday looks like…', a: `${interests[0]} in the morning, friends in the evening.` },
          { q: 'I geek out about…',         a: `${interests[1] ?? interests[0]}.` },
        ],
    creativity: [interests[0]],
    category: surface === 'dtm' ? 'serious / matrimonial' : surface === 'both' ? 'serious + creative' : 'discover regular',
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
    completionScore: score,
    completionMissing: missing,
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

async function main() {
  console.log('🌱 Seeding Miamo database...');

  // Clean existing data
  await prisma.$transaction([
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
    const surface: Surface = u.surface ?? (u.seriousMode ? 'both' : 'discover');
    const completionScore = u.completionScore ?? (u.profileScore >= 85 ? 100 : u.profileScore);
    const completionMissing = u.completionMissing ?? [];
    // DTM extended fields are only meaningful for surface='dtm' or 'both'.
    const wantsDtm = surface === 'dtm' || surface === 'both';
    const dtmFields = wantsDtm ? {
      familyBackground: completionMissing.includes('familyBackground') ? null : `${u.city}-rooted family. Values education and warmth.`,
      educationLevel: u.education || 'bachelors',
      educationInstitution: completionMissing.includes('employer') ? null : 'Top-tier university',
      employer: completionMissing.includes('employer') ? null : u.profession.split(' at ')[1] || 'Independent',
      incomeBand: completionMissing.includes('incomeBand') ? null : ['10-15 LPA', '15-25 LPA', '25-40 LPA', '40+ LPA'][u.num % 4],
      maritalStatus: 'Never Married',
      willingToRelocate: u.num % 2 === 0,
      familyInvolved: u.num % 3 !== 0,
      expectedTimeline: completionMissing.includes('expectedTimeline') ? null : ['6-12 months', '1-2 years', '2+ years'][u.num % 3],
      kundliUrl: completionMissing.includes('kundliUrl') ? null : null,
    } : {};
    const user = await prisma.user.create({
      data: {
        email: `miamo${u.num}@miamo.test`,
        passwordHash,
        displayName: u.displayName,
        username: u.username,
        miamoId: `miamo${u.num}`,
        verified: u.verified,
        active: true,
        profile: {
          create: {
            age: u.age,
            gender: u.gender,
            city: u.city,
            profession: u.profession,
            bio: u.bio,
            datingIntent: u.intent,
            seriousMode: u.seriousMode,
            profileScore: u.profileScore,
            online: u.online,
            lastActive: new Date(SEED_DATE),
            avatarGradient: u.avatarGradient,
            height: u.height,
            sexuality: u.sexuality,
            lookingFor: u.lookingFor,
            smoking: u.smoking,
            drinking: u.drinking,
            exercise: u.exercise,
            education: u.education,
            religion: u.religion,
            zodiac: u.zodiac,
            languages: u.languages,
            pets: u.pets,
            children: u.children,
            completionScore,
            completionMissing,
            ...dtmFields,
          },
        },
        settings: {
          create: {
            theme: 'dark',
            seriousModeEnabled: u.seriousMode,
          },
        },
        privacySettings: {
          create: {
            profileVisible: true,
            searchable: true,
            miamoIdSearchable: true,
            nameSearchable: true,
            citySearchable: true,
            disableSearch: u.num === 20, // user 20 has search disabled for testing
          },
        },
      },
    });

    // Photos (gradient avatars)
    // Partial profiles miss some photos.
    const photoCount = completionMissing.includes('photos') ? 1 : 3;
    for (let p = 0; p < photoCount; p++) {
      await prisma.profilePhoto.create({
        data: {
          userId: user.id,
          url: `https://api.dicebear.com/7.x/lorelei/svg?seed=miamo${u.num}-${p}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
          position: p,
        },
      });
    }

    // Prompts
    for (let pi = 0; pi < u.prompts.length; pi++) {
      await prisma.profilePrompt.create({
        data: { userId: user.id, question: u.prompts[pi].q, answer: u.prompts[pi].a, position: pi },
      });
    }

    // Interests
    for (const interest of u.interests) {
      await prisma.profileInterest.create({
        data: { userId: user.id, name: interest },
      });
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
  // Created for users on the Discover or Both surface. DTM-only users skip this
  // (they live in the matrimonial surface and don't appear in swipe queues).
  let discoverFilterCount = 0;
  for (let dfi = 0; dfi < USERS.length; dfi++) {
    const u = USERS[dfi];
    const surface: Surface = u.surface ?? (u.seriousMode ? 'both' : 'discover');
    if (surface === 'dtm') continue;
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
  console.log(`  ✓ Created ${discoverFilterCount} discover filters (skipped DTM-only users)`);

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
  for (const md of matriData) {
    await prisma.matrimonialProfile.create({
      data: {
        userId: userRecords[md.num].id,
        fullName: md.fullName,
        dateOfBirth: new Date(md.dob),
        religion: md.religion,
        caste: md.caste,
        education: md.education,
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
        aboutMe: md.about,
        aboutFamily: md.aboutFamily,
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
  }
  console.log('  ✓ Created 20 matrimonial profiles');

  // ── Matrimonial profiles for new DTM/Both users (num 36–50) ──
  // Programmatically generated. Partial users (num 41–45) leave optional
  // matri fields blank to mirror an in-progress DTM onboarding.
  let extraMatriCount = 0;
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    if (u.num <= 20) continue; // existing matri loop already covered these
    const surface: Surface = u.surface ?? (u.seriousMode ? 'both' : 'discover');
    if (surface === 'discover') continue;
    const partial = (u.completionMissing ?? []).length > 0;
    const dobYear = 2026 - u.age;
    const heightStr = u.height ? `${Math.floor(u.height / 30.48)}'${Math.round((u.height % 30.48) / 2.54)}"` : '';
    await prisma.matrimonialProfile.create({
      data: {
        userId: userRecords[i].id,
        fullName: u.displayName.replace(/ \(miamo\d+\)$/, ''),
        dateOfBirth: new Date(`${dobYear}-06-15`),
        religion: u.religion,
        caste: '',
        education: u.education || 'bachelors',
        occupation: u.profession,
        company: partial ? '' : u.profession.includes(' at ') ? u.profession.split(' at ')[1] : 'Independent',
        annualIncome: partial ? '' : ['10-15 LPA', '15-25 LPA', '25-40 LPA', '40+ LPA'][u.num % 4],
        workingCity: u.city,
        workingCountry: '',
        motherName: '',
        fatherName: '',
        fatherOccupation: '',
        motherOccupation: '',
        brothers: u.num % 3,
        sisters: (u.num + 1) % 3,
        familyType: u.num % 2 === 0 ? 'Nuclear' : 'Joint',
        diet: u.num % 4 === 0 ? 'Vegetarian' : 'Non-Vegetarian',
        maritalStatus: 'Never Married',
        aboutMe: u.bio || `${u.profession} from ${u.city}.`,
        aboutFamily: partial ? '' : `Warm, supportive family in ${u.city}.`,
        bioDataGenerated: !partial,
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
  console.log(`  ✓ Created ${extraMatriCount} additional matrimonial profiles for DTM/Both users`);

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

  console.log('');
  console.log('✅ Seeding complete!');
  console.log(`   ${USERS.length} users: miamo1@miamo.test … miamo${USERS.length}@miamo.test`);
  console.log('   Password = username (e.g. miamo1/miamo1, miamo50/miamo50)');
  console.log('   Buckets:');
  console.log('     1–20  : original mix (Discover + Both)');
  console.log('     21–30 : Discover-only, profile 100%');
  console.log('     31–35 : Discover-only, profile partial');
  console.log('     36–40 : DTM-only,      profile 100%');
  console.log('     41–45 : DTM-only,      profile partial');
  console.log('     46–50 : Both surfaces, profile 100%');
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
