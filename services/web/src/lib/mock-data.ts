// ─── Miamo Mock Data ─────────────────────────────────────
// Realistic profiles, conversations, feeds for frontend demo

export interface MockUser {
  id: string;
  displayName: string;
  username: string;
  miamoId: string;
  age: number;
  city: string;
  profession: string;
  bio: string;
  photos: string[];
  interests: string[];
  prompts: { question: string; answer: string }[];
  aiMatchScore: number;
  profileScore: number;
  verified: boolean;
  seriousMode: boolean;
  online: boolean;
  lastActive: string;
  intent: string;
  commonInterests: string[];
  beatStatus?: { state: string; count: number };
  creativity?: string[];
}

export interface MockMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  type: "text" | "image" | "voice" | "snap";
}

export interface MockConversation {
  id: string;
  user: MockUser;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  pinned: boolean;
  archived: boolean;
  muted: boolean;
}

export interface MockFeedPost {
  id: string;
  author: MockUser;
  type: "thought" | "image" | "video" | "date-idea" | "poll" | "mood" | "milestone";
  content: string;
  media?: string;
  likes: number;
  comments: number;
  timestamp: string;
  liked: boolean;
  saved: boolean;
}

export interface MockStory {
  id: string;
  user: MockUser;
  items: { type: "photo" | "video" | "text"; url?: string; text?: string; timestamp: string }[];
  viewed: boolean;
}

