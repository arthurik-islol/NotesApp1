import React from "react";
import { Note, Task, Reminder } from "../types";
import { 
  FileText, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  ArrowRight, 
  PlusCircle, 
  Sparkles,
  Clock,
  Trash2,
  Square,
  ChevronLeft,
  ChevronRight,
  Percent,
  DollarSign,
  Activity,
  Bell,
  Plus
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

interface DashboardProps {
  notes: Note[];
  tasks: Task[];
  username: string;
  currency: string;
  onNavigate: (tab: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onToggleTask?: (taskId: string, isCompleted: boolean) => void;
  reminders: Reminder[];
  onAddReminder: (text: string) => void;
  onCheckReminder: (id: string) => void;
}

export default function Dashboard({ 
  notes, 
  tasks, 
  username, 
  currency, 
  onNavigate, 
  onDeleteTask, 
  onToggleTask,
  reminders,
  onAddReminder,
  onCheckReminder
}: DashboardProps) {
  // Highlights Panel State
  const [weekOffset, setWeekOffset] = React.useState<number>(0);

  const [newReminderText, setNewReminderText] = React.useState("");

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    onAddReminder(newReminderText.trim());
    setNewReminderText("");
  };

  // Week helper calculations
  const getWeekDates = (anchor: Date) => {
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
  };

  const anchorDate = new Date();
  anchorDate.setDate(anchorDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(anchorDate);
  const startOfWeekStr = weekDates[0].toISOString().split("T")[0];
  const endOfWeekStr = weekDates[6].toISOString().split("T")[0];

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = weekDates[0].toLocaleDateString(undefined, options);
    const endStr = weekDates[6].toLocaleDateString(undefined, { ...options, year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  // Helper to parse explicit date string into standard YYYY-MM-DD
  const parseExplicitDateStr = (str: string): string | null => {
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
  };

  // Helper to parse target date of a note
  const getNoteTargetDate = (note: Note): string => {
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

    // 4. Look for day of week mentions using word boundaries (preventing substring matches like 'mon' in 'money' or 'month')
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
  };

  // Parsing financials from note text
  const parseFinancials = (text: string): { turnover: number; profit: number } => {
    let turnover = 0;
    let profit = 0;

    const cleanText = text.toLowerCase();

    // Look for turnover, profit, and loss with loose boundaries, AMD support, typos and dash/minus/thousands separator support
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
  };

  // Advanced parsing of notes that may contain daily breakdown segments for multiple weekdays or explicit date ranges
  const parseNoteFinancialsByDay = (note: Note): { [dateStr: string]: { turnover: number; profit: number } } => {
    const result: { [dateStr: string]: { turnover: number; profit: number } } = {};
    const text = `${note.title}\n${note.content}`;
    const targetDate = getNoteTargetDate(note);
    
    // 1. Try to find explicit range headers, e.g. "From Friday to Saturday: 13/3/2026 10:00:00 - 14/3/2026 10:00:00"
    // Supports optional 'From', 'to', spaces, colons, and both 2-digit/4-digit years
    const headerRegex = /(?:From\s+)?\w+\s+(?:to|-)\s+\w+[\s:]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})[^-]+-\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/gi;
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

        // Auto-correct any date typos in the headers (e.g. 01/06/2026 typed instead of 01/07/2026)
        if (startDate) {
          if (!explicitDate) {
            const startD = new Date(startDate);
            const correctedEndD = new Date(startD);
            correctedEndD.setDate(startD.getDate() + 1);
            explicitDate = correctedEndD.toISOString().split("T")[0];
          } else {
            const startD = new Date(startDate);
            const endD = new Date(explicitDate);
            // If end date is before start date or shift spans more than 3 days, it's highly likely a typo.
            // Reset to 1 day after the start date.
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

    // Find all day mentions with their positions
    const mentions: { dayIndex: number; pos: number }[] = [];
    dayRegexesGlobal.forEach((regex, dayIndex) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        mentions.push({ dayIndex, pos: match.index });
      }
    });

    // Sort mentions by position in the text
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
  };

  // Pre-calculate parsed note financials day by day
  const noteFinancialsMap = notes.map((note) => {
    return {
      note,
      byDay: parseNoteFinancialsByDay(note)
    };
  });

  // Now aggregate stats for the selected week
  const weekdayStats = weekDates.map((d) => {
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
    const dateNum = d.getDate();

    let dayTurnover = 0;
    let dayProfit = 0;
    const dayNotes: Note[] = [];

    noteFinancialsMap.forEach(({ note, byDay }) => {
      if (byDay[dateStr]) {
        dayTurnover += byDay[dateStr].turnover;
        dayProfit += byDay[dateStr].profit;
        dayNotes.push(note);
      }
    });

    return {
      dateStr,
      dayName,
      dateNum,
      notes: dayNotes,
      turnover: dayTurnover,
      profit: dayProfit,
    };
  });

  // Sum up weekly stats
  const totalTurnover = weekdayStats.reduce((sum, day) => sum + day.turnover, 0);
  const totalProfit = weekdayStats.reduce((sum, day) => sum + day.profit, 0);
  const profitMarginPercent = totalTurnover > 0 ? (totalProfit / totalTurnover) * 100 : 0;

  // Maximum absolute values for day breakdown bar chart scaling
  const maxWeeklyTurnover = Math.max(
    ...weekdayStats.map(d => Math.abs(d.turnover)),
    1
  );
  const maxWeeklyProfit = Math.max(
    ...weekdayStats.map(d => Math.abs(d.profit)),
    1
  );

  // Currency Formatter Helper
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ` ${currency}`;
  };

  // Calculations
  const totalNotes = notes.length;
  
  const completedTasksCount = tasks.filter(t => t.isCompleted).length;
  const activeTasksCount = tasks.filter(t => !t.isCompleted).length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // Combine tasks to find upcoming items
  const todayStr = new Date().toISOString().split("T")[0];
  
  interface UpcomingItem {
    id: string;
    type: "task";
    title: string;
    dueDate: string;
    isCompleted: boolean;
  }

  const upcomingItems: UpcomingItem[] = tasks.map(t => ({
    id: t.id,
    type: "task" as const,
    title: t.text,
    dueDate: t.dueDate,
    isCompleted: t.isCompleted,
  }))
    .filter(item => !item.isCompleted)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5); // Take top 5 soonest

  // Helper to determine urgency colors
  const getUrgencyStyles = (dueDate: string) => {
    if (!dueDate) return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", label: "No Date" };
    
    const diffTime = new Date(dueDate).getTime() - new Date(todayStr).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        bg: "bg-red-50 hover:bg-red-100", 
        text: "text-red-700", 
        border: "border-red-200", 
        label: `Overdue by ${Math.abs(diffDays)}d` 
      };
    } else if (diffDays === 0) {
      return { 
        bg: "bg-amber-50 hover:bg-amber-100", 
        text: "text-amber-700", 
        border: "border-amber-200", 
        label: "Due Today" 
      };
    } else if (diffDays <= 3) {
      return { 
        bg: "bg-indigo-50 hover:bg-indigo-100", 
        text: "text-indigo-700", 
        border: "border-indigo-200", 
        label: `Due in ${diffDays}d` 
      };
    } else {
      return { 
        bg: "bg-emerald-50 hover:bg-emerald-100", 
        text: "text-emerald-700", 
        border: "border-emerald-200", 
        label: `Due in ${diffDays}d` 
      };
    }
  };

  // Distribution calculations
  const notesByCategory = notes.reduce((acc, note) => {
    acc[note.category] = (acc[note.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8" id="dashboard-section">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome, {username}
          </h1>
          <p className="text-slate-500 font-sans mt-1 dark:text-slate-400">
            Track your notes, ideas, milestones, and personal development in one elegant space.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 text-indigo-700 font-sans text-sm self-start md:self-center dark:bg-slate-800 dark:border-slate-750 dark:text-indigo-350">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Local Time: {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      {/* Grid of Key Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Notes */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4"
          id="stat-notes"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Total Notes</p>
            <h3 className="text-2xl font-sans font-bold text-slate-800">{totalNotes}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Organized by category</p>
          </div>
        </motion.div>

        {/* Active Reminders */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => {
            const el = document.getElementById("reminders-widget-card");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4 cursor-pointer"
          id="stat-reminders"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Active Reminders</p>
            <h3 className="text-2xl font-sans font-bold text-slate-800">{reminders.length}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click to view Quick Reminders</p>
          </div>
        </motion.div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Upcoming Deadlines & Ideas Due */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs" id="highlight-insights-panel">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h2 className="text-lg font-sans font-bold text-slate-900 dark:text-slate-100">Weekly Financial Highlights</h2>
              </div>
            </div>

            <div className="space-y-6">
                  {/* Week Range Selector Header */}
                  <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5 rounded-xl border border-slate-100 dark:bg-slate-950/40 dark:border-slate-800/85">
                    <button
                      onClick={() => setWeekOffset(prev => prev - 1)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400 rounded-lg border border-slate-150 dark:border-slate-800 transition cursor-pointer shadow-3xs"
                      title="Previous Week"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="text-center">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wide">
                        Weekly Financial Highlights
                      </span>
                      <span className="text-xs sm:text-sm font-sans font-bold text-slate-800 dark:text-slate-200">
                        {formatDateRange()}
                      </span>
                    </div>

                    <button
                      onClick={() => setWeekOffset(prev => prev + 1)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400 rounded-lg border border-slate-150 dark:border-slate-800 transition cursor-pointer shadow-3xs"
                      title="Next Week"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Financial Metrics Bento Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Turnover card */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Weekly Turnover</span>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="text-xl font-sans font-extrabold text-slate-800 dark:text-slate-100">
                        {formatCurrency(totalTurnover)}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">Gross total recorded in notes</p>
                    </div>

                    {/* Profit card */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Weekly Profit</span>
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h4 className="text-xl font-sans font-extrabold text-slate-800 dark:text-slate-100">
                        {formatCurrency(totalProfit)}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">Net total recorded in notes</p>
                    </div>

                    {/* Margin card */}
                    <div className={`p-4 border rounded-xl space-y-1 transition duration-200 ${
                      profitMarginPercent > 30 
                        ? "bg-emerald-50/30 border-emerald-150 dark:bg-emerald-950/30 dark:border-emerald-900/35 text-emerald-800 dark:text-emerald-400" 
                        : profitMarginPercent > 0 
                        ? "bg-indigo-50/30 border-indigo-150 dark:bg-indigo-950/30 dark:border-indigo-900/35 text-indigo-800 dark:text-indigo-400"
                        : "bg-slate-50/50 border-slate-150 dark:bg-slate-950/20 dark:border-slate-850 text-slate-850 dark:text-slate-400"
                    }`}>
                      <div className="flex items-center justify-between text-slate-450 dark:text-slate-550">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Profit Margin</span>
                        <Percent className="w-4 h-4 text-purple-500" />
                      </div>
                      <h4 className="text-xl font-sans font-extrabold">
                        {profitMarginPercent.toFixed(1)}%
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                        {totalTurnover > 0 ? "Calculated profit / turnover" : "No turnover logged"}
                      </p>
                    </div>
                  </div>

                  {/* Day-by-Day Calendar breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Turnover & Profit Day Breakdown
                    </h3>
                    
                    <div className="grid grid-cols-7 gap-3 sm:gap-4">
                      {weekdayStats.map((day) => {
                        const hasData = day.turnover !== 0 || day.profit !== 0;
                        const isToday = day.dateStr === todayStr;
                        
                        // Calculate percentage heights for visual bars (proportionate to respective weekly maximums)
                        const turnoverPercent = maxWeeklyTurnover > 0 ? (Math.abs(day.turnover) / maxWeeklyTurnover) * 100 : 0;
                        const profitPercent = maxWeeklyProfit > 0 ? (Math.abs(day.profit) / maxWeeklyProfit) * 100 : 0;

                        return (
                          <div 
                            key={day.dateStr}
                            className={`p-2.5 sm:p-3.5 rounded-2xl border text-center flex flex-col justify-between min-h-[215px] transition-all duration-200 relative group/card ${
                              isToday 
                                ? "bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-xs" 
                                : hasData 
                                ? "bg-slate-50/70 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/70" 
                                : "bg-transparent border-slate-100 dark:border-slate-850"
                            }`}
                          >
                            {/* Card Date Header */}
                            <div>
                              <span className={`text-[10px] sm:text-xs font-sans font-semibold block ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}>
                                {day.dayName}
                              </span>
                              <span className={`text-sm sm:text-base font-mono font-extrabold block ${isToday ? "text-indigo-800 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                                {day.dateNum}
                              </span>
                            </div>

                            {/* Visual chart container: green & blue lines side-by-side */}
                            <div className="h-28 w-full bg-slate-50/70 dark:bg-slate-950/25 rounded-xl p-2 border border-slate-100/80 dark:border-slate-850 flex items-end justify-center gap-1.5 sm:gap-2.5 relative my-2">
                              {hasData ? (
                                <>
                                  {/* Dashed background grid lines for a professional, metric-focused look */}
                                  <div className="absolute inset-x-0 bottom-1/4 border-b border-dashed border-slate-200/50 dark:border-slate-800/30 pointer-events-none" />
                                  <div className="absolute inset-x-0 bottom-2/4 border-b border-dashed border-slate-200/50 dark:border-slate-800/30 pointer-events-none" />
                                  <div className="absolute inset-x-0 bottom-3/4 border-b border-dashed border-slate-200/50 dark:border-slate-800/30 pointer-events-none" />

                                  {/* Turnover Line (Green) */}
                                  <div className="group/line relative flex flex-col items-center justify-end h-full w-3.5 sm:w-4.5 cursor-pointer z-10">
                                    <div 
                                      style={{ height: `${Math.max(6, turnoverPercent)}%` }}
                                      className="w-2.5 sm:w-3.5 bg-emerald-500 dark:bg-emerald-400 rounded-full hover:bg-emerald-400 dark:hover:bg-emerald-350 transition-all duration-300 shadow-3xs"
                                    />
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full mb-2.5 hidden group-hover/line:flex flex-col items-center z-50 pointer-events-none transition-all duration-250 animate-in fade-in-50 slide-in-from-bottom-1">
                                      <div className="bg-slate-900 dark:bg-slate-950 text-white text-[10px] sm:text-xs py-1.5 px-2.5 rounded-xl shadow-xl border border-slate-800/90 font-sans whitespace-nowrap text-left">
                                        <span className="font-mono text-emerald-400 font-extrabold uppercase text-[9px] tracking-wider block">Turnover</span>
                                        <span className="font-mono font-bold">{formatCurrency(day.turnover)}</span>
                                      </div>
                                      <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-800/90 rotate-45 -mt-0.75" />
                                    </div>
                                  </div>

                                  {/* Profit Line (Blue / Red if loss) */}
                                  <div className="group/line relative flex flex-col items-center justify-end h-full w-3.5 sm:w-4.5 cursor-pointer z-10">
                                    <div 
                                      style={{ height: `${Math.max(6, profitPercent)}%` }}
                                      className={`w-2.5 sm:w-3.5 rounded-full transition-all duration-300 shadow-3xs ${
                                        day.profit < 0 
                                          ? "bg-rose-500 dark:bg-rose-400 hover:bg-rose-400 dark:hover:bg-rose-350" 
                                          : "bg-blue-500 dark:bg-blue-400 hover:bg-blue-400 dark:hover:bg-blue-300"
                                      }`}
                                    />
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full mb-2.5 hidden group-hover/line:flex flex-col items-center z-50 pointer-events-none transition-all duration-250 animate-in fade-in-50 slide-in-from-bottom-1">
                                      <div className="bg-slate-900 dark:bg-slate-950 text-white text-[10px] sm:text-xs py-1.5 px-2.5 rounded-xl shadow-xl border border-slate-800/90 font-sans whitespace-nowrap text-left">
                                        <span className={`font-mono font-extrabold uppercase text-[9px] tracking-wider block ${day.profit < 0 ? "text-rose-400" : "text-blue-400"}`}>
                                          {day.profit < 0 ? "Loss" : "Profit"}
                                        </span>
                                        <span className="font-mono font-bold">
                                          {day.profit < 0 ? "-" : ""}{formatCurrency(Math.abs(day.profit))}
                                        </span>
                                      </div>
                                      <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-800/90 rotate-45 -mt-0.75" />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center w-full">
                                  <span className="text-[10px] text-slate-350 dark:text-slate-650 font-sans italic select-none">No Data</span>
                                </div>
                              )}
                            </div>

                            {/* Textual summary footer under the chart area */}
                            <div className="mt-1 min-h-[20px] flex flex-col justify-center">
                              {hasData ? (
                                day.turnover !== 0 ? (
                                  <span className={`text-[10px] sm:text-xs font-mono font-extrabold block ${day.profit < 0 ? "text-rose-500" : "text-emerald-500 dark:text-emerald-400"}`}>
                                    {day.profit < 0 ? "-" : ""}{Math.abs((day.profit / day.turnover) * 100).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-300 dark:text-slate-700 block select-none">-</span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-350 dark:text-slate-750 font-sans block select-none">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes Source Attribution */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Financial Source Notes ({
                        (() => {
                          const seen = new Set<string>();
                          return noteFinancialsMap.filter(({ note, byDay }) => {
                            const match = Object.keys(byDay).some(dateStr => {
                              return dateStr >= startOfWeekStr && dateStr <= endOfWeekStr && (byDay[dateStr].turnover > 0 || byDay[dateStr].profit > 0);
                            });
                            if (!match) return false;
                            if (seen.has(note.title)) return false;
                            seen.add(note.title);
                            return true;
                          }).length;
                        })()
                      })
                    </h3>
                    
                    {(() => {
                      const allSourceNotes = noteFinancialsMap.filter(({ byDay }) => {
                        return Object.keys(byDay).some(dateStr => {
                          return dateStr >= startOfWeekStr && dateStr <= endOfWeekStr && (byDay[dateStr].turnover > 0 || byDay[dateStr].profit > 0);
                        });
                      });

                      const seenTitles = new Set<string>();
                      const sourceNotes = allSourceNotes.filter(({ note }) => {
                        if (seenTitles.has(note.title)) return false;
                        seenTitles.add(note.title);
                        return true;
                      });

                      if (sourceNotes.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-sans italic bg-slate-50/30 dark:bg-slate-900/10 p-4 border border-dashed border-slate-150 dark:border-slate-800 rounded-xl text-center">
                            No notes with "turnover" or "profit" found for this week. Create a note and type e.g., "Turnover: 1200, Profit: 400" to track!
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {sourceNotes.map(({ note, byDay }) => {
                            // Sum up turnover and profit of this note ONLY for the selected week
                            let noteWeekTurnover = 0;
                            let noteWeekProfit = 0;
                            Object.keys(byDay).forEach(dateStr => {
                              if (dateStr >= startOfWeekStr && dateStr <= endOfWeekStr) {
                                noteWeekTurnover += byDay[dateStr].turnover;
                                noteWeekProfit += byDay[dateStr].profit;
                              }
                            });

                            const noteWeekProfitPercent = noteWeekTurnover > 0 ? (noteWeekProfit / noteWeekTurnover) * 100 : 0;

                            return (
                              <div 
                                key={note.id}
                                className="p-3 bg-white dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/60 transition cursor-pointer"
                                onClick={() => onNavigate("notes")}
                              >
                                <div className="space-y-0.5 min-w-0 flex-1 mr-4">
                                  <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                                    {note.title}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    Linked Date: {getNoteTargetDate(note)}
                                  </span>
                                </div>
                                <div className="flex gap-2 font-mono text-[10px] sm:text-xs shrink-0 mr-4 sm:mr-16 lg:mr-24">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/20 px-1.5 py-0.5 rounded-md" title={`Weekly Turnover: ${noteWeekTurnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}>
                                    T: {noteWeekTurnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                  </span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/35 border border-indigo-100 dark:border-indigo-900/20 px-1.5 py-0.5 rounded-md" title={`Weekly Profit: ${noteWeekProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}>
                                    P: {noteWeekProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                  </span>
                                  <span className="text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/35 border border-purple-100 dark:border-purple-900/20 px-1.5 py-0.5 rounded-md" title={`Weekly Profit Margin: ${noteWeekProfitPercent.toFixed(2)}%`}>
                                    %: {noteWeekProfitPercent.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

          {/* Quick Shortcuts */}
          <div className="bg-slate-50 dark:bg-slate-900/10 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => onNavigate("notes")}
              className="bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition duration-200 group flex flex-col justify-between h-32 cursor-pointer"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 group-hover:bg-indigo-100 rounded-lg w-fit">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-sm">Add New Note</h4>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Write ideas & auto-summarize</p>
              </div>
            </button>

            <button 
              onClick={() => onNavigate("calendar")}
              className="bg-white hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition duration-200 group flex flex-col justify-between h-32 cursor-pointer"
            >
              <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:bg-emerald-100 rounded-lg w-fit">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-sm">View Schedule</h4>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Explore upcoming milestones</p>
              </div>
            </button>
          </div>
        </div>

        {/* Right Side: Notes Progress & Stats Charts */}
        <div className="space-y-6">
          
          {/* Quick Reminders Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs" id="reminders-widget-card">
            <div className="flex items-center space-x-2 mb-4">
              <Bell className="w-5 h-5 text-indigo-500" />
              <h3 className="font-sans font-bold text-slate-900 text-base">Quick Reminders</h3>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAddReminder} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="Add a new reminder..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-200"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                title="Add reminder"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Reminders List */}
            {reminders.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                <p className="text-slate-400 text-xs font-sans italic">All caught up! No active reminders.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <AnimatePresence>
                  {reminders.map((reminder) => (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl flex items-start justify-between group transition dark:bg-slate-900/40 dark:border-slate-800/80 dark:hover:bg-slate-900/60"
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        {/* Circle checkoff button */}
                        <button
                          type="button"
                          onClick={() => onCheckReminder(reminder.id)}
                          className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-transparent hover:text-emerald-500 hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer shrink-0 mt-0.5"
                          title="Check off"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 hover:scale-110 transition" />
                        </button>
                        <span className="text-xs text-slate-700 font-sans leading-relaxed whitespace-normal break-words dark:text-slate-300">
                          {reminder.text}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
