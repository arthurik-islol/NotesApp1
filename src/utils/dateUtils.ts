import { Note } from "../types";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_ABBRS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
];

/**
 * Robustly parses valid calendar dates from text.
 * Strictly avoids false positives on:
 * - Floating point / decimal numbers (e.g. odds "1.8 (54%)", "2.0", "8.5%")
 * - Mathematical subtraction, negative numbers, or ranges (e.g. "2-1", "1-5", "-8.30")
 * - Fractions (e.g. "1/2", "3/4")
 * - Percentages (e.g. "15.19%", "8.5%")
 * - Arbitrary IDs or code identifiers (e.g. "api-18750131")
 */
export function parseDatesFromText(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const dates: string[] = [];
  const normalized = text.toLowerCase();

  // 1. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  // Strict: Delimiters must match, year 2000-2099, valid month 1-12, valid day 1-31
  const ymdRegex = /\b(20\d{2})([-/.\\])(0?[1-9]|1[0-2])\2(0?[1-9]|[12]\d|3[01])\b/g;
  let match: RegExpExecArray | null;
  while ((match = ymdRegex.exec(normalized)) !== null) {
    const year = parseInt(match[1]);
    const month = parseInt(match[3]);
    const day = parseInt(match[4]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  // 2. Match DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (or MM/DD/YYYY with 4-digit year)
  // Strict: Delimiters must match, 4-digit year 2000-2099
  const dmy4Regex = /\b(0?[1-9]|[12]\d|3[01])([-/.\\])(0?[1-9]|[12]\d|3[01])\2(20\d{2})\b/g;
  while ((match = dmy4Regex.exec(normalized)) !== null) {
    const val1 = parseInt(match[1]);
    const val2 = parseInt(match[3]);
    const year = parseInt(match[4]);

    if (val1 > 12 && val1 <= 31 && val2 >= 1 && val2 <= 12) {
      // Unambiguously DD/MM/YYYY
      dates.push(`${year}-${String(val2).padStart(2, "0")}-${String(val1).padStart(2, "0")}`);
    } else if (val2 > 12 && val2 <= 31 && val1 >= 1 && val1 <= 12) {
      // Unambiguously MM/DD/YYYY (US style)
      dates.push(`${year}-${String(val1).padStart(2, "0")}-${String(val2).padStart(2, "0")}`);
    } else if (val1 >= 1 && val1 <= 31 && val2 >= 1 && val2 <= 12) {
      // Default to DD/MM/YYYY for ambiguous format
      dates.push(`${year}-${String(val2).padStart(2, "0")}-${String(val1).padStart(2, "0")}`);
    }
  }

  // 3. Match 2-digit years with slash or hyphen only (e.g. 14/03/26 or 13/3/26)
  // We explicitly DO NOT allow '.' delimiter here to prevent collision with semver like 1.2.3
  const dmy2Regex = /\b(0?[1-9]|[12]\d|3[01])([/-])(0?[1-9]|[12]\d|3[01])\2(2[0-9]|3[0-5])\b/g;
  while ((match = dmy2Regex.exec(normalized)) !== null) {
    const val1 = parseInt(match[1]);
    const val2 = parseInt(match[3]);
    const shortYear = parseInt(match[4]);
    const year = 2000 + shortYear;

    if (val1 > 12 && val1 <= 31 && val2 >= 1 && val2 <= 12) {
      dates.push(`${year}-${String(val2).padStart(2, "0")}-${String(val1).padStart(2, "0")}`);
    } else if (val2 > 12 && val2 <= 31 && val1 >= 1 && val1 <= 12) {
      dates.push(`${year}-${String(val1).padStart(2, "0")}-${String(val2).padStart(2, "0")}`);
    } else if (val1 >= 1 && val1 <= 31 && val2 >= 1 && val2 <= 12) {
      dates.push(`${year}-${String(val2).padStart(2, "0")}-${String(val1).padStart(2, "0")}`);
    }
  }

  // 4. Match textual month names:
  // (a) (Month name) (day number), e.g. "June 24th, 2026", "September 9, 2026", "March 14"
  const monthDayRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b\s*(\d{1,2})(?:st|nd|rd|th)?\b(?:\s*,?\s*(20\d{2}))?/gi;
  while ((match = monthDayRegex.exec(normalized)) !== null) {
    const mStr = match[1].toLowerCase().slice(0, 3);
    const mIdx = MONTH_ABBRS.indexOf(mStr);
    const day = parseInt(match[2]);
    const year = match[3] ? parseInt(match[3]) : 2026;
    if (mIdx !== -1 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  // (b) (Day number) of (Month name), e.g. "14th of March", "14 March 2026", "24 June"
  const dayMonthRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b(?:\s*,?\s*(20\d{2}))?/gi;
  while ((match = dayMonthRegex.exec(normalized)) !== null) {
    const day = parseInt(match[1]);
    const mStr = match[2].toLowerCase().slice(0, 3);
    const mIdx = MONTH_ABBRS.indexOf(mStr);
    const year = match[3] ? parseInt(match[3]) : 2026;
    if (mIdx !== -1 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  // 5. Contiguous date digits, e.g. "1632026" (16/3/2026) or "14032026" or "25062026"
  // Must NOT be preceded or followed by alphanumeric chars or hyphens (to prevent matching API keys/IDs)
  const contiguousRegex = /(?:^|[^\w\d.-])(\d{5,8})(?=[^\w\d.-]|$)/g;
  while ((match = contiguousRegex.exec(normalized)) !== null) {
    const digitsStr = match[1];
    const year4 = parseInt(digitsStr.slice(-4));
    if (year4 >= 2020 && year4 <= 2035) {
      const rest = digitsStr.slice(0, -4);
      if (rest.length === 2) {
        // DM (e.g. 132026 -> 1/3/2026)
        const day = parseInt(rest[0]);
        const month = parseInt(rest[1]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          dates.push(`${year4}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
        }
      } else if (rest.length === 3) {
        // DDM or DMM (e.g. 1632026 -> 16/3/2026)
        const d1 = parseInt(rest.slice(0, 2));
        const m1 = parseInt(rest.slice(2));
        if (m1 >= 1 && m1 <= 12 && d1 >= 1 && d1 <= 31) {
          dates.push(`${year4}-${String(m1).padStart(2, "0")}-${String(d1).padStart(2, "0")}`);
        } else {
          const d2 = parseInt(rest.slice(0, 1));
          const m2 = parseInt(rest.slice(1));
          if (m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31) {
            dates.push(`${year4}-${String(m2).padStart(2, "0")}-${String(d2).padStart(2, "0")}`);
          }
        }
      } else if (rest.length === 4) {
        // DDMM (e.g. 14032026 -> 14/03/2026)
        const day = parseInt(rest.slice(0, 2));
        const month = parseInt(rest.slice(2));
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          dates.push(`${year4}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
        }
      }
    }
  }

  // 6. Two-part dates WITHOUT year: ONLY with forward slash '/' (e.g. 14/03, 06/24, 24/6)
  // CRITICAL ANTI-BUG GUARDS:
  // - NEVER match '.' (dots are decimals, e.g. "1.8 (54%)", "8.5%", "2.0")
  // - NEVER match '-' (hyphens are ranges, negative numbers, e.g. "2-1", "-8.30")
  // - Avoid fractions: either one value must be > 12 (e.g. 14/3, 24/6) OR at least one value has a leading zero (e.g. 06/24, 03/14)
  // - Must not be followed by % or preceded by currency
  const slashDateRegex = /(?:^|[^\w\d/])(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|[12]\d|3[01])(?=[^\w\d/%]|$)/g;
  while ((match = slashDateRegex.exec(normalized)) !== null) {
    const raw1 = match[1];
    const raw2 = match[2];
    const val1 = parseInt(raw1);
    const val2 = parseInt(raw2);

    // Require either a value > 12 (unambiguous day) OR 2 digits with leading zero (e.g. "03/14", "06/24", "14/03")
    // This strictly filters out fractions like "1/2", "3/4", "5/8"
    const hasUnambiguousDay = val1 > 12 || val2 > 12;
    const hasLeadingZero = (raw1.length === 2 && raw1.startsWith("0")) || (raw2.length === 2 && raw2.startsWith("0"));

    if (hasUnambiguousDay || hasLeadingZero) {
      if (val1 > 12 && val1 <= 31 && val2 >= 1 && val2 <= 12) {
        // DD/MM
        dates.push(`2026-${String(val2).padStart(2, "0")}-${String(val1).padStart(2, "0")}`);
      } else if (val2 > 12 && val2 <= 31 && val1 >= 1 && val1 <= 12) {
        // MM/DD
        dates.push(`2026-${String(val1).padStart(2, "0")}-${String(val2).padStart(2, "0")}`);
      } else if (val1 >= 1 && val1 <= 31 && val2 >= 1 && val2 <= 12) {
        // Default to DD/MM
        dates.push(`2026-${String(val2).padStart(2, "0")}-${String(val1).padStart(2, "0")}`);
      }
    }
  }

  // Deduplicate results while preserving first occurrence order
  return dates.filter((val, idx, self) => self.indexOf(val) === idx);
}

/**
 * Calculates the Monday of the week for a given YYYY-MM-DD date string.
 * Uses local calendar date arithmetic to avoid UTC timezone off-by-one shifts.
 */
export function getMonday(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + distanceToMonday);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns an array of 7 Dates [Mon, Tue, Wed, Thu, Fri, Sat, Sun] for a given anchor Date.
 */
export function getWeekDates(anchor: Date): Date[] {
  const currentDay = anchor.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + distanceToMonday);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Formats a Monday date string (YYYY-MM-DD) into "Week of Month Day, Year".
 */
export function formatWeekHeader(mondayDateStr: string): string {
  const parts = mondayDateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return `Week of ${mondayDateStr}`;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const monthName = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `Week of ${monthName} ${day}, ${year}`;
}

/**
 * Formats a YYYY-MM-DD date string into a clean, localized long date (e.g. "June 15, 2026").
 * Avoids UTC timezone conversion shifts.
 */
export function formatCalendarDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Helper to parse explicit date string into standard YYYY-MM-DD
 */
export function parseExplicitDateStr(str: string): string | null {
  if (!str) return null;
  const cleaned = str.trim();
  // Try YYYY-MM-DD
  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(cleaned);
  if (ymd) {
    const y = parseInt(ymd[1]);
    const m = parseInt(ymd[2]);
    const d = parseInt(ymd[3]);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // Try DD-MM-YYYY or MM-DD-YYYY or DD-MM-YY or MM-DD-YY
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(cleaned);
  if (dmy) {
    const dayOrMonth = parseInt(dmy[1]);
    const monthOrDay = parseInt(dmy[2]);
    let y = parseInt(dmy[3]);
    if (y < 100) {
      y += 2000;
    }
    let day = dayOrMonth;
    let month = monthOrDay;
    if (monthOrDay > 12 && dayOrMonth <= 12) {
      day = monthOrDay;
      month = dayOrMonth;
    }
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

/**
 * Primary target date resolver for a Note.
 * 1. If note.targetDate is explicitly specified, uses it.
 * 2. Tries dates extracted from TITLE (highest priority intentional signal).
 * 3. Tries explicit range header in CONTENT (e.g. "From Friday to Saturday: 13/3/2026...").
 * 4. Tries dates extracted from CONTENT.
 * 5. Tries day-of-week mentions in TITLE anchored to the note's creation week.
 * 6. Defaults to note's createdAt date.
 */
export function getNoteTargetDate(note: Note): string {
  if (note.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(note.targetDate)) {
    return note.targetDate;
  }

  const createdAtDateStr = note.createdAt ? note.createdAt.split("T")[0] : new Date().toISOString().split("T")[0];

  // 1. Try robust parseDatesFromText on TITLE first
  const titleDates = parseDatesFromText(note.title);
  if (titleDates.length > 0) {
    return titleDates[0];
  }

  // 2. Check for explicit range header in note.content:
  // e.g. "From Friday to Saturday: 13/3/2026 10:00:00 - 14/3/2026 10:00:00"
  if (note.content) {
    const headerRegex = /(?:From\s+)?\w+\s+(?:to|-)\s+\w+[\s:]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})[^-]+-\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i;
    const headerMatch = note.content.match(headerRegex);
    if (headerMatch) {
      const endD = parseExplicitDateStr(headerMatch[2]);
      if (endD) return endD;
      const startD = parseExplicitDateStr(headerMatch[1]);
      if (startD) return startD;
    }
  }

  // 3. Try robust parseDatesFromText on CONTENT second
  const contentDates = parseDatesFromText(note.content);
  if (contentDates.length > 0) {
    return contentDates[0];
  }

  // 4. Look for day of week mentions in TITLE (e.g. "Saturday Report", "Friday Sync")
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const titleLower = note.title.toLowerCase();
  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[i];
    const regex = new RegExp(`\\b${dayName}\\b`, "i");
    if (regex.test(titleLower)) {
      const anchor = new Date(note.createdAt);
      const anchorWeekDates = getWeekDates(anchor);
      const weekDatesIndex = i === 0 ? 6 : i - 1;
      return anchorWeekDates[weekDatesIndex].toISOString().split("T")[0];
    }
  }

  // Fallback: note creation date
  return createdAtDateStr;
}

export function getLocalDateString(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.split("T")[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return isoString.split("T")[0];
  }
}
