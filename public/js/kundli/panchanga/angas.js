// The five angas at an instant, each with the interval during which it prevails.

import {
  elongation, moonSidereal, yogaSum, findCrossing, STEP_MOON, requireAyanamsa
} from './sky.js';
import { TITHI_NAMES, NAKSHATRAS, YOGA_NAMES, KARANA_NAMES, PAKSHA } from './tables.js';

const NAKSHATRA_WIDTH = 360 / 27;

/**
 * The span of the anga (a width-degree slice of `fn`) containing `utc`.
 * @param {(utc:number)=>number} fn
 * @param {number} width - degrees per anga
 * @param {number} utc
 * @param {(index:number)=>string} nameOf
 * @returns {import('./contracts.js').AngaSpan}
 */
export function angaSpan(fn, width, utc, nameOf) {
  const index = Math.floor(fn(utc) / width);
  return {
    index,
    name: nameOf(index),
    startUtc: findCrossing(fn, index * width, utc, -1, STEP_MOON),
    endUtc: findCrossing(fn, (index + 1) * width, utc, +1, STEP_MOON)
  };
}

/**
 * Tithi, paksha, nakshatra (+pada), yoga and karana at `utc`.
 * Tithi, paksha and karana come from the tropical Moon-Sun elongation (ayanamsa-free);
 * nakshatra, pada and yoga use the chart's sidereal zodiac.
 * @param {number} utc
 * @param {string} ayanamsaKind - the chart's ayanamsa; never defaulted here
 * @returns {import('./contracts.js').PanchangaAngas}
 */
export function angasAt(utc, ayanamsaKind) {
  requireAyanamsa(ayanamsaKind);
  const moonSid = t => moonSidereal(t, ayanamsaKind);
  const yoga = t => yogaSum(t, ayanamsaKind);
  return {
    tithi: angaSpan(elongation, 12, utc, i => TITHI_NAMES[i]),
    paksha: angaSpan(elongation, 180, utc, i => PAKSHA[i].name),
    nakshatra: angaSpan(moonSid, NAKSHATRA_WIDTH, utc, i => NAKSHATRAS[i].name),
    pada: Math.floor((moonSid(utc) % NAKSHATRA_WIDTH) / (NAKSHATRA_WIDTH / 4)) + 1,
    yoga: angaSpan(yoga, NAKSHATRA_WIDTH, utc, i => YOGA_NAMES[i]),
    karana: angaSpan(elongation, 6, utc, i => KARANA_NAMES[i])
  };
}
