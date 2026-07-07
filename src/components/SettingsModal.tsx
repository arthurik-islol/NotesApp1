import React, { useState, useRef } from "react";
import { Note, Task } from "../types";
import { 
  X, 
  Settings, 
  User, 
  Coins, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  FileJson
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  username: string;
  onUpdateUsername: (name: string) => void;
  currency: string;
  onUpdateCurrency: (curr: string) => void;
  onResetApp: () => void;
  onClearNotes: () => void;
  onClearTasks: () => void;
  notes: Note[];
  tasks: Task[];
  onImportData: (importedNotes: Note[], importedTasks: Task[], importedUsername?: string, importedCurrency?: string) => void;
}

type SettingsTab = "general" | "appearance" | "backup" | "danger";

export default function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  onToggleTheme,
  username,
  onUpdateUsername,
  currency,
  onUpdateCurrency,
  onResetApp,
  onClearNotes,
  onClearTasks,
  notes,
  tasks,
  onImportData
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  
  // Local form inputs
  const [localName, setLocalName] = useState(username);
  const [localCurrency, setLocalCurrency] = useState(currency);
  
  // States for actions
  const [confirmText, setConfirmText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearNotesConfirm, setShowClearNotesConfirm] = useState(false);
  const [showClearTasksConfirm, setShowClearTasksConfirm] = useState(false);
  
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUsername(localName.trim() || "Your Blueprint");
    onUpdateCurrency(localCurrency.trim() || "AMD");
    
    // Quick local save flash
    setImportSuccess("Profile settings saved!");
    setTimeout(() => setImportSuccess(null), 3000);
  };

  // Export backup JSON
  const handleExportData = () => {
    try {
      const backupObj = {
        app: "Aura Organizer",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        username,
        currency,
        notes,
        tasks
      };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aura_organizer_backup_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
    }
  };

  // Read and validate JSON
  const validateAndImportJSON = (fileText: string) => {
    try {
      const data = JSON.parse(fileText);
      if (!data || typeof data !== "object") {
        throw new Error("Invalid format. Expected a JSON object.");
      }
      
      // We expect at least notes or tasks arrays (or both)
      const importedNotes = Array.isArray(data.notes) ? data.notes : [];
      const importedTasks = Array.isArray(data.tasks) ? data.tasks : [];
      
      if (importedNotes.length === 0 && importedTasks.length === 0) {
        throw new Error("No notes or tasks found in this backup file.");
      }

      // Safe import
      onImportData(
        importedNotes,
        importedTasks,
        data.username || undefined,
        data.currency || undefined
      );

      // Reload local inputs
      if (data.username) setLocalName(data.username);
      if (data.currency) setLocalCurrency(data.currency);

      setImportError(null);
      setImportSuccess(`Successfully imported ${importedNotes.length} notes and ${importedTasks.length} tasks!`);
      setTimeout(() => setImportSuccess(null), 5000);
    } catch (err: any) {
      setImportSuccess(null);
      setImportError(err.message || "Could not parse JSON file.");
    }
  };

  // Handle File Upload Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        validateAndImportJSON(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          validateAndImportJSON(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  // Danger zone action wrappers
  const handleExecuteReset = () => {
    if (confirmText.toLowerCase() === "reset") {
      onResetApp();
      setShowResetConfirm(false);
      setConfirmText("");
      setImportSuccess("Application fully reset to factory defaults.");
      setTimeout(() => setImportSuccess(null), 4000);
    }
  };

  const handleExecuteClearNotes = () => {
    onClearNotes();
    setShowClearNotesConfirm(false);
    setImportSuccess("All personal notes deleted successfully.");
    setTimeout(() => setImportSuccess(null), 4000);
  };

  const handleExecuteClearTasks = () => {
    onClearTasks();
    setShowClearTasksConfirm(false);
    setImportSuccess("All checklist tasks and calendar goals cleared.");
    setTimeout(() => setImportSuccess(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs dark:bg-slate-950/60"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh] md:max-h-[80vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-sans font-bold text-slate-900 dark:text-slate-100">
              Settings & Customization
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Tab Navigation */}
          <div className="w-full md:w-48 bg-slate-50/50 dark:bg-slate-950/20 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap md:whitespace-normal transition w-full cursor-pointer ${
                activeTab === "general"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>General Profile</span>
            </button>

            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap md:whitespace-normal transition w-full cursor-pointer ${
                activeTab === "appearance"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              }`}
            >
              <Moon className="w-4 h-4 shrink-0" />
              <span>Theme / Style</span>
            </button>

            <button
              onClick={() => setActiveTab("backup")}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap md:whitespace-normal transition w-full cursor-pointer ${
                activeTab === "backup"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Backup & Sync</span>
            </button>

            <button
              onClick={() => setActiveTab("danger")}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap md:whitespace-normal transition w-full cursor-pointer ${
                activeTab === "danger"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                  : "text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              }`}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Danger Zone</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Notifications/Toasts inside the panel */}
            <AnimatePresence>
              {importSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 dark:bg-emerald-950/40 dark:border-emerald-900/30 dark:text-emerald-400"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>{importSuccess}</span>
                </motion.div>
              )}
              {importError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center space-x-2 dark:bg-rose-950/40 dark:border-rose-900/30 dark:text-rose-400"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>{importError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* General Tab */}
            {activeTab === "general" && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    Personalized Greeting Profile
                  </h3>
                  <p className="text-slate-400 text-[11px] font-sans mb-3">
                    Customize how Aura Organizer greets and addresses you on the personal dashboard.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      placeholder="e.g. Artur"
                      maxLength={30}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    Financial Currency Customizer
                  </h3>
                  <p className="text-slate-400 text-[11px] font-sans mb-3">
                    Change the currency suffix displayed on the calendar financials and income notes tracker.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500">
                      <Coins className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={localCurrency}
                      onChange={(e) => setLocalCurrency(e.target.value)}
                      placeholder="e.g. AMD, USD, EUR, $"
                      maxLength={8}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    Interface Themes
                  </h3>
                  <p className="text-slate-400 text-[11px] font-sans mb-4">
                    Choose between a clean, elegant light layout or a dark mode.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Light theme selector card */}
                  <button
                    type="button"
                    onClick={() => isDarkMode && onToggleTheme()}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 cursor-pointer transition ${
                      !isDarkMode 
                        ? "border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500" 
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg w-fit">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Light Mode</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Perfect for bright environments</span>
                    </div>
                  </button>

                  {/* Dark theme selector card */}
                  <button
                    type="button"
                    onClick={() => !isDarkMode && onToggleTheme()}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 cursor-pointer transition ${
                      isDarkMode 
                        ? "border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500" 
                        : "border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-1.5 bg-indigo-900 text-indigo-300 rounded-lg w-fit">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Dark Mode</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Calming tones for late night work</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Backup & Sync Tab */}
            {activeTab === "backup" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    Data Backups
                  </h3>
                  <p className="text-slate-400 text-[11px] font-sans mb-4">
                    Export your notes, calendar events, checklist items, and profile details to a local JSON file, or restore them.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Export Trigger */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Export Backup</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Download a secure backup of all your local content</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                  </div>

                  {/* Drag and Drop JSON Upload Zone */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50/10" 
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/20"
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/35 dark:text-indigo-400 rounded-full mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Import Backup File
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 max-w-[240px]">
                      Drag and drop your exported <code className="font-mono text-indigo-500">.json</code> backup file or click to browse
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-sans font-bold text-sm text-red-600 dark:text-rose-450 mb-1">
                    Danger Zone
                  </h3>
                  <p className="text-slate-400 text-[11px] font-sans mb-4">
                    Be careful. These actions are destructive and cannot be undone unless you have a backup file saved.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Clear Notes Only */}
                  <div className="p-4 rounded-2xl border border-red-100 dark:border-red-950/30 bg-red-50/25 dark:bg-rose-950/5 flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Delete All Personal Notes</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Wipes out every study, brainstorm, or personal note in storage.</span>
                    </div>
                    {showClearNotesConfirm ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowClearNotesConfirm(false)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteClearNotes}
                          className="px-2.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClearNotesConfirm(true)}
                        className="flex items-center space-x-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-sans text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer dark:border-red-900/30 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Notes</span>
                      </button>
                    )}
                  </div>

                  {/* Clear Tasks Only */}
                  <div className="p-4 rounded-2xl border border-red-100 dark:border-red-950/30 bg-red-50/25 dark:bg-rose-950/5 flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Clear All Calendar Tasks</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Resets the calendar scheduler and wipes all checklist objectives.</span>
                    </div>
                    {showClearTasksConfirm ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowClearTasksConfirm(false)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteClearTasks}
                          className="px-2.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClearTasksConfirm(true)}
                        className="flex items-center space-x-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-sans text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer dark:border-red-900/30 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Tasks</span>
                      </button>
                    )}
                  </div>

                  {/* Factory Reset App */}
                  <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/30 dark:bg-rose-950/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Factory Reset Aura Organizer</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Wipe all notes, tasks, settings, custom name, and reload original seeds.</span>
                      </div>
                      {!showResetConfirm && (
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(true)}
                          className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-750 text-white font-sans text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset Hub</span>
                        </button>
                      )}
                    </div>

                    {showResetConfirm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-3 border-t border-rose-100 dark:border-rose-900/30 space-y-3"
                      >
                        <div className="flex items-start space-x-2 bg-rose-50 dark:bg-rose-950/35 p-3 rounded-xl border border-rose-100 dark:border-rose-900/20">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <span className="text-[10px] text-rose-800 dark:text-rose-350 leading-normal">
                            This will wipe ALL history, settings, and custom changes. To proceed, please type <strong className="font-bold font-mono text-rose-700 bg-rose-100 px-1 py-0.5 rounded dark:bg-rose-900">reset</strong> below:
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type 'reset' to confirm"
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetConfirm(false);
                              setConfirmText("");
                            }}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleExecuteReset}
                            disabled={confirmText.toLowerCase() !== "reset"}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-750 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Execute
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
