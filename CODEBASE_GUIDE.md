# 🧭 DeploySense Codebase Guide

> A complete map of every file in the project — what it does, why it exists, and how important it is.

---

## 📁 Root Level

| File | What It Covers | Importance |
|------|---------------|------------|
| `README.md` | Project overview, setup instructions, API reference, architecture diagram | 🟢 High — First file any contributor or user reads |
| `.env.example` | Template for all environment variables (safe to commit, no real secrets) | 🟢 High — Critical for onboarding new developers |
| `.gitignore` | Prevents committing secrets (`.env`), `node_modules`, build artifacts | 🟢 High — Security and repo hygiene |
| `docker-compose.yml` | Orchestrates local dev stack: NestJS backend + React frontend containers | 🟡 Medium — Used for Docker-based local development |

---

## 📁 `.github/workflows/`

| File | What It Covers | Importance |
|------|---------------|------------|
| `deploysense-ci.yml` | **GitHub Actions CI/CD Pipeline** — On every push to `main`, installs dependencies, builds backend TypeScript, and can be extended to run tests and deploy | 🟢 High — Ensures code quality gates on every commit |

---

## 📁 `backend/` — NestJS API Server

### Root Config Files

| File | What It Covers | Importance |
|------|---------------|------------|
| `backend/.env` | **Live secrets** — Database URL, Gemini API Key, SMTP credentials, port config. Never commit this file | 🔴 Critical — App won't work without this |
| `backend/package.json` | Node.js dependencies: NestJS, Prisma, nodemailer, @google/generative-ai, etc. | 🟢 High — Defines the entire dependency tree |
| `backend/tsconfig.json` | TypeScript compiler configuration for the NestJS project | 🟡 Medium — Needed for TS compilation |
| `backend/nest-cli.json` | NestJS CLI configuration — entry point, source root | 🟡 Medium — Required for `npm run start:dev` to work |

---

### `backend/prisma/`

| File | What It Covers | Importance |
|------|---------------|------------|
| `prisma/schema.prisma` | **Database schema** — Defines 4 models: `Deployment`, `LogEntry`, `Incident`, `NotificationLog`. Connected to Neon PostgreSQL cloud | 🔴 Critical — Any change here requires `npx prisma db push` |

**Models at a glance:**
- `Deployment` → Tracks every CI/CD deployment event (service, version, environment, status)
- `LogEntry` → Raw log lines ingested from external services
- `Incident` → AI-generated failure incident with severity, root cause, confidence score
- `NotificationLog` → Audit trail of every email alert sent (success/failure status)

---

### `backend/src/`

#### Core Application Files

| File | What It Covers | Importance |
|------|---------------|------------|
| `src/main.ts` | **Application bootstrap** — Starts NestJS, binds `ConfigService` to read `PORT`, enables CORS for frontend on port 5173, sets global API prefix `/api/v1` | 🔴 Critical — Entry point of the entire backend |
| `src/app.module.ts` | **Root module** — Wires together ConfigModule, PrismaModule, LogsModule, and NotificationsModule | 🔴 Critical — NestJS dependency injection root |

---

#### `src/prisma/`

| File | What It Covers | Importance |
|------|---------------|------------|
| `prisma/prisma.service.ts` | **Resilient Prisma Client** — Extends `PrismaClient`, handles `onModuleInit` connection with graceful fallback (app keeps running even if DB is offline at startup) | 🟢 High — Protects against startup crashes when DB is unreachable |
| `prisma/prisma.module.ts` | NestJS module that exports `PrismaService` so other modules can inject it | 🟡 Medium — Boilerplate module registration |

---

#### `src/modules/ai/`

