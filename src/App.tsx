import React, { useState, useEffect } from "react";
import { Note, Task, ChatMessage, Reminder } from "./types";
import Dashboard from "./components/Dashboard";
import NotesManager from "./components/NotesManager";
import CalendarView from "./components/CalendarView";
import SettingsModal from "./components/SettingsModal";
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  BookOpen,
  Sun,
  Moon,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// SEED DATA FOR FIRST TIME USER
const SEED_NOTES: Note[] = [];

const SEED_TASKS: Task[] = [];

const SEED_CHAT: ChatMessage[] = [];

export default function App() {
  // Global States
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [importedTaskIds, setImportedTaskIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [username, setUsername] = useState<string>("Your Blueprint");
  const [currency, setCurrency] = useState<string>("AMD");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("org_dark_mode") === "true";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("org_dark_mode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("org_dark_mode", "false");
    }
  }, [isDarkMode]);

  // Load from Local Storage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("org_notes");
    const savedTasks = localStorage.getItem("org_tasks");
    const savedChat = localStorage.getItem("org_chat");
    const savedImportedIds = localStorage.getItem("org_imported_ids");
    const savedUsername = localStorage.getItem("org_username");
    const savedCurrency = localStorage.getItem("org_currency");
    const savedReminders = localStorage.getItem("org_dashboard_reminders");

    if (savedNotes) setNotes(JSON.parse(savedNotes));
    else {
      setNotes(SEED_NOTES);
      localStorage.setItem("org_notes", JSON.stringify(SEED_NOTES));
    }

    if (savedTasks) setTasks(JSON.parse(savedTasks));
    else {
      setTasks(SEED_TASKS);
      localStorage.setItem("org_tasks", JSON.stringify(SEED_TASKS));
    }

    if (savedChat) setChatHistory(JSON.parse(savedChat));
    else {
      setChatHistory(SEED_CHAT);
      localStorage.setItem("org_chat", JSON.stringify(SEED_CHAT));
    }

    if (savedImportedIds) setImportedTaskIds(JSON.parse(savedImportedIds));
    else {
      const initialImported: string[] = [];
      setImportedTaskIds(initialImported);
      localStorage.setItem("org_imported_ids", JSON.stringify(initialImported));
    }

    if (savedReminders) setReminders(JSON.parse(savedReminders));
    else {
      setReminders([]);
      localStorage.setItem("org_dashboard_reminders", JSON.stringify([]));
    }

    if (savedUsername) setUsername(savedUsername);
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  // Sync to Local Storage
  const updateNotesState = (updatedNotes: Note[] | ((prev: Note[]) => Note[])) => {
    setNotes((prevNotes) => {
      const next = typeof updatedNotes === "function" ? updatedNotes(prevNotes) : updatedNotes;
      localStorage.setItem("org_notes", JSON.stringify(next));
      return next;
    });
  };

  const updateTasksState = (updatedTasks: Task[] | ((prev: Task[]) => Task[])) => {
    setTasks((prevTasks) => {
      const next = typeof updatedTasks === "function" ? updatedTasks(prevTasks) : updatedTasks;
      localStorage.setItem("org_tasks", JSON.stringify(next));
      return next;
    });
  };

  const updateChatState = (updatedChat: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatHistory((prevChat) => {
      const next = typeof updatedChat === "function" ? updatedChat(prevChat) : updatedChat;
      localStorage.setItem("org_chat", JSON.stringify(next));
      return next;
    });
  };

  const updateRemindersState = (updatedReminders: Reminder[] | ((prev: Reminder[]) => Reminder[])) => {
    setReminders((prevReminders) => {
      const next = typeof updatedReminders === "function" ? updatedReminders(prevReminders) : updatedReminders;
      localStorage.setItem("org_dashboard_reminders", JSON.stringify(next));
      return next;
    });
  };

  const handleAddReminder = (text: string) => {
    const newRem: Reminder = {
      id: `rem-${Date.now()}`,
      text: text
    };
    updateRemindersState((prev) => [...prev, newRem]);
  };

  const handleCheckReminder = (id: string) => {
    updateRemindersState((prev) => prev.filter((r) => r.id !== id));
  };

  // Add/Delete Note callbacks
  const handleAddNote = (newNoteData: Omit<Note, "id" | "createdAt">): Note => {
    const newNote: Note = {
      ...newNoteData,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    updateNotesState((prev) => [...prev, newNote]);
    return newNote;
  };

  const handleUpdateItemStatus = (type: "task", id: string, isCompleted: boolean) => {
    if (type === "task") {
      updateTasksState((prev) => prev.map(t => t.id === id ? { ...t, isCompleted } : t));
    }
  };

  const handleUpdateNote = (updatedNote: Note) => {
    updateNotesState((prev) => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleDeleteNote = (noteId: string) => {
    updateNotesState((prev) => prev.filter(n => n.id !== noteId));
    // Also remove associated tasks
    updateTasksState((prev) => prev.filter(t => t.noteId !== noteId));
  };

  const handleDeleteTask = (taskId: string) => {
    updateTasksState((prev) => prev.filter(t => t.id !== taskId));
  };

  // Import task callback (linking AI suggestion to checklist / calendar)
  const handleImportTask = (text: string, dueDate: string, uniqueImportId: string) => {
    const noteId = uniqueImportId.split("-task-")[0];
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      isCompleted: false,
      noteId
    };

    updateTasksState((prev) => [...prev, newTask]);
    
    setImportedTaskIds((prev) => {
      const next = [...prev, uniqueImportId];
      localStorage.setItem("org_imported_ids", JSON.stringify(next));
      return next;
    });
  };

  const handleAddChatMessage = (msg: ChatMessage) => {
    updateChatState((prev) => [...prev, msg]);
  };

  const handleClearChat = () => {
    updateChatState([]);
  };

  const handleUpdateUsername = (name: string) => {
    setUsername(name);
    localStorage.setItem("org_username", name);
  };

  const handleUpdateCurrency = (curr: string) => {
    setCurrency(curr);
    localStorage.setItem("org_currency", curr);
  };

  const handleResetApp = () => {
    setNotes(SEED_NOTES);
    setTasks(SEED_TASKS);
    setChatHistory(SEED_CHAT);
    setReminders([]);
    setImportedTaskIds([]);
    setUsername("Your Blueprint");
    setCurrency("AMD");

    localStorage.setItem("org_notes", JSON.stringify(SEED_NOTES));
    localStorage.setItem("org_tasks", JSON.stringify(SEED_TASKS));
    localStorage.setItem("org_chat", JSON.stringify(SEED_CHAT));
    localStorage.setItem("org_dashboard_reminders", JSON.stringify([]));
    localStorage.setItem("org_imported_ids", JSON.stringify([]));
    localStorage.setItem("org_username", "Your Blueprint");
    localStorage.setItem("org_currency", "AMD");
  };

  const handleClearNotes = () => {
    updateNotesState([]);
    updateTasksState((prev) => prev.filter(t => !t.noteId));
    setImportedTaskIds([]);
    localStorage.setItem("org_imported_ids", JSON.stringify([]));
  };

  const handleClearTasks = () => {
    updateTasksState([]);
    setImportedTaskIds([]);
    localStorage.setItem("org_imported_ids", JSON.stringify([]));
  };

  const handleImportData = (
    importedNotes: Note[], 
    importedTasks: Task[], 
    importedUsername?: string, 
    importedCurrency?: string
  ) => {
    if (importedNotes && importedNotes.length > 0) {
      updateNotesState(importedNotes);
    }
    if (importedTasks && importedTasks.length > 0) {
      updateTasksState(importedTasks);
    }
    if (importedUsername) {
      handleUpdateUsername(importedUsername);
    }
    if (importedCurrency) {
      handleUpdateCurrency(importedCurrency);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col antialiased dark:bg-slate-950 transition-colors">
      
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs dark:bg-indigo-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-sans font-extrabold text-slate-900 tracking-tight dark:text-slate-50">
              Aura Organizer
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase mt-0.5 dark:text-slate-500">
              Personal Development Hub
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 border border-slate-100 bg-slate-50/50 p-1.5 rounded-2xl dark:border-slate-850 dark:bg-slate-950/50">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-sans font-semibold transition cursor-pointer ${
                activeTab === "dashboard" 
                  ? "bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-2xs dark:bg-slate-800 dark:text-indigo-400 dark:border-indigo-450" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-sans font-semibold transition cursor-pointer ${
                activeTab === "notes" 
                  ? "bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-2xs dark:bg-slate-800 dark:text-indigo-400 dark:border-indigo-450" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Personal Notes</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-sans font-semibold transition cursor-pointer ${
                activeTab === "calendar" 
                  ? "bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-2xs dark:bg-slate-800 dark:text-indigo-400 dark:border-indigo-450" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </button>
          </nav>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer shadow-3xs"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 fill-indigo-500/10" />
            )}
          </button>

          {/* Settings Trigger Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer shadow-3xs"
            title="Open Settings"
          >
            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Body Content Scroll Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        {/* Dynamic component routing rendering */}
        <div className="relative">
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard 
                notes={notes} 
                tasks={tasks}
                username={username}
                currency={currency}
                onNavigate={(tab) => setActiveTab(tab)} 
                onDeleteTask={handleDeleteTask}
                onToggleTask={(id, isCompleted) => handleUpdateItemStatus("task", id, isCompleted)}
                reminders={reminders}
                onAddReminder={handleAddReminder}
                onCheckReminder={handleCheckReminder}
              />
            </motion.div>
          )}

          {activeTab === "notes" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <NotesManager 
                notes={notes}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onImportTask={handleImportTask}
                importedTaskIds={importedTaskIds}
                selectedNoteId={selectedNoteId}
              />
            </motion.div>
          )}

          {activeTab === "calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CalendarView 
                notes={notes}
                tasks={tasks}
                currency={currency}
                onDeleteTask={handleDeleteTask}
                onToggleTask={(id, isCompleted) => handleUpdateItemStatus("task", id, isCompleted)}
                onNoteSelect={(noteId) => {
                  setSelectedNoteId(noteId);
                  setActiveTab("notes");
                }}
              />
            </motion.div>
          )}
        </div>

      </main>

      {/* Mobile Footer Sticky Navigation */}
      <nav className="md:hidden bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 py-2.5 px-4 flex items-center justify-around z-50 shadow-lg dark:bg-slate-900 dark:border-slate-800 transition-colors">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center space-y-1 transition ${activeTab === "dashboard" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-sans font-medium">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`flex flex-col items-center space-y-1 transition ${activeTab === "notes" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-sans font-medium">Notes</span>
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex flex-col items-center space-y-1 transition ${activeTab === "calendar" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-sans font-medium">Calendar</span>
        </button>
      </nav>

      {/* Adjust viewport space on mobile so footer navigation doesn't clip content */}
      <div className="h-16 md:hidden" />

      {/* Settings Modal overlay portal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            username={username}
            onUpdateUsername={handleUpdateUsername}
            currency={currency}
            onUpdateCurrency={handleUpdateCurrency}
            onResetApp={handleResetApp}
            onClearNotes={handleClearNotes}
            onClearTasks={handleClearTasks}
            notes={notes}
            tasks={tasks}
            onImportData={handleImportData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
