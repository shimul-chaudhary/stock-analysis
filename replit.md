# Workspace

## Overview

pnpm monorepo with a Python/FastAPI backend and React/Vite frontend.

## Stack

### Backend (`artifacts/api-server`) — Python
- **Runtime**: Python 3.11
- **Framework**: FastAPI + Uvicorn
- **Database**: PostgreSQL via `psycopg2-binary`
- **AI**: Gemini 2.5 Flash via `google-genai` (Replit AI Integrations proxy)
- **HTTP client**: `httpx` (async, for Alpha Vantage)
- **Validation**: Pydantic v2 (built into FastAPI)
- **Entry point**: `artifacts/api-server/main.py`
- **Routes**: `artifacts/api-server/routers/` (health, stocks, macro, holdings, analysis)
- **Libs**: `artifacts/api-server/lib/` (alphavantage.py, database.py, gemini.py)

### Frontend (`artifacts/financial-dashboard`) — TypeScript
- **Framework**: React + Vite
- **Styling**: Tailwind CSS + Shadcn/UI (dark Bloomberg terminal theme)
- **Data fetching**: TanStack Query with generated hooks
- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24 / TypeScript 5.9

## Key Commands

- `cd artifacts/api-server && uvicorn main:app --host 0.0.0.0 --port 8080 --reload` — run Python API server
- `pnpm --filter @workspace/financial-dashboard run dev` — run frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes (all prefixed `/api`)

- `GET /api/healthz` — health check
- `GET /api/stocks/screen` — screen 15 infrastructure stocks
- `GET /api/stocks/summary` — market summary stats
- `GET /api/stocks/{symbol}/quote` — single stock quote (Alpha Vantage)
- `GET /api/stocks/{symbol}/news` — news + sentiment (Alpha Vantage)
- `GET /api/macro/heatmap` — geopolitical event cards
- `GET /api/macro/themes` — macro investment themes
- `GET/POST /api/holdings` — list / create portfolio holdings
- `PUT/DELETE /api/holdings/{id}` — update / delete holding
- `POST /api/analysis/deep-dive` — Gemini AI stock deep dive
- `POST /api/analysis/holdings` — Gemini AI portfolio risk analysis

## Secrets

- `ALPHA_VANTAGE_API_KEY` — Alpha Vantage market data
- `GOOGLE_API_KEY` — Gemini AI fallback
- `AI_INTEGRATIONS_GEMINI_BASE_URL` / `AI_INTEGRATIONS_GEMINI_API_KEY` — Replit proxy (auto-set)
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `GITHUB_PERSONAL_ACCESS_TOKEN` — GitHub push access
