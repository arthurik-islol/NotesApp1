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
import {
  parseDatesFromText,
  getLocalDateString,
  getWeekDates,
  parseExplicitDateStr,
  getNoteTargetDate,
  formatCalendarDate
} from "../utils/dateUtils";
import { parseFinancials, parseNoteFinancialsByDay } from "../utils/financialUtils";

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
    
    return notes.filter(n => {
      const targetDate = getNoteTargetDate(n);
      if (targetDate === dateStr) return true;
      
      const explicitDates = getExplicitDatesForNote(n);
      return explicitDates.includes(dateStr);
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
