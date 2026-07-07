import React, { useState } from "react";
import { Note, NOTE_CATEGORIES, Task } from "../types";
import { 
  Plus, 
  Search, 
  Trash2, 
  Sparkles, 
  ChevronRight, 
  BookOpen, 
  Calendar, 
  Folder, 
  Tag, 
  Loader2, 
  Check, 
  FileText,
  AlertCircle,
  Upload
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

function parseFirstDateFromText(title: string, content: string): string | null {
  const titleDates = parseDatesFromText(title);
  if (titleDates.length > 0) return titleDates[0];
  const contentDates = parseDatesFromText(content);
  return contentDates.length > 0 ? contentDates[0] : null;
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function formatWeekHeader(mondayStr: string): string {
  const d = new Date(mondayStr);
  return "Week of " + d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

interface NotesManagerProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, "id" | "createdAt">) => Note;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onImportTask: (text: string, dueDate: string, noteId: string) => void;
  importedTaskIds: string[]; // Keep track of imported tasks
  selectedNoteId?: string | null;
}

export default function NotesManager({ 
  notes, 
  onAddNote, 
  onUpdateNote, 
  onDeleteNote,
  onImportTask,
  importedTaskIds,
  selectedNoteId
}: NotesManagerProps) {
  // UI states
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auto reset delete confirmation when note selection changes
  React.useEffect(() => {
    setShowDeleteConfirm(false);
  }, [activeNoteId]);

  // Handle note selection from other components like CalendarView
  React.useEffect(() => {
    if (selectedNoteId) {
      setActiveNoteId(selectedNoteId);
      setIsCreating(false);
    }
  }, [selectedNoteId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [groupByWeek, setGroupByWeek] = useState(true);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});

  // Toggle week collapse state
  const toggleWeek = (monday: string) => {
    setCollapsedWeeks(prev => {
      const isCurrentlyCollapsed = prev[monday] ?? true;
      return {
        ...prev,
        [monday]: !isCurrentlyCollapsed
      };
    });
  };

  // New Note Form States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [tagsInput, setTagsInput] = useState("");
  
  // Manual Task input states
  const [manualTaskText, setManualTaskText] = useState("");
  const [manualTaskDate, setManualTaskDate] = useState("");

  // Upload/Import error state
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Helper to read file content as a promise
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          resolve(text);
        } else {
          reject(new Error("Failed to read file text"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Unknown error reading file"));
      reader.readAsText(file);
    });
  };

  // Common handler to process multiple .txt files
  const processFiles = async (files: FileList | File[]) => {
    const txtFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".txt"));
    
    if (txtFiles.length === 0) {
      setUploadError("No .txt files detected. Please drop or select only .txt files.");
      return;
    }

    setUploadError(null);
    let lastCreatedNoteId: string | null = null;

    for (const file of txtFiles) {
      try {
        const text = await readFileAsText(file);
        const rawTitle = file.name.replace(/\.txt$/i, "");
        const noteTitle = rawTitle.replace(/[-_]/g, " ");

        const createdNote = onAddNote({
          title: noteTitle,
          content: text,
          category: "Work & Tasks",
          tags: ["imported-file"],
        });

        if (createdNote) {
          lastCreatedNoteId = createdNote.id;
        }
      } catch (err: any) {
        console.error(`Error reading file ${file.name}:`, err);
        setUploadError(`Failed to import file "${file.name}"`);
      }
    }

    if (lastCreatedNoteId) {
      setActiveNoteId(lastCreatedNoteId);
      setIsCreating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset the file input value so same files can be uploaded again if needed
    e.target.value = "";
  };

  // Computed lists
  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Compute notes with linked target dates & group them by week (Monday)
  const notesWithDates = filteredNotes.map(note => {
    const targetDate = parseFirstDateFromText(note.title, note.content) || note.createdAt.split("T")[0];
    const monday = getMonday(targetDate);
    return { ...note, targetDate, monday };
  });

  // Sort notesWithDates descending by targetDate
  notesWithDates.sort((a, b) => b.targetDate.localeCompare(a.targetDate));

  // If grouping:
  const weeksMap: { [key: string]: typeof notesWithDates } = {};
  notesWithDates.forEach(n => {
    if (!weeksMap[n.monday]) {
      weeksMap[n.monday] = [];
    }
    weeksMap[n.monday].push(n);
  });

  // Sort mondays descending
  const sortedMondays = Object.keys(weeksMap).sort((a, b) => b.localeCompare(a));

  // Sort notes within each week ascending (chronological within the week)
  sortedMondays.forEach(m => {
    weeksMap[m].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  });

  const handleManualTaskAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTaskText.trim() || !activeNote) return;

    const taskText = manualTaskText.trim();
    const taskDate = manualTaskDate || new Date().toISOString().split("T")[0];

    // Add to note's suggestedTasks (we can reuse this field for manually linked tasks)
    const updatedSuggestedTasks = [
      ...(activeNote.suggestedTasks || []),
      { task: taskText, dueDate: taskDate }
    ];

    const updatedNote: Note = {
      ...activeNote,
      suggestedTasks: updatedSuggestedTasks
    };

    onUpdateNote(updatedNote);

    // Automatically trigger import/track for this manual task so it lands in the calendar immediately!
    const idx = updatedSuggestedTasks.length - 1;
    const uniqueTaskId = `${activeNote.id}-task-${idx}`;
    onImportTask(taskText, taskDate, uniqueTaskId);

    // Clear form inputs
    setManualTaskText("");
    setManualTaskDate("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    const newNote = onAddNote({
      title,
      content,
      category,
      tags,
    });

    if (newNote) {
      setActiveNoteId(newNote.id);
    }

    // Reset Form
    setTitle("");
    setContent("");
    setCategory("General");
    setTagsInput("");
    setIsCreating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-12rem)]" id="notes-manager">
      
      {/* LEFT PANEL: Note List & Sidebar */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-xs dark:bg-slate-900/60 dark:border-slate-800 relative"
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-600/15 dark:bg-indigo-950/40 backdrop-blur-xs border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center z-50 pointer-events-none"
            >
              <div className="p-4 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-indigo-100 dark:border-indigo-950 flex items-center justify-center mb-3 scale-110 transition duration-200">
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              </div>
              <p className="text-indigo-900 dark:text-indigo-200 font-sans font-bold text-sm">
                Drop Note File Here
              </p>
              <p className="text-indigo-600 dark:text-indigo-400 font-sans text-xs mt-1">
                Supports .txt documents
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Search and Sort Filter */}
        <div className="p-4 border-b border-slate-100 space-y-3 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search notes, tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
              Group & Sort
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGroupByWeek(true)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold font-sans transition-all cursor-pointer ${
                  groupByWeek 
                    ? "bg-white text-indigo-600 shadow-3xs dark:bg-slate-800 dark:text-indigo-400" 
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Weekly Grouping
              </button>
              <button
                type="button"
                onClick={() => setGroupByWeek(false)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold font-sans transition-all cursor-pointer ${
                  !groupByWeek 
                    ? "bg-white text-indigo-600 shadow-3xs dark:bg-slate-800 dark:text-indigo-400" 
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Chronological
              </button>
            </div>
          </div>
        </div>

        {/* Note List Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-sans">
              No notes found
            </div>
          ) : groupByWeek ? (
            sortedMondays.map(monday => {
              const isCollapsed = collapsedWeeks[monday] ?? true;
              return (
                <div key={monday} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleWeek(monday)}
                    className="sticky top-0 z-10 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs py-1.5 px-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors group/header cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <ChevronRight 
                        className={`w-3.5 h-3.5 text-slate-400 group-hover/header:text-indigo-500 transition-transform duration-200 shrink-0 ${
                          !isCollapsed ? "rotate-90 text-indigo-500" : ""
                        }`} 
                      />
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono truncate">
                        {formatWeekHeader(monday)}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-950 dark:text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800 shrink-0 select-none">
                      {weeksMap[monday].length} {weeksMap[monday].length === 1 ? 'report' : 'reports'}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="space-y-2 overflow-hidden"
                      >
                        {weeksMap[monday].map(note => {
                          const isActive = note.id === activeNoteId;
                          return (
                            <div 
                              key={note.id}
                              onClick={() => {
                                setActiveNoteId(note.id);
                                setIsCreating(false);
                              }}
                              className={`p-3.5 rounded-xl cursor-pointer text-left transition duration-200 relative group border ${
                                isActive 
                                  ? "bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800/80" 
                                  : "bg-white hover:bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:border-slate-800/80"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={`font-sans font-bold text-sm line-clamp-1 ${isActive ? "text-indigo-900 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"}`}>
                                  {note.title}
                                </h3>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 shrink-0">
                                  {note.category}
                                </span>
                              </div>
                              
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2 dark:text-slate-400">
                                {note.content}
                              </p>

                              <div className="flex items-center justify-between mt-3">
                                <span className="text-[10px] text-slate-400 font-mono dark:text-slate-500">
                                  Linked: {note.targetDate}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            notesWithDates.map(note => {
              const isActive = note.id === activeNoteId;
              return (
                <div 
                  key={note.id}
                  onClick={() => {
                    setActiveNoteId(note.id);
                    setIsCreating(false);
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer text-left transition duration-200 relative group border ${
                    isActive 
                      ? "bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800/80" 
                      : "bg-white hover:bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:border-slate-800/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-sans font-bold text-sm line-clamp-1 ${isActive ? "text-indigo-900 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"}`}>
                      {note.title}
                    </h3>
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 shrink-0">
                      {note.category}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 dark:text-slate-400">
                    {note.content}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-slate-400 font-mono dark:text-slate-500">
                      Linked: {note.targetDate}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Button bottom bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2 dark:bg-slate-900/40 dark:border-slate-800">
          <button
            onClick={() => {
              setIsCreating(true);
              setActiveNoteId(null);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold text-sm py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-xs dark:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Note</span>
          </button>

          <label className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-sans font-semibold text-sm py-2.5 rounded-xl transition duration-200 cursor-pointer text-center shadow-3xs dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200">
            <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Import Note (.txt)</span>
            <input 
              type="file" 
              accept=".txt" 
              multiple
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>
          <p className="text-[10px] text-center text-slate-400 font-sans tracking-wide dark:text-slate-500">
            or drag & drop files directly onto this panel
          </p>


        </div>
      </div>

      {/* RIGHT PANEL: Details/Editor */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-y-auto h-full shadow-xs relative dark:bg-slate-900/60 dark:border-slate-800">
        <AnimatePresence mode="wait">
          {/* Creating View */}
          {isCreating ? (
            <motion.form 
              key="create-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCreateSubmit}
              className="p-6 space-y-6 h-full flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-sans font-bold text-slate-800 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-indigo-500" /> New Personal Note
                  </h2>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCreating(false);
                      setActiveNoteId(notes[0]?.id || null);
                    }}
                    className="text-slate-400 text-sm hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">Note Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Brainstorming Ideas for my 2026 Marathon Goal..." 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-sans"
                    >
                      {NOTE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">Content</label>
                  <textarea 
                    required
                    rows={12}
                    placeholder="Write your note, thoughts, ideas, or study highlights here..." 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">Tags (comma-separated)</label>
                  <input 
                    type="text" 
                    placeholder="marathon, running, fitness, timeline" 
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 mt-6 flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold text-sm px-6 py-2.5 rounded-xl transition duration-200 cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </motion.form>
          ) : activeNote ? (
            /* Active Note Details & AI Summaries */
            <motion.div 
              key={`details-${activeNote.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-6 space-y-8"
            >
              {/* Note Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400">
                      {activeNote.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(activeNote.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
                    </span>
                  </div>
                  <h1 className="text-2xl font-sans font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {activeNote.title}
                  </h1>
                </div>

                <div className="flex items-center space-x-2 self-start md:self-center">
                  {showDeleteConfirm ? (
                    <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 p-1 rounded-xl animate-fade-in dark:bg-red-950/20 dark:border-red-900/30">
                      <span className="text-[11px] font-semibold text-red-700 px-1.5 font-sans dark:text-red-400">Delete this note?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteNote(activeNote.id);
                          const nextNote = notes.find(n => n.id !== activeNote.id);
                          setActiveNoteId(nextNote ? nextNote.id : null);
                          setShowDeleteConfirm(false);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-sans font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-slate-500 hover:text-slate-700 text-[11px] font-sans font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition duration-200 cursor-pointer dark:hover:bg-red-950/30"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Note Content and Actions in standard vertical layout */}
              <div className="space-y-6">
                
                {/* Note Core Content */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" /> Original Note Content
                  </h3>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-5 rounded-xl border border-slate-100 font-sans dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-300">
                    {activeNote.content}
                  </div>

                  {activeNote.tags && activeNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeNote.tags.map(tag => (
                        <span key={tag} className="flex items-center text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 font-sans dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          <Tag className="w-3 h-3 mr-1 text-slate-400" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800 my-6" />

                {/* Manual Actions & Linked Tasks (Replaced Smart Insights with Clean Task Linker) */}
                <div className="space-y-6">
                  {uploadError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start text-xs font-sans dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <span className="font-bold">Import Warning</span>
                        <p className="mt-0.5">{uploadError}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                    
                    {/* Left Side: Instructions / Info Box */}
                    <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Note Action Hub
                      </h4>
                      <p className="text-slate-600 text-xs leading-relaxed font-sans dark:text-slate-300">
                        Create actionable calendar tasks directly linked to this note. Each task will automatically sync to your global personal scheduler and the calendar view.
                      </p>
                      <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <p className="flex items-center"><Check className="w-3.5 h-3.5 text-indigo-500 mr-1.5 shrink-0" /> Fast manual link to date</p>
                        <p className="flex items-center"><Check className="w-3.5 h-3.5 text-indigo-500 mr-1.5 shrink-0" /> Immediate tracking on the calendar</p>
                        <p className="flex items-center"><Check className="w-3.5 h-3.5 text-indigo-500 mr-1.5 shrink-0" /> Categorized note-to-task relationships</p>
                      </div>
                    </div>

                    {/* Right Side: Linked Tasks & Deadlines */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Linked Tasks & Deadlines
                      </h4>
                      
                      {activeNote.suggestedTasks && activeNote.suggestedTasks.length > 0 ? (
                        <div className="space-y-2">
                          {activeNote.suggestedTasks.map((st, i) => {
                            const uniqueTaskId = `${activeNote.id}-task-${i}`;
                            const isImported = importedTaskIds.includes(uniqueTaskId);

                            return (
                              <div 
                                key={i} 
                                className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between hover:bg-slate-50/50 transition dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-900/60"
                              >
                                <div className="space-y-0.5 pr-2">
                                  <p className="text-slate-700 font-sans text-xs font-medium leading-tight dark:text-slate-200">
                                    {st.task}
                                  </p>
                                  {st.dueDate && (
                                    <div className="flex items-center text-[10px] text-slate-400 font-mono mt-1 dark:text-slate-500">
                                      <Calendar className="w-3 h-3 mr-1 text-indigo-400" />
                                      <span>Target: {st.dueDate}</span>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    if (!isImported && activeNote) {
                                      const noteDateFallback = parseFirstDateFromText(activeNote.title, activeNote.content) || activeNote.createdAt.split("T")[0];
                                      onImportTask(st.task, st.dueDate || noteDateFallback, uniqueTaskId);
                                    }
                                  }}
                                  disabled={isImported}
                                  className={`flex items-center shrink-0 space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-sans font-semibold transition ${
                                    isImported 
                                      ? "bg-slate-50 text-emerald-600 border-emerald-100 dark:bg-slate-950 dark:text-emerald-400 dark:border-emerald-900/30" 
                                      : "bg-white hover:bg-indigo-50 border-slate-200 text-slate-700 cursor-pointer hover:border-indigo-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  {isImported ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span>Imported</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3 text-slate-400" />
                                      <span>Track</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic dark:text-slate-500">No linked tasks added yet. Create one below to track on the calendar!</p>
                      )}

                      {/* Manual Task Linker Form */}
                      <div className="pt-4 border-t border-slate-100/80 dark:border-slate-800/80 space-y-2">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Add custom linked task
                        </h5>
                        <form onSubmit={handleManualTaskAdd} className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-150 dark:bg-slate-900/20 dark:border-slate-850">
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Task description..."
                              value={manualTaskText}
                              onChange={(e) => setManualTaskText(e.target.value)}
                              className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-sans dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                              required
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-semibold text-slate-400 font-mono uppercase">Due:</label>
                              <input
                                type="date"
                                value={manualTaskDate}
                                onChange={(e) => setManualTaskDate(e.target.value)}
                                className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-sans dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-sans font-semibold text-xs py-2 rounded-lg transition duration-200 cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-650"
                          >
                            + Add & Track on Calendar
                          </button>
                        </form>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            /* No notes yet placeholder */
            <div className="flex flex-col items-center justify-center h-full py-24 text-center p-6">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-sans font-bold text-slate-800 text-lg">No Notes Created</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm">
                Get started by building your repository. Create a personal note and we will help you organize and outline actionable goals!
              </p>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setActiveNoteId(null);
                }}
                className="mt-4 flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-sans font-semibold text-sm px-4 py-2 rounded-xl transition duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Note</span>
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
