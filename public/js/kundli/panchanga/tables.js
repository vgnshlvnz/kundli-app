// Name tables for the panchanga. Table-driven: no name is computed with arithmetic on strings.

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

export const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu' }, { name: 'Bharani', lord: 'Venus' },
  { name: 'Krittika', lord: 'Sun' }, { name: 'Rohini', lord: 'Moon' },
  { name: 'Mrigashira', lord: 'Mars' }, { name: 'Ardra', lord: 'Rahu' },
  { name: 'Punarvasu', lord: 'Jupiter' }, { name: 'Pushya', lord: 'Saturn' },
  { name: 'Ashlesha', lord: 'Mercury' }, { name: 'Magha', lord: 'Ketu' },
  { name: 'Purva Phalguni', lord: 'Venus' }, { name: 'Uttara Phalguni', lord: 'Sun' },
  { name: 'Hasta', lord: 'Moon' }, { name: 'Chitra', lord: 'Mars' },
  { name: 'Swati', lord: 'Rahu' }, { name: 'Vishakha', lord: 'Jupiter' },
  { name: 'Anuradha', lord: 'Saturn' }, { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Ketu' }, { name: 'Purva Ashadha', lord: 'Venus' },
  { name: 'Uttara Ashadha', lord: 'Sun' }, { name: 'Shravana', lord: 'Moon' },
  { name: 'Dhanishta', lord: 'Mars' }, { name: 'Shatabhisha', lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' }, { name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { name: 'Revati', lord: 'Mercury' }
];

export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

// The 60 karanas of a lunar month (half-tithis), index 0-59:
//   #1 Kimstughna, #2-#57 the seven movable karanas repeating eight times,
//   #58 Shakuni, #59 Chatushpada, #60 Naga.
const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];
export const KARANA_NAMES = [
  'Kimstughna',
  ...Array.from({ length: 56 }, (_, i) => MOVABLE_KARANAS[i % 7]),
  'Shakuni', 'Chatushpada', 'Naga'
];
export const isFixedKarana = index => index === 0 || index >= 57;

export const PAKSHA = [
  { name: 'shukla', english: 'Waxing' },
  { name: 'krishna', english: 'Waning' }
];

export const VARA_NAMES = [
  { name: 'Ravivara', english: 'Sunday' },
  { name: 'Somavara', english: 'Monday' },
  { name: 'Mangalavara', english: 'Tuesday' },
  { name: 'Budhavara', english: 'Wednesday' },
  { name: 'Guruvara', english: 'Thursday' },
  { name: 'Shukravara', english: 'Friday' },
  { name: 'Shanivara', english: 'Saturday' }
];

// Weekday lords, Sunday first; the hora sequence is the Chaldean order starting at the day lord.
export const VARA_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

// Lunar months, indexed by the Sun's sidereal sign (0 = Mesha) at the month's opening new moon
// plus one: Sun in Meena at the new moon -> Chaitra.
export const LUNAR_MONTHS = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashwina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'
];

// Spellings match public/js/kundli/i18n TAMIL_MONTHS. Index = sidereal sign of the Sun (0 = Mesha).
export const TAMIL_MONTHS = [
  'Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Avani', 'Purattasi',
  'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Maasi', 'Panguni'
];

// The 60-year (samvatsara) cycle. Index 0 = Prabhava = the Tamil year that began in April 1987.
export const YEAR60_NAMES = [
  'Prabhava', 'Vibhava', 'Shukla', 'Pramodoota', 'Prajotpatti', 'Angirasa', 'Srimukha',
  'Bhava', 'Yuva', 'Dhatu', 'Isvara', 'Vegudhanya', 'Pramathi', 'Vikrama', 'Vishu',
  'Chitrabhanu', 'Subhanu', 'Dharana', 'Parthiva', 'Viya', 'Sarvajit', 'Sarvadhari',
  'Virodhi', 'Vikruti', 'Kara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi',
  'Hevilambi', 'Vilambi', 'Vikari', 'Sarvari', 'Plava', 'Subakrit', 'Sobhakrit', 'Krodhi',
  'Visuvasu', 'Parabhava', 'Plavanga', 'Keelaka', 'Soumya', 'Sadharana', 'Virodhikrit',
  'Paridhabi', 'Pramadicha', 'Anandha', 'Rakshasa', 'Nala', 'Pingala', 'Kalayukthi',
  'Siddharthi', 'Raudhri', 'Dunmathi', 'Dundubhi', 'Rudhrothgari', 'Raktakshi',
  'Krodhana', 'Akshaya'
];
export const YEAR60_EPOCH = 1987;
