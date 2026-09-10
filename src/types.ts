export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate: string; // YYYY-MM-DD
  noteId?: string; // Optional link to a note
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string; // ISO string
  targetDate?: string; // Optional explicit target date (YYYY-MM-DD)
  summary?: string;
  keyPoints?: string[];
  suggestedTasks?: { task: string; dueDate: string }[];
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string; // ISO string
}

export interface Reminder {
  id: string;
  text: string;
}

export const NOTE_CATEGORIES = [
  "General",
  "Ideas & Brainstorm",
  "Meeting Notes",
  "Personal Journal",
  "Study & Learning",
  "Work & Tasks"
];
