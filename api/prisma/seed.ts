// ─── Miamo Seed Data ─────────────────────────────────
// 20 diverse users with full profiles, posts, stories, videos, creativity, messages, beats
// FULLY DETERMINISTIC: same data every run for consistent testing
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fixed base date: 2026-05-15T12:00:00Z — all timestamps derive from this
const SEED_DATE = new Date('2026-05-15T12:00:00.000Z').getTime();

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
    prisma.storyView.deleteMany(),
    prisma.story.deleteMany(),
    prisma.feedReaction.deleteMany(),
    prisma.feedComment.deleteMany(),
    prisma.feedPost.deleteMany(),
    prisma.beatEvent.deleteMany(),
    prisma.beat.deleteMany(),
    prisma.message.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.match.deleteMany(),
    prisma.miamoMove.deleteMany(),
    prisma.matchRequest.deleteMany(),
    prisma.like.deleteMany(),
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
    for (let p = 0; p < 3; p++) {
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
  console.log('  ✓ Created 20 users with profiles');

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

  // Create notifications
  const notifTypes = ['match', 'message', 'like', 'comment', 'beat', 'story', 'system'];
  for (let ni = 0; ni < 30; ni++) {
    const userIdx = ni % 20;
    const type = notifTypes[ni % notifTypes.length];
    await prisma.notification.create({
      data: {
        userId: userRecords[userIdx].id,
        type,
        title: type === 'match' ? 'New Match! 🎉' : type === 'message' ? 'New Message' : type === 'like' ? 'Someone liked your profile' : type === 'beat' ? 'Beat reminder ⚡' : 'Notification',
        body: type === 'match' ? 'You matched with someone!' : type === 'message' ? 'You have a new message' : type === 'like' ? 'Check who liked your profile' : type === 'beat' ? 'Don\'t lose your streak!' : 'Check your activity',
        read: ni > 15,
        createdAt: new Date(SEED_DATE - ni * 1800000),
      },
    });
  }
  console.log('  ✓ Created notifications');

  // Create reports/blocks sample
  await prisma.report.create({
    data: {
      reporterId: userRecords[0].id,
      reportedId: userRecords[19].id,
      reason: 'spam',
      details: 'Test report for seed data',
      status: 'pending',
    },
  });
  await prisma.block.create({
    data: {
      blockerId: userRecords[0].id,
      blockedId: userRecords[19].id,
    },
  });
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
  console.log('   20 users: miamo1@miamo.test to miamo20@miamo.test');
  console.log('   Password = username (e.g. miamo1/miamo1, miamo2/miamo2, etc.)');
  console.log('   15 matches, 50 posts, 40 stories, 40 videos, 60+60 creativity items');
  console.log('   Dummy items: "dummy_Sports", "dummy_Music", etc. (3 per category)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Seed error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
