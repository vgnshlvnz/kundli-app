// Timezone conversion using Intl APIs with historical offset support
//
// Algorithm:
// 1. Estimate the UTC offset for the local time
// 2. Convert local → UTC using that offset
// 3. Convert back UTC → local to validate
// 4. If validation fails, try alternative offset (DST vs standard)
// 5. If both succeed, time is ambiguous; if neither succeeds, time is in a gap

export function localToUtc(localTimeStr, timeZone, options = {}) {
  const input = parseLocalTime(localTimeStr);

  const offsetEst = estimateOffset(input, timeZone);

  // Try primary conversion
  const utcPrimary = tryConvert(input, offsetEst);
  const validPrimary = validateConversion(input, utcPrimary, timeZone);

  // Check alternative offset (standard vs DST, -60 min)
  const offsetAlt = offsetEst - 60;
  const utcAlt = tryConvert(input, offsetAlt);
  const validAlt = validateConversion(input, utcAlt, timeZone);

  if (validPrimary && validAlt) {
    // Both valid → ambiguous (DST fall-back)
    if (options.fold === undefined) {
      throw new Error(
        `Ambiguous local time: ${localTimeStr} in ${timeZone}. Specify fold option.`
      );
    }
    return formatUtc(options.fold === 0 ? utcPrimary : utcAlt);
  }

  if (validPrimary) {
    return formatUtc(utcPrimary);
  }

  if (validAlt) {
    return formatUtc(utcAlt);
  }

  throw new Error(
    `Nonexistent local time: ${localTimeStr} in ${timeZone} (DST gap)`
  );
}

function estimateOffset(input, timeZone) {
  // Treat local time as UTC and check what offset Intl says
  const date = new Date(toLocalMs(input));
  return getOffsetAtDate(date, timeZone);
}

function getOffsetAtDate(date, timeZone) {
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const tzParts = partMap(tzFormatter.formatToParts(date));
  const utcParts = partMap(utcFormatter.formatToParts(date));

  const tzStr = `${tzParts.year}-${tzParts.month}-${tzParts.day}T${tzParts.hour}:${tzParts.minute}:${tzParts.second}Z`;
  const utcStr = `${utcParts.year}-${utcParts.month}-${utcParts.day}T${utcParts.hour}:${utcParts.minute}:${utcParts.second}Z`;

  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
  return Math.round(offsetMs / 60000);
}

function tryConvert(input, offsetMinutes) {
  const localMs = toLocalMs(input);
  const utcMs = localMs - offsetMinutes * 60000;
  return new Date(utcMs);
}

function validateConversion(input, utcDate, timeZone) {
  const reconstructed = utcToLocal(utcDate, timeZone);
  return timesEqual(input, reconstructed);
}

function utcToLocal(utcDate, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const map = partMap(parts);

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

function partMap(parts) {
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return map;
}

function timesEqual(a, b) {
  return (
    a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute && a.second === b.second
  );
}

function parseLocalTime(str) {
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Invalid local time format: ${str}`);
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    day: parseInt(m[3], 10),
    hour: parseInt(m[4], 10),
    minute: parseInt(m[5], 10),
    second: parseInt(m[6], 10),
  };
}

function toLocalMs(input) {
  return Date.UTC(
    input.year, input.month - 1, input.day,
    input.hour, input.minute, input.second, 0
  );
}

function formatUtc(date) {
  return date.toISOString().replace('.000Z', 'Z');
}
