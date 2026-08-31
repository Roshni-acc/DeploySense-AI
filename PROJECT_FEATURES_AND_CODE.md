# 🚀 DeploySense AI — Project Features & Codebase Architecture Guide

Welcome to the comprehensive technical documentation for **DeploySense AI**. This document provides an exhaustive, line-by-line and component-by-component breakdown of all features, architecture designs, data models, backend services, and frontend UI components implemented in this project.

---

## 📖 Table of Contents
1. [Executive Overview & System Architecture](#-executive-overview--system-architecture)
2. [Comprehensive Feature Breakdown](#-comprehensive-feature-breakdown)
   - [1. Real-Time Telemetry & Incident Dashboard](#1-real-time-telemetry--incident-dashboard)
   - [2. Gemini AI Root-Cause Diagnostic Engine & Fallback](#2-gemini-ai-root-cause-diagnostic-engine--fallback)
   - [3. End-to-End Pipeline Simulation Suite](#3-end-to-end-pipeline-simulation-suite)
   - [4. Automated Multi-Channel Email Alerting Engine](#4-automated-multi-channel-email-alerting-engine)
   - [5. Incident Lifecycle & Resolution Management](#5-incident-lifecycle--resolution-management)
   - [6. GitHub Actions & Webhook Integration](#6-github-actions--webhook-integration)
   - [7. Universal Multi-Language SDK Ingestion (Node, Python, Go, cURL)](#7-universal-multi-language-sdk-ingestion-node-python-go-curl)
3. [Deep-Dive Codebase Breakdown](#-deep-dive-codebase-breakdown)
   - [Backend Architecture (`/backend`)](#backend-architecture-backend)
   - [Frontend Architecture (`/frontend`)](#frontend-architecture-frontend)
   - [Containerization & Infrastructure](#containerization--infrastructure)
4. [Data Model Schema & System Flow](#-data-model-schema--system-flow)

---

## 🏗️ Executive Overview & System Architecture

**DeploySense AI** is an intelligent, developer-centric CI/CD deployment monitoring and automated incident response platform. Modern cloud deployments often fail due to container OOM kills, database connection timeouts, missing environment variables, or silent configuration bugs.

DeploySense acts as an automated SRE (Site Reliability Engineer):
1. **Ingests log telemetry streams** from any language or build system via REST API / GitHub Webhooks.
2. **Scans logs in real-time** for non-zero exit codes, uncaught stack traces, and failure signatures.
3. **Executes Google Gemini AI** (with heuristic fallbacks) to analyze raw logs, extract root causes, compute confidence scores, and formulate exact code fix recommendations.
4. **Dispatches instant email alerts** via SMTP (with CC/BCC support and terminal fallback) to notify DevOps engineers.
5. **Provides an interactive React UI** for real-time monitoring, incident resolution, pipeline simulation, and language integration.

```
       [ Any Tech Stack / CI Pipeline ]
 (Node.js / Python / Go / cURL / GitHub Actions)
                       │
                       ▼  HTTP POST /api/v1/logs/ingest
             ┌───────────────────┐
             │   NestJS Backend  │
             └─────────┬─────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌────────────────────┐
│ Google Gemini AI │       │ PostgreSQL (Prisma)│
│  (Analysis Engine│       │ (Deployments/Logs) │
└────────┬─────────┘       └─────────┬──────────┘
         │                           │
         └─────────────┬─────────────┘
                       ▼
          ┌─────────────────────────┐
          │ Email Alert Dispatcher  │
          │ (Nodemailer / Terminal) │
          └────────────┬────────────┘
                       ▼
          ┌─────────────────────────┐
          │  Vite + React Frontend  │
          │ (Dashboard & AI Modal)  │
          └─────────────────────────┘
```

---

## ⚡ Comprehensive Feature Breakdown

### 1. Real-Time Telemetry & Incident Dashboard
- **Telemetry Counter Cards**: Real-time aggregation of Total Incidents, Open High/Critical Incidents, Fixed/Closed Incidents, and Active Alert Channels.
- **Auto & Manual Refresh**: Real-time polling with visual feedback button (`RefreshCw` / `CheckCircle2` loading transitions).
- **Glassmorphic Theme**: Dark cyber aesthetic featuring custom HSL gradients, cyan accents (`#00f2fe`), purple highlights (`#a855f7`), and glowing pulse indicators.

### 2. Gemini AI Root-Cause Diagnostic Engine & Fallback
- **Google Gemini Generative AI (`@google/generative-ai`)**:
  - Automatically queries candidate models (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`).
  - Enforces strict JSON schema generation (`rootCause`, `likelyCause`, `severity`, `aiConfidence`, `suggestedFix`, `recommendedActions`).
- **Heuristic Pattern Matching Fallback**:
  - When Gemini API is unconfigured or offline, an embedded heuristic engine inspects raw log signals (e.g. `ECONNREFUSED`, `OOMKilled`, exit code `137`, missing `ENV` variables) and produces instant structured diagnostic reports with 85-94% confidence.

### 3. End-to-End Pipeline Simulation Suite
Allows developers to trigger 3 real-world deployment failure scenarios directly from the UI:
1. **PostgreSQL Database Connection Timeout**: Simulates `ECONNREFUSED: 5432` during payment service startup.
2. **Memory Leak / Container OOM Failure**: Simulates Node.js heap overflow and Linux kernel `Exit Code 137 (OOMKilled)`.
3. **Missing Environment Variable Config**: Simulates unhandled configuration exception due to missing `JWT_SECRET_KEY` in auth service.

### 4. Automated Multi-Channel Email Alerting Engine
- Powered by **Nodemailer** with configurable SMTP host, port, authentication, `ALERT_EMAIL_TO`, `ALERT_EMAIL_CC`, and `ALERT_EMAIL_BCC`.
- **HTML Email Template Builder**: Generates rich, color-coded diagnostic alert emails containing severity tags, root cause summaries, and code fix boxes.
- **Terminal Simulation Mode**: When SMTP credentials are not set, alerts are logged into the backend console in standard email header format without throwing errors.

### 5. Incident Lifecycle & Resolution Management
- Incidents progress through status states: `OPEN` ➔ `INVESTIGATING` ➔ `RESOLVED` ➔ `CLOSED`.
- Clicking **"Mark Fixed"** in the dashboard or modal popup instantly updates the backend database via `PATCH /api/v1/logs/incidents/:id/resolve`, sets `resolvedAt` timestamps, and strikes out the incident visually.

### 6. GitHub Actions & Webhook Integration
- Exposes `POST /api/v1/webhooks/github` to receive push/workflow_run webhooks directly from GitHub repositories.
- Automatically extracts workflow names, repository details, head SHA commits, and build log URLs to create automated incident logs.

### 7. Universal Multi-Language SDK Ingestion (Node, Python, Go, cURL)
- **Language-Agnostic Ingestion Endpoint**: `POST /api/v1/logs/ingest`.
- **Interactive UI Guide**: Features a language dropdown select and visual tabs for **Node.js/TypeScript**, **Python**, **Go (Golang)**, and **cURL/Bash**.
- Includes a **Copy Code** button and an interactive **"Test Ingest API"** button that sends live log payloads from the selected language directly to the backend.

---

## 🔍 Deep-Dive Codebase Breakdown

### Backend Architecture (`/backend`)

#### 1. [schema.prisma](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/prisma/schema.prisma)
Defines the database schema and PostgreSQL entities:
- **`Deployment`**: Stores `serviceName`, `version`, `environment`, `status` (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`), `startedAt`, `finishedAt`.
- **`LogEntry`**: Stores raw log lines, `logLevel`, `source`, `timestamp`.
- **`Incident`**: Core entity storing AI diagnostic outcome: `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `status`, `rootCause`, `likelyCause`, `aiConfidence`, `suggestedFix`, `recommendedActions` (array of strings), `rawLogSnippet`, `resolvedAt`.
- **`NotificationLog`**: Tracks outgoing alert status (`channel`, `status`, `recipient`, `sentAt`).

#### 2. [main.ts](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/src/main.ts)
- Bootstraps the NestJS application.
- Configures CORS (`origin: true`, credentials).
- Attaches `ValidationPipe` with `transform: true` and `whitelist: true` for strict DTO validation.
- Runs the web server on `process.env.PORT || 3001`.

#### 3. [app.module.ts](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/src/app.module.ts)
- Imports `ConfigModule.forRoot({ isGlobal: true })`.
- Registers core feature modules: `PrismaModule`, `AiModule`, `NotificationsModule`, `LogsModule`.

#### 4. [ai.service.ts](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/src/modules/ai/ai.service.ts)
- Initializes `@google/generative-ai` with `GEMINI_API_KEY`.
- `analyzeLogs(serviceName, environment, rawLogs)`:
  - Executes model candidate loop across `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`.
  - Prompts Gemini to return structured JSON.
  - Cleans JSON markers (````json ... ````) and parses object.
  - On API error or missing key, invokes `heuristicFallback()` which uses pattern matching for DB timeouts, network timeouts, OOM kills, and missing variables.

#### 5. [logs.controller.ts](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/src/modules/logs/logs.controller.ts)
- `POST /api/v1/logs/ingest`: Accepts `IngestLogDto` log payload.
- `POST /api/v1/logs/simulate-failure`: Generates mock log streams for simulation buttons.
- `GET /api/v1/logs/incidents`: Retrieves last 100 detected incidents.
- `PATCH /api/v1/logs/incidents/:id/resolve`: Marks incident as fixed/closed.
- `POST /api/v1/webhooks/github`: Receives GitHub Actions pipeline notifications.

#### 6. [logs.service.ts](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/src/modules/logs/logs.service.ts)
- Orchestrates the deployment workflow:
  1. Creates `Deployment` record in PostgreSQL (or transient fallback object if DB is uninitialized).
  2. Scans log text with `detectFailureInLogs()`.
  3. If failure detected, calls `aiService.analyzeLogs()`.
  4. Saves `Incident` record in database and updates deployment status to `FAILED`.
  5. Dispatches alerts via `notificationsService.dispatchIncidentAlerts()`.
  6. Returns full JSON response including incident diagnostic details.

#### 7. [notifications.service.ts](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/backend/src/modules/notifications/notifications.service.ts)
- Configures Nodemailer transporter when `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are supplied.
- Sends formatted HTML email alert with CC and BCC headers.
- Logs full email content to terminal when running in simulation mode.

---

### Frontend Architecture (`/frontend`)

#### 1. [App.tsx](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/frontend/src/App.tsx)
- Main React container component using Lucide icons.
- **Dynamic API Base URL**: Reads `import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'`.
- **State Management**:
  - `incidents`: List of active and resolved incidents.
  - `selectedLang`: Current selected integration language (`nodejs`, `python`, `go`, `curl`).
  - `sendingTestLog` & `testLogStatus`: Controls integration test button state and status messaging.
  - `selectedIncident`: Active incident for AI Diagnostic modal display.
- **UI Components**:
  - Header & Status Counters.
  - End-to-End Pipeline Simulation Controls.
  - **Universal Multi-Language Integration SDK Guide**: Dropdown selector, tabs, code window, copy button, and live API test runner.
  - Detected Incidents Table with severity badges, AI confidence bars, and action buttons.
  - Detailed AI Diagnostics Modal Popup with root cause summaries, code remediation blocks, and action checklist.

#### 2. [index.css](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/frontend/src/index.css)
- CSS custom variables (`--bg-dark`, `--panel-bg`, `--accent-cyan`, `--accent-purple`, `--text-muted`).
- Glassmorphism backdrop filters (`backdrop-filter: blur(12px)`).
- Keyframe animations (`spin`, `pulse`).
- Severity badge colors (`badge-critical`, `badge-high`, `badge-medium`, `badge-low`, `badge-success`).

---

## 📊 Data Model Schema & System Flow

### Prisma Entity Relationship Diagram (ERD)

```
┌───────────────────────┐         ┌───────────────────────┐
│      Deployment       │         │       LogEntry        │
├───────────────────────┤         ├───────────────────────┤
│ id (UUID, PK)         │ 1     * │ id (UUID, PK)         │
│ serviceName (String)  ├─────────┼─deploymentId (FK)     │
│ version (String)      │         │ logLevel (String)     │
│ environment (String)  │         │ message (Text)        │
│ status (Enum)         │         │ source (String)       │
│ startedAt (DateTime)  │         │ timestamp (DateTime)  │
│ finishedAt (DateTime?)│         └───────────────────────┘
└───────────┬───────────┘
            │ 1
            │
            │ *
┌───────────┴───────────┐         ┌───────────────────────┐
│       Incident        │         │    NotificationLog    │
├───────────────────────┤         ├───────────────────────┤
│ id (UUID, PK)         │ 1     * │ id (UUID, PK)         │
│ deploymentId (FK)     ├─────────┼─incidentId (FK)       │
│ serviceName (String)  │         │ channel (Enum)        │
│ severity (Enum)       │         │ status (Enum)         │
│ rootCause (Text)      │         │ recipient (String)    │
│ likelyCause (Text)    │         │ sentAt (DateTime)     │
│ aiConfidence (Float)  │         └───────────────────────┘
│ suggestedFix (Text)   │
│ recommendedActions[]  │
│ resolvedAt (DateTime?)│
└───────────────────────┘
```

---

## 🎯 Verification & Build Summary

- **Backend Framework**: NestJS + Prisma ORM + Google Generative AI SDK + Nodemailer.
- **Frontend Framework**: React + TypeScript + Vite + Lucide Icons.
- **Build Status**: Verified zero TypeScript build errors (`tsc && vite build` clean compilation).

---
*Created for DeploySense AI — Open Source Incident Response System.*
