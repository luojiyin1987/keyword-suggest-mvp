import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const port = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_DELAY_MS = 180;
const FETCH_TIMEOUT_MS = 8000;

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "0123456789".split("");
const QUESTION_WORDS = [
  "best",
  "free",
  "online",
  "app",
  "tool",
  "software",
  "for",
  "with",
  "without",
  "how",
  "what",
  "why",
  "where",
  "near me"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSuffixes(mode) {
  if (mode === "full") return [...ALPHA, ...NUMBERS, ...QUESTION_WORDS];
  if (mode === "alpha_num") return [...ALPHA, ...NUMBERS];
  return ALPHA;
}

function getCached(cacheKey) {
  const item = cache.get(cacheKey);
  if (!item) return null;

  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }

  return item.payload;
}

async function fetchSuggest(query, lang, country) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.searchParams.set("client", "firefox");
  url.searchParams.set("hl", lang);
  url.searchParams.set("gl", country);
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 KeywordSuggestMVP/0.1"
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/suggest", async (req, res) => {
  const keyword = String(req.query.q || "").trim();
  const lang = String(req.query.lang || "en").trim().toLowerCase();
  const country = String(req.query.country || "us").trim().toLowerCase();
  const mode = String(req.query.mode || "alpha").trim().toLowerCase();

  if (!keyword) {
    return res.status(400).json({ error: "Missing q keyword parameter" });
  }

  if (keyword.length > 120) {
    return res.status(400).json({ error: "Keyword is too long" });
  }

  const cacheKey = `${keyword}:${lang}:${country}:${mode}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const suffixes = getSuffixes(mode);
  const suggestions = new Set();
  const errors = [];

  for (const suffix of suffixes) {
    const query = `${keyword} ${suffix}`;
    const items = await fetchSuggest(query, lang, country);

    if (!items.length) {
      errors.push(query);
    }

    for (const item of items) {
      const value = String(item || "").trim();
      if (value) suggestions.add(value);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const payload = {
    keyword,
    lang,
    country,
    mode,
    count: suggestions.size,
    suggestions: [...suggestions].sort((a, b) => a.localeCompare(b)),
    failedQueries: errors.length
  };

  cache.set(cacheKey, {
    createdAt: Date.now(),
    payload
  });

  res.json({ ...payload, cached: false });
});

app.listen(port, () => {
  console.log(`Keyword Suggest backend listening on http://localhost:${port}`);
});
