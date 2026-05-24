import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

function toCsv(rows) {
  const header = "Suggestions\n";
  const body = rows
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join("\n");
  return header + body;
}

function downloadCsv(rows, keyword) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${keyword || "suggestions"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function App() {
  const [keyword, setKeyword] = useState("ai video generator");
  const [lang, setLang] = useState("en");
  const [country, setCountry] = useState("us");
  const [mode, setMode] = useState("alpha");
  const [filter, setFilter] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredResults = useMemo(() => {
    const text = filter.trim().toLowerCase();
    if (!text) return results;
    return results.filter((item) => item.toLowerCase().includes(text));
  }, [results, filter]);

  async function handleSearch(event) {
    event.preventDefault();
    const q = keyword.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setMeta(null);
    setResults([]);

    try {
      const params = new URLSearchParams({ q, lang, country, mode });
      const response = await fetch(`${DEFAULT_API_BASE}/api/suggest?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResults(Array.isArray(data.suggestions) ? data.suggestions : []);
      setMeta(data);
    } catch (err) {
      setError(err.message || "Failed to fetch suggestions");
    } finally {
      setLoading(false);
    }
  }

  async function copyKeyword(value) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Internal keyword tool</p>
        <h1>Google Autocomplete Batch Retriever</h1>
        <p className="subtitle">
          输入一个种子关键词，批量获取 Google autocomplete 建议词，去重后导出 CSV。
        </p>
      </section>

      <form className="search-card" onSubmit={handleSearch}>
        <div className="field keyword-field">
          <label htmlFor="keyword">Keyword</label>
          <input
            id="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="ai video generator"
          />
        </div>

        <div className="field short-field">
          <label htmlFor="lang">Language</label>
          <input id="lang" value={lang} onChange={(event) => setLang(event.target.value)} />
        </div>

        <div className="field short-field">
          <label htmlFor="country">Country</label>
          <input id="country" value={country} onChange={(event) => setCountry(event.target.value)} />
        </div>

        <div className="field mode-field">
          <label htmlFor="mode">Mode</label>
          <select id="mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="alpha">a-z</option>
            <option value="alpha_num">a-z + 0-9</option>
            <option value="full">a-z + 0-9 + words</option>
          </select>
        </div>

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error ? <div className="error">{error}</div> : null}

      <section className="result-card">
        <div className="result-header">
          <div>
            <h2>Suggestions</h2>
            <p>
              {meta ? `${meta.count} results${meta.cached ? " · cached" : ""}` : "No search yet"}
            </p>
          </div>

          <div className="actions">
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter results"
              className="filter"
            />
            <button
              type="button"
              onClick={() => downloadCsv(filteredResults, keyword.trim())}
              disabled={!filteredResults.length}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Suggestions</th>
                <th className="operation">Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.length ? (
                filteredResults.map((item) => (
                  <tr key={item}>
                    <td>{item}</td>
                    <td className="operation">
                      <button type="button" onClick={() => copyKeyword(item)}>
                        Copy
                      </button>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(item)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        SERP
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="empty">
                    {loading ? "Fetching suggestions..." : "No suggestions"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
