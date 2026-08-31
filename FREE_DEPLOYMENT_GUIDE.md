# 🌐 DeploySense AI — Free Platform Deployment Guide (100% Free Hosting)

This guide provides step-by-step instructions for deploying both the **DeploySense NestJS Backend** (with PostgreSQL Database & Prisma ORM) and the **Vite React Frontend** to zero-cost cloud platforms.

---

## 📌 Recommended Free Tech Stack Architecture

| Component | Platform | Free Plan Capabilities | Cost |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | [Neon.tech](https://neon.tech) / [Render DB](https://render.com) | 0.5 GB Storage, Serverless Postgres, Auto SSL | **$0 / month** |
| **NestJS Backend Service** | [Render Web Service](https://render.com) | 512 MB RAM, Automatic HTTPS, Free SSL, Git CI | **$0 / month** |
| **Vite React Frontend** | [Vercel](https://vercel.com) / [Netlify](https://netlify.com) | Unlimited Bandwidth, Global Edge CDN, Custom Domain | **$0 / month** |

---

## 🚀 Step 1: Deploy Free PostgreSQL Database (Neon.tech)

1. Sign up for a free account at [Neon.tech](https://neon.tech) (or Render PostgreSQL).
2. Click **Create Project** and name it `deploysense-db`.
3. Select PostgreSQL version `15` or `16` and choose your nearest region.
4. Copy the connection string provided in your dashboard:
   ```env
   DATABASE_URL="postgresql://deploysense_owner:YOUR_PASSWORD@ep-xyz.neon.tech/deploysense?sslmode=require"
   ```

---

## ⚙️ Step 2: Deploy Backend to Render.com (Free Web Service)

1. Sign up/log in at [Render.com](https://render.com).
2. Click **New +** ➔ Select **Web Service**.
3. Connect your GitHub repository: `DeploySense-AI`.
4. Fill in the service configuration:
   - **Name**: `deploysense-backend`
   - **Region**: Choose closest to database region.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npx prisma db push && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start:prod
     ```
   - **Instance Type**: Select **Free** (512 MB RAM).

5. Scroll down to **Environment Variables** and add the following keys:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://...` *(from Step 1)* | Managed Postgres URI |
   | `GEMINI_API_KEY` | `AIzaSy...` *(your Gemini Key)* | AI Root Cause Analyzer |
   | `PORT` | `10000` | Port assigned by Render |
   | `ALERT_EMAIL_TO` | `admin@example.com` | Fallback alert recipient (used if external project doesn't specify `recipientEmail`) |
   | `ALERT_EMAIL_CC` | `devops@example.com` | Secondary CC alert recipient |
   | `ALERT_EMAIL_BCC` | `logs@example.com` | Hidden BCC log archive recipient |
   | `SMTP_HOST` | `smtp.gmail.com` *(optional)* | SMTP Server (for delivering CI/CD failure emails) |
   | `SMTP_USER` | `your_email@gmail.com` *(optional)* | SMTP Username |
   | `SMTP_PASS` | `your_app_password` *(optional)* | SMTP Password |
   | `SMTP_PORT` | `587` *(optional)* | SMTP Port |

6. Click **Create Web Service**. Render will install dependencies, push Prisma migrations, compile NestJS, and start the app.
7. Once deployed, note down your live Backend URL:
   `https://deploysense-backend.onrender.com`

---

## ⏰ Preventing Render Free-Tier Sleep (Automated 5-Min Heartbeat)

Render's free-tier web services automatically sleep after 15 minutes of inactivity, causing 30-50 second cold start delays on new requests.

**DeploySense includes a built-in Dual-Layer Keep-Alive Engine to prevent sleeping:**
1. **Automated Backend Self-Ping (`KeepAliveService`)**: Every 5 minutes (`5 * 60 * 1000 ms`), the NestJS backend automatically pings `https://<service-name>.onrender.com/api/v1/health`. Render provides `RENDER_EXTERNAL_URL` automatically, keeping the instance 100% active 24/7 without external cron services.
2. **Frontend Heartbeat**: The React frontend dashboard automatically sends a silent heartbeat to `/api/v1/health` every 5 minutes when open in the browser.
3. **Dedicated Health Endpoint**: `GET /api/v1/health` returns server health status, uptime, and timestamps. You can also configure [UptimeRobot](https://uptimerobot.com) or [Cron-job.org](https://cron-job.org) to ping `https://<your-render-url>/api/v1/health` every 5 minutes for triple redundancy.

---

## 💻 Step 3: Deploy Frontend to Vercel (Free Global CDN)

1. Sign up/log in at [Vercel.com](https://vercel.com).
2. Click **Add New...** ➔ **Project** ➔ Import repository `DeploySense-AI`.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and set to `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   | Name | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://deploysense-backend.onrender.com/api/v1` | Live Render backend endpoint |

5. Click **Deploy**.
6. Vercel will build your static assets and publish your site to a free domain:
   `https://deploysense-ai.vercel.app`

---

## 🌐 Step 4: Alternative Free Frontend Hosting (Netlify / Render Static)

### Option B: Netlify
1. Log in to [Netlify.com](https://netlify.com) ➔ **Add new site** ➔ **Import an existing project**.
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`
5. Environment Variable: `VITE_API_BASE_URL` = `https://deploysense-backend.onrender.com/api/v1`
6. Click **Deploy Site**.

---

## 🧪 Step 5: Verification & Live End-to-End Testing

1. Open your live frontend URL (e.g. `https://deploysense-ai.vercel.app`).
2. Verify dashboard telemetry status counters.
3. Test simulation failure buttons (**Simulate DB Connection**, **Simulate OOM Failure**, **Simulate Missing Env Config**).
4. Select the **Universal Multi-Language Integration Guide** dropdown to test sending log telemetry in Node.js, Python, Go, or cURL!
5. Open any incident report to verify Google Gemini AI Root Cause Analysis and recommended code remediation steps.

---

## 🛡️ Production Security Checklist for Free Tiers
- ✅ Keep `GEMINI_API_KEY` and database credentials in hosting provider environment secrets.
- ✅ Ensure SSL mode is enabled (`sslmode=require`) on PostgreSQL connection string.
- ✅ Enable CORS headers on backend for frontend production domain.

---
*DeploySense AI — Free Platform Deployment Guide*