// Reliable gradient placeholder images (never break)
function gradientAvatar(seed: number): string {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "u1",
    displayName: "Aria Chen",
    username: "ariachen",
    miamoId: "aria.chen",
    age: 26,
    city: "San Francisco",
    profession: "Product Designer at Figma",
    bio: "Designing the future, one pixel at a time. Weekend hiker, matcha enthusiast, and aspiring pottery maker.",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Design", "Hiking", "Coffee", "Pottery", "Photography"],
    prompts: [
      { question: "A perfect first date for me looks like\u2026", answer: "Exploring a new neighborhood, finding a hidden caf\u00e9, and talking until they close." },
      { question: "I geek out about\u2026", answer: "Typography. Seriously, ask me about kerning and I won\u0027t stop." },
      { question: "The way to win me over is\u2026", answer: "Show me something you\u0027ve made with your hands \u2014 painting, code, a really good pasta." },
    ],
    aiMatchScore: 92,
    profileScore: 88,
    verified: true,
    seriousMode: false,
    online: true,
    lastActive: new Date().toISOString(),
    intent: "Long-term relationship",
    commonInterests: ["Coffee", "Photography", "Design"],
    creativity: ["Photography", "Pottery"],
  },
  {
    id: "u2",
    displayName: "Marcus Rivera",
    username: "marcusriv",
    miamoId: "marcus.r",
    age: 29,
    city: "New York",
    profession: "Jazz Musician & Music Producer",
    bio: "Brooklyn nights and vinyl mornings. I write songs about strangers on the subway and cook pasta at 2am.",
    photos: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Music", "Cooking", "Writing", "Concerts", "Travel"],
    prompts: [
      { question: "I feel most alive when\u2026", answer: "I\u0027m on stage, the crowd disappears, and it\u0027s just me and the keys." },
      { question: "My most controversial opinion is\u2026", answer: "Pineapple on pizza is not just acceptable \u2014 it\u0027s necessary." },
      { question: "Something that surprises people about me\u2026", answer: "I have a degree in astrophysics. Music was plan B that became plan A." },
    ],
    aiMatchScore: 87,
    profileScore: 94,
    verified: true,
    seriousMode: true,
    online: false,
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    intent: "Life partner",
    commonInterests: ["Music", "Cooking"],
    creativity: ["Music Production", "Songwriting", "Cooking"],
    beatStatus: { state: "strong", count: 14 },
  },
  {
    id: "u3",
    displayName: "Sofia Andersen",
    username: "sofiaand",
    miamoId: "sofia.a",
    age: 24,
    city: "Copenhagen",
    profession: "Architect & Illustrator",
    bio: "I draw buildings during the day and dreams at night. Scandinavian minimalism meets chaotic creativity.",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Art", "Travel", "Nature", "Reading", "Yoga"],
    prompts: [
      { question: "My ideal weekend involves\u2026", answer: "A morning run by the harbor, brunch with friends, and an afternoon in my studio." },
      { question: "I\u0027m looking for someone who\u2026", answer: "Can sit with me in comfortable silence and also debate architecture for hours." },
      { question: "The key to my heart is\u2026", answer: "Thoughtfulness. It\u0027s not about the gesture, it\u0027s about the attention behind it." },
    ],
    aiMatchScore: 95,
    profileScore: 91,
    verified: true,
    seriousMode: true,
    online: true,
    lastActive: new Date().toISOString(),
    intent: "Serious only",
    commonInterests: ["Art", "Travel", "Reading"],
    creativity: ["Architecture", "Illustration", "Painting"],
  },
  {
    id: "u4",
    displayName: "Kai Yamamoto",
    username: "kaiyama",
    miamoId: "kai.y",
    age: 27,
    city: "Tokyo",
    profession: "Software Engineer at Stripe",
    bio: "Building things that matter. Weekend photographer, ramen critic, and terrible at karaoke but always the first one there.",
    photos: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Tech", "Photography", "Gaming", "Running", "Coffee"],
    prompts: [
      { question: "A perfect first date for me looks like\u2026", answer: "A walk through Shimokitazawa, finding vinyl records, ending at a tiny ramen spot." },
      { question: "I geek out about\u2026", answer: "Mechanical keyboards. Yes, I have six. No, I don\u0027t need a seventh. Maybe." },
      { question: "I\u0027m convinced that\u2026", answer: "The best conversations happen after midnight over bad instant coffee." },
    ],
    aiMatchScore: 84,
    profileScore: 82,
    verified: false,
    seriousMode: false,
    online: true,
    lastActive: new Date().toISOString(),
    intent: "Short-term, open to long",
    commonInterests: ["Photography", "Coffee", "Tech"],
    creativity: ["Photography", "Tech Projects"],
  },
  {
    id: "u5",
    displayName: "Zara Okafor",
    username: "zaraok",
    miamoId: "zara.o",
    age: 28,
    city: "London",
    profession: "Documentary Filmmaker",
    bio: "Telling stories that need to be told. Obsessed with street food, old cinemas, and people who care deeply.",
    photos: [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Film", "Travel", "Cooking", "Writing", "Volunteering"],
    prompts: [
      { question: "The most spontaneous thing I\u0027ve done\u2026", answer: "Flew to Marrakech on a Tuesday because I found a $40 flight, stayed for two weeks, came back with a documentary." },
      { question: "My love language is\u2026", answer: "Quality time. I don\u0027t need fancy \u2014 I need present. Put the phone down and let\u0027s talk." },
      { question: "I feel most alive when\u2026", answer: "I\u0027m editing at 3am with good headphones and the story finally clicks." },
    ],
    aiMatchScore: 89,
    profileScore: 96,
    verified: true,
    seriousMode: false,
    online: false,
    lastActive: new Date(Date.now() - 7200000).toISOString(),
    intent: "Long-term relationship",
    commonInterests: ["Travel", "Cooking", "Film"],
    creativity: ["Filmmaking", "Writing", "Photography"],
  },
  {
    id: "u6",
    displayName: "Liam Patel",
    username: "liampatel",
    miamoId: "liam.p",
    age: 31,
    city: "Austin",
    profession: "Startup Founder & Yoga Instructor",
    bio: "Built two companies and found peace on the mat. Looking for someone who can match my energy and challenge my perspective.",
    photos: [
      "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1522556189639-b150ed9c4330?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Yoga", "Startups", "Meditation", "Hiking", "Music"],
    prompts: [
      { question: "I\u0027m looking for someone who\u2026", answer: "Is building something meaningful and knows how to rest too." },
      { question: "My ideal weekend involves\u2026", answer: "Sunrise yoga, farmers market haul, cooking something new, live music at night." },
      { question: "The way to win me over is\u2026", answer: "Intellectual curiosity. Tell me about the last thing that blew your mind." },
    ],
    aiMatchScore: 78,
    profileScore: 85,
    verified: true,
    seriousMode: true,
    online: false,
    lastActive: new Date(Date.now() - 1800000).toISOString(),
    intent: "Life partner",
    commonInterests: ["Yoga", "Music", "Hiking"],
    creativity: ["Yoga", "Public Speaking"],
    beatStatus: { state: "soft", count: 7 },
  },
  {
    id: "u7",
    displayName: "Elena Volkov",
    username: "elenavolkov",
    miamoId: "elena.v",
    age: 25,
    city: "Berlin",
    profession: "Contemporary Dancer & Choreographer",
    bio: "My body tells the stories my words can\u0027t. Espresso addict. Fluent in three languages and sarcasm.",
    photos: [
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Dancing", "Fashion", "Coffee", "Theater", "Travel"],
    prompts: [
      { question: "Something that surprises people about me\u2026", answer: "I have a black belt in judo. The grace on stage comes with strength." },
      { question: "A perfect first date for me looks like\u2026", answer: "A contemporary art exhibition, then street food and arguing about what we just saw." },
      { question: "I\u0027m convinced that\u2026", answer: "Everyone should learn to dance. Not for others \u2014 for themselves." },
    ],
    aiMatchScore: 91,
    profileScore: 89,
    verified: true,
    seriousMode: false,
    online: true,
    lastActive: new Date().toISOString(),
    intent: "Long-term relationship",
    commonInterests: ["Coffee", "Travel", "Fashion"],
    creativity: ["Dance", "Choreography"],
  },
  {
    id: "u8",
    displayName: "Noah Kim",
    username: "noahkim",
    miamoId: "noah.k",
    age: 30,
    city: "Seoul",
    profession: "Chef & Restaurant Owner",
    bio: "I express love through food. Owner of a tiny 12-seat restaurant in Itaewon. Every dish tells a story.",
    photos: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=400&h=500&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=500&fit=crop&crop=face",
    ],
    interests: ["Cooking", "Wine", "Travel", "Photography", "Nature"],
    prompts: [
      { question: "The way to win me over is\u2026", answer: "Be curious about flavors. Taste everything. Don\u0027t say \u0022I don\u0027t eat that\u0022 before trying." },
      { question: "My most controversial opinion is\u2026", answer: "Fusion food is the future of cuisine. Tradition inspires, but shouldn\u0027t limit." },
      { question: "I feel most alive when\u2026", answer: "A full house, every plate going out perfect, and I hear someone say \u0022this changed me\u0022." },
    ],
    aiMatchScore: 86,
    profileScore: 93,
    verified: true,
    seriousMode: true,
    online: false,
    lastActive: new Date(Date.now() - 5400000).toISOString(),
    intent: "Serious only",
    commonInterests: ["Cooking", "Wine", "Travel"],
    creativity: ["Cooking", "Food Photography"],
    beatStatus: { state: "strong", count: 21 },
  },
];

