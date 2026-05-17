// ── Quick Reactions ──
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
export const ALL_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍', '😍', '🤔', '👏', '🙌', '💀', '💯', '🎉', '😭', '🥰', '😈'];
export const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: '😊 Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥'] },
  { label: '❤️ Love', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '😍', '🥰', '😘', '😻', '💑', '👩‍❤️‍👨', '💏', '💋', '🫶', '🤟', '🫰'] },
  { label: '👋 Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🙏', '💪', '🫂'] },
  { label: '🎉 Party', emojis: ['🎉', '🎊', '🎈', '🎁', '🎂', '🍾', '🥂', '🥳', '🪅', '✨', '🌟', '⭐', '💫', '🔥', '💥', '🎆', '🎇', '🏆', '🥇', '🎯', '🎪', '🎭', '🎬', '🎵', '🎶', '🎸', '🎹', '🎺', '🥁', '🎤'] },
  { label: '🍕 Food', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '🍭', '🍮', '☕', '🍵', '🥤', '🧃', '🍷', '🍸', '🍹', '🍺', '🥂', '🍾', '🧊', '🥑', '🍌', '🍓', '🍑', '🍒'] },
  { label: '🌸 Nature', emojis: ['🌸', '💐', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🍀', '🍁', '🍂', '🍃', '🌿', '🪴', '🌵', '🌈', '☀️', '🌙', '⭐', '🌟', '✨', '⚡', '🔥', '💧', '🌊', '❄️', '🦋'] },
  { label: '💀 Meme', emojis: ['💀', '☠️', '👻', '👽', '🤖', '🫠', '😈', '👿', '🤡', '💩', '🙈', '🙉', '🙊', '🐸', '🗿', '🫃', '💅', '🤷', '🤦', '😎', '🥶', '🥵', '🤯', '🫨', '😱', '😤', '🤬', '🫡', '🧢', '💀'] },
];

// ── Entertainment Zone ──
export const ENTERTAINMENT_ITEMS = [
  { icon: '🎮', label: 'Would You Rather', prompts: ['Travel to the future or the past?', 'Have unlimited money or unlimited time?', 'Be able to fly or be invisible?', 'Live by the ocean or in the mountains?'] },
  { icon: '💭', label: 'This or That', prompts: ['Netflix or chill?', 'Coffee or tea?', 'Morning person or night owl?', 'Cat or dog?'] },
  { icon: '🎲', label: 'Truth or Dare', prompts: ['What\'s your guilty pleasure?', 'Most embarrassing moment?', 'Send a screenshot of your last DM', 'Send your most used emoji'] },
  { icon: '❓', label: 'Deep Questions', prompts: ['What makes you feel alive?', 'What\'s your biggest dream?', 'If you could have dinner with anyone, who?', 'What\'s the best advice you\'ve received?'] },
  { icon: '🎵', label: 'Song Battle', prompts: ['Drop your favorite song right now 🎵', 'Song that describes your love life?', 'Your ultimate road trip anthem?', 'Song that makes you cry every time?'] },
  { icon: '📸', label: 'Photo Challenge', prompts: ['Show me your view right now!', 'Last photo in your gallery?', 'Your favorite selfie ever', 'A photo that makes you happy'] },
];

// ── Conversation Starter Categories ──
export const SUGGESTION_CATEGORIES = [
  { label: '✨ Starters', context: undefined },
  { label: '💬 Casual', context: 'casual' },
  { label: '🔥 Flirty', context: 'flirty' },
  { label: '🧠 Deep', context: 'deep' },
  { label: '😄 Fun', context: 'fun' },
];

// ── Report Reasons ──
export const REPORT_REASONS = [
  'Inappropriate messages',
  'Spam or scam',
  'Fake profile',
  'Harassment or bullying',
  'Underage user',
  'Threatening behavior',
  'Other',
];

// ── Unmatch Reasons ──
export const UNMATCH_REASONS = [
  'Not feeling a connection',
  'Communication styles don\'t match',
  'Different life goals',
  'Distance is an issue',
  'Found someone else',
  'Moving too fast / too slow',
  'Incompatible values',
  'Not ready to date',
  'Other',
];

// ── Block Reasons ──
export const BLOCK_REASONS = [
  'Inappropriate or offensive behavior',
  'Harassment',
  'Spam or scam',
  'Made me feel unsafe',
  'Fake profile',
  'Threatening behavior',
  'Other',
];
