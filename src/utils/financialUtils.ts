import { Note } from "../types";
import { getNoteTargetDate, parseExplicitDateStr, getWeekDates } from "./dateUtils";

export interface DayFinancials {
  turnover: number;
  profit: number;
}

export interface ContributingNote {
  note: Note;
  turnover: number;
  profit: number;
  profitMargin: number;
  dates: string[];
}

export interface BreakdownItem {
  id: string;
  label: string;
  sublabel?: string;
  dateStr?: string;
  turnover: number;
  profit: number;
  profitMargin: number;
  hasData: boolean;
}

export type TimeframeMode = "week" | "month" | "year" | "all" | "custom";

/**
 * Extracts turnover and profit from free text.
 * Robust to formatting like AMD, $, symbols, commas, decimals, negative signs, typos.
 */
export function parseFinancials(text: string): DayFinancials {
  let turnover = 0;
  let profit = 0;

  if (!text || typeof text !== "string") {
    return { turnover, profit };
  }

  const cleanText = text.toLowerCase();

  // Match turnover with various typos and abbreviations
  const turnoverRegex = /\b(?:turn\s*over|turn-over|turnover|trnover|tunover|turnovr|t\/o)s?\s*(?::|=>|=|of|is)?\s*(?:\$|£|€|amd|dram|֏)?\s*([-–—−]?[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)\b/gi;
  // Match profit
  const profitRegex = /\b(?:profit|proft|porfit|profet|prfit|proit|pft)s?\s*(?::|=>|=|of|is)?\s*(?:\$|£|€|amd|dram|֏)?\s*([-–—−]?[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)\b/gi;
  // Match loss (negative profit)
  const lossRegex = /\b(?:loss|losses|los|lose|lossess)s?\s*(?::|=>|=|of|is)?\s*(?:\$|£|€|amd|dram|֏)?\s*([-–—−]?[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = turnoverRegex.exec(cleanText)) !== null) {
    const cleanNumStr = match[1].replace(/[–—−]/g, "-").replace(/[,\s]/g, "");
    const val = parseFloat(cleanNumStr);
    if (!isNaN(val)) {
      turnover += val;
    }
  }

  while ((match = profitRegex.exec(cleanText)) !== null) {
    const cleanNumStr = match[1].replace(/[–—−]/g, "-").replace(/[,\s]/g, "");
    const val = parseFloat(cleanNumStr);
    if (!isNaN(val)) {
      profit += val;
    }
  }

  while ((match = lossRegex.exec(cleanText)) !== null) {
    const cleanNumStr = match[1].replace(/[–—−]/g, "-").replace(/[,\s]/g, "");
    const val = parseFloat(cleanNumStr);
    if (!isNaN(val)) {
      profit -= val;
    }
  }

  return { turnover, profit };
}

/**
 * Parses note text for daily segments or date range headers.
 * Returns a map of YYYY-MM-DD -> { turnover, profit }.
 */
export function parseNoteFinancialsByDay(note: Note): { [dateStr: string]: DayFinancials } {
  const result: { [dateStr: string]: DayFinancials } = {};
  const text = `${note.title}\n${note.content}`;
  const targetDate = getNoteTargetDate(note);

  // 1. Try to find explicit range headers, e.g. "From Friday to Saturday 12/6/2026 10:00:00 - 13/6/2026 10:00:00"
  const headerRegex = /(?:From\s+)?\w+\s+(?:to|-)\s+\w+[\s:]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})[^-]+-\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/gi;
  const headerMatches: { index: number; startDateStr: string; endDateStr: string }[] = [];
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headerRegex.exec(text)) !== null) {
    headerMatches.push({
      index: hMatch.index,
      startDateStr: hMatch[1],
      endDateStr: hMatch[2]
    });
  }

  if (headerMatches.length > 0) {
    for (let i = 0; i < headerMatches.length; i++) {
      const currentHeader = headerMatches[i];
      const startPos = currentHeader.index;
      const endPos = i + 1 < headerMatches.length ? headerMatches[i + 1].index : text.length;

      const sectionText = text.substring(startPos, endPos);
      const sectionFinancials = parseFinancials(sectionText);

      let explicitDate = parseExplicitDateStr(currentHeader.endDateStr);
      const startDate = parseExplicitDateStr(currentHeader.startDateStr);

      if (startDate) {
        if (!explicitDate) {
          const startD = new Date(startDate);
          const correctedEndD = new Date(startD);
          correctedEndD.setDate(startD.getDate() + 1);
          explicitDate = correctedEndD.toISOString().split("T")[0];
        } else {
          const startD = new Date(startDate);
          const endD = new Date(explicitDate);
          if (endD < startD || (endD.getTime() - startD.getTime()) > 3 * 24 * 60 * 60 * 1000) {
            const correctedEndD = new Date(startD);
            correctedEndD.setDate(startD.getDate() + 1);
            explicitDate = correctedEndD.toISOString().split("T")[0];
          }
        }
      }

      if (explicitDate) {
        if (!result[explicitDate]) {
          result[explicitDate] = { turnover: 0, profit: 0 };
        }
        result[explicitDate].turnover += sectionFinancials.turnover;
        result[explicitDate].profit += sectionFinancials.profit;
      }
    }
    return result;
  }

  // 2. Check if note has an explicit ISO date YYYY-MM-DD
  const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/;
  const matchIso = text.match(isoDateRegex);
  if (matchIso) {
    const explicitDate = matchIso[0];
    result[explicitDate] = parseFinancials(text);
    return result;
  }

  // 3. Weekday mentions in the text
  const dayRegexesGlobal = [
    /\b(sunday|sun)\b/gi,
    /\b(monday|mon)\b/gi,
    /\b(tuesday|tue|tues)\b/gi,
    /\b(wednesday|wed)\b/gi,
    /\b(thursday|thu|thur|thurs)\b/gi,
    /\b(friday|fri)\b/gi,
    /\b(saturday|sat)\b/gi
  ];

  const mentions: { dayIndex: number; pos: number }[] = [];
  dayRegexesGlobal.forEach((regex, dayIndex) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      mentions.push({ dayIndex, pos: match.index });
    }
  });

  mentions.sort((a, b) => a.pos - b.pos);

  if (mentions.length === 0) {
    result[targetDate] = parseFinancials(text);
    return result;
  }

  if (mentions.length === 1) {
    const dayIndex = mentions[0].dayIndex;
    const anchor = new Date(targetDate);
    const anchorWeekDates = getWeekDates(anchor);
    const weekDatesIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    const targetDateStr = anchorWeekDates[weekDatesIndex].toISOString().split("T")[0];
    result[targetDateStr] = parseFinancials(text);
    return result;
  }

  // Split text into weekday segments
  for (let i = 0; i < mentions.length; i++) {
    const currentMatch = mentions[i];
    const startPos = currentMatch.pos;
    const endPos = i + 1 < mentions.length ? mentions[i + 1].pos : text.length;

    const sectionText = text.substring(startPos, endPos);
    const sectionFinancials = parseFinancials(sectionText);

    const dayIndex = currentMatch.dayIndex;
    const anchor = new Date(targetDate);
    const anchorWeekDates = getWeekDates(anchor);
    const weekDatesIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    const targetDateStr = anchorWeekDates[weekDatesIndex].toISOString().split("T")[0];

    if (!result[targetDateStr]) {
      result[targetDateStr] = { turnover: 0, profit: 0 };
    }
    result[targetDateStr].turnover += sectionFinancials.turnover;
    result[targetDateStr].profit += sectionFinancials.profit;
  }

  return result;
}