// Current logged-in user
export const CURRENT_USER: MockUser = {
  id: "me",
  displayName: "Alex Morgan",
  username: "alexmorgan",
  miamoId: "alex.m",
  age: 27,
  city: "Los Angeles",
  profession: "Creative Director",
  bio: "Designing brands by day, exploring rooftops by night. Always looking for the next great conversation.",
  photos: [],
  interests: ["Design", "Photography", "Coffee", "Travel", "Music", "Cooking", "Art", "Film"],
  prompts: [
    { question: "A perfect first date for me looks like\u2026", answer: "Golden hour at Griffith Observatory, then tacos and honest conversation." },
    { question: "I geek out about\u2026", answer: "Brand identity. I can tell you the psychology behind every color choice in your favorite app." },
  ],
  aiMatchScore: 0,
  profileScore: 76,
  verified: true,
  seriousMode: false,
  online: true,
  lastActive: new Date().toISOString(),
  intent: "Long-term relationship",
  commonInterests: [],
};

// Mock conversations
export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: "c1",
    user: MOCK_USERS[0],
    lastMessage: "That pottery class sounds amazing! When should we go?",
    lastMessageTime: new Date(Date.now() - 300000).toISOString(),
    unread: 2,
    pinned: true,
    archived: false,
    muted: false,
  },
  {
    id: "c2",
    user: MOCK_USERS[1],
    lastMessage: "\ud83c\udfb5 Check out this track I just finished",
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
    unread: 0,
    pinned: false,
    archived: false,
    muted: false,
  },
  {
    id: "c3",
    user: MOCK_USERS[2],
    lastMessage: "The gallery opens next Thursday, saving you a spot \u2728",
    lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
    unread: 1,
    pinned: false,
    archived: false,
    muted: false,
  },
  {
    id: "c4",
    user: MOCK_USERS[7],
    lastMessage: "I\u0027ll make you my signature tasting menu. Deal?",
    lastMessageTime: new Date(Date.now() - 14400000).toISOString(),
    unread: 0,
    pinned: true,
    archived: false,
    muted: false,
  },
  {
    id: "c5",
    user: MOCK_USERS[4],
    lastMessage: "Just wrapped the Berlin edit. So many stories.",
    lastMessageTime: new Date(Date.now() - 28800000).toISOString(),
    unread: 0,
    pinned: false,
    archived: false,
    muted: false,
  },
];

