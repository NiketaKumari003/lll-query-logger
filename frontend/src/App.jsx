import { useEffect, useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Debug log the environment variables
  console.log('Environment Variables:', {
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    NODE_ENV: import.meta.env.MODE
  });
  
  // Ensure the backend URL is properly formatted
  let backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  // Remove any whitespace and trailing slashes
  backendUrl = backendUrl.trim().replace(/\/+$/, '');
  
  console.log('Using backend URL:', backendUrl);
  const backend = backendUrl;

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const apiUrl = `${backend}/history`;
      console.log('Fetching history from:', apiUrl);
      const r = await fetch(apiUrl);
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error(`HTTP error! status: ${r.status}, response:`, errorText);
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      
      const j = await r.json();
      console.log('History response:', j);
      setHistory(j.logs || []);
    } catch (err) {
      console.error("fetchHistory error:", err);
    }
  }

  async function submit(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const apiUrl = `${backend}/query`;
      console.log('Submitting query to:', apiUrl, 'with query:', query);
      
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const j = await r.json();
      if (j.answer) {
        setAnswer(j.answer);
        setQuery("");
        // refresh history quickly
        fetchHistory();
      } else {
        setAnswer("No answer (error).");
      }
    } catch (err) {
      console.error(err);
      setAnswer("Error contacting backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>LLM Query App (OpenRouter)</h1>

      <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something (e.g., main pillars of OOP in Java)"
          style={{ flex: 1, padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ padding: "10px 16px" }}>
          {loading ? "Loading..." : "Ask"}
        </button>
      </form>

      <div style={{ marginTop: 20, padding: 16, background: "#fff", borderRadius: 6, boxShadow: "0 3px 12px rgba(0,0,0,0.06)" }}>
        <h3>Answer</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>{answer || "No answer yet."}</pre>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>History (recent)</h3>
        {history.length === 0 && <div>No history yet.</div>}
        <ul>
          {history.map((h) => (
            <li key={h._id} style={{ marginBottom: 10 }}>
              <strong>{new Date(h.createdAt).toLocaleString()}</strong>
              <div><em>Q:</em> {h.query}</div>
              <div><em>A:</em> {h.answer}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
