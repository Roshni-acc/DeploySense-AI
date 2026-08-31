# 🚀 DeploySense — AI-Powered CI/CD & Deployment Incident-Response Platform

DeploySense is a modern, AI-powered deployment monitoring and automated incident-response platform built with **NestJS**, **TypeScript**, **PostgreSQL**, **Redis**, and **Google Gemini AI**.

Unlike traditional CI/CD pipelines that simply fail and output raw, unparsed terminal logs, DeploySense automatically ingests application and deployment logs during or after a release, analyzes root causes using Google Gemini AI, generates step-by-step remediation advice, stores incidents in PostgreSQL, and dispatches real-time alerts via Webhooks, Slack, and Email.

---

## 🎯 Architecture Diagram

```
                        ┌──────────────────────────┐
                        │     Developer Push       │
                        └────────────┬─────────────┘
                                     │ git push
                                     ▼
                        ┌──────────────────────────┐
                        │      GitHub Actions      │
                        │  (Build, Test & Deploy)  │
                        └────────────┬─────────────┘
                                     │
                     Failure Event / Terminal Logs
                                     ▼
                        ┌──────────────────────────┐
                        │   DeploySense Backend    │
                        │     (NestJS API)         │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │   BullMQ Event Queue     │
                        │      (Redis Core)        │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │    AI Analysis Engine    │
                        │ (Google Gemini 1.5/2.5)  │
                        └────────────┬─────────────┘
                                     │
                       Root Cause, Fix & Severity
                                     ▼
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
 ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
 │ PostgreSQL DB│            │ Slack/Email  │            │ React / Web  │
 │ (Incidents)  │            │   Webhooks   │            │  Dashboard   │
 └──────────────┘            └──────────────┘            └──────────────┘
```

---

## 🔥 Key Features

- **🌐 Universal Multi-Language SDK & Guide**: Language-agnostic log ingestion endpoint (`POST /api/v1/logs/ingest`) with interactive UI code samples for **Node.js/TypeScript**, **Python**, **Go (Golang)**, and **cURL/Bash CI/CD**.
- **✉️ Dynamic Per-Project Email Alerts**: Integration snippets support an optional `"recipientEmail"` parameter so external repositories receive alerts directly in their team inbox without modifying central backend settings.
- **📊 Categorized Failure Tracking**:
  - **🛠️ CI/CD Build Failures (`BUILD`)**: Ingested from GitHub Actions / CI pipelines. Dispatches AI root-cause diagnostic email alerts to `recipientEmail`.
  - **🚀 Deployment Failures (`DEPLOYMENT`)**: Ingested from runtime container/server logs. Dispatches AI root-cause diagnostic email alerts to `recipientEmail`.
- **⚡ Automated Log Ingestion**: Ingests deployment logs from GitHub Actions, webhooks, or custom container monitors.
- **🤖 AI-Powered Root Cause Analysis**: Leverages Google Gemini AI to analyze raw stack traces, connection errors, and missing environment flags.
- **🎯 Actionable Remediation**: Generates human-readable cause summaries, severity rankings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and exact fix commands.
- **🚨 Multi-Channel Alerting**: Dispatches real-time incident summaries to Slack webhooks, email endpoints, and custom webhooks.
- **📊 Real-time Incident Dashboard**: Modern React UI to monitor deployments, explore incident diagnostics, trigger test failures, and test language SDKs.

---

## 📚 Detailed Documentation Guides

- 📘 **[Full Codebase & Feature Guide (PROJECT_FEATURES_AND_CODE.md)](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/PROJECT_FEATURES_AND_CODE.md)**: Exhaustive line-by-line breakdown of every NestJS backend service, Prisma data model, React UI component, and Gemini AI diagnostic flow.
- 🚀 **[Free Platform Deployment Guide (FREE_DEPLOYMENT_GUIDE.md)](file:///c:/Users/Roshni%20Singh/DeploySense/DeploySense-AI/FREE_DEPLOYMENT_GUIDE.md)**: Complete step-by-step instructions for deploying both Frontend and Backend on **100% Free Cloud Hosting** (Render, Vercel, Neon.tech).

---

## 📂 Project Structure

```
DeploySense-AI/
├── README.md                 # Project Overview & Guide
├── docker-compose.yml        # Orchestrates Postgres, Redis, Backend & Frontend
├── .env.example              # Template for Environment Variables
├── .gitignore                # Git exclusions
├── backend/                  # NestJS Backend Application
│   ├── Dockerfile            # Multi-stage Docker build for NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── ai/          # Gemini AI integration service
│   │   │   ├── logs/        # Log ingestion & webhook endpoints
│   │   │   ├── incidents/   # Incident management & PostgreSQL schema
│   │   │   └── notifications/ # Slack/Email/Webhook dispatch engine
│   │   ├── app.module.ts    # Root NestJS module
│   │   └── main.ts          # Application bootstrap
│   └── package.json
└── frontend/                 # React + Vite Monitoring Dashboard
    ├── Dockerfile
    ├── src/
    └── package.json
```

---

## 🛠️ Tech Stack & Free-Tier Services

| Component | Technology | Free Tier Provider |
| :--- | :--- | :--- |
| **Backend** | NestJS (TypeScript, Node.js) | Local / Render / Railway |
| **AI Analysis** | `@google/genai` (Gemini 1.5/2.5 Flash) | Google AI Studio (Free) |
| **Database** | PostgreSQL + Prisma ORM | Local Docker / Neon.tech |
| **Cache/Queue** | Redis + BullMQ | Local Docker / Upstash |
| **CI/CD** | GitHub Actions | GitHub (2,000 free min/mo) |
| **Alerting** | Discord / Slack Webhooks, Nodemailer | Slack / Discord Free |
| **Frontend** | React, Vite, Tailwind CSS | Vercel / Netlify / Local |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Docker & Docker Compose (Optional for local containerized runner)
- Google Gemini API Key (Free from [Google AI Studio](https://aistudio.google.com/))

### 1. Environment Setup
Copy `.env.example` to `.env` inside `backend/`:
```bash
cp .env.example backend/.env
```

Fill in your secrets:
```env
PORT=3000
DATABASE_URL="postgresql://deploysense:deploysense_pass@localhost:5432/deploysense_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
GEMINI_API_KEY="your-gemini-api-key-here"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx/yyy/zzz"
```

### 2. Run with Docker Compose (Recommended)
```bash
docker-compose up --build
```

### 3. Run Locally without Docker
```bash
# Start backend
cd backend
npm install
npx prisma db push
npm run start:dev

# Start frontend (in another terminal)
cd ../frontend
npm install
npm run dev
```

---

## 📝 For Your Resume (1.5 Years Experience)

> **DeploySense — AI-Powered Deployment Monitoring & Incident-Response Platform**
> - Architected an automated deployment monitoring system using **NestJS**, **TypeScript**, and **PostgreSQL** that ingests CI/CD logs and detects pipeline failures in real time.
> - Integrated **Google Gemini LLM** to perform automated root-cause analysis on stack traces, reducing mean-time-to-resolution (MTTR) by classifying incident severity and generating precise remediation steps.
> - Built an asynchronous processing pipeline with **BullMQ** & **Redis** to ingest high-throughput log streams without blocking core HTTP API threads.
> - Implemented multi-channel incident notifications via **Slack Webhooks**, **Email**, and **Webhooks**, and designed a **React** dashboard for live pipeline observability.

---

## 📄 License
MIT License. Created for learning and demonstration purposes.
