// Interface text in English and Tamil
// UI strings are looked up by key; astrological names coming from the
// calculation modules (signs, planets, nakshatras, tithis...) are looked up
// by their English name, so those modules stay language-neutral.

export const LANGUAGES = ['en', 'ta'];

const STRINGS = {
  en: {
    'app.title': 'Vedic Kundli Calculator',
    'app.subtitle': 'Birth chart, divisional charts, dashas and panchanga, computed in your browser',
    'form.heading': 'Birth Details',
    'form.name': 'Name',
    'form.namePlaceholder': 'Your name',
    'form.date': 'Date of Birth',
    'form.time': 'Time of Birth',
    'form.location': 'Birth Location',
    'form.locationPlaceholder': 'Search city...',
    'form.submit': 'Calculate Kundli',
    'options.heading': 'Chart Options',
    'options.ayanamsa': 'Ayanamsa',
    'options.lahiri': 'Lahiri (Champaneri)',
    'options.raman': 'Raman',
    'options.krishnamurti': 'Krishnamurti',
    'options.house': 'House System',
    'options.wholesign': 'Whole Sign',
    'options.equal': 'Equal',
    'options.placidus': 'Placidus',
    'options.style': 'Chart Style',
    'options.basic': 'Basic',
    'options.advanced': 'Advanced',
    'options.hint': 'Changes apply to the current chart straight away. Advanced adds Navamsa, Vimshottari, Panchanga and KP.',
    'results.heading': 'Your Chart',
    'results.pdf': 'Download PDF',
    'tab.rasi': 'Rasi (D1)',
    'tab.navamsa': 'Navamsa (D9)',
    'tab.planets': 'Planets',
    'tab.vimshottari': 'Vimshottari',
    'tab.panchanga': 'Panchanga',
    'tab.kp': 'KP',
    'language.label': 'Language',
    'install.ios': 'Install this app: tap the Share button, then "Add to Home Screen".',
    'install.close': 'Dismiss',
    'location.noMatch': 'No places match "{query}". Try another spelling.',
    'location.unavailable': 'Location search is unavailable right now. Please try again later.',
    'location.centroid': 'centroid',
    'timezone.label': 'Timezone: {tz}',
    'timezone.resolved': 'Timezone: {tz} (resolved)',
    'chart.lagna': 'Lagna',
    'chart.asc': 'Asc',
    'chart.retroMark': '(R)',
    'chart.retrograde': 'retrograde',
    'chart.aria': '{title} chart, South Indian style',
    'rasi.heading': 'Rasi Chart (D1)',
    'rasi.title': 'Rasi',
    'rasi.ascendant': 'Ascendant (Lagna)',
    'navamsa.heading': 'Navamsa Chart (D9)',
    'navamsa.title': 'Navamsa',
    'navamsa.ascendant': 'Navamsa Ascendant',
    'col.planet': 'Planet',
    'col.sign': 'Sign',
    'col.degree': 'Degree',
    'col.house': 'House',
    'col.retrograde': 'Retrograde',
    'col.nakshatra': 'Nakshatra',
    'col.pada': 'Pada',
    'col.speed': 'Speed',
    'col.start': 'Start',
    'col.end': 'End',
    'col.duration': 'Duration (years)',
    'col.current': 'Current',
    'col.starLord': 'Star Lord',
    'col.subLord': 'Sub Lord',
    'col.subSubLord': 'Sub-Sub Lord',
    'col.signLord': 'Sign Lord',
    'col.cusp': 'Cusp',
    'yes': 'Yes',
    'no': 'No',
    'na': 'N/A',
    'perDay': '°/day',
    'planets.heading': 'Planet Positions',
    'dasha.heading': 'Vimshottari Dasha',
    'dasha.born': 'Born',
    'dasha.moonNakshatra': 'Moon Nakshatra',
    'dasha.lord': 'Lord',
    'dasha.currentMahadasha': 'Current Mahadasha',
    'dasha.currentBhukti': 'Current Bhukti',
    'dasha.timeline': 'Mahadasha Timeline',
    'panchanga.heading': 'Panchanga',
    'panchanga.tithi': 'Tithi',
    'panchanga.elapsed': '{percent}% elapsed',
    'panchanga.paksha': 'Paksha',
    'panchanga.nakshatra': 'Nakshatra',
    'panchanga.yoga': 'Yoga',
    'panchanga.karana': 'Karana',
    'panchanga.fixed': '(fixed)',
    'panchanga.vara': 'Vara',
    'panchanga.tamilMonth': 'Tamil Month',
    'panchanga.sunrise': 'Sunrise',
    'panchanga.sunset': 'Sunset',
    'kp.heading': 'KP Astrology',
    'kp.planetSubLords': 'Planet Sub-Lords',
    'kp.cuspSubLords': 'House Cusp Sub-Lords',
    'facts.lagna': 'Lagna',
    'facts.moonSign': 'Moon Sign',
    'facts.birthStar': 'Birth Star',
    'facts.currentDasha': 'Current Dasha',
    'print.heading': 'Vedic Birth Chart',
    'print.name': 'Name',
    'print.born': 'Born',
    'print.place': 'Place',
    'print.ayanamsa': 'Ayanamsa',
    'print.houses': 'Houses',
    'pdf.fileName': 'Kundli - {name}'
  },
  ta: {
    'app.title': 'வேத ஜாதகக் கணிப்பான்',
    'app.subtitle': 'ராசி, அம்சம், தசை, பஞ்சாங்கம் — உங்கள் உலாவியிலேயே கணிக்கப்படுகிறது',
    'form.heading': 'பிறப்பு விவரங்கள்',
    'form.name': 'பெயர்',
    'form.namePlaceholder': 'உங்கள் பெயர்',
    'form.date': 'பிறந்த தேதி',
    'form.time': 'பிறந்த நேரம்',
    'form.location': 'பிறந்த இடம்',
    'form.locationPlaceholder': 'நகரைத் தேடுக...',
    'form.submit': 'ஜாதகம் கணி',
    'options.heading': 'ஜாதக அமைப்புகள்',
    'options.ayanamsa': 'அயனாம்சம்',
    'options.lahiri': 'லாஹிரி',
    'options.raman': 'ராமன்',
    'options.krishnamurti': 'கிருஷ்ணமூர்த்தி',
    'options.house': 'பாவ முறை',
    'options.wholesign': 'முழு ராசி',
    'options.equal': 'சம பாவம்',
    'options.placidus': 'பிளாசிடஸ்',
    'options.style': 'காட்சி முறை',
    'options.basic': 'அடிப்படை',
    'options.advanced': 'விரிவானது',
    'options.hint': 'மாற்றங்கள் தற்போதைய ஜாதகத்தில் உடனே பொருந்தும். "விரிவானது" தேர்வில் நவாம்சம், விம்சோத்தரி, பஞ்சாங்கம், கே.பி. ஆகியவை சேரும்.',
    'results.heading': 'உங்கள் ஜாதகம்',
    'results.pdf': 'PDF பதிவிறக்கு',
    'tab.rasi': 'ராசி (D1)',
    'tab.navamsa': 'நவாம்சம் (D9)',
    'tab.planets': 'கிரகங்கள்',
    'tab.vimshottari': 'விம்சோத்தரி',
    'tab.panchanga': 'பஞ்சாங்கம்',
    'tab.kp': 'கே.பி.',
    'language.label': 'மொழி',
    'install.ios': 'இந்த செயலியை நிறுவ: பகிர் (Share) பொத்தானைத் தட்டி, "முகப்புத் திரையில் சேர்" (Add to Home Screen) என்பதைத் தேர்ந்தெடுக்கவும்.',
    'install.close': 'மூடு',
    'location.noMatch': '"{query}" என்ற இடம் கிடைக்கவில்லை. வேறு எழுத்துக்கூட்டலில் முயலவும்.',
    'location.unavailable': 'இடத் தேடல் தற்போது இயங்கவில்லை. பிறகு மீண்டும் முயலவும்.',
    'location.centroid': 'மையப்புள்ளி',
    'timezone.label': 'நேர மண்டலம்: {tz}',
    'timezone.resolved': 'நேர மண்டலம்: {tz} (உறுதிசெய்யப்பட்டது)',
    'chart.lagna': 'லக்னம்',
    'chart.asc': 'லக்',
    'chart.retroMark': '(வ)',
    'chart.retrograde': 'வக்கிரம்',
    'chart.aria': '{title} சக்கரம், தென்னிந்திய முறை',
    'rasi.heading': 'ராசி சக்கரம் (D1)',
    'rasi.title': 'ராசி',
    'rasi.ascendant': 'லக்னம்',
    'navamsa.heading': 'நவாம்ச சக்கரம் (D9)',
    'navamsa.title': 'நவாம்சம்',
    'navamsa.ascendant': 'நவாம்ச லக்னம்',
    'col.planet': 'கிரகம்',
    'col.sign': 'ராசி',
    'col.degree': 'பாகை',
    'col.house': 'பாவம்',
    'col.retrograde': 'வக்கிரம்',
    'col.nakshatra': 'நட்சத்திரம்',
    'col.pada': 'பாதம்',
    'col.speed': 'வேகம்',
    'col.start': 'தொடக்கம்',
    'col.end': 'முடிவு',
    'col.duration': 'காலம் (ஆண்டுகள்)',
    'col.current': 'நடப்பு',
    'col.starLord': 'நட்சத்திர அதிபதி',
    'col.subLord': 'உப அதிபதி',
    'col.subSubLord': 'உப-உப அதிபதி',
    'col.signLord': 'ராசி அதிபதி',
    'col.cusp': 'பாவ முனை',
    'yes': 'ஆம்',
    'no': 'இல்லை',
    'na': 'பொருந்தாது',
    'perDay': '°/நாள்',
    'planets.heading': 'கிரக நிலைகள்',
    'dasha.heading': 'விம்சோத்தரி தசை',
    'dasha.born': 'பிறப்பு',
    'dasha.moonNakshatra': 'சந்திர நட்சத்திரம்',
    'dasha.lord': 'அதிபதி',
    'dasha.currentMahadasha': 'நடப்பு மகா தசை',
    'dasha.currentBhukti': 'நடப்பு புக்தி',
    'dasha.timeline': 'மகா தசை காலவரிசை',
    'panchanga.heading': 'பஞ்சாங்கம்',
    'panchanga.tithi': 'திதி',
    'panchanga.elapsed': '{percent}% கடந்தது',
    'panchanga.paksha': 'பட்சம்',
    'panchanga.nakshatra': 'நட்சத்திரம்',
    'panchanga.yoga': 'யோகம்',
    'panchanga.karana': 'கரணம்',
    'panchanga.fixed': '(ஸ்திர கரணம்)',
    'panchanga.vara': 'வாரம்',
    'panchanga.tamilMonth': 'தமிழ் மாதம்',
    'panchanga.sunrise': 'சூரிய உதயம்',
    'panchanga.sunset': 'சூரிய அஸ்தமனம்',
    'kp.heading': 'கே.பி. ஜோதிடம்',
    'kp.planetSubLords': 'கிரக உப அதிபதிகள்',
    'kp.cuspSubLords': 'பாவ முனை உப அதிபதிகள்',
    'facts.lagna': 'லக்னம்',
    'facts.moonSign': 'சந்திர ராசி',
    'facts.birthStar': 'ஜன்ம நட்சத்திரம்',
    'facts.currentDasha': 'நடப்பு தசை',
    'print.heading': 'வேத ஜாதகம்',
    'print.name': 'பெயர்',
    'print.born': 'பிறப்பு',
    'print.place': 'இடம்',
    'print.ayanamsa': 'அயனாம்சம்',
    'print.houses': 'பாவ முறை',
    'pdf.fileName': 'ஜாதகம் - {name}'
  }
};

