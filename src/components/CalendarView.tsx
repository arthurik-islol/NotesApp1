import React, { useState } from "react";
import { Note, Task } from "../types";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  FileText, 
  Clock, 
  TrendingUp,
  Trash2,
  Square,
  BookOpen,
  ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function parseDatesFromText(text: string): string[] {
  const dates: string[] = [];
  const normalized = text.toLowerCase().trim();

  // 1. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdRegex = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
  let match;
  while ((match = ymdRegex.exec(normalized)) !== null) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }

  // 2. Match DD MM YYYY or DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyRegex = /\b(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})\b/g;
  while ((match = dmyRegex.exec(normalized)) !== null) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }

  // 3. Match MM/DD or MM-DD or MM.DD (e.g., 6/24, 06/24, 6-24, 6.24) without year attached
  const mdRegex = /\b(\d{1,2})[-/.](\d{1,2})\b/g;
  while ((match = mdRegex.exec(normalized)) !== null) {
    const startIdx = match.index;
    const endIdx = mdRegex.lastIndex;
    const beforeChar = startIdx > 0 ? normalized[startIdx - 1] : '';
    const afterChar = endIdx < normalized.length ? normalized[endIdx] : '';
    if (!['-', '/', '.'].includes(beforeChar) && !['-', '/', '.'].includes(afterChar)) {
      const val1 = parseInt(match[1]);
      const val2 = parseInt(match[2]);
      if (val1 >= 1 && val1 <= 12 && val2 >= 1 && val2 <= 31) {
        dates.push(`2026-${String(val1).padStart(2, '0')}-${String(val2).padStart(2, '0')}`);
      } else if (val2 >= 1 && val2 <= 12 && val1 >= 1 && val1 <= 31) {
        dates.push(`2026-${String(val2).padStart(2, '0')}-${String(val1).padStart(2, '0')}`);
      }
    }
  }

  // 4. Match textual month names: "June 24th, 2026", "24 June", "June 30", "June 29"
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  
  // (month name) (day number)
  const monthDayRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b\s*(\d{1,2})(?:st|nd|rd|th)?\b(?:\s*,?\s*(\d{4}))?/gi;
  while ((match = monthDayRegex.exec(normalized)) !== null) {
    const mStr = match[1].toLowerCase().slice(0, 3);
    const mIdx = months.indexOf(mStr);
    const day = parseInt(match[2]);
    const year = match[3] ? parseInt(match[3]) : 2026;
    if (mIdx !== -1 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }

  // (day number) (month name)
  const dayMonthRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b(?:\s*,?\s*(\d{4}))?/gi;
  while ((match = dayMonthRegex.exec(normalized)) !== null) {
    const day = parseInt(match[1]);
    const mStr = match[2].toLowerCase().slice(0, 3);
    const mIdx = months.indexOf(mStr);
    const year = match[3] ? parseInt(match[3]) : 2026;
    if (mIdx !== -1 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }

  // 5. Contiguous digits e.g. "2652026" or "2562026" or "25062026"
  const contiguousRegex = /\b(\d{5,8})\b/g;
  while ((match = contiguousRegex.exec(normalized)) !== null) {
    const digitsStr = match[1];
    const year4 = parseInt(digitsStr.slice(-4));
    if (year4 >= 2000 && year4 <= 2100) {
      const rest = digitsStr.slice(0, -4);
      if (rest.length === 2) {
        const day = parseInt(rest[0]);
        const month = parseInt(rest[1]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          dates.push(`${year4}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
      } else if (rest.length === 3) {
        const d1 = parseInt(rest.slice(0, 2));
        const m1 = parseInt(rest.slice(2));
        const d2 = parseInt(rest.slice(0, 1));
        const m2 = parseInt(rest.slice(1));
        
        if (m1 >= 1 && m1 <= 12 && d1 >= 1 && d1 <= 31) {
          dates.push(`${year4}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`);
        }
        if (m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31) {
          dates.push(`${year4}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`);
        }
      } else if (rest.length === 4) {
        const day = parseInt(rest.slice(0, 2));
        const month = parseInt(rest.slice(2));
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          dates.push(`${year4}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
      }
    }
  }

  // Filter out duplicates
  return dates.filter((val, idx, self) => self.indexOf(val) === idx);
}

function getLocalDateString(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.split("T")[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return isoString.split("T")[0];
  }
}

// Week helper calculations
function getWeekDates(anchor: Date): Date[] {
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
  return dates; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
}

// Helper to parse explicit date string into standard YYYY-MM-DD
function parseExplicitDateStr(str: string): string | null {
  const cleaned = str.trim();
  // Try YYYY-MM-DD
  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(cleaned);
  if (ymd) {
    const y = parseInt(ymd[1]);
    const m = parseInt(ymd[2]);
    const d = parseInt(ymd[3]);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  // Try DD-MM-YYYY or MM-DD-YYYY or DD-MM-YY or MM-DD-YY
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(cleaned);
  if (dmy) {
    const dayOrMonth = parseInt(dmy[1]);
    const monthOrDay = parseInt(dmy[2]);
    let y = parseInt(dmy[3]);
    if (y < 100) {
      y += 2000; // e.g. 26 -> 2026
    }
    let day = dayOrMonth;
    let month = monthOrDay;
    if (monthOrDay > 12 && dayOrMonth <= 12) {
      day = monthOrDay;
      month = dayOrMonth;
    }
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

// Helper to parse target date of a note
function getNoteTargetDate(note: Note): string {
  const createdAtDateStr = note.createdAt.split("T")[0];
  
  // 1. Try robust parseDatesFromText on TITLE first
  const parsedTitleDates = parseDatesFromText(note.title);
  if (parsedTitleDates.length > 0) {
    return parsedTitleDates[0];
  }

  // 2. Try robust parseDatesFromText on CONTENT second
  const parsedContentDates = parseDatesFromText(note.content);
  if (parsedContentDates.length > 0) {
    return parsedContentDates[0];
  }

  // 3. Look for explicit ISO date pattern YYYY-MM-DD in title or content
  const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/;
  const matchIso = note.title.match(isoDateRegex) || note.content.match(isoDateRegex);
  if (matchIso) {
    return matchIso[0];
  }

  // 4. Look for day of week mentions using word boundaries
  const dayRegexes = [
    /\b(sunday|sun)\b/i,
    /\b(monday|mon)\b/i,
    /\b(tuesday|tue|tues)\b/i,
    /\b(wednesday|wed)\b/i,
    /\b(thursday|thu|thur|thurs)\b/i,
    /\b(friday|fri)\b/i,
    /\b(saturday|sat)\b/i
  ];
  
  // Check title first
  for (let i = 0; i < 7; i++) {
    if (dayRegexes[i].test(note.title)) {
      const anchor = new Date(note.createdAt);
      const anchorWeekDates = getWeekDates(anchor);
      const weekDatesIndex = i === 0 ? 6 : i - 1;
      return anchorWeekDates[weekDatesIndex].toISOString().split("T")[0];
    }
  }

  // Check content second
  for (let i = 0; i < 7; i++) {
    if (dayRegexes[i].test(note.content)) {
      const anchor = new Date(note.createdAt);
      const anchorWeekDates = getWeekDates(anchor);
      const weekDatesIndex = i === 0 ? 6 : i - 1;
      return anchorWeekDates[weekDatesIndex].toISOString().split("T")[0];
    }
  }

  return createdAtDateStr;
}

// Parsing financials from note text
function parseFinancials(text: string): { turnover: number; profit: number } {
  let turnover = 0;
  let profit = 0;

  const cleanText = text.toLowerCase();

  const turnoverRegex = /\b(?:turn\s*over|turn-over|turnover|trnover|tunover|turnovr|t\/o)s?\s*(?::|=>|=|of|is)?\s*(?:\$|£|€|amd|dram|֏)?\s*([-–—−]?[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)\b/gi;
  const profitRegex = /\b(?:profit|proft|porfit|profet|prfit|proit|pft)s?\s*(?::|=>|=|of|is)?\s*(?:\$|£|€|amd|dram|֏)?\s*([-–—−]?[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)\b/gi;
  const lossRegex = /\b(?:loss|losses|los|lose|lossess)s?\s*(?::|=>|=|of|is)?\s*(?:\$|£|€|amd|dram|֏)?\s*([-–—−]?[0-9]+(?:[,\s][0-9]{3})*(?:\.[0-9]+)?)\b/gi;

  let match;
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

// Advanced parsing of notes that may contain daily breakdown segments for multiple weekdays or explicit date ranges
function parseNoteFinancialsByDay(note: Note): { [dateStr: string]: { turnover: number; profit: number } } {
  const result: { [dateStr: string]: { turnover: number; profit: number } } = {};
  const text = `${note.title}\n${note.content}`;
  const targetDate = getNoteTargetDate(note);
  
  // 1. Try to find explicit range headers, e.g. "From Friday to Saturday 19/6/2026 10:00:00 - 20/6/2026 10:00:00"
  const headerRegex = /From\s+\w+\s+to\s+\w+\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})[^-]+-\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/gi;
  const headerMatches: { index: number; startDateStr: string; endDateStr: string }[] = [];
  let hMatch;
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

  // Check if the note has an explicit ISO date YYYY-MM-DD
  const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/;
  const matchIso = text.match(isoDateRegex);
  if (matchIso) {
    const explicitDate = matchIso[0];
    const financials = parseFinancials(text);
    result[explicitDate] = financials;
    return result;
  }

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

interface CalendarViewProps {
  notes: Note[];
  tasks: Task[];
  currency: string;
  onDeleteTask?: (taskId: string) => void;
  onToggleTask?: (taskId: string, isCompleted: boolean) => void;
  onNoteSelect?: (noteId: string) => void;
}

export default function CalendarView({ notes, tasks, currency, onDeleteTask, onToggleTask, onNoteSelect }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(
    new Date().toISOString().split("T")[0]
  );
  const [sidebarTab, setSidebarTab] = useState<"tasks" | "notes">("notes");

  // Pre-calculate daily financials from notes
  const dailyFinancialsMap = React.useMemo(() => {
    const dailyData: { [dateStr: string]: { turnover: number; profit: number } } = {};
    
    notes.forEach(note => {
      const byDay = parseNoteFinancialsByDay(note);
      Object.keys(byDay).forEach(dateStr => {
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { turnover: 0, profit: 0 };
        }
        dailyData[dateStr].turnover += byDay[dateStr].turnover;
        dailyData[dateStr].profit += byDay[dateStr].profit;
      });
    });
    
    return dailyData;
  }, [notes]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Previous month padding
  const prevMonthDays = [];
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIndex);
  for (let i = firstDay - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: daysInPrevMonth - i,
      month: prevMonthIndex,
      year: prevMonthYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month padding
  const totalCells = 42; // 6 rows of 7 days
  const nextMonthDaysNeeded = totalCells - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = [];
  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  for (let i = 1; i <= nextMonthDaysNeeded; i++) {
    nextMonthDays.push({
      day: i,
      month: nextMonthIndex,
      year: nextMonthYear,
      isCurrentMonth: false,
    });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Helpers to shift month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Combine deadlines
  interface CalendarDeadline {
    id: string;
    type: "task";
    title: string;
    isCompleted: boolean;
    dueDate: string;
  }

  const getDeadlinesForDate = (dateStr: string): CalendarDeadline[] => {
    const matchedTasks: CalendarDeadline[] = tasks
      .filter(t => t.dueDate === dateStr)
      .map(t => ({
        id: t.id,
        type: "task",
        title: t.text,
        isCompleted: t.isCompleted,
        dueDate: t.dueDate,
      }));

    return matchedTasks;
  };

  const getExplicitDatesForNote = (note: Note): string[] => {
    const dates: string[] = [];
    dates.push(...parseDatesFromText(note.title));
    return dates.filter((val, idx, self) => self.indexOf(val) === idx);
  };

  const getNotesForDate = (dateStr: string): Note[] => {
    if (!dateStr) return [];
    
    const [y, m, d] = dateStr.split("-").map(Number);
    const sf = `${d}/${m}/${y}`;
    const df = `${d}.${m}.${y}`;
    const spf = `${d} ${m} ${y}`;
    const cf = `${d}${m}${y}`;
    const cfz = `${d}${String(m).padStart(2, '0')}${y}`;
    
    return notes.filter(n => {
      // Prioritize explicit date matches from the title (file name). If the note explicitly specifies some date(s),
      // it should only show up on those dates, and not on its creation date.
      const explicitDates = getExplicitDatesForNote(n);
      if (explicitDates.length > 0) {
        return explicitDates.includes(dateStr);
      }
      
      // 1. If created-at matches exactly, show it (as a fallback in local time)
      if (n.createdAt && getLocalDateString(n.createdAt) === dateStr) return true;
      
      // 2. Otherwise, search only the note title (file name) for standard textual date patterns, ignoring body content.
      const normalized = n.title.toLowerCase();
      return (
        normalized.includes(sf) ||
        normalized.includes(df) ||
        normalized.includes(spf) ||
        normalized.includes(cf) ||
        normalized.includes(cfz)
      );
    });
  };

  const selectedDeadlines = selectedDateStr ? getDeadlinesForDate(selectedDateStr) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto" id="calendar-view">
      
      {/* Calendar Grid Section */}
      <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full">
        
        {/* Navigation Head */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-sans font-bold text-slate-800">
              {monthNames[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs font-semibold font-sans hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <span key={day} className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              {day}
            </span>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[340px]">
          {allCalendarDays.map((cell, idx) => {
            const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
            const isSelected = selectedDateStr === cellDateStr;
            const deadlines = getDeadlinesForDate(cellDateStr);
            const hasDeadlines = deadlines.length > 0;
            const allCompleted = hasDeadlines && deadlines.every(d => d.isCompleted);

            const isToday = (() => {
              const d = new Date();
              return d.getFullYear() === cell.year && d.getMonth() === cell.month && d.getDate() === cell.day;
            })();

            const financials = dailyFinancialsMap[cellDateStr];
            const hasFinancials = financials && (financials.turnover > 0 || financials.profit !== 0);
            const profitPercentage = hasFinancials && financials.turnover > 0 
              ? (financials.profit / financials.turnover) * 100 
              : null;

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDateStr(cellDateStr);
                  setSidebarTab("notes");
                }}
                className={`aspect-square p-2 rounded-xl flex flex-col justify-between items-center cursor-pointer select-none border transition-all ${
                  !cell.isCurrentMonth 
                    ? "bg-slate-50/50 text-slate-350 border-slate-100" 
                    : "bg-white text-slate-800 border-slate-150"
                } ${
                  isSelected 
                    ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 text-indigo-900 font-bold" 
                    : isToday 
                    ? "border-emerald-500 bg-emerald-50/10 font-bold" 
                    : "hover:bg-slate-50"
                }`}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold ${isToday && !isSelected ? "text-emerald-700 font-bold" : ""}`}>
                  {cell.day}
                </span>

                {/* Financial Indicators */}
                {hasFinancials ? (
                  <div 
                    className={`text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md leading-none select-none transition-transform hover:scale-105 shadow-2xs ${
                      financials.profit >= 0 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30" 
                        : "bg-rose-50 text-rose-750 border border-rose-150 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/30"
                    }`}
                    title={`Turnover: ${financials.turnover.toLocaleString()} ${currency}, Profit: ${financials.profit.toLocaleString()} ${currency}`}
                  >
                    {profitPercentage !== null ? (
                      `${profitPercentage >= 0 ? "+" : ""}${profitPercentage.toFixed(0)}%`
                    ) : (
                      `${financials.profit >= 0 ? "+" : ""}${financials.profit >= 1000 ? (financials.profit / 1000).toFixed(0) + "k" : financials.profit}`
                    )}
                  </div>
                ) : (
                  <div className="h-4" />
                )}

                {/* Deadlines Dots indicator */}
                {hasDeadlines ? (
                  <div className="flex gap-1 h-1.5 items-center">
                    {deadlines.slice(0, 3).map((d) => (
                      <span 
                        key={d.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          d.isCompleted 
                            ? "bg-emerald-400" 
                            : "bg-indigo-500"
                        }`}
                        title={d.title}
                      />
                    ))}
                    {deadlines.length > 3 && (
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    )}
                  </div>
                ) : (
                  <div className="h-1.5" />
                )}
              </div>
            );
          })}
        </div>



      </div>

      {/* Selected Day Reminders sidebar */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full min-h-[460px]">
        
        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-sans font-bold text-slate-800">
              Day Info: {selectedDateStr ? new Date(selectedDateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Selected Date"}
            </h3>
          </div>

          {/* Selected Day Financials Panel */}
          {selectedDateStr && dailyFinancialsMap[selectedDateStr] && (dailyFinancialsMap[selectedDateStr].turnover > 0 || dailyFinancialsMap[selectedDateStr].profit !== 0) && (() => {
            const dayFin = dailyFinancialsMap[selectedDateStr];
            const margin = dayFin.turnover > 0 ? (dayFin.profit / dayFin.turnover) * 100 : 0;
            return (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-900/30 dark:border-slate-800/80 space-y-3">
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Daily Financial Report
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 dark:bg-slate-900">
                    <span className="text-[9px] font-sans font-semibold text-slate-400 uppercase tracking-wider block">Turnover</span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{dayFin.turnover.toLocaleString()} {currency}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 dark:bg-slate-900">
                    <span className="text-[9px] font-sans font-semibold text-slate-400 uppercase tracking-wider block">Profit</span>
                    <span className={`text-xs font-mono font-extrabold ${dayFin.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                      {dayFin.profit >= 0 ? "+" : ""}{dayFin.profit.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
                {dayFin.turnover > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-sans font-medium">Profit Margin</span>
                    <span className={`font-mono font-black ${margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSidebarTab("notes")}
              className={`flex-1 py-1.5 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer ${
                sidebarTab === "notes"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              Notes Insight ({selectedDateStr ? getNotesForDate(selectedDateStr).length : 0})
            </button>
            <button
              onClick={() => setSidebarTab("tasks")}
              className={`flex-1 py-1.5 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer ${
                sidebarTab === "tasks"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              Tasks ({selectedDeadlines.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            {sidebarTab === "notes" ? (
              // Notes Insight tab content (now first!)
              (() => {
                if (!selectedDateStr) return null;
                const matchingNotes = getNotesForDate(selectedDateStr);

                if (matchingNotes.length === 0) {
                  return (
                    <motion.div
                      key="empty-notes"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16 text-center text-slate-400 font-sans text-xs"
                    >
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300 mb-3">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-slate-700">No Note Insights</h4>
                      <p className="mt-1">No notes created on or reference this date.</p>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key="list-notes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 max-h-[350px] overflow-y-auto pr-1"
                  >
                    {matchingNotes.map((note) => (
                      <div
                        key={note.id}
                        onDoubleClick={() => onNoteSelect?.(note.id)}
                        className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left space-y-2 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 cursor-pointer select-none"
                        title="Double-click to open in Personal Notes"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight font-sans flex-1 mr-2 dark:text-slate-200">
                            {note.title}
                          </h4>
                          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md uppercase font-sans tracking-wide shrink-0 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400">
                            {note.category}
                          </span>
                        </div>

                        {note.summary && (
                          <div className="text-xs text-slate-600 leading-relaxed font-sans italic bg-white/70 p-2.5 rounded-lg border border-slate-100 dark:bg-slate-950/60 dark:border-slate-800/80 dark:text-slate-300">
                            <span className="font-semibold text-slate-700 font-mono text-[10px] uppercase block mb-1 dark:text-slate-400">AI Summary</span>
                            {note.summary}
                          </div>
                        )}

                        {note.keyPoints && note.keyPoints.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-700 font-mono text-[10px] uppercase block dark:text-slate-400">Key Points</span>
                            <ul className="list-disc pl-3.5 space-y-1 text-slate-600 text-xs font-sans dark:text-slate-300">
                              {note.keyPoints.map((kp, idx) => (
                                <li key={idx} className="leading-tight">{kp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {note.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded font-mono dark:bg-slate-800/80 dark:text-slate-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                );
              })()
            ) : (
              selectedDeadlines.length === 0 ? (
                <motion.div
                  key="empty-tasks"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center text-slate-400 font-sans text-xs"
                >
                  <div className="p-3 bg-slate-50 rounded-full text-slate-300 mb-3">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-700">No Reminders</h4>
                  <p className="mt-1">Nothing is due on this day.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="list-tasks"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 max-h-[350px] overflow-y-auto pr-1"
                >
                  {selectedDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                        dl.isCompleted 
                          ? "bg-slate-50 border-slate-200 text-slate-400" 
                          : "bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Toggle status button */}
                        <button
                          onClick={() => onToggleTask?.(dl.id, !dl.isCompleted)}
                          className="shrink-0 transition cursor-pointer text-slate-400 hover:text-indigo-600"
                          title={dl.isCompleted ? "Mark incomplete" : "Mark completed"}
                        >
                          {dl.isCompleted ? (
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <h4 className={`text-xs font-semibold leading-tight font-sans truncate ${dl.isCompleted ? "line-through font-medium" : "text-slate-800"}`} title={dl.title}>
                            {dl.title}
                          </h4>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => onDeleteTask?.(dl.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer shrink-0 ml-2"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic status/quote banner */}
        <div className="mt-8 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Productivity Insight
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            "Organizing tasks with clear target dates turns notes into high-speed execution plans."
          </p>
        </div>

      </div>

    </div>
  );
}
