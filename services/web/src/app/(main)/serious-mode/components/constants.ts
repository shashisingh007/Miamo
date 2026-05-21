/* ═══════════════════════════════════════════════════════════
 CONSTANTS & DROPDOWN DATA
 ═══════════════════════════════════════════════════════════ */
export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'Other'];
export const CASTES_BY_RELIGION: Record<string, string[]> = {
 Hindu: ['Brahmin','Rajput','Marwari','Agarwal','Jat','Kayastha','Vaishya','Khatri','Yadav','Gupta','Sharma','Verma','Patel','Nair','Iyer','Iyengar','Reddy','Naidu','Lingayat','Vokkaliga','Kurmi','Baniya','Arora','Thakur','Other'],
 Muslim: ['Syed','Sheikh','Pathan','Mughal','Ansari','Khan','Qureshi','Bohra','Memon','Other'],
 Sikh: ['Jat Sikh','Khatri Sikh','Arora Sikh','Ramgarhia','Saini','Other'],
 Christian: ['Roman Catholic','Syrian Christian','Protestant','CSI','Other'],
 Jain: ['Digambar','Shwetambar','Other'],
 Buddhist: ['Mahayana','Theravada','Neo-Buddhist','Other'],
};
export const MOTHER_TONGUES = ['Hindi','Bengali','Telugu','Marathi','Tamil','Urdu','Gujarati','Kannada','Malayalam','Odia','Punjabi','Assamese','Maithili','Sindhi','Konkani','Dogri','Kashmiri','Sanskrit','English','Other'];
export const HEIGHTS = ["4'0\"","4'1\"","4'2\"","4'3\"","4'4\"","4'5\"","4'6\"","4'7\"","4'8\"","4'9\"","4'10\"","4'11\"","5'0\"","5'1\"","5'2\"","5'3\"","5'4\"","5'5\"","5'6\"","5'7\"","5'8\"","5'9\"","5'10\"","5'11\"","6'0\"","6'1\"","6'2\"","6'3\"","6'4\"","6'5\""];
export const EDUCATION_LEVELS = ['High School','Diploma','B.A.','B.Sc.','B.Com.','B.Tech/B.E.','BBA','BCA','MBBS','BDS','B.Pharm','LLB','B.Ed.','M.A.','M.Sc.','M.Com.','M.Tech/M.E.','MBA','MCA','MD','MS','M.Phil.','Ph.D.','CA','CS','ICWA','IAS/IPS/IFS','Other'];
export const INCOMES = ['Not specified','Below 2 Lakh','2-4 Lakh','4-6 Lakh','6-8 Lakh','8-10 Lakh','10-15 Lakh','15-20 Lakh','20-30 Lakh','30-50 Lakh','50-75 Lakh','75 Lakh - 1 Cr','1 Cr+','2 Cr+','5 Cr+'];
export const FAMILY_TYPES = ['Nuclear','Joint','Extended'];
export const FAMILY_STATUS = ['Middle Class','Upper Middle Class','Rich','Affluent'];
export const FAMILY_VALUES = ['Orthodox','Traditional','Moderate','Liberal'];
export const MARITAL_STATUSES = ['Never Married','Divorced','Widowed','Awaiting Divorce'];
export const DIETS = ['Vegetarian','Non-Vegetarian','Eggetarian','Jain','Vegan'];
export const MANGLIK_OPTIONS = ['No','Yes','Partial / Anshik',"Doesn't Matter"];
export const COMPLEXIONS = ['Very Fair','Fair','Wheatish','Wheatish Brown','Dark'];
export const BODY_TYPES = ['Slim','Average','Athletic','Heavy'];
export const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
export const RAASHIS = ['Mesha (Aries)','Vrishabha (Taurus)','Mithuna (Gemini)','Karka (Cancer)','Simha (Leo)','Kanya (Virgo)','Tula (Libra)','Vrischika (Scorpio)','Dhanu (Sagittarius)','Makara (Capricorn)','Kumbha (Aquarius)','Meena (Pisces)'];

