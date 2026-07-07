import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini API client lazily
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Support parsing JSON bodies
app.use(express.json());

// Helper to parse dates from text (e.g. "01 6 2026", "29.6.2026", "June 1st, 2026", "2026-06-01")
function parseDateFromText(text: string): string | null {
  const normalized = text.toLowerCase().trim()
    .replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");

  // 1. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = normalized.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1]);
    const month = parseInt(ymdMatch[2]);
    const day = parseInt(ymdMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 2. Match DD MM YYYY or DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  // E.g. "29/6/2026", "29.6.2026", "15/08/2026"
  const dmyMatch = normalized.match(/\b(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})\b/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const month = parseInt(dmyMatch[2]);
    const year = parseInt(dmyMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Match DD-MM-YY, DD/MM/YY, DD.MM.YY, DD MM YY (2-digit year)
  // E.g. "29/6/26"
  const dmy2Match = normalized.match(/\b(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2})\b/);
  if (dmy2Match) {
    const day = parseInt(dmy2Match[1]);
    const month = parseInt(dmy2Match[2]);
    const year2 = parseInt(dmy2Match[3]);
    const year = year2 < 50 ? 2000 + year2 : 1900 + year2;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Match DD/MM, DD-MM, DD.MM (No year specified - defaults to current year 2026)
  // Negative lookahead (?![-\/.]\d) ensures we don't match DD/MM of a DD/MM/YYYY date
  const dmMatch = normalized.match(/\b(\d{1,2})[-/.](\d{1,2})\b(?![-\/.]\d)/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1]);
    const month = parseInt(dmMatch[2]);
    const year = 2026; // Default active context year
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 5. Match month name formats: "June 1, 2026", "1st of June 2026", etc.
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  for (let i = 0; i < months.length; i++) {
    const monthName = months[i];
    if (normalized.includes(monthName)) {
      const numbers = normalized.match(/\b(\d{1,4})\b/g);
      if (numbers && numbers.length >= 2) {
        const yearVal = parseInt(numbers.find(n => n.length === 4) || "2026");
        const dayVal = parseInt(numbers.find(n => n.length <= 2) || "1");
        if (dayVal >= 1 && dayVal <= 31) {
          return `${yearVal}-${String(i + 1).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;
        }
      }
    }
  }

  // 6. Match contiguous digits like "2562026" (DDMYYYY) or "25062026" (DDMMYYYY) or "5062026" (DMYYYY) or "562026" (DMYY)
  // Matches 5 to 8 contiguous digits that form a valid date
  const contiguousMatch = normalized.match(/\b(\d{5,8})\b/);
  if (contiguousMatch) {
    const digitsStr = contiguousMatch[1];
    
    // We expect the year to be either the last 4 digits (e.g. 2026) or the last 2 digits (e.g. 26)
    const year4 = parseInt(digitsStr.slice(-4));
    if (year4 >= 2000 && year4 <= 2100) {
      const rest = digitsStr.slice(0, -4);
      if (rest.length === 2) {
        // e.g. "562026" -> Day 5, Month 6, Year 2026
        const day = parseInt(rest[0]);
        const month = parseInt(rest[1]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year4}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      } else if (rest.length === 3) {
        // e.g. "2562026" -> Day 25, Month 6, Year 2026
        // Try Case 1: DD M (first 2 = day, last 1 = month)
        const d1 = parseInt(rest.slice(0, 2));
        const m1 = parseInt(rest.slice(2));
        // Try Case 2: D MM (first 1 = day, last 2 = month)
        const d2 = parseInt(rest.slice(0, 1));
        const m2 = parseInt(rest.slice(1));
        
        const v1 = (m1 >= 1 && m1 <= 12 && d1 >= 1 && d1 <= 31);
        const v2 = (m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31);
        
        if (v1 && !v2) {
          return `${year4}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        } else if (v2 && !v1) {
          return `${year4}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
        } else if (v1 && v2) {
          // If both valid, default to DD M as DD/MM is the user's primary regional format
          return `${year4}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        }
      } else if (rest.length === 4) {
        // e.g. "25062026" -> Day 25, Month 6, Year 2026
        const day = parseInt(rest.slice(0, 2));
        const month = parseInt(rest.slice(2));
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year4}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    } else {
      // Check 2-digit year (e.g. "25626")
      const year2 = parseInt(digitsStr.slice(-2));
      const year = year2 < 50 ? 2000 + year2 : 1900 + year2;
      const rest = digitsStr.slice(0, -2);
      if (rest.length === 2) {
        // e.g. "5626" -> Day 5, Month 6, Year 2026
        const day = parseInt(rest[0]);
        const month = parseInt(rest[1]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      } else if (rest.length === 3) {
        // e.g. "25626" -> Day 25, Month 6, Year 2026
        const d1 = parseInt(rest.slice(0, 2));
        const m1 = parseInt(rest.slice(2));
        const d2 = parseInt(rest.slice(0, 1));
        const m2 = parseInt(rest.slice(1));
        
        const v1 = (m1 >= 1 && m1 <= 12 && d1 >= 1 && d1 <= 31);
        const v2 = (m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31);
        
        if (v1 && !v2) {
          return `${year}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        } else if (v2 && !v1) {
          return `${year}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
        } else if (v1 && v2) {
          return `${year}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        }
      } else if (rest.length === 4) {
        // e.g. "250626" -> Day 25, Month 06, Year 2026
        const day = parseInt(rest.slice(0, 2));
        const month = parseInt(rest.slice(2));
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
  }

  return null;
}

// API: Check server health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Summarize a note using Gemini
app.post("/api/summarize", async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content || content.trim() === "") {
      res.status(400).json({ error: "Content is required for summarization" });
      return;
    }

    const client = getAiClient();
    if (!client) {
      // Fallback heuristic summarizing when GEMINI_API_KEY is not defined
      // We use a negative lookbehind/lookahead to prevent splitting on periods within dates (e.g., "29.6.2026")
      const sentences = content
        .split(/(?<!\d)\.(?!\d)|[!?\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      const summaryText = sentences.slice(0, 2).join(". ") + (sentences.length > 2 ? "." : "");
      
      // Simple tag extractor
      const words = content.toLowerCase().match(/\b[a-z]{4,12}\b/g) || [];
      const commonStopwords = new Set(["with", "this", "that", "from", "your", "have", "will", "been", "want", "should", "completed"]);
      const uniqueTags = Array.from(new Set(words))
        .filter((w: string) => !commonStopwords.has(w))
        .slice(0, 4);

      // Heuristic task extractor
      const suggestedTasks = [];
      const taskKeywords = ["need to", "should", "must", "want to", "task:", "todo:", "action:"];
      const activeActionIndicators = [
        "meet", "call", "review", "complete", "finish", "todo", "task", "submit", "buy", "write", "send", "update", "schedule", "test", "deploy", "prepare", "check", "discuss", "sync", "session", "interview", "presentation", "launch", "milestone", "deadline", "reminder", "due", "plan", "organize", "run"
      ];

      // Find overall note date as a fallback if a specific sentence doesn't have a date
      const overallNoteDate = parseDateFromText(title || "") || parseDateFromText(content || "");

      for (const sentence of sentences) {
        const detectedDate = parseDateFromText(sentence);
        if (detectedDate) {
          // Only extract as a suggested task if the sentence is actionable
          const lowerS = sentence.toLowerCase();
          const hasAction = activeActionIndicators.some(indicator => lowerS.includes(indicator)) ||
                            taskKeywords.some(kw => lowerS.includes(kw));

          if (hasAction) {
            // Extract task and clean the date text out cleanly (handling dots, dashes, slashes, and contiguous digits)
            const cleanedText = sentence
              .replace(/\b\d{1,2}[-/.\s]\d{1,2}[-/.\s]\d{2,4}\b/g, "")
              .replace(/\b\d{4}[-/.\s]\d{1,2}[-/.\s]\d{1,2}\b/g, "")
              .replace(/\b\d{1,2}[-/.]\d{1,2}\b(?![-\/.]\d)/g, "")
              .replace(/\b\d{5,8}\b/g, "")
              .replace(/\s+/g, " ")
              .trim();
            
            const taskName = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1) || sentence;
            const lowerTask = taskName.toLowerCase();
            const startsWithFragment = lowerTask.startsWith("n't") || 
                                       lowerTask.startsWith("doesn't") || 
                                       lowerTask.startsWith("isn't") || 
                                       lowerTask.startsWith("won't") || 
                                       lowerTask.startsWith("not") || 
                                       lowerTask.startsWith("no ");
            const isInvalidText = taskName.length < 10 || startsWithFragment;
            if (!isInvalidText) {
              suggestedTasks.push({
                task: taskName,
                dueDate: detectedDate
              });
            }
          }
        } else {
          for (const kw of taskKeywords) {
            if (sentence.toLowerCase().includes(kw)) {
              const taskText = sentence.substring(sentence.toLowerCase().indexOf(kw) + kw.length).trim();
              const taskName = taskText.charAt(0).toUpperCase() + taskText.slice(1);
              const lowerTask = taskName.toLowerCase();
              const startsWithFragment = lowerTask.startsWith("n't") || 
                                         lowerTask.startsWith("doesn't") || 
                                         lowerTask.startsWith("isn't") || 
                                         lowerTask.startsWith("won't") || 
                                         lowerTask.startsWith("not") || 
                                         lowerTask.startsWith("no ");
              const isInvalidText = taskName.length < 10 || startsWithFragment;
              if (taskText.length > 5 && !isInvalidText) {
                suggestedTasks.push({
                  task: taskName,
                  dueDate: overallNoteDate || ""
                });
                break;
              }
            }
          }
        }
      }

      res.json({
        summary: summaryText || `Heuristic notes overview for "${title || "Imported File"}".`,
        keyPoints: sentences.slice(0, 3).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)),
        suggestedTasks: suggestedTasks.slice(0, 4),
        tags: uniqueTags.length > 0 ? uniqueTags : ["imported", "document"],
        isFallback: true
      });
      return;
    }

    const prompt = `
      You are an expert personal productivity assistant. 
      Please analyze the following personal note and provide a structured summary.
      Note Title: ${title || "Untitled Note"}
      Note Content:
      ${content}

      You must return a valid JSON object matching the following structure:
      {
        "summary": "A 2-3 sentence high-level summary of the note.",
        "keyPoints": ["Bullet point 1", "Bullet point 2", "etc."],
        "suggestedTasks": [
          {
            "task": "A brief, actionable, complete todo item derived from the note (e.g. 'Roadmap meeting' if '01 6 2026 roadmap meeting' was written). CRITICAL: Ensure the task name is a complete sentence that makes sense on its own. Avoid single words or broken fragments like 'Doesn't work on' or 'Be turned on'. ONLY generate suggested tasks if there is an explicit, clear, actionable objective, action item, todo, meeting, or reminder transcribed in the note. If the note is just a static data report, raw log, status update, or contains no actionable objective/todo/goal, you MUST return an empty array [] for suggestedTasks. Do NOT invent/assume tasks out of plain reporting data.",
            "dueDate": "YYYY-MM-DD format. Be extremely smart and precise! Note that ALL dates in the input text use the Day/Month/Year (DD/MM/YYYY) format. For example, '29/6/2026' represents June 29th, 2026 (returning '2026-06-29'). Also handle delimiter-free contiguous dates like '2562026' which is Day 25, Month 6, Year 2026 (returning '2026-06-25'), '25062026' (returning '2026-06-25'), or '5062026' (returning '2026-06-05'). Never treat the first number as the month if it exceeds 12 or if the user's regional format is DD/MM/YYYY. If you see '06/07/2026', it represents July 6th, 2026 ('2026-07-06'). Leave empty if no date was specified."
          }
        ],
        "tags": ["3-5 relevant single-word category tags for organization"]
      }

      Do not wrap the response in any markdown code blocks or add any text outside the JSON object. Return ONLY raw valid JSON.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    // Clean potential markdown wrappers
    const jsonString = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("Failed to parse Gemini summary JSON, using fallback parser:", parseError);
      const sentences = responseText
        .split(/(?<!\d)\.(?!\d)|[!?\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      result = {
        summary: sentences[0] || `Summary of "${title || "Imported Note"}".`,
        keyPoints: sentences.slice(1, 4),
        suggestedTasks: [],
        tags: ["imported"]
      };
    }
    res.json(result);
  } catch (error: any) {
    console.error("Summarize error:", error);
    res.status(500).json({
      error: error.message || "An error occurred while generating the summary.",
    });
  }
});

// API: Analyze notes, tasks, and answer user queries
app.post("/api/analyze", async (req, res) => {
  try {
    const { notes, tasks, query, clientDate } = req.body;
    if (!query || query.trim() === "") {
      res.status(400).json({ error: "Query is required for analysis" });
      return;
    }

    const client = getAiClient();
    if (!client) {
      // Intelligent fallback logic when GEMINI_API_KEY is not configured
      const normalizedQuery = query.toLowerCase();
      let answer = "";
      let updateAction = null;

      // Handle direct status updates in conversational queries
      // Look for keywords: "complete", "finish", "done", "mark", "check", "uncheck", "incomplete", "todo"
      const isCompleteAction = normalizedQuery.includes("complete") || normalizedQuery.includes("finish") || normalizedQuery.includes("done") || normalizedQuery.includes("mark") || normalizedQuery.includes("check") || normalizedQuery.includes("yes");
      const isCompletedValue = !(normalizedQuery.includes("incomplete") || normalizedQuery.includes("uncheck") || normalizedQuery.includes("not done") || normalizedQuery.includes("no"));

      let foundItem: any = null;
      let foundType: "task" | null = null;

      // Search through Tasks first
      for (const t of tasks || []) {
        const words = t.text.toLowerCase().split(" ");
        // If query mentions some words of the task
        const matchCount = words.filter((w: string) => w.length > 3 && normalizedQuery.includes(w)).length;
        if (matchCount >= 2 || normalizedQuery.includes(t.text.toLowerCase()) || (t.id && normalizedQuery.includes(t.id.toLowerCase()))) {
          foundItem = t;
          foundType = "task";
          break;
        }
      }

      if (foundItem && isCompleteAction) {
        updateAction = {
          type: foundType,
          id: foundItem.id,
          isCompleted: isCompletedValue
        };
        answer = `### ✅ Aura Organizer Updated!

I detected that you want to update your **${foundType}**: 
👉 **"${foundItem.text}"**

I have marked it as **${isCompletedValue ? "Completed 🎉" : "Active / Incomplete ⏳"}**!

*Note: I successfully executed this update using our smart local offline rules parsing. If you ever configure a Gemini API key, I will also be able to hold deep conversational chats with you!*`;
      } else {
        let targetQueryDate: string | null = parseDateFromText(query);
        const baseDate = clientDate ? new Date(clientDate) : new Date();

        if (normalizedQuery.includes("today")) {
          const y = baseDate.getFullYear();
          const m = String(baseDate.getMonth() + 1).padStart(2, '0');
          const d = String(baseDate.getDate()).padStart(2, '0');
          targetQueryDate = `${y}-${m}-${d}`;
        } else if (normalizedQuery.includes("yesterday")) {
          const prevDate = new Date(baseDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const y = prevDate.getFullYear();
          const m = String(prevDate.getMonth() + 1).padStart(2, '0');
          const d = String(prevDate.getDate()).padStart(2, '0');
          targetQueryDate = `${y}-${m}-${d}`;
        }

        let matchingNotes: any[] = [];
        let dateQueryTriggered = false;

        if (targetQueryDate) {
          dateQueryTriggered = true;
          matchingNotes = (notes || []).filter((n: any) => {
            if (n.createdAt && n.createdAt.startsWith(targetQueryDate!)) return true;
            const titleDate = parseDateFromText(n.title);
            if (titleDate && titleDate === targetQueryDate) return true;
            return false;
          });
        } else {
          // Build an extremely smart local semantic matching engine
          const searchTerms = normalizedQuery
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
            .split(/\s+/)
            .filter((w: string) => w.length > 2 && !["the", "and", "for", "you", "not", "with", "from", "your", "what", "have", "this", "that", "show", "list", "view", "find", "search", "about"].includes(w));

          // Find matching notes
          matchingNotes = (notes || []).filter((note: any) => {
            const titleLower = (note.title || "").toLowerCase();
            const contentLower = (note.content || "").toLowerCase();
            const tagsLower = (note.tags || []).map((t: string) => t.toLowerCase());
            
            return searchTerms.some((term: string) => 
              titleLower.includes(term) || 
              contentLower.includes(term) || 
              tagsLower.includes(term)
            );
          });
        }

        if (normalizedQuery.includes("task") || normalizedQuery.includes("todo") || normalizedQuery.includes("remind") || normalizedQuery.includes("schedule") || normalizedQuery.includes("deadline")) {
          // List Tasks and upcoming reminders
          const activeTasks = (tasks || []).filter((t: any) => !t.isCompleted);
          const completedTasks = (tasks || []).filter((t: any) => t.isCompleted);
          
          let taskReport = `### 📋 Your Checklist & Task Reminders\n\n`;
          if (activeTasks.length === 0) {
            taskReport += `✨ **Hooray! You have no active tasks left to complete.**\n\n`;
          } else {
            taskReport += `Here are your **${activeTasks.length} active task(s)**:\n\n`;
            activeTasks.forEach((t: any) => {
              const dueStr = t.dueDate ? ` *(Due: ${t.dueDate})*` : "";
              taskReport += `- ⏳ **"${t.text}"**${dueStr}\n`;
            });
          }

          if (completedTasks.length > 0) {
            taskReport += `\n**Completed recently (${completedTasks.length}):**\n`;
            completedTasks.slice(0, 5).forEach((t: any) => {
              taskReport += `- ✅ ~~"${t.text}"~~\n`;
            });
          }

          taskReport += `\n💡 *Tip: To check any of these off from the chat, just say something like: **"complete ${activeTasks[0]?.text || "buy specialized shoes"}"**.*`;
          answer = taskReport;

        } else if (dateQueryTriggered) {
          let noteReport = `### 📂 Notes for ${targetQueryDate}\n\n`;
          if (matchingNotes.length === 0) {
            noteReport += `No notes were written or found for the date **${targetQueryDate}**.`;
          } else {
            matchingNotes.forEach((n: any) => {
              noteReport += `#### 📄 ${n.title}\n`;
              if (n.category) {
                noteReport += `*Category: \`${n.category}\` | Created: ${new Date(n.createdAt).toLocaleDateString()}*\n\n`;
              }
              
              noteReport += `**Summary & Key Takeaways:**\n`;
              noteReport += `${n.summary || n.content.substring(0, 180) + "..."}\n\n`;
              
              if (n.keyPoints && n.keyPoints.length > 0) {
                noteReport += `**Key Points remembered:**\n`;
                n.keyPoints.forEach((pt: string) => {
                  noteReport += `- ${pt}\n`;
                });
                noteReport += `\n`;
              }

              if (n.suggestedTasks && n.suggestedTasks.length > 0) {
                noteReport += `**Suggested Tasks identified:**\n`;
                n.suggestedTasks.forEach((t: any) => {
                  noteReport += `- [ ] ${t.task} ${t.dueDate ? `*(Due: ${t.dueDate})*` : ""}\n`;
                });
                noteReport += `\n`;
              }
              noteReport += `---\n\n`;
            });
          }
          answer = noteReport;
        } else if (matchingNotes.length > 0) {
          // Found matching notes/reports! Summarize them instantly
          let noteReport = `### 📂 Found ${matchingNotes.length} matching report(s)/note(s) in your history:\n\n`;
          
          matchingNotes.forEach((n: any) => {
            noteReport += `#### 📄 ${n.title}\n`;
            if (n.category) {
              noteReport += `*Category: \`${n.category}\` | Created: ${new Date(n.createdAt).toLocaleDateString()}*\n\n`;
            }
            
            noteReport += `**Summary & Key Takeaways:**\n`;
            noteReport += `${n.summary || n.content.substring(0, 180) + "..."}\n\n`;
            
            if (n.keyPoints && n.keyPoints.length > 0) {
              noteReport += `**Key Points remembered:**\n`;
              n.keyPoints.forEach((pt: string) => {
                noteReport += `- ${pt}\n`;
              });
              noteReport += `\n`;
            }

            if (n.suggestedTasks && n.suggestedTasks.length > 0) {
              noteReport += `**Suggested Tasks identified:**\n`;
              n.suggestedTasks.forEach((t: any) => {
                noteReport += `- [ ] ${t.task} ${t.dueDate ? `*(Due: ${t.dueDate})*` : ""}\n`;
              });
              noteReport += `\n`;
            }
            noteReport += `---\n\n`;
          });

          noteReport += `💡 *Tip: I automatically extracted this info when you created/imported these reports. You can ask me to complete any of the tasks listed above!*`;
          answer = noteReport;

        } else {
          // Generative fallback response explaining how the local offline assistant helper behaves
          answer = `### 🤖 Smart Offline Assistant
I am running in local mode because **\`GEMINI_API_KEY\`** is not configured. 

* I couldn't find any specific notes or tasks matching **"${query}"**.
* Try searching for key terms in your files (e.g., *"losses report"* or *"marathon"*), or ask to *"list my tasks"*.
* To mark a task as done, say: *"complete [task text]"*.`;
        }
      }

      res.json({
        answer,
        updateAction
      });
      return;
    }
    
    // Format notes and tasks context for the LLM
    const formattedNotes = (notes || [])
      .map((n: any, idx: number) => `
        NOTE #${idx + 1}
        ID: ${n.id}
        Title: ${n.title}
        Category: ${n.category || "General"}
        Created: ${n.createdAt}
        Tags: ${(n.tags || []).join(", ")}
        Content: ${n.content}
        Summary: ${n.summary || "No summary available"}
      `)
      .join("\n---\n");

    const formattedTasks = (tasks || [])
      .map((t: any, idx: number) => `
        TASK #${idx + 1}
        ID: ${t.id}
        Text: ${t.text}
        Status: ${t.isCompleted ? "Completed" : "Active"}
        Due Date: ${t.dueDate || "None"}
        Associated Note ID: ${t.noteId || "None"}
      `)
      .join("\n---\n");

    const prompt = `
      You are an intelligent Personal Note and Task Assistant. 
      The user is asking you a question, requesting an analysis, or asking for information about their notes and personal tasks.
      
      === SYSTEM CONTEXT ===
      Current date and time in user's browser: ${clientDate || new Date().toISOString()}

      Below is the user's current organizer data:
      
      === USER NOTES ===
      ${formattedNotes || "No notes saved yet."}
      
      === USER TASKS ===
      ${formattedTasks || "No tasks created yet."}
      
      === USER QUERY ===
      "${query}"
      
      Your task:
      1. Review the query and answer it directly using the provided notes and tasks.
      2. If the user is asking to mark a task as completed or incomplete, identify the task ID and return it in "updateAction".
      3. CRITICAL: Be extremely concise, direct, and straight to the point. Get directly to the answer. Avoid fluff, long introductions, conversational preambles (like "Based on your notes..."), or generic advice.
      4. If the question is simple, answer it in one or two sentences. Use minimal bullet points for complex topics.
      5. Return your output as a valid JSON object matching this schema:
      {
        "answer": "Your concise, direct markdown answer (straight to the point, zero filler/fluff).",
        "updateAction": {
          "type": "task",
          "id": "the-exact-id-of-the-item-to-update",
          "isCompleted": true or false
        }
      }
      If the user is NOT requesting to update a task status, set "updateAction" to null.
      6. STRICT DATE FILTERING: If the user query refers to a specific date (such as 'June 30th 2026', 'today', 'yesterday', 'June 22nd', etc.), you MUST strictly filter the user notes and tasks to match ONLY that date based on their Created timestamp or explicit date mentions in the title or content. You MUST NOT include, summarize, or reference notes or tasks from other dates. If no notes or tasks match the specified date, state that directly (e.g., 'No notes were recorded on June 30th, 2026') rather than offering summaries of other dates.
      
      Guidelines:
      - Match the task text closely before performing an update.
      - Do not include any markdown wrappers (like \`\`\`json) or text outside the JSON block. Return ONLY the raw valid JSON.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    // Clean potential markdown wrappers
    const jsonString = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("Failed to parse Gemini analysis JSON, using conversation fallback:", parseError);
      result = {
        answer: responseText,
        updateAction: null
      };
    }
    res.json(result);
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({
      error: error.message || "An error occurred while analyzing.",
    });
  }
});

// Set up Vite or static serving based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