| File | What It Covers | Importance |
|------|---------------|------------|
| `ai.service.ts` | **Core AI Engine** — Integrates Google Gemini for intelligent log analysis. Falls back to a structured heuristic rule engine when Gemini is unavailable. Produces: `rootCause`, `likelyCause`, `severity`, `aiConfidence`, `suggestedFix`, `recommendedActions` | 🔴 Critical — The brain of DeploySense |
| `ai.module.ts` | NestJS module registration for `AiService` | 🟡 Low — Boilerplate |

---

#### `src/modules/logs/`

| File | What It Covers | Importance |
|------|---------------|------------|
| `logs.service.ts` | **Orchestration Engine** — Receives log payloads → detects failure keywords → triggers AI analysis → saves incident to DB → dispatches notifications. Also handles DB-offline transient mode | 🔴 Critical — The pipeline controller of the whole system |
| `logs.controller.ts` | **REST API Routes** — Exposes: `POST /api/v1/logs/ingest` (main integration point), `POST /api/v1/logs/simulate-failure` (testing), `GET /api/v1/incidents` (dashboard data), `POST /api/v1/webhooks/github` (GitHub webhook receiver) | 🔴 Critical — External API surface |
| `logs.module.ts` | NestJS module wiring LogsService, AiService, NotificationsService | 🟡 Medium |
| `dto/ingest-log.dto.ts` | **Request shape validation** — Defines the expected JSON body for `/api/v1/logs/ingest`: `serviceName`, `environment`, `version`, `logs`, `source` | 🟡 Medium — Input validation contract |

---

#### `src/modules/notifications/`

| File | What It Covers | Importance |
|------|---------------|------------|
| `notifications.service.ts` | **Email Alert Engine** — Uses `nodemailer` with SMTP (Gmail) to send rich HTML incident alert emails. Supports `TO`, `CC`, and `BCC` fields. Falls back to terminal simulation if SMTP is not configured | 🟢 High — Delivers real-world incident alerts |
| `notifications.module.ts` | NestJS module registration | 🟡 Low — Boilerplate |

---

## 📁 `frontend/` — React Monitoring Dashboard

| File | What It Covers | Importance |
|------|---------------|------------|
| `frontend/src/App.tsx` | **Main Dashboard UI** — Shows incident table, AI confidence scores, severity badges, simulation buttons (DB Timeout / OOM / Missing Config), and AI Diagnostics detail modal | 🟢 High — Primary user interface |
| `frontend/src/index.css` | **Design System** — Glassmorphism dark theme, CSS variables, badge styles, animations (pulse dot, spin, gradient text), gradient buttons | 🟢 High — All visual styling lives here |
| `frontend/src/main.tsx` | React app entry point — mounts `<App />` | 🟡 Low — Standard React bootstrap |
| `frontend/vite.config.ts` | Vite bundler config — dev server on port 5173 | 🟡 Low — Build tooling config |
| `frontend/index.html` | HTML shell with `<div id="root">` and font imports | 🟡 Low — Standard HTML entry |

---

## 🧠 How the Pieces Connect (Data Flow)

```
External Service / CI Pipeline
      │
      ▼
POST /api/v1/logs/ingest        ← logs.controller.ts
      │
      ▼
LogsService.processLogIngestion()   ← logs.service.ts
      │
      ├─── detectFailureInLogs()     ← keyword matching (error, fatal, econnrefused, oom...)
      │
      ├─── AiService.analyzeLogs()   ← ai.service.ts
      │         ├── Gemini API (if API key valid)
      │         └── heuristicFallback() (always works — no API key needed)
      │
      ├─── PrismaService.incident.create()   ← saves to Neon PostgreSQL
      │
      └─── NotificationsService.dispatchIncidentAlerts()   ← sends email
                    │
                    └─── nodemailer → Gmail SMTP → Your Inbox 📧

React Dashboard (port 5173)
      │
      └─── GET /api/v1/incidents  ← polls backend for live incident list
```

---

## 📊 Importance Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 Critical | System breaks without this file |
| 🟢 High | Core functionality — important to understand |
| 🟡 Medium | Supporting role — needed but not urgent to understand |
