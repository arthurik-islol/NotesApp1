import React, { useState, useMemo } from "react";
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
  Plus,
  RotateCcw,
  SlidersHorizontal,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  parseDatesFromText, 
  getNoteTargetDate, 
  getWeekDates, 
  parseExplicitDateStr,
  formatCalendarDate 
} from "../utils/dateUtils";
import {
  calculatePeriodFinancialReport,
  TimeframeMode,
  PeriodFinancialReport
} from "../utils/financialUtils";

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
  // Timeframe & Financial Highlights State
  const [timeframeMode, setTimeframeMode] = useState<TimeframeMode>("week");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth()); // 0-11
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const [newReminderText, setNewReminderText] = useState("");

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    onAddReminder(newReminderText.trim());
    setNewReminderText("");
  };

  // Date anchors
  const anchorDate = new Date();
  anchorDate.setDate(anchorDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(anchorDate);
  const startOfWeekStr = weekDates[0].toISOString().split("T")[0];
  const endOfWeekStr = weekDates[6].toISOString().split("T")[0];

  // Month range
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const startOfMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const endOfMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(daysInSelectedMonth).padStart(2, "0")}`;

  // Year range
  const startOfYearStr = `${selectedYear}-01-01`;
  const endOfYearStr = `${selectedYear}-12-31`;

  // Financial report calculation for current timeframe
  const financialReport: PeriodFinancialReport = useMemo(() => {
    return calculatePeriodFinancialReport(notes, timeframeMode, {
      startDateStr: 
        timeframeMode === "week" ? startOfWeekStr :
        timeframeMode === "month" ? startOfMonthStr :
        timeframeMode === "year" ? startOfYearStr :
        timeframeMode === "custom" ? customStartDate : undefined,
      endDateStr:
        timeframeMode === "week" ? endOfWeekStr :
        timeframeMode === "month" ? endOfMonthStr :
        timeframeMode === "year" ? endOfYearStr :
        timeframeMode === "custom" ? customEndDate : undefined,
      selectedYear,
      selectedMonth,
      weekDates
    });
  }, [notes, timeframeMode, startOfWeekStr, endOfWeekStr, startOfMonthStr, endOfMonthStr, startOfYearStr, endOfYearStr, customStartDate, customEndDate, selectedYear, selectedMonth, weekDates]);

  // Overall financial stats
  const totalTurnover = financialReport.turnover;
  const totalProfit = financialReport.profit;
  const profitMarginPercent = financialReport.profitMargin;

  // Maximum values for scaling bars
  const maxPeriodTurnover = Math.max(
    ...financialReport.breakdownItems.map(d => Math.abs(d.turnover)),
    1
  );
  const maxPeriodProfit = Math.max(
    ...financialReport.breakdownItems.map(d => Math.abs(d.profit)),
    1
  );

  // Currency Formatter Helper
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ` ${currency}`;
  };

  // Helper text for date range title
  const getPeriodDisplayTitle = () => {
    if (timeframeMode === "week") {
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
      const startStr = weekDates[0].toLocaleDateString(undefined, options);
      const endStr = weekDates[6].toLocaleDateString(undefined, { ...options, year: "numeric" });
      return `${startStr} - ${endStr}`;
    }
    if (timeframeMode === "month") {
      const dateObj = new Date(selectedYear, selectedMonth, 1);
      return dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (timeframeMode === "year") {
      return `Calendar Year ${selectedYear}`;
    }
    if (timeframeMode === "all") {
      return `All Time Records (${financialReport.earliestDate} to ${financialReport.latestDate})`;
    }
    if (timeframeMode === "custom") {
      return `${customStartDate} to ${customEndDate}`;
    }
    return "";
  };

  const handlePrevPeriod = () => {
    if (timeframeMode === "week") {
      setWeekOffset(prev => prev - 1);
    } else if (timeframeMode === "month") {
      setSelectedMonth(prev => {
        if (prev === 0) {
          setSelectedYear(y => y - 1);
          return 11;
        }
        return prev - 1;
      });
    } else if (timeframeMode === "year") {
      setSelectedYear(y => y - 1);
    }
  };

  const handleNextPeriod = () => {
    if (timeframeMode === "week") {
      setWeekOffset(prev => prev + 1);
    } else if (timeframeMode === "month") {
      setSelectedMonth(prev => {
        if (prev === 11) {
          setSelectedYear(y => y + 1);
          return 0;
        }
        return prev + 1;
      });
    } else if (timeframeMode === "year") {
      setSelectedYear(y => y + 1);
    }
  };

  const handleResetToCurrent = () => {
    if (timeframeMode === "week") {
      setWeekOffset(0);
    } else if (timeframeMode === "month") {
      setSelectedYear(new Date().getFullYear());
      setSelectedMonth(new Date().getMonth());
    } else if (timeframeMode === "year") {
      setSelectedYear(new Date().getFullYear());
    }
  };

  const applyPresetRange = (preset: "7d" | "30d" | "90d" | "thisMonth" | "lastMonth" | "ytd" | "all") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setCustomStartDate(d.toISOString().split("T")[0]);
      setCustomEndDate(todayStr);
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setCustomStartDate(d.toISOString().split("T")[0]);
      setCustomEndDate(todayStr);
    } else if (preset === "90d") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setCustomStartDate(d.toISOString().split("T")[0]);
      setCustomEndDate(todayStr);
    } else if (preset === "thisMonth") {
      const startD = new Date(today.getFullYear(), today.getMonth(), 1);
      const endD = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setCustomStartDate(startD.toISOString().split("T")[0]);
      setCustomEndDate(endD.toISOString().split("T")[0]);
    } else if (preset === "lastMonth") {
      const startD = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endD = new Date(today.getFullYear(), today.getMonth(), 0);
      setCustomStartDate(startD.toISOString().split("T")[0]);
      setCustomEndDate(endD.toISOString().split("T")[0]);
    } else if (preset === "ytd") {
      const startD = new Date(today.getFullYear(), 0, 1);
      setCustomStartDate(startD.toISOString().split("T")[0]);
      setCustomEndDate(todayStr);
    } else if (preset === "all") {
      setCustomStartDate(financialReport.earliestDate);
      setCustomEndDate(financialReport.latestDate);
    }
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
            {/* Header with Title and Timeframe Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-sans font-bold text-slate-900 dark:text-slate-100">
                  Financial Performance & Analytics
                </h2>
              </div>

              {/* Timeframe Selector Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-sans font-semibold">
                {(["week", "month", "year", "all", "custom"] as TimeframeMode[]).map((mode) => {
                  const labelMap: Record<TimeframeMode, string> = {
                    week: "Weekly",
                    month: "Monthly",
                    year: "Yearly",
                    all: "All Time",
                    custom: "Custom"
                  };
                  const isActive = timeframeMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setTimeframeMode(mode)}
                      className={`px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {labelMap[mode]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              {/* Range Navigation Controls */}
              {timeframeMode !== "custom" && (
                <div className="flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/40 px-4 py-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    {timeframeMode !== "all" ? (
                      <button
                        onClick={handlePrevPeriod}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-3xs"
                        title="Previous period"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="w-7" />
                    )}

                    {timeframeMode !== "all" && (
                      <button
                        onClick={handleResetToCurrent}
                        className="px-2.5 py-1 text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-3xs"
                        title="Jump to current period"
                      >
                        Current
                      </button>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wide">
                      {timeframeMode === "week" ? "Weekly Timeframe" : timeframeMode === "month" ? "Monthly Timeframe" : timeframeMode === "year" ? "Yearly Timeframe" : "All Time Coverage"}
                    </span>
                    <span className="text-xs sm:text-sm font-sans font-bold text-slate-800 dark:text-slate-200">
                      {getPeriodDisplayTitle()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {timeframeMode !== "all" ? (
                      <button
                        onClick={handleNextPeriod}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-3xs"
                        title="Next period"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="w-7" />
                    )}
                  </div>
                </div>
              )}

              {/* Custom Date Range Controls */}
              {timeframeMode === "custom" && (
                <div className="bg-slate-50/90 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs font-sans font-semibold text-slate-700 dark:text-slate-300">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                      <span>Custom Date Range:</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-mono text-slate-500">From</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-mono text-slate-500">To</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Presets:</span>
                    {[
                      { id: "7d", label: "Last 7D" },
                      { id: "30d", label: "Last 30D" },
                      { id: "90d", label: "Last 90D" },
                      { id: "thisMonth", label: "This Month" },
                      { id: "lastMonth", label: "Last Month" },
                      { id: "ytd", label: "Year-to-Date" },
                      { id: "all", label: "All Records" }
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPresetRange(preset.id as any)}
                        className="px-2 py-0.5 text-[11px] font-sans font-medium rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Metrics Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Turnover card */}
                <div className="bg-slate-50/60 dark:bg-slate-950/30 p-4 border border-slate-200/80 dark:border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Overall Turnover</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="text-xl font-sans font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(totalTurnover)}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                    Gross turnover for selected period
                  </p>
                </div>

                {/* Profit card */}
                <div className="bg-slate-50/60 dark:bg-slate-950/30 p-4 border border-slate-200/80 dark:border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Overall Profit</span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h4 className={`text-xl font-sans font-extrabold ${totalProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {totalProfit < 0 ? "-" : ""}{formatCurrency(Math.abs(totalProfit))}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                    {totalProfit < 0 ? "Net period loss logged" : "Net period earnings logged"}
                  </p>
                </div>

                {/* Margin card */}
                <div className={`p-4 border rounded-xl space-y-1 transition duration-200 ${
                  profitMarginPercent >= 30 
                    ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300" 
                    : profitMarginPercent > 0 
                    ? "bg-indigo-50/40 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300"
                    : profitMarginPercent < 0
                    ? "bg-rose-50/40 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40 text-rose-900 dark:text-rose-300"
                    : "bg-slate-50/60 border-slate-200/80 dark:bg-slate-950/30 dark:border-slate-800/80 text-slate-800 dark:text-slate-300"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">Profit Margin</span>
                    <Percent className="w-4 h-4 opacity-80" />
                  </div>
                  <h4 className="text-xl font-sans font-extrabold">
                    {profitMarginPercent > 0 ? "+" : ""}{profitMarginPercent.toFixed(1)}%
                  </h4>
                  <p className="text-[10px] opacity-75 font-sans">
                    {totalTurnover > 0 ? "Profit / Turnover ratio" : "No turnover recorded"}
                  </p>
                </div>
              </div>

              {/* Timeframe Performance Breakdown Visualizer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {timeframeMode === "week" ? "Day-by-Day Performance" : timeframeMode === "month" ? "Weekly Segments Breakdown" : timeframeMode === "year" ? "Monthly Progression Breakdown" : "Timeframe Segment Breakdown"}
                  </h3>
                  <div className="flex items-center space-x-3 text-[11px] font-sans">
                    <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                      <span>Turnover</span>
                    </span>
                    <span className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                      <span>Profit</span>
                    </span>
                  </div>
                </div>
                
                {/* Visual Bars Container */}
                <div className={`grid gap-2 sm:gap-3 ${
                  financialReport.breakdownItems.length <= 7
                    ? "grid-cols-7"
                    : financialReport.breakdownItems.length <= 12
                    ? "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12"
                    : "grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                }`}>
                  {financialReport.breakdownItems.map((item, idx) => {
                    const hasData = item.hasData;
                    
                    // Proportionate height calculations
                    const turnoverPct = maxPeriodTurnover > 0 && item.turnover > 0
                      ? Math.min(Math.round((item.turnover / maxPeriodTurnover) * 100), 100)
                      : 0;

                    const profitPct = maxPeriodProfit > 0 && item.profit !== 0
                      ? Math.min(Math.round((Math.abs(item.profit) / maxPeriodProfit) * 100), 100)
                      : 0;

                    return (
                      <div 
                        key={idx}
                        className={`flex flex-col items-center p-2 rounded-xl border text-center transition duration-150 group relative ${
                          hasData
                            ? "bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500"
                            : "bg-transparent border-slate-100 dark:border-slate-850/50"
                        }`}
                      >
                        {/* Column Header */}
                        <span className="text-[11px] font-sans font-bold text-slate-800 dark:text-slate-200 truncate w-full">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate w-full">
                            {item.sublabel}
                          </span>
                        )}

                        {/* Bar Stage */}
                        <div className="h-28 w-full flex items-end justify-center gap-1 my-2 px-1 relative">
                          {hasData ? (
                            <>
                              {/* Turnover Bar (Emerald) */}
                              <div 
                                className="w-full max-w-[12px] bg-emerald-500/80 hover:bg-emerald-500 rounded-t-xs transition-all duration-300 relative group/bar cursor-pointer"
                                style={{ height: `${Math.max(turnoverPct, 6)}%` }}
                              >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover/bar:flex flex-col items-center z-50 pointer-events-none whitespace-nowrap">
                                  <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg font-mono">
                                    <span className="text-emerald-400 font-bold">Turnover:</span> {formatCurrency(item.turnover)}
                                  </div>
                                </div>
                              </div>

                              {/* Profit Bar (Blue for positive, Rose for negative) */}
                              <div 
                                className={`w-full max-w-[12px] rounded-t-xs transition-all duration-300 relative group/bar cursor-pointer ${
                                  item.profit < 0 
                                    ? "bg-rose-500/80 hover:bg-rose-500" 
                                    : "bg-blue-500/80 hover:bg-blue-500"
                                }`}
                                style={{ height: `${Math.max(profitPct, 6)}%` }}
                              >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover/bar:flex flex-col items-center z-50 pointer-events-none whitespace-nowrap">
                                  <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg font-mono">
                                    <span className={item.profit < 0 ? "text-rose-400 font-bold" : "text-blue-400 font-bold"}>
                                      {item.profit < 0 ? "Loss:" : "Profit:"}
                                    </span> {item.profit < 0 ? "-" : ""}{formatCurrency(Math.abs(item.profit))}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center w-full">
                              <span className="text-[9px] text-slate-300 dark:text-slate-700 italic select-none">-</span>
                            </div>
                          )}
                        </div>

                        {/* Footer Percentage / Margin */}
                        <div className="min-h-[16px] flex items-center justify-center w-full">
                          {hasData ? (
                            item.turnover !== 0 ? (
                              <span className={`text-[10px] font-mono font-bold ${
                                item.profit < 0 
                                  ? "text-rose-500" 
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {item.profitMargin > 0 ? "+" : ""}{item.profitMargin.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-700">-</span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes Source Attribution */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contributing Notes in Selected Timeframe ({financialReport.contributingNotes.length})
                  </h3>
                  <span className="text-[11px] font-sans text-slate-400 dark:text-slate-500">
                    Click note to open
                  </span>
                </div>
                
                {financialReport.contributingNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans italic bg-slate-50/50 dark:bg-slate-900/20 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                    No notes with recorded turnover or profit found within this timeframe. Create notes with e.g. "Turnover: 5000, Profit: 1500" to track analytics.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {financialReport.contributingNotes.map(({ note, turnover: noteTurnover, profit: noteProfit, profitMargin }) => {
                      return (
                        <div 
                          key={note.id}
                          className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                          onClick={() => onNavigate("notes")}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1 mr-4">
                            <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200 truncate">
                              {note.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              Date: {formatCalendarDate(getNoteTargetDate(note))}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-xs shrink-0">
                            <span 
                              className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-md" 
                              title={`Turnover: ${formatCurrency(noteTurnover)}`}
                            >
                              T: {noteTurnover.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
                            </span>
                            <span 
                              className={`font-bold px-2 py-0.5 rounded-md border ${
                                noteProfit < 0 
                                  ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40" 
                                  : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40"
                              }`}
                              title={`Profit: ${formatCurrency(noteProfit)}`}
                            >
                              P: {noteProfit < 0 ? "-" : ""}{Math.abs(noteProfit).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
                            </span>
                            <span 
                              className="text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 px-2 py-0.5 rounded-md" 
                              title={`Profit Margin: ${profitMargin.toFixed(1)}%`}
                            >
                              %: {profitMargin > 0 ? "+" : ""}{profitMargin.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
