# Keyword Suggest MVP

Internal-use Google autocomplete keyword collector.

This MVP lets you enter a seed keyword, expands it with `a-z` and optional extras, fetches Google autocomplete suggestions, deduplicates the results, displays them in a table, and exports CSV from the browser.

## Features

- Keyword input
- Google Suggest autocomplete collection
- Language and country parameters
- `a-z` suffix expansion
- Optional numeric and question-word expansion
- Deduped and sorted results
- Copy individual keyword
- Export CSV
- Simple in-memory backend cache
- Docker Compose for internal deployment

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Deployment: Docker Compose

## Run locally

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## Run with Docker Compose

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173
```

## API

### GET `/api/suggest`

Example:

```text
/api/suggest?q=ai%20video%20generator&lang=en&country=us&mode=alpha
```

Query params:

| Param | Default | Description |
| --- | --- | --- |
| `q` | required | Seed keyword |
| `lang` | `en` | Google `hl` language parameter |
| `country` | `us` | Google `gl` country parameter |
| `mode` | `alpha` | `alpha`, `alpha_num`, or `full` |

Response:

```json
{
  "keyword": "ai video generator",
  "count": 42,
  "suggestions": ["ai video generator app"]
}
```

## Notes

This uses Google Suggest endpoints intended for autocomplete-style results. For internal use, keep request volume modest. The backend adds request spacing and caching, but it is still not designed for high-volume scraping.

For a production commercial tool, use an official or paid keyword data provider instead of relying only on this endpoint.
