// ─── DTM (Date to Marry) Seed Data ───────────────────────
// Seeds comprehensive matrimonial profiles for all 20 users
// Run: DATABASE_URL="postgresql://miamo:miamo@localhost:5432/miamo?schema=public" npx tsx prisma/seed-dtm.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DTMProfile {
  username: string;
  fullName: string;
  dateOfBirth: string; // ISO
  birthTime: string;
  birthPlace: string;
  height: string;
  weight: string;
  complexion: string;
  bloodGroup: string;
  bodyType: string;
  religion: string;
  caste: string;
  subCaste: string;
  gotra: string;
  manglik: string;
  star: string;
  raasi: string;
  motherTongue: string;
  education: string;
  educationDetail: string;
  college: string;
  occupation: string;
  company: string;
  annualIncome: string;
  workingCity: string;
  workingCountry: string;
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  brothers: number;
  brothersMarried: number;
  sisters: number;
  sistersMarried: number;
  familyType: string;
  familyStatus: string;
  familyValues: string;
  nativePlace: string;
  maritalStatus: string;
  diet: string;
  drinking: string;
  smoking: string;
  aboutMe: string;
  aboutFamily: string;
  phoneNumber: string;
  linkedIn: string;
  contactEmail: string;
  bioDataTemplate: string;
}

