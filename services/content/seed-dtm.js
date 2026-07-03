const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDTM() {
  const users = await prisma.user.findMany({ select: { id: true, displayName: true }, orderBy: { createdAt: 'asc' } });
  console.log('Found', users.length, 'users');

  const gotras = ['Kashyap','Bharadwaj','Vashishta','Vishwamitra','Gautam','Jamadagni','Atri','Agastya'];
  const nakshatras = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  const manglikOpts = ['Yes','No','Partial'];
  const tongues = ['Hindi','Tamil','Telugu','Kannada','Malayalam','Bengali','Marathi','Gujarati','Punjabi','English'];
  const familyTypes = ['Nuclear','Joint','Extended'];
  const familyValues = ['Traditional','Moderate','Liberal'];
  const templates = ['royal-rajasthani','south-indian-silk','mughal-elegance','modern-minimal','punjabi-phulkari','bengali-alpona','gujarati-bandhani','kerala-kasavu','marathi-paithani','kashmiri-pashmina'];
  const cities = ['Mumbai','Delhi','Chennai','Bangalore','Kolkata','Hyderabad','Jaipur','Lucknow','Pune','Ahmedabad'];
  const educations = ['B.Tech','M.Tech','MBA','MBBS','CA','BBA','B.Sc','M.Sc','PhD','LLB'];
  const occupations = ['Software Engineer','Doctor','CA','Lawyer','Business','Teacher','Banker','Civil Servant','Architect','Data Scientist'];
  const companies = ['Google','Infosys','TCS','Wipro','Amazon','Microsoft','Flipkart','Deloitte','HDFC','Self-employed'];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const dob = new Date(1990 + (i % 10), (i % 12), (i % 28) + 1);

    await prisma.matrimonialProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        fullName: u.displayName || 'User ' + (i+1),
        dateOfBirth: dob,
        birthTime: String((5 + i) % 24).padStart(2,'0') + ':' + String((i * 7) % 60).padStart(2,'0'),
        birthPlace: cities[i % cities.length],
        height: (5 + Math.floor(i/10)) + "'" + ((i % 10) + 2) + '"',
        weight: String(55 + i * 2) + ' kg',
        complexion: ['Fair','Wheatish','Medium','Dark'][i % 4],
        bloodGroup: ['A+','B+','O+','AB+','A-','B-'][i % 6],
        religion: 'Hindu',
        caste: ['Brahmin','Kshatriya','Vaishya','Kayastha'][i % 4],
        subCaste: ['Saraswat','Gaur','Kanyakubj','Maithil','Saryuparin'][i % 5],
        gotra: gotras[i % gotras.length],
        manglik: manglikOpts[i % manglikOpts.length],
        star: nakshatras[i % nakshatras.length],
        nakshatra: nakshatras[i % nakshatras.length],
        raasi: ['Mesh','Vrishabh','Mithun','Kark','Singh','Kanya','Tula','Vrishchik','Dhanu','Makar','Kumbh','Meen'][i % 12],
        motherTongue: tongues[i % tongues.length],
        education: educations[i % educations.length],
        educationDetail: educations[i % educations.length] + ' from IIT/IIM',
        occupation: occupations[i % occupations.length],
        company: companies[i % companies.length],
        annualIncome: String(8 + i * 2) + ' LPA',
        workingCity: cities[i % cities.length],
        fatherName: 'Mr. Sharma Sr ' + (i+1),
        fatherOccupation: 'Retired Govt.',
        motherName: 'Mrs. Sharma ' + (i+1),
        motherOccupation: 'Homemaker',
        brothers: i % 3,
        sisters: i % 2,
        familyType: familyTypes[i % familyTypes.length],
        familyValues: familyValues[i % familyValues.length],
        familyStatus: ['Middle Class','Upper Middle','Rich'][i % 3],
        nativePlace: cities[(i + 3) % cities.length],
        maritalStatus: 'Never Married',
        diet: ['Vegetarian','Non-Vegetarian','Eggetarian'][i % 3],
        horoscopeMatch: i % 2 === 0,
        numerologyNumber: (i % 9) + 1,
        destinyNumber: ((i + 3) % 9) + 1,
        soulNumber: ((i + 5) % 9) + 1,
        aboutMe: 'Looking for a life partner who values family and growth. Love music, travel and good food.',
        aboutFamily: 'We are a close-knit family with strong values and mutual respect.',
        partnerAgeMin: 22,
        partnerAgeMax: 32,
        partnerReligion: 'Hindu',
        partnerEducation: 'Graduate+',
        partnerCity: cities[(i + 5) % cities.length],
        bioDataTemplate: templates[i % templates.length],
        bioDataPublic: i % 3 !== 0,
        photosPublic: true,
      },
    });
  }

  console.log('Created', users.length, 'matrimonial profiles');

  // Access requests
  if (users.length >= 4) {
    const pairs = [
      [users[1].id, users[0].id, 'granted'],
      [users[2].id, users[0].id, 'pending'],
      [users[3].id, users[0].id, 'pending'],
      [users[0].id, users[1].id, 'granted'],
      [users[0].id, users[2].id, 'pending'],
    ];
    for (const p of pairs) {
      try {
        await prisma.bioDataAccessRequest.create({
          data: { requesterId: p[0], targetUserId: p[1], accessType: 'biodata', status: p[2], message: 'Interested in your profile' },
        });
      } catch (e) {
        // skip duplicates
      }
    }
    console.log('Created access requests');
  }

  console.log('DTM seed complete!');
  await prisma.$disconnect();
}

seedDTM().catch(e => { console.error(e); process.exit(1); });
