# 🔌 DeploySense Integration Guide

> How to send your deployment logs to DeploySense from **any project**, regardless of tech stack.
> Works with Node.js, Python, Java, Docker, GitHub Actions, or any HTTP-capable system.

---

## 🚀 What You're Integrating

DeploySense exposes a single HTTP endpoint:

```
POST http://your-deploysense-host:3001/api/v1/logs/ingest
Content-Type: application/json
```

**Request Body:**
```json
{
  "serviceName": "your-app-name",
  "environment": "production",
  "version": "v1.2.3",
  "source": "ci-pipeline",
  "recipientEmail": "dev-team@yourdomain.com",
  "logs": "your raw log output here..."
}
```

DeploySense will automatically:
1. ✅ Detect failure patterns in your logs
2. 🤖 Run AI root-cause analysis & calculate confidence score
3. 💾 Save the incident under either **🚀 Deployment Failures** or **🛠️ CI/CD Build Failures** tab
4. 📧 Send an HTML email alert to `recipientEmail` (or global `ALERT_EMAIL_TO`) for any failure incident

---

## 📊 Understanding Dashboard Incident Categories

DeploySense classifies incidents into two distinct tabs:

| Tab | Category | Description | Email Triggered? |
|-----|----------|-------------|------------------|
| **🛠️ CI/CD Build Failures** | `BUILD` | Failures during GitHub Actions, linting, compilation, Docker builds, or automated test pipelines. | **YES** 📧 (Dispatches diagnostic email alert to `recipientEmail`) |
| **🚀 Deployment Failures** | `DEPLOYMENT` | Runtime / production crashes (e.g. database `ECONNREFUSED`, `OOMKilled` memory leaks, unhandled web exceptions). | **YES** 📧 (Dispatches diagnostic email alert to `recipientEmail`) |

---

## Method 1: Node.js (Native HTTP)

```javascript
// deploysense-reporter.js
const http = require('http');

function reportToDeploySense(logs, options = {}) {
  const payload = JSON.stringify({
    serviceName: options.serviceName || process.env.npm_package_name || 'node-app',
    environment: options.environment || process.env.NODE_ENV || 'production',
    version: options.version || process.env.npm_package_version || '1.0.0',
    source: 'node-app',
    logs,
  });

  const req = http.request({
    hostname: options.host || 'localhost',
    port: options.port || 3001,
    path: '/api/v1/logs/ingest',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => console.log('[DeploySense]', JSON.parse(data).status));
  });

  req.on('error', (e) => console.error('[DeploySense] Error:', e.message));
  req.write(payload);
  req.end();
}

module.exports = { reportToDeploySense };
```

**Usage:**
```javascript
const { reportToDeploySense } = require('./deploysense-reporter');

// In your catch blocks or process error handlers:
process.on('uncaughtException', (err) => {
  reportToDeploySense(`FATAL: ${err.stack}`, { serviceName: 'my-node-app' });
});
```

---

## Method 2: Python

```python
# deploysense_reporter.py
import urllib.request
import json
import os

def report_to_deploysense(logs: str, service_name: str = None, environment: str = None, version: str = None, host: str = "localhost", port: int = 3001):
    payload = json.dumps({
        "serviceName": service_name or os.getenv("SERVICE_NAME", "python-app"),
        "environment": environment or os.getenv("ENVIRONMENT", "production"),
        "version": version or os.getenv("APP_VERSION", "1.0.0"),
        "source": "python-app",
        "logs": logs
    }).encode("utf-8")

    req = urllib.request.Request(
        f"http://{host}:{port}/api/v1/logs/ingest",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            result = json.loads(res.read())
            print(f"[DeploySense] {result.get('status')}")
    except Exception as e:
        print(f"[DeploySense] Failed to report: {e}")
```

**Usage:**
```python
import traceback
from deploysense_reporter import report_to_deploysense

try:
    # your application code
    connect_to_database()
except Exception as e:
    report_to_deploysense(
        logs=f"ERROR: {str(e)}\n{traceback.format_exc()}",
        service_name="my-python-service",
        environment="production"
    )
    raise
```

---

## Method 3: cURL (Shell Script / Bash / CI)

```bash
#!/bin/bash
# deploysense-report.sh

DEPLOYSENSE_HOST="${DEPLOYSENSE_HOST:-localhost}"
DEPLOYSENSE_PORT="${DEPLOYSENSE_PORT:-3001}"
SERVICE_NAME="${SERVICE_NAME:-my-service}"
ENVIRONMENT="${ENVIRONMENT:-production}"
VERSION="${VERSION:-1.0.0}"

report_to_deploysense() {
  local logs="$1"
  curl -s -X POST \
    "http://$DEPLOYSENSE_HOST:$DEPLOYSENSE_PORT/api/v1/logs/ingest" \
    -H "Content-Type: application/json" \
    -d "{
      \"serviceName\": \"$SERVICE_NAME\",
      \"environment\": \"$ENVIRONMENT\",
      \"version\": \"$VERSION\",
      \"source\": \"bash-script\",
      \"logs\": $(echo "$logs" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
    }" || echo "[DeploySense] Reporting failed"
}

# Usage: capture command output and report
OUTPUT=$(your-deployment-command 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  report_to_deploysense "DEPLOYMENT FAILED (exit $EXIT_CODE): $OUTPUT"
fi
```

---

## Method 4: GitHub Actions CI/CD

Add this step to any `.github/workflows/*.yml` file to automatically report deployment failures:

```yaml
# .github/workflows/deploy.yml
name: Deploy with DeploySense Monitoring

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and Deploy
        id: deploy
        run: |
          # your build/deploy commands here
          npm install && npm run build
        continue-on-error: true

      - name: Report to DeploySense
        if: always()
        run: |
          STATUS="${{ steps.deploy.outcome }}"
          LOGS="GitHub Actions $STATUS for ${{ github.repository }} @ ${{ github.sha }}"

          if [ "$STATUS" = "failure" ]; then
            LOGS="DEPLOYMENT FAILED: $LOGS. Commit message: ${{ github.event.head_commit.message }}"
          fi

          curl -s -X POST \
            "${{ secrets.DEPLOYSENSE_URL }}/api/v1/logs/ingest" \
            -H "Content-Type: application/json" \
            -d "{
              \"serviceName\": \"${{ github.event.repository.name }}\",
              \"environment\": \"production\",
              \"version\": \"${{ github.sha }}\",
              \"source\": \"github-actions\",
              \"logs\": \"$LOGS\"
            }"
```

> **Setup:** Add `DEPLOYSENSE_URL=http://your-server:3001` as a GitHub Actions secret.

---

## Method 5: Docker Container Sidecar

Add DeploySense as a sidecar in your `docker-compose.yml`:

```yaml
# docker-compose.yml (your existing project)
version: '3.8'

services:
  your-app:
    image: your-app:latest
    environment:
      - DEPLOYSENSE_URL=http://deploysense:3001
    depends_on:
      - deploysense

  # Add DeploySense as a sidecar monitoring service:
  deploysense:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - /path/to/DeploySense-AI/backend:/app
    command: sh -c "npm install && npm run start:dev"
    environment:
      - PORT=3001
      - DATABASE_URL=your_neon_db_url
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=your@gmail.com
      - SMTP_PASS=your_app_password
      - ALERT_EMAIL_TO=your@gmail.com
    ports:
      - "3001:3001"
```

Then in your app container's entrypoint script:

```bash
#!/bin/sh
# entrypoint.sh

# Run your app and capture logs
your-app-command 2>&1 | tee /tmp/app.log

# If non-zero exit, report to DeploySense sidecar
if [ $? -ne 0 ]; then
  curl -s -X POST http://deploysense:3001/api/v1/logs/ingest \
    -H "Content-Type: application/json" \
    -d "{\"serviceName\":\"$SERVICE_NAME\",\"environment\":\"$ENV\",\"logs\":\"$(cat /tmp/app.log | tail -100)\"}"
fi
```

---

## Method 6: Java / Spring Boot

```java
// DeploySenseReporter.java
import java.net.http.*;
import java.net.URI;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

public class DeploySenseReporter {
    private static final String DEPLOYSENSE_URL = 
        System.getenv().getOrDefault("DEPLOYSENSE_URL", "http://localhost:3001");
    
    public static void report(String logs, String serviceName, String environment) {
        try {
            var payload = new ObjectMapper().writeValueAsString(Map.of(
                "serviceName", serviceName,
                "environment", environment,
                "version", "1.0.0",
                "source", "spring-boot",
                "logs", logs
            ));
            
            HttpClient.newHttpClient().send(
                HttpRequest.newBuilder()
                    .uri(URI.create(DEPLOYSENSE_URL + "/api/v1/logs/ingest"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build(),
                HttpResponse.BodyHandlers.ofString()
            );
        } catch (Exception e) {
            System.err.println("[DeploySense] Reporting failed: " + e.getMessage());
        }
    }
}
```

---

## 📦 Environment Variables for Integration

Set these in your external project:

| Variable | Description | Example |
|----------|-------------|---------|
| `DEPLOYSENSE_URL` | DeploySense backend URL | `http://localhost:3001` |
| `SERVICE_NAME` | Your service name (shows in dashboard) | `payment-service` |
| `ENVIRONMENT` | Deployment environment | `production`, `staging` |
| `APP_VERSION` | Your app version | `v2.1.0` |

---

## 🧪 Test Your Integration

Run this one-liner to confirm DeploySense is receiving your logs:

```bash
curl -X POST http://localhost:3001/api/v1/logs/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "test-service",
    "environment": "development",
    "version": "v1.0.0",
    "logs": "ERROR: ECONNREFUSED 127.0.0.1:5432 — database connection failed"
  }'
```

Expected response:
```json
{
  "success": true,
  "status": "FAILED",
  "failureDetected": true,
  "incident": {
    "severity": "HIGH",
    "rootCause": "...",
    "aiConfidence": 92
  }
}
```

---

## 🌍 Deploying DeploySense to Production (So Other Projects Can Use It Remotely)

### Option A: Deploy to Railway (Free Tier)
1. Go to [railway.app](https://railway.app) and connect your GitHub repo
2. Select `backend/` as the root directory
3. Add all your environment variables from `backend/.env`
4. Railway auto-deploys on every push to `main`
5. Your DeploySense URL becomes: `https://your-project.up.railway.app`

### Option B: Deploy to Render (Free Tier)
1. Go to [render.com](https://render.com) → New Web Service
2. Connect `https://github.com/Roshni-acc/DeploySense-AI`
3. Root Directory: `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `node dist/main.js`
6. Add environment variables from your `.env`

### Option C: Docker Anywhere (VPS, GCP, AWS)
```bash
# Build the backend image
docker build -t deploysense-backend ./backend

# Run with your env vars
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="your_neon_db_url" \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=587 \
  -e SMTP_USER=your@gmail.com \
  -e SMTP_PASS=your_app_password \
  -e ALERT_EMAIL_TO=your@gmail.com \
  deploysense-backend
```