const DTM_PROFILES: DTMProfile[] = [
  {
    username: 'miamo1', fullName: 'Aria Sharma', dateOfBirth: '1999-03-15', birthTime: '06:30 AM', birthPlace: 'Jaipur',
    height: "5'4\"", weight: '52 kg', complexion: 'Fair', bloodGroup: 'B+', bodyType: 'Slim',
    religion: 'Hindu', caste: 'Brahmin', subCaste: 'Gaur', gotra: 'Kashyap', manglik: 'No',
    star: 'Rohini', raasi: 'Vrishabha (Taurus)', motherTongue: 'Hindi',
    education: 'M.Tech/M.E.', educationDetail: 'M.Tech CSE from IIT Delhi', college: 'IIT Delhi',
    occupation: 'Product Designer', company: 'Figma', annualIncome: '20-30 Lakh',
    workingCity: 'Bangalore', workingCountry: 'India',
    fatherName: 'Rajesh Sharma', fatherOccupation: 'Government Officer (IAS)',
    motherName: 'Sunita Sharma', motherOccupation: 'Professor',
    brothers: 1, brothersMarried: 0, sisters: 1, sistersMarried: 1,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Jaipur, Rajasthan',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Creative soul with a passion for design and technology. Love traveling, reading, and exploring local cafes. Looking for a life partner who values growth and companionship.',
    aboutFamily: 'Well-educated family. Father is a retired IAS officer. Mother is a university professor. One younger brother pursuing MBA and one elder sister happily married.',
    phoneNumber: '+91 98765 43210', linkedIn: 'linkedin.com/in/ariasharma', contactEmail: 'aria.sharma@email.com',
    bioDataTemplate: 'royal-rajasthani',
  },
  {
    username: 'miamo2', fullName: 'Vikram Rajput', dateOfBirth: '1996-08-22', birthTime: '10:15 AM', birthPlace: 'Udaipur',
    height: "5'11\"", weight: '75 kg', complexion: 'Wheatish', bloodGroup: 'O+', bodyType: 'Athletic',
    religion: 'Hindu', caste: 'Rajput', subCaste: 'Sisodia', gotra: 'Bharadwaj', manglik: 'Yes',
    star: 'Magha', raasi: 'Simha (Leo)', motherTongue: 'Hindi',
    education: 'MBA', educationDetail: 'MBA Finance from IIM Ahmedabad', college: 'IIM Ahmedabad',
    occupation: 'Investment Banker', company: 'Goldman Sachs', annualIncome: '50-75 Lakh',
    workingCity: 'Mumbai', workingCountry: 'India',
    fatherName: 'Thakur Pratap Singh', fatherOccupation: 'Industrialist',
    motherName: 'Rajkumari Devi', motherOccupation: 'Homemaker',
    brothers: 0, brothersMarried: 0, sisters: 2, sistersMarried: 1,
    familyType: 'Joint', familyStatus: 'Rich', familyValues: 'Traditional',
    nativePlace: 'Udaipur, Rajasthan',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Ambitious professional with royal Rajput heritage. Passionate about finance, polo, and heritage conservation. Seeking a partner who appreciates both tradition and modernity.',
    aboutFamily: 'Respected Rajput family from Udaipur with ancestral heritage. Father manages family business. Two sisters - one married into a business family.',
    phoneNumber: '+91 98111 22334', linkedIn: 'linkedin.com/in/vikramrajput', contactEmail: 'vikram.rajput@email.com',
    bioDataTemplate: 'royal-rajasthani',
  },
  {
    username: 'miamo3', fullName: 'Lakshmi Iyer', dateOfBirth: '1998-12-05', birthTime: '04:45 AM', birthPlace: 'Chennai',
    height: "5'3\"", weight: '50 kg', complexion: 'Wheatish', bloodGroup: 'A+', bodyType: 'Slim',
    religion: 'Hindu', caste: 'Iyer', subCaste: 'Vadama', gotra: 'Srivatsa', manglik: 'No',
    star: 'Hasta', raasi: 'Kanya (Virgo)', motherTongue: 'Tamil',
    education: 'MBBS', educationDetail: 'MBBS from CMC Vellore', college: 'CMC Vellore',
    occupation: 'Doctor (Pediatrician)', company: 'Apollo Hospital', annualIncome: '15-20 Lakh',
    workingCity: 'Chennai', workingCountry: 'India',
    fatherName: 'Dr. Venkatesh Iyer', fatherOccupation: 'Cardiologist',
    motherName: 'Kamala Iyer', motherOccupation: 'Classical Dancer (Bharatanatyam)',
    brothers: 1, brothersMarried: 1, sisters: 0, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Traditional',
    nativePlace: 'Kumbakonam, Tamil Nadu',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Dedicated pediatrician with love for Carnatic music and Bharatanatyam. Value family traditions while embracing modern outlook. Seeking a well-educated, family-oriented partner.',
    aboutFamily: 'Tamil Brahmin family rooted in traditions and education. Father is a renowned cardiologist. Mother is Bharatanatyam performer. Elder brother is married, works in IT.',
    phoneNumber: '+91 94444 55667', linkedIn: 'linkedin.com/in/lakshmiiyer', contactEmail: 'lakshmi.iyer@email.com',
    bioDataTemplate: 'south-indian-temple',
  },
  {
    username: 'miamo4', fullName: 'Aditya Gupta', dateOfBirth: '1997-05-18', birthTime: '02:30 PM', birthPlace: 'Kolkata',
    height: "5'9\"", weight: '70 kg', complexion: 'Fair', bloodGroup: 'AB+', bodyType: 'Average',
    religion: 'Hindu', caste: 'Gupta', subCaste: 'Agarwal', gotra: 'Mudgal', manglik: 'No',
    star: 'Swati', raasi: 'Tula (Libra)', motherTongue: 'Bengali',
    education: 'B.Tech/B.E.', educationDetail: 'B.Tech from BITS Pilani', college: 'BITS Pilani',
    occupation: 'Software Architect', company: 'Google India', annualIncome: '30-50 Lakh',
    workingCity: 'Bangalore', workingCountry: 'India',
    fatherName: 'Suresh Kumar Gupta', fatherOccupation: 'Businessman (Textiles)',
    motherName: 'Asha Gupta', motherOccupation: 'School Principal',
    brothers: 1, brothersMarried: 0, sisters: 1, sistersMarried: 0,
    familyType: 'Joint', familyStatus: 'Rich', familyValues: 'Moderate',
    nativePlace: 'Howrah, West Bengal',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Tech enthusiast building scalable systems at Google. Weekend musician and photography lover. Looking for someone intellectually curious and kind.',
    aboutFamily: 'Business family from Kolkata. Father runs textile business. Mother is a school principal. Joint family with grandparents.',
    phoneNumber: '+91 70012 34567', linkedIn: 'linkedin.com/in/adityagupta', contactEmail: 'aditya.gupta@email.com',
    bioDataTemplate: 'bengali-lal-paar',
  },
  {
    username: 'miamo5', fullName: 'Harpreet Kaur', dateOfBirth: '1998-01-28', birthTime: '11:00 AM', birthPlace: 'Amritsar',
    height: "5'6\"", weight: '58 kg', complexion: 'Very Fair', bloodGroup: 'B+', bodyType: 'Average',
    religion: 'Sikh', caste: 'Jat Sikh', subCaste: 'Sidhu', gotra: 'Sandhu', manglik: 'No',
    star: 'Pushya', raasi: 'Karka (Cancer)', motherTongue: 'Punjabi',
    education: 'CA', educationDetail: 'Chartered Accountant', college: 'ICAI',
    occupation: 'Senior Auditor', company: 'Deloitte', annualIncome: '20-30 Lakh',
    workingCity: 'Delhi', workingCountry: 'India',
    fatherName: 'Sardar Gurpreet Singh', fatherOccupation: 'Retired Army Colonel',
    motherName: 'Harjeet Kaur', motherOccupation: 'Homemaker',
    brothers: 2, brothersMarried: 1, sisters: 0, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Amritsar, Punjab',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'CA by profession, Punjabi by heart! Love cooking, bhangra, and road trips. Looking for a life partner with good values and humor.',
    aboutFamily: 'Proud Sikh family. Father is retired Army Colonel. Two brothers - elder one married. Family believes in hard work and simplicity.',
    phoneNumber: '+91 98765 11223', linkedIn: 'linkedin.com/in/harpreetkaur', contactEmail: 'harpreet.kaur@email.com',
    bioDataTemplate: 'punjabi-phulkari',
  },
  {
    username: 'miamo6', fullName: 'Rahul Patel', dateOfBirth: '1995-09-10', birthTime: '08:20 AM', birthPlace: 'Ahmedabad',
    height: "5'10\"", weight: '72 kg', complexion: 'Wheatish', bloodGroup: 'O+', bodyType: 'Athletic',
    religion: 'Hindu', caste: 'Patel', subCaste: 'Kadva', gotra: 'Vasishtha', manglik: 'Partial / Anshik',
    star: 'Anuradha', raasi: 'Vrischika (Scorpio)', motherTongue: 'Gujarati',
    education: 'MBA', educationDetail: 'MBA from SP Jain', college: 'SP Jain Mumbai',
    occupation: 'Entrepreneur', company: 'Own Startup (FoodTech)', annualIncome: '30-50 Lakh',
    workingCity: 'Ahmedabad', workingCountry: 'India',
    fatherName: 'Jagdish Patel', fatherOccupation: 'Diamond Merchant',
    motherName: 'Reena Patel', motherOccupation: 'Homemaker',
    brothers: 0, brothersMarried: 0, sisters: 1, sistersMarried: 1,
    familyType: 'Nuclear', familyStatus: 'Rich', familyValues: 'Traditional',
    nativePlace: 'Mehsana, Gujarat',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'First-generation entrepreneur running a FoodTech startup. Gujarati at heart - love garba, food, and family gatherings. Looking for a supportive and ambitious partner.',
    aboutFamily: 'Gujarati Patel family from Mehsana. Father is in diamond business. One sister happily married. Close-knit family with strong values.',
    phoneNumber: '+91 99099 88776', linkedIn: 'linkedin.com/in/rahulpatel', contactEmail: 'rahul.patel@email.com',
    bioDataTemplate: 'gujarati-bandhani',
  },
  {
    username: 'miamo7', fullName: 'Sneha Deshmukh', dateOfBirth: '1999-07-03', birthTime: '05:15 PM', birthPlace: 'Pune',
    height: "5'5\"", weight: '54 kg', complexion: 'Fair', bloodGroup: 'A-', bodyType: 'Slim',
    religion: 'Hindu', caste: 'Marwari', subCaste: 'Deshmukh', gotra: 'Atri', manglik: 'No',
    star: 'Purva Phalguni', raasi: 'Simha (Leo)', motherTongue: 'Marathi',
    education: 'M.Sc.', educationDetail: 'M.Sc Biotechnology from Pune University', college: 'Pune University',
    occupation: 'Research Scientist', company: 'Serum Institute', annualIncome: '10-15 Lakh',
    workingCity: 'Pune', workingCountry: 'India',
    fatherName: 'Sunil Deshmukh', fatherOccupation: 'Bank Manager (SBI)',
    motherName: 'Vaishali Deshmukh', motherOccupation: 'Teacher',
    brothers: 0, brothersMarried: 0, sisters: 1, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Middle Class', familyValues: 'Moderate',
    nativePlace: 'Satara, Maharashtra',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Science nerd with a love for poetry and classical music. Currently researching vaccines at Serum Institute. Want a partner who values intellect and simplicity.',
    aboutFamily: 'Middle-class Maharashtrian family. Father is SBI Bank Manager. Mother teaches at a school. One younger sister studying engineering.',
    phoneNumber: '+91 88888 99900', linkedIn: 'linkedin.com/in/snehadeshmukh', contactEmail: 'sneha.deshmukh@email.com',
    bioDataTemplate: 'marathi-paithani',
  },
  {
    username: 'miamo8', fullName: 'Karthik Nair', dateOfBirth: '1996-11-25', birthTime: '09:45 AM', birthPlace: 'Thiruvananthapuram',
    height: "5'8\"", weight: '68 kg', complexion: 'Wheatish Brown', bloodGroup: 'B-', bodyType: 'Average',
    religion: 'Hindu', caste: 'Nair', subCaste: 'Menon', gotra: 'Vishwamitra', manglik: 'No',
    star: 'Shravana', raasi: 'Makara (Capricorn)', motherTongue: 'Malayalam',
    education: 'M.Tech/M.E.', educationDetail: 'M.Tech from IIT Madras', college: 'IIT Madras',
    occupation: 'AI/ML Engineer', company: 'Microsoft', annualIncome: '30-50 Lakh',
    workingCity: 'Hyderabad', workingCountry: 'India',
    fatherName: 'Gopal Krishnan Nair', fatherOccupation: 'ISRO Scientist',
    motherName: 'Deepa Nair', motherOccupation: 'Ayurvedic Doctor',
    brothers: 1, brothersMarried: 0, sisters: 0, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Alappuzha, Kerala',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'AI researcher by day, kathakali appreciation post maker by night. Love the blend of Kerala culture and cutting-edge tech. Looking for an intellectually stimulating partner.',
    aboutFamily: 'Kerala Nair family. Father is an ISRO scientist. Mother practices Ayurveda. One younger brother studying at NIT.',
    phoneNumber: '+91 94467 88990', linkedIn: 'linkedin.com/in/karthiknair', contactEmail: 'karthik.nair@email.com',
    bioDataTemplate: 'kerala-kasavu',
  },
  {
    username: 'miamo9', fullName: 'Ananya Mishra', dateOfBirth: '2000-02-14', birthTime: '12:00 PM', birthPlace: 'Lucknow',
    height: "5'4\"", weight: '48 kg', complexion: 'Very Fair', bloodGroup: 'A+', bodyType: 'Slim',
    religion: 'Hindu', caste: 'Brahmin', subCaste: 'Kanyakubja', gotra: 'Parashar', manglik: 'No',
    star: 'Uttara Phalguni', raasi: 'Kanya (Virgo)', motherTongue: 'Hindi',
    education: 'B.A.', educationDetail: 'B.A. English Literature from BHU', college: 'BHU Varanasi',
    occupation: 'Content Writer & Blogger', company: 'Freelance', annualIncome: '6-8 Lakh',
    workingCity: 'Lucknow', workingCountry: 'India',
    fatherName: 'Ashutosh Mishra', fatherOccupation: 'University Professor',
    motherName: 'Nirmala Mishra', motherOccupation: 'Homemaker',
    brothers: 1, brothersMarried: 0, sisters: 0, sistersMarried: 0,
    familyType: 'Joint', familyStatus: 'Middle Class', familyValues: 'Traditional',
    nativePlace: 'Varanasi, UP',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Words are my world. Classical music lover, avid reader, and aspiring novelist. Believe in the beauty of simplicity and deep conversations.',
    aboutFamily: 'Traditional Brahmin family from Varanasi. Father is a Hindi literature professor at BHU. Joint family living with grandparents.',
    phoneNumber: '+91 93369 44556', linkedIn: 'linkedin.com/in/ananyamishra', contactEmail: 'ananya.mishra@email.com',
    bioDataTemplate: 'lucknowi-chikan',
  },
  {
    username: 'miamo10', fullName: 'Siddharth Jain', dateOfBirth: '1997-04-07', birthTime: '07:30 AM', birthPlace: 'Indore',
    height: "5'7\"", weight: '65 kg', complexion: 'Fair', bloodGroup: 'O-', bodyType: 'Average',
    religion: 'Jain', caste: 'Digambar', subCaste: 'Porwal', gotra: 'Kaushal', manglik: 'No',
    star: 'Ashwini', raasi: 'Mesha (Aries)', motherTongue: 'Hindi',
    education: 'CA', educationDetail: 'CA + CS double qualification', college: 'ICAI + ICSI',
    occupation: 'CFO', company: 'Family Business Group', annualIncome: '50-75 Lakh',
    workingCity: 'Indore', workingCountry: 'India',
    fatherName: 'Mahaveer Jain', fatherOccupation: 'Industrialist (Textiles)',
    motherName: 'Pushpa Jain', motherOccupation: 'Homemaker',
    brothers: 1, brothersMarried: 1, sisters: 1, sistersMarried: 1,
    familyType: 'Joint', familyStatus: 'Affluent', familyValues: 'Traditional',
    nativePlace: 'Indore, MP',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Jain values with modern outlook. Managing family textile empire while pursuing passion for sustainable fashion. Strictly vegetarian, value dharma and karma.',
    aboutFamily: 'Affluent Jain family with textile business spanning 3 generations. Elder brother married, managing Mumbai operations. Family follows strict Jain principles.',
    phoneNumber: '+91 98930 11223', linkedIn: 'linkedin.com/in/siddharthjain', contactEmail: 'siddharth.jain@email.com',
    bioDataTemplate: 'jain-peaceful',
  },
  {
    username: 'miamo11', fullName: 'Fatima Khan', dateOfBirth: '1999-06-20', birthTime: '03:30 AM', birthPlace: 'Hyderabad',
    height: "5'5\"", weight: '55 kg', complexion: 'Wheatish', bloodGroup: 'B+', bodyType: 'Average',
    religion: 'Muslim', caste: 'Syed', subCaste: 'Naqvi', gotra: '', manglik: 'No',
    star: 'Ardra', raasi: 'Mithuna (Gemini)', motherTongue: 'Urdu',
    education: 'MBBS', educationDetail: 'MBBS from Osmania Medical College', college: 'Osmania Medical College',
    occupation: 'Dermatologist', company: 'Yashoda Hospital', annualIncome: '15-20 Lakh',
    workingCity: 'Hyderabad', workingCountry: 'India',
    fatherName: 'Dr. Imran Khan', fatherOccupation: 'Surgeon',
    motherName: 'Rukhsar Khan', motherOccupation: 'Lawyer',
    brothers: 0, brothersMarried: 0, sisters: 2, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Hyderabad, Telangana',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Doctor with a passion for skincare and wellness. Love Hyderabadi food, poetry, and long drives. Looking for someone educated, kind, and family-oriented.',
    aboutFamily: 'Progressive Muslim family. Both parents are professionals. Two younger sisters studying medicine and law respectively.',
    phoneNumber: '+91 99899 77665', linkedIn: 'linkedin.com/in/fatimakhan', contactEmail: 'fatima.khan@email.com',
    bioDataTemplate: 'hyderabadi-pearl',
  },
  {
    username: 'miamo12', fullName: 'Rohan Mehta', dateOfBirth: '1995-10-12', birthTime: '01:15 PM', birthPlace: 'Delhi',
    height: "6'0\"", weight: '78 kg', complexion: 'Fair', bloodGroup: 'AB+', bodyType: 'Athletic',
    religion: 'Hindu', caste: 'Khatri', subCaste: 'Arora', gotra: 'Bhardwaj', manglik: 'No',
    star: 'Vishakha', raasi: 'Tula (Libra)', motherTongue: 'Hindi',
    education: 'MBA', educationDetail: 'MBA from ISB Hyderabad', college: 'ISB Hyderabad',
    occupation: 'VP Engineering', company: 'Amazon India', annualIncome: '75 Lakh - 1 Cr',
    workingCity: 'Gurgaon', workingCountry: 'India',
    fatherName: 'Ashok Mehta', fatherOccupation: 'Retired Brigadier (Army)',
    motherName: 'Sunanda Mehta', motherOccupation: 'Author',
    brothers: 0, brothersMarried: 0, sisters: 1, sistersMarried: 1,
    familyType: 'Nuclear', familyStatus: 'Rich', familyValues: 'Moderate',
    nativePlace: 'Chandigarh',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Tech leader by profession, fitness enthusiast by passion. Run marathons, read voraciously, and cook Italian food on weekends. Seeking a partner who challenges me intellectually.',
    aboutFamily: 'Father is retired Army Brigadier. Mother is a published author. One sister married and settled in London. Progressive family with strong values.',
    phoneNumber: '+91 99100 22334', linkedIn: 'linkedin.com/in/rohanmehta', contactEmail: 'rohan.mehta@email.com',
    bioDataTemplate: 'modern-minimal',
  },
  {
    username: 'miamo13', fullName: 'Deepika Reddy', dateOfBirth: '2000-08-30', birthTime: '06:00 PM', birthPlace: 'Visakhapatnam',
    height: "5'6\"", weight: '56 kg', complexion: 'Wheatish', bloodGroup: 'O+', bodyType: 'Average',
    religion: 'Hindu', caste: 'Reddy', subCaste: 'Kapu', gotra: 'Goutam', manglik: 'No',
    star: 'Dhanishta', raasi: 'Makara (Capricorn)', motherTongue: 'Telugu',
    education: 'B.Tech/B.E.', educationDetail: 'B.Tech ECE from NIT Warangal', college: 'NIT Warangal',
    occupation: 'Data Scientist', company: 'Flipkart', annualIncome: '15-20 Lakh',
    workingCity: 'Bangalore', workingCountry: 'India',
    fatherName: 'Venkata Reddy', fatherOccupation: 'Farmer & Politician',
    motherName: 'Padma Reddy', motherOccupation: 'Homemaker',
    brothers: 1, brothersMarried: 0, sisters: 1, sistersMarried: 0,
    familyType: 'Joint', familyStatus: 'Rich', familyValues: 'Traditional',
    nativePlace: 'Guntur, Andhra Pradesh',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Data nerds unite! Love crunching numbers by day and Telugu cinema by night. Passionate about using AI for social good. Looking for a caring partner.',
    aboutFamily: 'Prominent Reddy family from Guntur. Father is involved in farming and local politics. Joint family with strong Telugu traditions.',
    phoneNumber: '+91 89779 55443', linkedIn: 'linkedin.com/in/deepikareddy', contactEmail: 'deepika.reddy@email.com',
    bioDataTemplate: 'south-indian-temple',
  },
  {
    username: 'miamo14', fullName: 'Arjun Singh Thakur', dateOfBirth: '1996-03-25', birthTime: '04:00 AM', birthPlace: 'Shimla',
    height: "5'11\"", weight: '76 kg', complexion: 'Fair', bloodGroup: 'A+', bodyType: 'Athletic',
    religion: 'Hindu', caste: 'Thakur', subCaste: 'Rajput', gotra: 'Kaushik', manglik: 'Yes',
    star: 'Krittika', raasi: 'Mesha (Aries)', motherTongue: 'Hindi',
    education: 'B.Tech/B.E.', educationDetail: 'B.Tech from NIT Hamirpur', college: 'NIT Hamirpur',
    occupation: 'Full Stack Developer & Musician', company: 'Paytm', annualIncome: '15-20 Lakh',
    workingCity: 'Noida', workingCountry: 'India',
    fatherName: 'Col. Virendra Thakur', fatherOccupation: 'Retired Army Colonel',
    motherName: 'Kamini Thakur', motherOccupation: 'Government Teacher',
    brothers: 1, brothersMarried: 0, sisters: 1, sistersMarried: 1,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Traditional',
    nativePlace: 'Shimla, Himachal Pradesh',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Mountain boy in the city. Code by day, guitar by night. Love trekking in Himalayas and cooking Pahadi food. Seeking a partner who loves both adventure and stability.',
    aboutFamily: 'Army family from Shimla. Father retired as Colonel. Mother is govt teacher. Sister married, brother in merchant navy.',
    phoneNumber: '+91 94180 55667', linkedIn: 'linkedin.com/in/arjunthakur', contactEmail: 'arjun.thakur@email.com',
    bioDataTemplate: 'royal-rajasthani',
  },
  {
    username: 'miamo15', fullName: 'Priya Nambiar', dateOfBirth: '1998-04-17', birthTime: '10:30 AM', birthPlace: 'Kochi',
    height: "5'4\"", weight: '52 kg', complexion: 'Wheatish', bloodGroup: 'B+', bodyType: 'Slim',
    religion: 'Hindu', caste: 'Nair', subCaste: 'Nambiar', gotra: 'Agastya', manglik: 'No',
    star: 'Revati', raasi: 'Meena (Pisces)', motherTongue: 'Malayalam',
    education: 'M.A.', educationDetail: 'M.A. Mass Communication from SCM Sophia', college: 'Sophia College Mumbai',
    occupation: 'Journalist & Travel Blogger', company: 'NDTV', annualIncome: '10-15 Lakh',
    workingCity: 'Mumbai', workingCountry: 'India',
    fatherName: 'Ramachandran Nambiar', fatherOccupation: 'Naval Officer',
    motherName: 'Devaki Nambiar', motherOccupation: 'School Vice Principal',
    brothers: 0, brothersMarried: 0, sisters: 1, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Kannur, Kerala',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Journalist with wanderlust. Have covered stories from 15 countries, but Kerala chai still hits different. Looking for someone with depth and good humor.',
    aboutFamily: 'Kerala Nair family. Father serves in Indian Navy. Mother is school vice principal. One younger sister studying architecture.',
    phoneNumber: '+91 98470 66778', linkedIn: 'linkedin.com/in/priyanambiar', contactEmail: 'priya.nambiar@email.com',
    bioDataTemplate: 'kerala-kasavu',
  },
  {
    username: 'miamo16', fullName: 'Mohit Agarwal', dateOfBirth: '1995-12-01', birthTime: '08:00 AM', birthPlace: 'Jaipur',
    height: "5'9\"", weight: '70 kg', complexion: 'Fair', bloodGroup: 'O+', bodyType: 'Average',
    religion: 'Hindu', caste: 'Agarwal', subCaste: 'Bansal', gotra: 'Garg', manglik: 'No',
    star: 'Mrigashira', raasi: 'Vrishabha (Taurus)', motherTongue: 'Hindi',
    education: 'MBA', educationDetail: 'MBA from FMS Delhi', college: 'FMS Delhi University',
    occupation: 'Product Manager', company: 'Razorpay', annualIncome: '30-50 Lakh',
    workingCity: 'Bangalore', workingCountry: 'India',
    fatherName: 'Rajendra Agarwal', fatherOccupation: 'Jeweler',
    motherName: 'Saroj Agarwal', motherOccupation: 'Homemaker',
    brothers: 1, brothersMarried: 1, sisters: 0, sistersMarried: 0,
    familyType: 'Joint', familyStatus: 'Rich', familyValues: 'Traditional',
    nativePlace: 'Jaipur, Rajasthan',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Product thinker building fintech at Razorpay. Love Rajasthani food, startup culture, and meditation. Looking for a vegetarian, family-oriented partner.',
    aboutFamily: 'Marwari joint family. Father has jewelry business in Jaipur. Elder brother married, managing Delhi branch. Traditional values with modern education.',
    phoneNumber: '+91 99280 33445', linkedIn: 'linkedin.com/in/mohitagarwal', contactEmail: 'mohit.agarwal@email.com',
    bioDataTemplate: 'royal-rajasthani',
  },
  {
    username: 'miamo17', fullName: 'Ishita Banerjee', dateOfBirth: '1999-09-08', birthTime: '11:45 AM', birthPlace: 'Kolkata',
    height: "5'3\"", weight: '49 kg', complexion: 'Fair', bloodGroup: 'A+', bodyType: 'Slim',
    religion: 'Hindu', caste: 'Kayastha', subCaste: 'Bose', gotra: 'Sandilya', manglik: 'No',
    star: 'Chitra', raasi: 'Tula (Libra)', motherTongue: 'Bengali',
    education: 'M.A.', educationDetail: 'M.A. Fine Arts from Visva-Bharati', college: 'Visva-Bharati Shantiniketan',
    occupation: 'Pastry Chef & Artist', company: 'Own Bakery', annualIncome: '8-10 Lakh',
    workingCity: 'Kolkata', workingCountry: 'India',
    fatherName: 'Soumitra Banerjee', fatherOccupation: 'Film Director',
    motherName: 'Rupa Banerjee', motherOccupation: 'Classical Singer',
    brothers: 0, brothersMarried: 0, sisters: 1, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Liberal',
    nativePlace: 'Shantiniketan, West Bengal',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Art runs in my blood. Run a boutique bakery in South Kolkata. Paint on weekends. Looking for someone who appreciates art, food, and Bengali culture.',
    aboutFamily: 'Artistic Bengali family. Father is a national award-winning film director. Mother is a Rabindra Sangeet singer. Very progressive household.',
    phoneNumber: '+91 98310 44556', linkedIn: 'linkedin.com/in/ishitabanerjee', contactEmail: 'ishita.banerjee@email.com',
    bioDataTemplate: 'bengali-lal-paar',
  },
  {
    username: 'miamo18', fullName: 'Vivek Yadav', dateOfBirth: '1997-07-15', birthTime: '02:00 PM', birthPlace: 'Patna',
    height: "5'10\"", weight: '73 kg', complexion: 'Wheatish', bloodGroup: 'B+', bodyType: 'Athletic',
    religion: 'Hindu', caste: 'Yadav', subCaste: 'Ahir', gotra: 'Atri', manglik: 'No',
    star: 'Punarvasu', raasi: 'Mithuna (Gemini)', motherTongue: 'Hindi',
    education: 'LLB', educationDetail: 'B.A. LLB from NLSIU Bangalore', college: 'NLSIU Bangalore',
    occupation: 'Corporate Lawyer', company: 'AZB & Partners', annualIncome: '20-30 Lakh',
    workingCity: 'Mumbai', workingCountry: 'India',
    fatherName: 'Rameshwar Yadav', fatherOccupation: 'IPS Officer',
    motherName: 'Savitri Yadav', motherOccupation: 'Doctor (Gynecologist)',
    brothers: 1, brothersMarried: 0, sisters: 0, sistersMarried: 0,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Patna, Bihar',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'Occasionally', smoking: 'No',
    aboutMe: 'Lawyer by profession, photographer by passion. Love debating, cricket, and biryani. From Bihar, proud of my roots. Looking for someone ambitious and grounded.',
    aboutFamily: 'Father is IPS officer, mother is a renowned gynecologist. One younger brother studying at AIIMS. Education-first family.',
    phoneNumber: '+91 98350 77889', linkedIn: 'linkedin.com/in/vivekyadav', contactEmail: 'vivek.yadav@email.com',
    bioDataTemplate: 'modern-minimal',
  },
  {
    username: 'miamo19', fullName: 'Sara Sheikh', dateOfBirth: '1998-11-03', birthTime: '07:00 PM', birthPlace: 'Lucknow',
    height: "5'5\"", weight: '53 kg', complexion: 'Fair', bloodGroup: 'AB+', bodyType: 'Slim',
    religion: 'Muslim', caste: 'Sheikh', subCaste: 'Qureshi', gotra: '', manglik: 'No',
    star: 'Jyeshtha', raasi: 'Vrischika (Scorpio)', motherTongue: 'Urdu',
    education: 'M.A.', educationDetail: 'M.A. Theatre from NSD', college: 'National School of Drama',
    occupation: 'Actress & Voice Artist', company: 'Freelance', annualIncome: '10-15 Lakh',
    workingCity: 'Mumbai', workingCountry: 'India',
    fatherName: 'Irfan Sheikh', fatherOccupation: 'Poet & Professor',
    motherName: 'Nafisa Sheikh', motherOccupation: 'Headmistress',
    brothers: 1, brothersMarried: 0, sisters: 1, sistersMarried: 1,
    familyType: 'Nuclear', familyStatus: 'Upper Middle Class', familyValues: 'Moderate',
    nativePlace: 'Lucknow, UP',
    maritalStatus: 'Never Married', diet: 'Non-Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Theatre-trained actress from NSD. Love Urdu poetry, ghazals, and Lucknowi cuisine. Looking for someone who appreciates art and has zubaan ki tehzeeb.',
    aboutFamily: 'Cultural Muslim family from Lucknow. Father is published poet and AMU professor. Mother runs a girls school. Very progressive with Awadhi values.',
    phoneNumber: '+91 99300 11234', linkedIn: 'linkedin.com/in/sarasheikh', contactEmail: 'sara.sheikh@email.com',
    bioDataTemplate: 'mughal-royal',
  },
  {
    username: 'miamo20', fullName: 'Nikhil Verma', dateOfBirth: '1996-06-08', birthTime: '05:30 AM', birthPlace: 'Bhopal',
    height: "5'8\"", weight: '68 kg', complexion: 'Wheatish', bloodGroup: 'O+', bodyType: 'Average',
    religion: 'Hindu', caste: 'Verma', subCaste: 'Kurmi', gotra: 'Vashishtha', manglik: 'Partial / Anshik',
    star: 'Bharani', raasi: 'Mesha (Aries)', motherTongue: 'Hindi',
    education: 'Ph.D.', educationDetail: 'Ph.D. in Physics from IISc', college: 'IISc Bangalore',
    occupation: 'Research Professor', company: 'IISc Bangalore', annualIncome: '15-20 Lakh',
    workingCity: 'Bangalore', workingCountry: 'India',
    fatherName: 'Dinesh Verma', fatherOccupation: 'Railway Engineer',
    motherName: 'Meena Verma', motherOccupation: 'Homemaker',
    brothers: 2, brothersMarried: 1, sisters: 1, sistersMarried: 1,
    familyType: 'Joint', familyStatus: 'Middle Class', familyValues: 'Traditional',
    nativePlace: 'Bhopal, MP',
    maritalStatus: 'Never Married', diet: 'Vegetarian', drinking: 'No', smoking: 'No',
    aboutMe: 'Physicist exploring the universe from a lab in Bangalore. Love chess, classical music, and cooking. From a simple family, value education and humility.',
    aboutFamily: 'Middle-class family from Bhopal. Father worked in Railways. Three siblings. Elder brother married, younger sister pursuing PhD abroad. Joint family values.',
    phoneNumber: '+91 98450 99887', linkedIn: 'linkedin.com/in/nikhilverma', contactEmail: 'nikhil.verma@email.com',
    bioDataTemplate: 'modern-minimal',
  },
];