// Tamil names keyed by the English names the calculation modules return
const TERMS_TA = {
  // Signs
  Aries: 'மேஷம்', Taurus: 'ரிஷபம்', Gemini: 'மிதுனம்', Cancer: 'கடகம்',
  Leo: 'சிம்மம்', Virgo: 'கன்னி', Libra: 'துலாம்', Scorpio: 'விருச்சிகம்',
  Sagittarius: 'தனுசு', Capricorn: 'மகரம்', Aquarius: 'கும்பம்', Pisces: 'மீனம்',
  // Planets
  Sun: 'சூரியன்', Moon: 'சந்திரன்', Mars: 'செவ்வாய்', Mercury: 'புதன்', Jupiter: 'குரு',
  Venus: 'சுக்கிரன்', Saturn: 'சனி', Rahu: 'ராகு', Ketu: 'கேது',
  // Nakshatras
  Ashwini: 'அசுவினி', Bharani: 'பரணி', Krittika: 'கிருத்திகை', Rohini: 'ரோகிணி',
  Mrigashira: 'மிருகசீரிடம்', Ardra: 'திருவாதிரை', Punarvasu: 'புனர்பூசம்', Pushya: 'பூசம்',
  Ashlesha: 'ஆயில்யம்', Magha: 'மகம்', 'Purva Phalguni': 'பூரம்', 'Uttara Phalguni': 'உத்திரம்',
  Hasta: 'அஸ்தம்', Chitra: 'சித்திரை', Swati: 'சுவாதி', Vishakha: 'விசாகம்',
  Anuradha: 'அனுஷம்', Jyeshtha: 'கேட்டை', Mula: 'மூலம்', 'Purva Ashadha': 'பூராடம்',
  'Uttara Ashadha': 'உத்திராடம்', Shravana: 'திருவோணம்', Dhanishta: 'அவிட்டம்', Shatabhisha: 'சதயம்',
  'Purva Bhadrapada': 'பூரட்டாதி', 'Uttara Bhadrapada': 'உத்திரட்டாதி', Revati: 'ரேவதி',
  // Tithis
  Pratipada: 'பிரதமை', Dwitiya: 'துவிதியை', Tritiya: 'திருதியை', Chaturthi: 'சதுர்த்தி',
  Panchami: 'பஞ்சமி', Shashthi: 'சஷ்டி', Saptami: 'சப்தமி', Ashtami: 'அஷ்டமி',
  Navami: 'நவமி', Dashami: 'தசமி', Ekadashi: 'ஏகாதசி', Dwadashi: 'துவாதசி',
  Trayodashi: 'திரயோதசி', Chaturdashi: 'சதுர்த்தசி', Purnima: 'பௌர்ணமி', Amavasya: 'அமாவாசை',
  // Paksha
  Waxing: 'வளர்பிறை', Waning: 'தேய்பிறை', shukla: 'சுக்ல பட்சம்', krishna: 'கிருஷ்ண பட்சம்',
  // Yogas
  Vishkambha: 'விஷ்கம்பம்', Priti: 'ப்ரீதி', Ayushman: 'ஆயுஷ்மான்', Saubhagya: 'சௌபாக்கியம்',
  Shobhana: 'சோபனம்', Atiganda: 'அதிகண்டம்', Sukarma: 'சுகர்மம்', Dhriti: 'திருதி',
  Shula: 'சூலம்', Ganda: 'கண்டம்', Vriddhi: 'விருத்தி', Dhruva: 'துருவம்',
  Vyaghata: 'வியாகாதம்', Harshana: 'ஹர்ஷணம்', Vajra: 'வஜ்ரம்', Siddhi: 'சித்தி',
  Vyatipata: 'வியதீபாதம்', Variyan: 'வரியான்', Parigha: 'பரிகம்', Shiva: 'சிவம்',
  Siddha: 'சித்தம்', Sadhya: 'சாத்தியம்', Shubha: 'சுபம்', Shukla: 'சுக்லம்',
  Brahma: 'பிரம்மம்', Indra: 'இந்திரம்', Vaidhriti: 'வைதிருதி',
  // Karanas
  Bava: 'பவம்', Balava: 'பாலவம்', Kaulava: 'கௌலவம்', Taitila: 'தைதுலம்', Gara: 'கரசை',
  Vanija: 'வணிசை', Vishti: 'பத்திரை', Kimstughna: 'கிம்ஸ்துக்னம்', Shakuni: 'சகுனி',
  Chatushpada: 'சதுஷ்பாதம்', Naga: 'நாகவம்',
  // Weekdays
  Sunday: 'ஞாயிற்றுக்கிழமை', Monday: 'திங்கட்கிழமை', Tuesday: 'செவ்வாய்க்கிழமை',
  Wednesday: 'புதன்கிழமை', Thursday: 'வியாழக்கிழமை', Friday: 'வெள்ளிக்கிழமை', Saturday: 'சனிக்கிழமை'
};

