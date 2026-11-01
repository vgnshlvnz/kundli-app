// Panchanga contracts: input/output shapes for panchangam calculations
// Contract version: 1.1 (Panchanga is the v1.1 shape; the flat v1.0 shape is PanchangaV1)

/**
 * @typedef {Object} ResolvedBirth
 * @property {number} utc - Unix timestamp (UTC seconds)
 * @property {number} longitude - Observer longitude (degrees, east positive)
 * @property {number} latitude - Observer latitude (degrees, north positive)
 * @property {string} [timezone] - IANA zone of the birth place, for the civil date (and so the
 *   vara and isPreviousCivilDay). Without it local mean solar time is used.
 * @property {boolean} [centroid] - true when the place is a country centroid; the panchanga refuses it
 */

/**
 * @typedef {Object} Tithi
 * @property {number} number - Tithi number (1-30)
 * @property {string} name - Tithi name (e.g. "Pratipada")
 * @property {number} percentage - Percentage elapsed in current tithi (0-100)
 */

/**
 * @typedef {Object} Paksha
 * @property {string} name - "shukla" or "krishna"
 * @property {string} english - "Waxing" or "Waning"
 */

/**
 * @typedef {Object} Nakshatra
 * @property {number} index - Nakshatra index (0-26)
 * @property {string} name - Nakshatra name (e.g. "Ashwini")
 * @property {string} lord - Nakshatra lord (e.g. "Ketu")
 */

/**
 * @typedef {Object} Yoga
 * @property {number} index - Yoga index (0-26)
 * @property {string} name - Yoga name (e.g. "Vishkambha")
 */

/**
 * @typedef {Object} Karana
 * @property {string} name - Karana name (e.g. "Bava")
 * @property {boolean} fixed - Whether this is a fixed karana
 */

/**
 * @typedef {Object} Vara
 * @property {number} index - Day index (0-6, 0=Sunday)
 * @property {string} name - Day name (e.g. "Ravivara")
 * @property {string} english - English day name
 */

/**
 * @typedef {Object} SunriseSunset
 * @property {number|null} sunriseUtc - Sunrise Unix timestamp (UTC seconds) or null
 * @property {number|null} sunsetUtc - Sunset Unix timestamp (UTC seconds) or null
 */

/**
 * @deprecated v1.0 shape, superseded by Panchanga (v1.1). Kept until consumers migrate.
 * @typedef {Object} PanchangaV1
 * @property {number} birthUtc - Original birth UTC timestamp
 * @property {Tithi} tithi
 * @property {Paksha} paksha
 * @property {Nakshatra} nakshatra
 * @property {Yoga} yoga
 * @property {Karana} karana
 * @property {Vara} vara
 * @property {SunriseSunset} sunriseSunset
 */

// ---- v1.1 ----

/**
 * An anga (limb) with the interval during which it prevails.
 * startUtc/endUtc are Unix seconds (UTC); startUtc may precede the queried instant.
 * @typedef {Object} AngaSpan
 * @property {number} index - Zero-based index within its cycle (tithi 0-29, nakshatra 0-26, yoga 0-26, karana 0-59)
 * @property {string} name
 * @property {number} startUtc
 * @property {number} endUtc
 */

/**
 * @typedef {Object} PanchangaAngas
 * @property {AngaSpan} tithi
 * @property {AngaSpan} paksha - index 0 = shukla, 1 = krishna; span is the paksha interval
 * @property {AngaSpan} nakshatra
 * @property {number} pada - 1-4
 * @property {AngaSpan} yoga
 * @property {AngaSpan} karana
 */

/**
 * The Hindu day runs sunrise to next sunrise.
 * @typedef {Object} HinduDay
 * @property {Vara|null} vara - Vara of the Hindu day (not the civil day); null when there is no sunrise
 * @property {number|null} sunriseUtc - null when the sun does not rise (see flags.noSunrise)
 * @property {number|null} sunsetUtc
 * @property {number|null} nextSunriseUtc
 * @property {boolean} isPreviousCivilDay - true when birth is before that civil day's sunrise, so the Hindu day began on the previous civil day
 */

/**
 * @typedef {Object} GhatiSinceSunrise
 * @property {number} ghati - whole ghatis (1 ghati = 24 minutes)
 * @property {number} vighati - whole vighatis (1 ghati = 60 vighati)
 */

/**
 * @typedef {Object} LunarMonth
 * @property {string} name - e.g. "Chaitra". For an adhika month, the name of the nija month it precedes.
 * @property {'amanta'|'purnimanta'} system
 * @property {boolean} adhika - true for an intercalary month
 */

/**
 * @typedef {Object} TamilSolar
 * @property {string} month - Tamil solar month name
 * @property {number} date - day of the Tamil solar month (1-32)
 * @property {string} year60Name - name in the 60-year (samvatsara) cycle
 */

/**
 * @typedef {Object} PanchangaFlags
 * @property {boolean} [kshayaTithi] - a tithi is skipped (begins and ends between two sunrises)
 * @property {boolean} [adhikaTithi] - a tithi spans two sunrises
 * @property {boolean} noSunrise - no sunrise/next sunrise within two days at this latitude (polar day or night);
 *   atSunrise, hinduDay times and vara, ghatiSinceSunrise, horaLord and tamilSolar are then null
 */

/**
 * @typedef {Object} PanchangaSettings
 * @property {'lahiri'|'raman'|'krishnamurti'} ayanamsa - REQUIRED. The chart's ayanamsa, for
 *   nakshatra, pada and yoga. Tithi, paksha and karana are tropical and unaffected. Never defaulted.
 * @property {'upperLimbRefracted'|'centreNoRefraction'|'centreRefracted'} [sunriseMode] - default
 *   'upperLimbRefracted'. upperLimbRefracted: Sun's upper edge on the horizon with 34' refraction
 *   (almanac sunrise). centreRefracted: Sun's centre 34' below the horizon (refraction only).
 *   centreNoRefraction: Sun's centre on the geometric horizon (traditional, ~2 min later).
 * @property {'amanta'|'purnimanta'} [lunarSystem] - default 'amanta'
 */

/**
 * Panchanga, contract v1.1.
 * @typedef {Object} Panchanga
 * @property {PanchangaAngas} atBirth
 * @property {PanchangaAngas|null} atSunrise - angas prevailing at that Hindu day's sunrise; null with no sunrise
 * @property {HinduDay} hinduDay
 * @property {GhatiSinceSunrise|null} ghatiSinceSunrise
 * @property {string|null} horaLord - fixed 1-hour horas counted from sunrise (Tamil style)
 * @property {LunarMonth} lunarMonth
 * @property {TamilSolar|null} tamilSolar
 * @property {PanchangaFlags} flags
 * @property {Required<PanchangaSettings>} settings - as resolved, defaults filled in
 */

export {};