// Mock feed posts
export const MOCK_FEED_POSTS: MockFeedPost[] = [
  {
    id: "p1",
    author: MOCK_USERS[4],
    type: "thought",
    content: "The best relationships aren\u0027t built on first impressions. They\u0027re built on second chances, honest conversations, and the courage to be vulnerable.",
    likes: 142,
    comments: 23,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    liked: false,
    saved: true,
  },
  {
    id: "p2",
    author: MOCK_USERS[0],
    type: "image",
    content: "Golden Gate at dawn. Some mornings you just have to stop and breathe.",
    media: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&h=400&fit=crop",
    likes: 87,
    comments: 12,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    liked: true,
    saved: false,
  },
  {
    id: "p3",
    author: MOCK_USERS[7],
    type: "date-idea",
    content: "\ud83d\udccd Date Idea: Night market food crawl in Myeongdong. Try everything, judge nothing. Whoever finds the best bite picks the next date.",
    likes: 234,
    comments: 45,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    liked: false,
    saved: false,
  },
  {
    id: "p4",
    author: MOCK_USERS[6],
    type: "mood",
    content: "Feeling \u2192 \u2728 Inspired. Just finished choreographing a piece about letting go. Art imitates life.",
    likes: 56,
    comments: 8,
    timestamp: new Date(Date.now() - 21600000).toISOString(),
    liked: false,
    saved: false,
  },
  {
    id: "p5",
    author: MOCK_USERS[1],
    type: "milestone",
    content: "\ud83c\udf89 Just hit a 21-day Beat streak with someone special. Daily connection really changes things.",
    likes: 198,
    comments: 31,
    timestamp: new Date(Date.now() - 36000000).toISOString(),
    liked: true,
    saved: false,
  },
  {
    id: "p6",
    author: MOCK_USERS[3],
    type: "thought",
    content: "Hot take: The best way to know if you like someone isn\u0027t a first date \u2014 it\u0027s how they handle a disagreement.",
    likes: 312,
    comments: 67,
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    liked: false,
    saved: true,
  },
];

// Mock stories
export const MOCK_STORIES: MockStory[] = MOCK_USERS.slice(0, 6).map((user, i) => ({
  id: `s${i}`,
  user,
  items: [
    { type: "photo" as const, url: user.photos[0], timestamp: new Date(Date.now() - i * 3600000).toISOString() },
  ],
  viewed: i > 2,
}));