// Planet abbreviations used inside the chart
const ABBREVIATIONS_TA = {
  Sun: 'சூரி', Moon: 'சந்', Mars: 'செவ்', Mercury: 'புத', Jupiter: 'குரு',
  Venus: 'சுக்', Saturn: 'சனி', Rahu: 'ராகு', Ketu: 'கேது'
};

// Tamil solar months, indexed by the Sun's sidereal sign (0 = Mesham/Aries → Chithirai)
const TAMIL_MONTHS = [
  ['Chithirai', 'சித்திரை'], ['Vaikasi', 'வைகாசி'], ['Aani', 'ஆனி'], ['Aadi', 'ஆடி'],
  ['Avani', 'ஆவணி'], ['Purattasi', 'புரட்டாசி'], ['Aippasi', 'ஐப்பசி'], ['Karthigai', 'கார்த்திகை'],
  ['Margazhi', 'மார்கழி'], ['Thai', 'தை'], ['Maasi', 'மாசி'], ['Panguni', 'பங்குனி']
];

/**
 * UI string for `key`, with {placeholders} filled from `vars`.
 * Falls back to English, then to the key itself.
 * @param {string} lang - 'en' | 'ta'
 * @param {string} key
 * @param {Object} [vars]
 * @returns {string}
 */
export function translate(lang, key, vars = {}) {
  const text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/**
 * Astrological name in the chosen language. English names pass through.
 * @param {string} lang
 * @param {string} englishName - As returned by the calculation modules
 * @returns {string}
 */
export function term(lang, englishName) {
  return lang === 'ta' ? (TERMS_TA[englishName] ?? englishName) : englishName;
}

/**
 * Short planet label for the chart, or undefined to use the chart's default.
 * @param {string} lang
 * @param {string} planetName - English planet name
 * @returns {string|undefined}
 */
export function planetAbbreviation(lang, planetName) {
  return lang === 'ta' ? ABBREVIATIONS_TA[planetName] : undefined;
}

/**
 * Tamil solar month for the Sun's sidereal sign.
 * @param {string} lang
 * @param {number} sunSign - 0 = Aries ... 11 = Pisces
 * @returns {string}
 */
export function tamilMonth(lang, sunSign) {
  const [english, tamil] = TAMIL_MONTHS[sunSign];
  return lang === 'ta' ? tamil : `${english} (${tamil})`;
}