export interface PeriodFinancialReport {
  turnover: number;
  profit: number;
  profitMargin: number;
  activeDaysCount: number;
  contributingNotes: ContributingNote[];
  dailyMap: { [dateStr: string]: DayFinancials };
  breakdownItems: BreakdownItem[];
  earliestDate: string;
  latestDate: string;
}

/**
 * Calculates overall financial analytics for any timeframe (weekly, monthly, yearly, custom, all-time).
 */
export function calculatePeriodFinancialReport(
  notes: Note[],
  mode: TimeframeMode,
  options: {
    startDateStr?: string;
    endDateStr?: string;
    selectedYear?: number;
    selectedMonth?: number; // 0-11
    weekDates?: Date[];
  }
): PeriodFinancialReport {
  const dailyMap: { [dateStr: string]: DayFinancials } = {};
  const noteBreakdowns: { note: Note; byDay: { [dateStr: string]: DayFinancials } }[] = [];

  let minDate = "9999-99-99";
  let maxDate = "0000-00-00";

  // Pre-parse all notes
  notes.forEach((n) => {
    const byDay = parseNoteFinancialsByDay(n);
    noteBreakdowns.push({ note: n, byDay });

    Object.keys(byDay).forEach((dStr) => {
      if (byDay[dStr].turnover !== 0 || byDay[dStr].profit !== 0) {
        if (dStr < minDate) minDate = dStr;
        if (dStr > maxDate) maxDate = dStr;

        if (!dailyMap[dStr]) {
          dailyMap[dStr] = { turnover: 0, profit: 0 };
        }
        dailyMap[dStr].turnover += byDay[dStr].turnover;
        dailyMap[dStr].profit += byDay[dStr].profit;
      }
    });
  });

  if (minDate === "9999-99-99") minDate = new Date().toISOString().split("T")[0];
  if (maxDate === "0000-00-00") maxDate = new Date().toISOString().split("T")[0];

  // Determine effective start and end dates
  let start = options.startDateStr;
  let end = options.endDateStr;

  if (mode === "all") {
    start = minDate;
    end = maxDate;
  }

  // Filter and aggregate
  let periodTurnover = 0;
  let periodProfit = 0;
  const activeDatesSet = new Set<string>();

  const isDateInPeriod = (dStr: string): boolean => {
    if (mode === "all") return true;
    if (start && dStr < start) return false;
    if (end && dStr > end) return false;
    return true;
  };

  const contributingNotes: ContributingNote[] = [];

  noteBreakdowns.forEach(({ note, byDay }) => {
    let noteTurnover = 0;
    let noteProfit = 0;
    const noteDates: string[] = [];

    Object.entries(byDay).forEach(([dStr, fin]) => {
      if (isDateInPeriod(dStr)) {
        if (fin.turnover !== 0 || fin.profit !== 0) {
          noteTurnover += fin.turnover;
          noteProfit += fin.profit;
          noteDates.push(dStr);
          activeDatesSet.add(dStr);
        }
      }
    });

    if (noteTurnover !== 0 || noteProfit !== 0) {
      const margin = noteTurnover > 0 ? (noteProfit / noteTurnover) * 100 : 0;
      contributingNotes.push({
        note,
        turnover: noteTurnover,
        profit: noteProfit,
        profitMargin: margin,
        dates: noteDates.sort()
      });
    }
  });

  // Sort contributing notes by turnover descending, then profit descending
  contributingNotes.sort((a, b) => Math.abs(b.turnover) - Math.abs(a.turnover) || Math.abs(b.profit) - Math.abs(a.profit));

  // Compute overall period totals
  Object.entries(dailyMap).forEach(([dStr, fin]) => {
    if (isDateInPeriod(dStr)) {
      periodTurnover += fin.turnover;
      periodProfit += fin.profit;
    }
  });

  const periodProfitMargin = periodTurnover > 0 ? (periodProfit / periodTurnover) * 100 : 0;

  // Build breakdown items for chart/visual presentation
  const breakdownItems: BreakdownItem[] = [];

  if (mode === "week" && options.weekDates) {
    options.weekDates.forEach((d) => {
      const dStr = d.toISOString().split("T")[0];
      const dayFin = dailyMap[dStr] || { turnover: 0, profit: 0 };
      const margin = dayFin.turnover > 0 ? (dayFin.profit / dayFin.turnover) * 100 : 0;
      breakdownItems.push({
        id: dStr,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        sublabel: `${d.getDate()}`,
        dateStr: dStr,
        turnover: dayFin.turnover,
        profit: dayFin.profit,
        profitMargin: margin,
        hasData: dayFin.turnover !== 0 || dayFin.profit !== 0
      });
    });
  } else if (mode === "month" && options.selectedYear !== undefined && options.selectedMonth !== undefined) {
    // 4 to 5 weeks breakdown within the month
    const year = options.selectedYear;
    const month = options.selectedMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Group into 4-5 weekly buckets (Days 1-7, 8-14, 15-21, 22-28, 29-end)
    const buckets = [
      { id: "w1", label: "Days 1-7", startDay: 1, endDay: 7 },
      { id: "w2", label: "Days 8-14", startDay: 8, endDay: 14 },
      { id: "w3", label: "Days 15-21", startDay: 15, endDay: 21 },
      { id: "w4", label: "Days 22-28", startDay: 22, endDay: 28 },
      { id: "w5", label: `Days 29-${daysInMonth}`, startDay: 29, endDay: daysInMonth }
    ];

    buckets.forEach((b) => {
      if (b.startDay <= daysInMonth) {
        let bTurnover = 0;
        let bProfit = 0;

        for (let day = b.startDay; day <= Math.min(b.endDay, daysInMonth); day++) {
          const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (dailyMap[dStr]) {
            bTurnover += dailyMap[dStr].turnover;
            bProfit += dailyMap[dStr].profit;
          }
        }

        const margin = bTurnover > 0 ? (bProfit / bTurnover) * 100 : 0;
        breakdownItems.push({
          id: b.id,
          label: b.label,
          turnover: bTurnover,
          profit: bProfit,
          profitMargin: margin,
          hasData: bTurnover !== 0 || bProfit !== 0
        });
      }
    });
  } else if (mode === "year" && options.selectedYear !== undefined) {
    const year = options.selectedYear;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    monthNames.forEach((name, mIdx) => {
      const monthPrefix = `${year}-${String(mIdx + 1).padStart(2, "0")}`;
      let mTurnover = 0;
      let mProfit = 0;

      Object.entries(dailyMap).forEach(([dStr, fin]) => {
        if (dStr.startsWith(monthPrefix)) {
          mTurnover += fin.turnover;
          mProfit += fin.profit;
        }
      });

      const margin = mTurnover > 0 ? (mProfit / mTurnover) * 100 : 0;
      breakdownItems.push({
        id: `m-${mIdx}`,
        label: name,
        turnover: mTurnover,
        profit: mProfit,
        profitMargin: margin,
        hasData: mTurnover !== 0 || mProfit !== 0
      });
    });
  } else {
    // Custom or All-time: Aggregate by month if span is multi-month, or by day if span is <= 31 days
    let dayCount = 0;
    if (start && end) {
      const d1 = new Date(start);
      const d2 = new Date(end);
      dayCount = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    if (dayCount > 0 && dayCount <= 31 && start && end) {
      // Day by day breakdown for short range
      const curr = new Date(start);
      const stop = new Date(end);
      while (curr <= stop) {
        const dStr = curr.toISOString().split("T")[0];
        const dayFin = dailyMap[dStr] || { turnover: 0, profit: 0 };
        const margin = dayFin.turnover > 0 ? (dayFin.profit / dayFin.turnover) * 100 : 0;

        breakdownItems.push({
          id: dStr,
          label: curr.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
          sublabel: curr.toLocaleDateString("en-US", { weekday: "narrow" }),
          dateStr: dStr,
          turnover: dayFin.turnover,
          profit: dayFin.profit,
          profitMargin: margin,
          hasData: dayFin.turnover !== 0 || dayFin.profit !== 0
        });

        curr.setDate(curr.getDate() + 1);
      }
    } else {
      // Monthly aggregation across the range
      const monthsSet = new Set<string>();
      Object.keys(dailyMap).forEach((dStr) => {
        if (isDateInPeriod(dStr)) {
          monthsSet.add(dStr.substring(0, 7)); // YYYY-MM
        }
      });

      const sortedMonths = Array.from(monthsSet).sort();
      if (sortedMonths.length === 0 && start) {
        sortedMonths.push(start.substring(0, 7));
      }

      sortedMonths.forEach((ym) => {
        let mTurnover = 0;
        let mProfit = 0;
        Object.entries(dailyMap).forEach(([dStr, fin]) => {
          if (dStr.startsWith(ym) && isDateInPeriod(dStr)) {
            mTurnover += fin.turnover;
            mProfit += fin.profit;
          }
        });

        const [y, m] = ym.split("-").map(Number);
        const dateObj = new Date(y, m - 1, 1);
        const label = dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const margin = mTurnover > 0 ? (mProfit / mTurnover) * 100 : 0;

        breakdownItems.push({
          id: ym,
          label,
          turnover: mTurnover,
          profit: mProfit,
          profitMargin: margin,
          hasData: mTurnover !== 0 || mProfit !== 0
        });
      });
    }
  }

  return {
    turnover: periodTurnover,
    profit: periodProfit,
    profitMargin: periodProfitMargin,
    activeDaysCount: activeDatesSet.size,
    contributingNotes,
    dailyMap,
    breakdownItems,
    earliestDate: minDate,
    latestDate: maxDate
  };
}