async function main() {
  console.log('🕉 Seeding DTM (Date to Marry) data...');

  // Delete existing DTM data
  await prisma.bioDataAccessRequest.deleteMany();
  await prisma.matrimonialProfile.deleteMany();
  console.log('  ✓ Cleaned existing matrimonial data');

  // Get user IDs by username
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const userMap = new Map(users.map(u => [u.username, u.id]));

  // Create profiles
  for (const p of DTM_PROFILES) {
    const userId = userMap.get(p.username);
    if (!userId) { console.log(`  ⚠ User ${p.username} not found, skipping`); continue; }

    await prisma.matrimonialProfile.create({
      data: {
        userId,
        fullName: p.fullName,
        dateOfBirth: new Date(p.dateOfBirth),
        birthTime: p.birthTime,
        birthPlace: p.birthPlace,
        height: p.height,
        weight: p.weight,
        complexion: p.complexion,
        bloodGroup: p.bloodGroup,
        bodyType: p.bodyType,
        religion: p.religion,
        caste: p.caste,
        subCaste: p.subCaste,
        gotra: p.gotra,
        manglik: p.manglik,
        star: p.star,
        raasi: p.raasi,
        motherTongue: p.motherTongue,
        education: p.education,
        educationDetail: p.educationDetail,
        college: p.college,
        occupation: p.occupation,
        company: p.company,
        annualIncome: p.annualIncome,
        workingCity: p.workingCity,
        workingCountry: p.workingCountry,
        fatherName: p.fatherName,
        fatherOccupation: p.fatherOccupation,
        motherName: p.motherName,
        motherOccupation: p.motherOccupation,
        brothers: p.brothers,
        brothersMarried: p.brothersMarried,
        sisters: p.sisters,
        sistersMarried: p.sistersMarried,
        familyType: p.familyType,
        familyStatus: p.familyStatus,
        familyValues: p.familyValues,
        nativePlace: p.nativePlace,
        maritalStatus: p.maritalStatus,
        diet: p.diet,
        drinking: p.drinking,
        smoking: p.smoking,
        aboutMe: p.aboutMe,
        aboutFamily: p.aboutFamily,
        phoneNumber: p.phoneNumber,
        linkedIn: p.linkedIn,
        contactEmail: p.contactEmail,
        bioDataTemplate: p.bioDataTemplate,
        bioDataGenerated: true,
        idVerified: Math.random() > 0.3,
        photosPublic: true,
      },
    });
  }
  console.log('  ✓ Created 20 matrimonial profiles');

  // Create some access requests between users for testing
  const profiles = await prisma.matrimonialProfile.findMany({ select: { id: true, userId: true } });
  const profileMap = new Map(profiles.map(p => [p.userId, p.id]));

  // miamo2 requests phone access from miamo1
  const m1Id = profileMap.get(userMap.get('miamo1')!);
  const m2Id = profileMap.get(userMap.get('miamo2')!);
  const m3Id = profileMap.get(userMap.get('miamo3')!);
  const m4Id = profileMap.get(userMap.get('miamo4')!);
  const m5Id = profileMap.get(userMap.get('miamo5')!);
  const m6Id = profileMap.get(userMap.get('miamo6')!);
  const m7Id = profileMap.get(userMap.get('miamo7')!);
  const m8Id = profileMap.get(userMap.get('miamo8')!);

  if (m1Id && m2Id && m3Id && m4Id && m5Id && m6Id && m7Id && m8Id) {
    const accessRequests = [
      // Incoming requests for miamo1 (to test access control)
      { ownerId: m1Id, requesterId: m2Id, accessType: 'phone', status: 'pending', message: 'I would like to connect with you' },
      { ownerId: m1Id, requesterId: m3Id, accessType: 'bioData', status: 'pending', message: 'Interested in your profile' },
      { ownerId: m1Id, requesterId: m4Id, accessType: 'linkedin', status: 'granted', message: 'Would love to connect professionally', grantedAt: new Date() },
      { ownerId: m1Id, requesterId: m5Id, accessType: 'email', status: 'denied', message: 'Hi, please share email' },
      { ownerId: m1Id, requesterId: m6Id, accessType: 'photos', status: 'pending', message: 'Your profile looks interesting' },
      { ownerId: m1Id, requesterId: m7Id, accessType: 'horoscope', status: 'granted', message: 'Want to check kundli match', grantedAt: new Date() },
      // Sent requests from miamo1
      { ownerId: m2Id, requesterId: m1Id, accessType: 'phone', status: 'granted', message: 'Hi, interested in your profile', grantedAt: new Date() },
      { ownerId: m3Id, requesterId: m1Id, accessType: 'bioData', status: 'pending', message: 'Want to see your bio data' },
      { ownerId: m4Id, requesterId: m1Id, accessType: 'linkedin', status: 'denied', message: 'Professional connect' },
      { ownerId: m8Id, requesterId: m1Id, accessType: 'phone', status: 'pending', message: 'Hi, like your profile' },
      // Cross requests for other users
      { ownerId: m3Id, requesterId: m4Id, accessType: 'phone', status: 'granted', message: 'Interested', grantedAt: new Date() },
      { ownerId: m5Id, requesterId: m6Id, accessType: 'bioData', status: 'pending', message: 'Profile matches my preferences' },
      { ownerId: m7Id, requesterId: m8Id, accessType: 'email', status: 'granted', message: 'Want to connect', grantedAt: new Date() },
    ];

    for (const req of accessRequests) {
      await prisma.bioDataAccessRequest.create({ data: req as any });
    }
    console.log('  ✓ Created 13 access requests (mixed statuses)');
  }

  console.log('\n✅ DTM seeding complete!');
  console.log('   20 matrimonial profiles with full details');
  console.log('   13 access requests for testing');
  console.log('   All profiles have: DOB, nakshatra, raasi, gotra, family, education, career');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('DTM Seed error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
