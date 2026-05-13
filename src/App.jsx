import { useState, useEffect } from "react";

const STORAGE_KEY = "habitflow_entries";

const systemPrompt = `You are HabitFlow, a warm and motivating personal habit coach. 
When given a habit log entry in natural language, you:
1. Extract and list the individual habits mentioned
2. Give encouraging, specific feedback (2-3 sentences)
3. Spot any patterns or suggestions based on the entry

Keep responses concise, warm, and actionable. Use a supportive coaching tone.`;

const weeklyPrompt = `You are HabitFlow, a personal habit coach analyzing a week of habit logs.
Review the entries and provide:
1. Key patterns you notice (positive and areas to improve)
2. Top 3 wins from the week
3. One specific recommendation for next week

Be encouraging, specific, and insightful. Keep it under 200 words.`;

async function callGroq(apiKey, messages, system) {
  const groqMessages = [{ role: "system", content: system }, ...messages];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: groqMessages,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq API error");
  return data.choices[0].message.content;
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("hf_groq_key") || "");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem("hf_groq_key"));
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyInsight, setWeeklyInsight] = useState("");
  const [showWeekly, setShowWeekly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  async function handleLog() {
    if (!log.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await callGroq(
        apiKey,
        [{ role: "user", content: `Today's habit log: ${log}` }],
        systemPrompt
      );
      const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        log,
        response,
      };
      setEntries((prev) => [entry, ...prev]);
      setLog("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleWeekly() {
    if (entries.length === 0) return;
    setWeeklyLoading(true);
    setError("");
    try {
      const recent = entries.slice(0, 7);
      const summary = recent.map((e) => `${e.date}: ${e.log}`).join("\n");
      const response = await callGroq(
        apiKey,
        [{ role: "user", content: `Here are my recent habit logs:\n\n${summary}` }],
        weeklyPrompt
      );
      setWeeklyInsight(response);
      setShowWeekly(true);
    } catch (e) {
      setError(e.message);
    }
    setWeeklyLoading(false);
  }

  function saveApiKey() {
    if (!apiKeyInput.trim()) return;
    localStorage.setItem("hf_groq_key", apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setShowKeyInput(false);
    setApiKeyInput("");
  }

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (showKeyInput) {
    return (
      <div style={styles.setupWrap}>
        <div style={styles.setupCard}>
          <div style={styles.logo}>🌱</div>
          <h1 style={styles.setupTitle}>Welcome to HabitFlow</h1>
          <p style={styles.setupDesc}>
            Your free AI-powered habit coach. Powered by Groq — completely free, no credit card needed.
          </p>
          <div style={styles.steps}>
            <p style={styles.stepsTitle}>Get your free Groq API key:</p>
            <ol style={styles.stepsList}>
              <li>Go to <strong>console.groq.com</strong></li>
              <li>Sign up with Google or email</li>
              <li>Click <strong>API Keys → Create API Key</strong></li>
              <li>Paste it below</li>
            </ol>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Groq API Key</label>
            <input
              style={styles.input}
              type="password"
              placeholder="gsk_..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
            />
            <p style={styles.hint}>Stored only in your browser. Never shared with anyone.</p>
          </div>
          <button style={{...styles.btnPrimary, opacity: apiKeyInput.trim() ? 1 : 0.5}} onClick={saveApiKey} disabled={!apiKeyInput.trim()}>
            Start Tracking →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerLogo}>🌱</span>
          <div>
            <h1 style={styles.headerTitle}>HabitFlow</h1>
            <p style={styles.headerSub}>Your personal AI coach</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.btnSecondary} onClick={handleWeekly} disabled={weeklyLoading || entries.length === 0}>
            {weeklyLoading ? "Analyzing..." : "📊 Weekly Insights"}
          </button>
          <button style={styles.btnGhost} onClick={() => setShowKeyInput(true)} title="Change API key">
            🔑
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.logCard}>
          <h2 style={styles.logTitle}>How did your habits go today?</h2>
          <textarea
            style={styles.textarea}
            value={log}
            onChange={(e) => setLog(e.target.value)}
            placeholder={'Write naturally — "went for a run, drank 2L water, skipped coffee, read for 20 mins"'}
            rows={4}
          />
          <div style={styles.logFooter}>
            <span style={styles.charCount}>{log.length} / 500</span>
            <button style={styles.btnPrimary} onClick={handleLog} disabled={loading || !log.trim()}>
              {loading ? "Coaching..." : "🌿 Log My Day"}
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {showWeekly && (
          <div style={styles.weeklyCard}>
            <div style={styles.weeklyHeader}>
              <h2 style={styles.weeklyTitle}>📊 Your Weekly Insights</h2>
              <button style={styles.closeBtn} onClick={() => setShowWeekly(false)}>✕</button>
            </div>
            <p style={styles.weeklyText}>{weeklyInsight}</p>
          </div>
        )}

        <div style={styles.entriesSection}>
          <h2 style={styles.sectionTitle}>
            Recent Entries {entries.length > 0 && <span style={styles.badge}>{entries.length}</span>}
          </h2>
          {entries.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📝</span>
              <p>No entries yet. Log your first day above!</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} style={styles.entryCard}>
                <div style={styles.entryHeader}>
                  <span style={styles.entryDate}>{entry.date}</span>
                  <button style={styles.deleteBtn} onClick={() => deleteEntry(entry.id)}>✕</button>
                </div>
                <p style={styles.entryLog}>"{entry.log}"</p>
                <div style={styles.divider} />
                <p style={styles.entryResponse}>{entry.response}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#f0faf4", fontFamily: "'Segoe UI', sans-serif" },
  header: { background: "#fff", borderBottom: "1px solid #e2f0e8", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" },
  headerLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  headerLogo: { fontSize: "2rem" },
  headerTitle: { margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#1a5c35" },
  headerSub: { margin: 0, fontSize: "0.8rem", color: "#6b9e7a" },
  headerRight: { display: "flex", gap: "0.5rem", alignItems: "center" },
  main: { maxWidth: "700px", margin: "0 auto", padding: "1.5rem 1rem" },
  logCard: { background: "#fff", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.5rem" },
  logTitle: { margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 600, color: "#1a5c35" },
  textarea: { width: "100%", border: "1.5px solid #d4edda", borderRadius: "10px", padding: "0.75rem", fontSize: "0.95rem", color: "#333", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#f8fffe" },
  logFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" },
  charCount: { fontSize: "0.8rem", color: "#aaa" },
  btnPrimary: { background: "#2d8c54", color: "#fff", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" },
  btnSecondary: { background: "#e8f5ee", color: "#1a5c35", border: "1.5px solid #b2dfca", borderRadius: "10px", padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" },
  btnGhost: { background: "transparent", border: "1.5px solid #e0e0e0", borderRadius: "10px", padding: "0.55rem 0.75rem", fontSize: "1rem", cursor: "pointer" },
  error: { background: "#fff5f5", border: "1px solid #ffcccc", borderRadius: "10px", padding: "0.75rem 1rem", color: "#c0392b", marginBottom: "1rem", fontSize: "0.9rem" },
  weeklyCard: { background: "#fff", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.5rem", borderLeft: "4px solid #2d8c54" },
  weeklyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  weeklyTitle: { margin: 0, fontSize: "1rem", fontWeight: 600, color: "#1a5c35" },
  closeBtn: { background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#aaa" },
  weeklyText: { margin: 0, lineHeight: 1.7, color: "#444", fontSize: "0.95rem", whiteSpace: "pre-wrap" },
  entriesSection: { marginTop: "0.5rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: 600, color: "#555", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" },
  badge: { background: "#2d8c54", color: "#fff", borderRadius: "99px", padding: "0.1rem 0.5rem", fontSize: "0.75rem" },
  emptyState: { textAlign: "center", padding: "3rem 1rem", color: "#aaa" },
  emptyIcon: { fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" },
  entryCard: { background: "#fff", borderRadius: "14px", padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" },
  entryHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  entryDate: { fontSize: "0.8rem", fontWeight: 600, color: "#2d8c54", textTransform: "uppercase", letterSpacing: "0.05em" },
  deleteBtn: { background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "0.85rem" },
  entryLog: { margin: "0 0 0.75rem", color: "#555", fontStyle: "italic", fontSize: "0.9rem", lineHeight: 1.5 },
  divider: { height: "1px", background: "#f0f0f0", margin: "0.75rem 0" },
  entryResponse: { margin: 0, color: "#333", fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  setupWrap: { minHeight: "100vh", background: "#f0faf4", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "'Segoe UI', sans-serif" },
  setupCard: { background: "#fff", borderRadius: "20px", padding: "2.5rem 2rem", maxWidth: "420px", width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" },
  logo: { fontSize: "3rem", marginBottom: "1rem" },
  setupTitle: { margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#1a5c35" },
  setupDesc: { margin: "0 0 1.5rem", color: "#666", fontSize: "0.95rem", lineHeight: 1.6 },
  steps: { background: "#f0faf4", borderRadius: "10px", padding: "1rem", marginBottom: "1.25rem", textAlign: "left" },
  stepsTitle: { margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#1a5c35" },
  stepsList: { margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#555", lineHeight: 1.8 },
  formGroup: { textAlign: "left", marginBottom: "1.25rem" },
  label: { display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.4rem" },
  input: { width: "100%", border: "1.5px solid #d4edda", borderRadius: "10px", padding: "0.65rem 0.75rem", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  hint: { margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#999" },
};