export const TEMPLATES = [
 { id: 'royal-rajasthani', name: 'Royal Rajasthani', colors: ['#8B0000','#FFD700','#FFF8DC'], emoji: '🏰', motif: '🕉', premium: false },
 { id: 'south-indian-temple', name: 'South Indian Temple', colors: ['#006400','#FFD700','#FFF5E1'], emoji: '🛕', motif: '🪔', premium: false },
 { id: 'bengali-lal-paar', name: 'Bengali Lal Paar', colors: ['#DC143C','#FFFFFF','#FFE4E1'], emoji: '🌺', motif: '🕉', premium: false },
 { id: 'punjabi-phulkari', name: 'Punjabi Phulkari', colors: ['#FF6B00','#FFD700','#FF1493'], emoji: '🧵', motif: '☬', premium: false },
 { id: 'gujarati-bandhani', name: 'Gujarati Bandhani', colors: ['#FF0000','#008000','#FFD700'], emoji: '🪞', motif: '🕉', premium: false },
 { id: 'marathi-paithani', name: 'Marathi Paithani', colors: ['#FF8C00','#006400','#FFD700'], emoji: '🦚', motif: '🕉', premium: false },
 { id: 'kerala-kasavu', name: 'Kerala Kasavu', colors: ['#FFFFF0','#FFD700','#8B4513'], emoji: '🌴', motif: '🪔', premium: false },
 { id: 'lucknowi-chikan', name: 'Lucknowi Chikan', colors: ['#FFFFFF','#F0E6FF','#E8F5E9'], emoji: '🕌', motif: '☪', premium: false },
 { id: 'mughal-royal', name: 'Mughal Royal', colors: ['#000080','#FFD700','#F5F5DC'], emoji: '👑', motif: '☪', premium: true },
 { id: 'kashmiri-pashmina', name: 'Kashmiri Pashmina', colors: ['#800020','#C19A6B','#F5DEB3'], emoji: '🏔️', motif: '🕉', premium: true },
 { id: 'assamese-mekhela', name: 'Assamese Mekhela', colors: ['#B22222','#FFD700','#FFFAF0'], emoji: '🎋', motif: '🕉', premium: false },
 { id: 'odia-bomkai', name: 'Odia Bomkai', colors: ['#800000','#FF8C00','#FFFACD'], emoji: '🏛️', motif: '🕉', premium: false },
 { id: 'manipuri-phanek', name: 'Manipuri Phanek', colors: ['#FF69B4','#8B008B','#FFE4B5'], emoji: '🌸', motif: '🕉', premium: false },
 { id: 'hyderabadi-pearl', name: 'Hyderabadi Pearl', colors: ['#FFFFF0','#008080','#FFD700'], emoji: '💎', motif: '☪', premium: true },
 { id: 'goan-catholic', name: 'Goan Christian', colors: ['#FFFFFF','#4169E1','#FFD700'], emoji: '⛪', motif: '✝', premium: false },
 { id: 'sikh-golden', name: 'Sikh Golden Temple', colors: ['#FFD700','#FFFFFF','#FF8C00'], emoji: '☬', motif: '☬', premium: false },
 { id: 'jain-peaceful', name: 'Jain Shanti', colors: ['#FFFFFF','#FF8C00','#006400'], emoji: '☸️', motif: '☸', premium: false },
 { id: 'modern-minimal', name: 'Modern Minimal', colors: ['#2D3748','#EDF2F7','#A78BFA'], emoji: '✨', motif: '✨', premium: false },
 { id: 'rose-garden', name: 'Rose Garden', colors: ['#FFC0CB','#FF69B4','#FFE4E1'], emoji: '🌹', motif: '🌹', premium: true },
 { id: 'midnight-royal', name: 'Midnight Royal', colors: ['#1A1A2E','#FFD700','#E94560'], emoji: '🌙', motif: '🕉', premium: true },
 { id: 'vedic-sunrise', name: 'Vedic Sunrise', colors: ['#FF6600','#8B0000','#FFF5EE'], emoji: '🌅', motif: '🕉', premium: false },
 { id: 'lotus-pond', name: 'Lotus Pond', colors: ['#FADADD','#228B22','#FFF1F4'], emoji: '🪷', motif: '🌸', premium: false },
 { id: 'temple-gold', name: 'Temple Gold', colors: ['#B8860B','#2F1B0E','#FDF5E6'], emoji: '🛕', motif: '⚱️', premium: true },
 { id: 'peacock-pride', name: 'Peacock Pride', colors: ['#0047AB','#00A86B','#E0FFFF'], emoji: '🦚', motif: '🪶', premium: false },
 { id: 'bridal-red', name: 'Bridal Red', colors: ['#CC0000','#FFD700','#FFF0F0'], emoji: '💍', motif: '🔴', premium: false },
 { id: 'sandalwood', name: 'Sandalwood Classic', colors: ['#C19A6B','#E8B04B','#FAEBD7'], emoji: '🪵', motif: '🌿', premium: false },
 { id: 'celestial-blue', name: 'Celestial Blue', colors: ['#191970','#C0C0C0','#F0F8FF'], emoji: '🌌', motif: '⭐', premium: true },
 { id: 'marigold-festive', name: 'Marigold Festive', colors: ['#FFA500','#228B22','#FFFFF0'], emoji: '🌼', motif: '🎊', premium: false },
 { id: 'ivory-elegance', name: 'Ivory Elegance', colors: ['#FFFFF0','#F7E7CE','#D4AF37'], emoji: '✨', motif: '💫', premium: false },
 { id: 'rajwada-heritage', name: 'Rajwada Heritage', colors: ['#4B0082','#FFD700','#F8F0FF'], emoji: '🏯', motif: '👑', premium: true },
 { id: 'tulsi-green', name: 'Tulsi Green', colors: ['#2E8B57','#8B4513','#F0FFF0'], emoji: '🌱', motif: '🍃', premium: false },
 { id: 'diwali-lights', name: 'Diwali Lights', colors: ['#FF4500','#FFD700','#1A0033'], emoji: '🪔', motif: '✨', premium: true },
];
