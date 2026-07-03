// Single source of truth for option lists used across discover filters,
// profile editing and onboarding. Values are stored in canonical
// kebab-case (or lowercase) form on the backend; labels are display-ready.

export interface Option { value: string; label: string }

const o = (value: string, label?: string): Option => ({ value, label: label ?? value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') });

export const GENDER_OPTIONS: Option[] = [
  o('woman', 'Woman'),
  o('man', 'Man'),
  o('non-binary', 'Non-binary'),
  o('transgender-woman', 'Transgender woman'),
  o('transgender-man', 'Transgender man'),
  o('genderfluid', 'Genderfluid'),
  o('genderqueer', 'Genderqueer'),
  o('agender', 'Agender'),
  o('bigender', 'Bigender'),
  o('demiboy', 'Demiboy'),
  o('demigirl', 'Demigirl'),
  o('androgynous', 'Androgynous'),
  o('two-spirit', 'Two-spirit'),
  o('intersex', 'Intersex'),
  o('pangender', 'Pangender'),
  o('polygender', 'Polygender'),
  o('questioning', 'Questioning'),
  o('other', 'Other'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const SEXUALITY_OPTIONS: Option[] = [
  o('straight', 'Straight'),
  o('gay', 'Gay'),
  o('lesbian', 'Lesbian'),
  o('bisexual', 'Bisexual'),
  o('pansexual', 'Pansexual'),
  o('queer', 'Queer'),
  o('asexual', 'Asexual'),
  o('demisexual', 'Demisexual'),
  o('sapiosexual', 'Sapiosexual'),
  o('aromantic', 'Aromantic'),
  o('questioning', 'Questioning'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const LOOKING_FOR_OPTIONS: Option[] = [
  o('long-term', 'Long-term relationship'),
  o('short-term', 'Short-term relationship'),
  o('casual', 'Casual dating'),
  o('marriage', 'Marriage'),
  o('friendship', 'Friendship'),
  o('networking', 'Networking'),
  o('open', 'Open to anything'),
  o('not-sure', 'Not sure yet'),
];

export const SMOKING_OPTIONS: Option[] = [
  o('never', 'Never'),
  o('occasionally', 'Occasionally'),
  o('socially', 'Socially'),
  o('regularly', 'Regularly'),
  o('daily', 'Daily'),
  o('vape', 'Vape only'),
  o('hookah-only', 'Hookah only'),
  o('cigar-only', 'Cigar only'),
  o('weed-only', 'Cannabis only'),
  o('trying-to-quit', 'Trying to quit'),
  o('quit', 'Quit'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const DRINKING_OPTIONS: Option[] = [
  o('never', 'Never'),
  o('rarely', 'Rarely'),
  o('socially', 'Socially'),
  o('regularly', 'Regularly'),
  o('daily', 'Daily'),
  o('beer-only', 'Beer only'),
  o('wine-only', 'Wine only'),
  o('whiskey', 'Whiskey connoisseur'),
  o('cocktails', 'Cocktails'),
  o('dry', 'Dry / Sober-curious'),
  o('sober', 'Sober / In recovery'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const EXERCISE_OPTIONS: Option[] = [
  o('never', 'Never'),
  o('sometimes', 'Sometimes'),
  o('active', 'Active'),
  o('very-active', 'Very active'),
  o('athlete', 'Athlete'),
  o('gym', 'Gym regular'),
  o('crossfit', 'CrossFit'),
  o('yoga', 'Yoga'),
  o('pilates', 'Pilates'),
  o('running', 'Running'),
  o('cycling', 'Cycling'),
  o('swimming', 'Swimming'),
  o('hiking', 'Hiking'),
  o('martial-arts', 'Martial arts'),
  o('dance', 'Dance'),
  o('sports', 'Team sports'),
];

export const DIET_OPTIONS: Option[] = [
  o('omnivore', 'Omnivore'),
  o('vegetarian', 'Vegetarian'),
  o('eggetarian', 'Eggetarian'),
  o('vegan', 'Vegan'),
  o('raw-vegan', 'Raw vegan'),
  o('pescatarian', 'Pescatarian'),
  o('flexitarian', 'Flexitarian'),
  o('jain', 'Jain'),
  o('sattvic', 'Sattvic'),
  o('halal', 'Halal'),
  o('kosher', 'Kosher'),
  o('keto', 'Keto'),
  o('paleo', 'Paleo'),
  o('gluten-free', 'Gluten-free'),
  o('carnivore', 'Carnivore'),
  o('other', 'Other'),
];

export const PETS_OPTIONS: Option[] = [
  o('none', 'None'),
  o('dog', 'Dog'),
  o('cat', 'Cat'),
  o('both', 'Dog & Cat'),
  o('bird', 'Bird'),
  o('fish', 'Fish'),
  o('reptile', 'Reptile'),
  o('rabbit', 'Rabbit'),
  o('hamster', 'Hamster'),
  o('horse', 'Horse'),
  o('farm-animals', 'Farm animals'),
  o('exotic', 'Exotic'),
  o('want-someday', 'Want one someday'),
  o('allergic', 'Allergic'),
  o('other', 'Other'),
];

export const CHILDREN_OPTIONS: Option[] = [
  o('want-someday', 'Want someday'),
  o('definitely-want', 'Definitely want'),
  o('open', 'Open to it'),
  o('dont-want', "Don't want"),
  o('not-sure', 'Not sure'),
  o('have-want-more', 'Have & want more'),
  o('have-no-more', "Have, no more"),
  o('expecting', 'Expecting'),
  o('trying', 'Currently trying'),
  o('stepkids', 'Have stepkids'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const EDUCATION_OPTIONS: Option[] = [
  o('high-school', 'High school'),
  o('some-college', 'Some college'),
  o('associates', "Associate's"),
  o('bachelors', "Bachelor's"),
  o('masters', "Master's"),
  o('phd', 'PhD'),
  o('trade-school', 'Trade school'),
  o('self-taught', 'Self-taught'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const RELIGION_OPTIONS: Option[] = [
  o('agnostic', 'Agnostic'),
  o('atheist', 'Atheist'),
  o('buddhist', 'Buddhist'),
  o('catholic', 'Catholic'),
  o('christian', 'Christian'),
  o('hindu', 'Hindu'),
  o('jain', 'Jain'),
  o('jewish', 'Jewish'),
  o('muslim', 'Muslim'),
  o('sikh', 'Sikh'),
  o('spiritual', 'Spiritual'),
  o('other', 'Other'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const POLITICS_OPTIONS: Option[] = [
  o('progressive', 'Progressive'),
  o('liberal', 'Liberal'),
  o('centrist', 'Centrist'),
  o('moderate', 'Moderate'),
  o('conservative', 'Conservative'),
  o('libertarian', 'Libertarian'),
  o('socialist', 'Socialist'),
  o('green', 'Green / Environmental'),
  o('apolitical', 'Apolitical'),
  o('other', 'Other'),
  o('prefer-not-to-say', 'Prefer not to say'),
];

export const ZODIAC_OPTIONS: Option[] = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
].map((z) => ({ value: z.toLowerCase(), label: z }));

export const LANGUAGE_OPTIONS: Option[] = [
  'English','Hindi','Mandarin','Spanish','Arabic','French','Bengali','Portuguese','Russian','Urdu','Japanese',
  'German','Korean','Italian','Tamil','Telugu','Marathi','Punjabi','Gujarati','Kannada','Malayalam',
  'Turkish','Vietnamese','Thai','Persian','Polish','Dutch','Greek','Hebrew','Swedish','Other',
].map((l) => ({ value: l.toLowerCase(), label: l }));

export const HEIGHT_OPTIONS: Option[] = (() => {
  const out: Option[] = [];
  for (let cm = 140; cm <= 220; cm++) {
    const totalIn = Math.round(cm / 2.54);
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn % 12;
    out.push({ value: String(cm), label: `${cm} cm  ·  ${ft}'${inch}"` });
  }
  return out;
})();

export const MARITAL_STATUS_OPTIONS: Option[] = [
  { value: 'never-married', label: 'Never married' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'awaiting-divorce', label: 'Awaiting divorce' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'annulled', label: 'Annulled' },
  { value: 'its-complicated', label: "It's complicated" },
];

export const INCOME_BAND_OPTIONS: Option[] = [
  { value: 'no-income', label: 'No income / Student' },
  { value: 'under-3l', label: 'Under ₹3L' },
  { value: '3l-5l', label: '₹3L – ₹5L' },
  { value: '5l-10l', label: '₹5L – ₹10L' },
  { value: '10l-20l', label: '₹10L – ₹20L' },
  { value: '20l-30l', label: '₹20L – ₹30L' },
  { value: '30l-50l', label: '₹30L – ₹50L' },
  { value: '50l-75l', label: '₹50L – ₹75L' },
  { value: '75l-1cr', label: '₹75L – ₹1Cr' },
  { value: '1cr-2cr', label: '₹1Cr – ₹2Cr' },
  { value: '2cr-5cr', label: '₹2Cr – ₹5Cr' },
  { value: '5cr-plus', label: '₹5Cr+' },
  { value: 'inherited', label: 'Inherited wealth' },
  { value: 'prefer-not-say', label: 'Prefer not to say' },
];

export const BODY_TYPE_OPTIONS: Option[] = [
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'average', label: 'Average' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'plus-size', label: 'Plus size' },
  { value: 'muscular', label: 'Muscular' },
];
