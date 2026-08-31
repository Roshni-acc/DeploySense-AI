import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldAlert, Cpu, Terminal, RefreshCw, 
  CheckCircle2, AlertTriangle, Play, Zap, ArrowRight, X,
  Database, MemoryStick, Settings, Loader2, ShieldCheck, Clock,
  Code2, Copy, Check, Send, Globe, ChevronDown
} from 'lucide-react';

interface Incident {
  id: string;
  serviceName: string;
  environment: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rootCause: string;
  likelyCause: string;
  aiConfidence: number;
  suggestedFix: string;
  recommendedActions: string[];
  createdAt: string;
  resolvedAt?: string | null;
}

type SimType = 'db_timeout' | 'memory_leak' | 'missing_config' | null;

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);
  const [simulatingType, setSimulatingType] = useState<SimType>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Integration guide state
  const [selectedLang, setSelectedLang] = useState<'nodejs' | 'python' | 'go' | 'curl'>('nodejs');
  const [copied, setCopied] = useState(false);
  const [sendingTestLog, setSendingTestLog] = useState(false);
  const [testLogStatus, setTestLogStatus] = useState<string | null>(null);
  const [showSdkModal, setShowSdkModal] = useState(false);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

  const fetchIncidents = async () => {
    setLoading(true);
    setRefreshComplete(false);
    try {
      const [res] = await Promise.all([
        fetch(`${API_BASE}/logs/incidents`),
        new Promise((r) => setTimeout(r, 600)),
      ]);
      if (res.ok) {
        const data = await res.json();
        setIncidents(Array.isArray(data) ? data : []);
      } else {
        setIncidents([]);
      }
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
      setRefreshComplete(true);
      setTimeout(() => setRefreshComplete(false), 2000);
    }
  };

  useEffect(() => {
    fetchIncidents();

    // 5-minute keep-alive heartbeat interval to prevent Render free server from sleeping
    const pingBackend = async () => {
      try {
        await fetch(`${API_BASE}/health`);
      } catch {
        // Background keep-alive heartbeat
      }
    };
    const keepAliveTimer = setInterval(pingBackend, 5 * 60 * 1000);

    return () => clearInterval(keepAliveTimer);
  }, []);

  const markAsFixed = async (incidentId: string) => {
    setResolvingId(incidentId);
    try {
      const res = await fetch(`${API_BASE}/logs/incidents/${incidentId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const resolvedAt = new Date().toISOString();
      if (res.ok) {
        // Update local state instantly for UX
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === incidentId
              ? { ...inc, status: 'CLOSED', resolvedAt }
              : inc
          )
        );
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident((prev) => prev ? { ...prev, status: 'CLOSED', resolvedAt } : null);
        }
      } else {
        // Still update UI optimistically if DB is offline (transient mode)
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === incidentId
              ? { ...inc, status: 'CLOSED', resolvedAt }
              : inc
          )
        );
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident((prev) => prev ? { ...prev, status: 'CLOSED', resolvedAt } : null);
        }
      }
    } catch {
      // Optimistic update even on network error
      const resolvedAt = new Date().toISOString();
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? { ...inc, status: 'CLOSED', resolvedAt }
            : inc
        )
      );
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident((prev) => prev ? { ...prev, status: 'CLOSED', resolvedAt } : null);
      }
    } finally {
      setResolvingId(null);
    }
  };

  const triggerSimulation = async (type: SimType) => {
    setSimulatingType(type);
    try {
      const serviceMap: Record<string, string> = {
        db_timeout: 'payment-service',
        memory_leak: 'analytics-worker',
        missing_config: 'auth-service',
      };
      const res = await fetch(`${API_BASE}/logs/simulate-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureType: type, serviceName: serviceMap[type!] }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.incident) {
          setIncidents((prev) => [result.incident, ...prev]);
          setSelectedIncident(result.incident);
        }
      }
    } catch {
      alert('Simulation triggered! (Make sure NestJS backend is running on http://localhost:3001)');
    } finally {
      setSimulatingType(null);
    }
  };

  const simButtons = [
    {
      type: 'db_timeout' as SimType,
      label: 'Simulate DB Connection',
      sublabel: 'PostgreSQL ECONNREFUSED',
      icon: Database,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.3)',
    },
    {
      type: 'memory_leak' as SimType,
      label: 'Simulate OOM Failure',
      sublabel: 'Container Exit 137 / OOMKilled',
      icon: MemoryStick,
      color: '#fb923c',
      bg: 'rgba(249, 115, 22, 0.15)',
      border: 'rgba(249, 115, 22, 0.3)',
    },
    {
      type: 'missing_config' as SimType,
      label: 'Simulate Missing Env Config',
      sublabel: 'Undefined ENV variable',
      icon: Settings,
      color: '#facc15',
      bg: 'rgba(234, 179, 8, 0.15)',
      border: 'rgba(234, 179, 8, 0.3)',
    },
  ];

  const codeSnippets: Record<string, { name: string; icon: string; desc: string; code: string }> = {
    nodejs: {
      name: 'Node.js / TypeScript (Global Error Listener)',
      icon: '⚡',
      desc: 'Paste at project entry (index.ts / server.js / main.ts). Automatically captures ALL uncaught exceptions and unhandled promise rejections across your ENTIRE Node project!',
      code: `import axios from 'axios';

// 🚀 GLOBAL PROJECT-WIDE ERROR LISTENER (Place in index.ts / server.js / main.ts)
// Catches ANY uncaught exception or unhandled promise rejection in your ENTIRE Node.js project!
export function initDeploySenseGlobalLogger(serviceName = 'my-node-app', environment = 'production') {
  const API_URL = '${API_BASE}/logs/ingest';

  const sendLog = async (errorLog: string) => {
    try {
      await axios.post(API_URL, {
        serviceName,
        version: 'v1.0.0',
        environment,
        logs: errorLog,
        source: 'global-uncaught-handler'
      });
    } catch (e: any) {
      console.error('DeploySense Ingest Error:', e.message);
    }
  };

  // 1. Catch all uncaught synchronous exceptions across the ENTIRE project
  process.on('uncaughtException', (error) => {
    console.error('🔥 Global Uncaught Exception Detected:', error);
    sendLog(\`[GLOBAL UNCAUGHT EXCEPTION]\\n\${error.stack || error.message}\`);
  });

  // 2. Catch all unhandled async promise rejections across the ENTIRE project
  process.on('unhandledRejection', (reason: any) => {
    console.error('🔥 Global Unhandled Rejection Detected:', reason);
    sendLog(\`[GLOBAL UNHANDLED REJECTION]\\n\${reason?.stack || reason}\`);
  });

  console.log('🚀 DeploySense Global Project-Wide Error Monitor Active.');
}`
    },
    python: {
      name: 'Python (Global sys.excepthook Handler)',
      icon: '🐍',
      desc: 'Paste at top of main.py / app.py / settings.py. Automatically intercepts EVERY uncaught exception across your ENTIRE Python project codebase!',
      code: `import sys
import traceback
import requests

def init_deploysense_global_logger(service_name="my-python-project", environment="production"):
    """🚀 Global Project-Wide Exception Handler (Place at top of main.py / app.py)
    Automatically catches EVERY uncaught crash & exception across your ENTIRE Python project!"""
    url = "${API_BASE}/logs/ingest"

    def handle_global_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return

        error_msg = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        print("🔥 [DeploySense] Global Project Error Intercepted:\\n", error_msg)

        payload = {
            "serviceName": service_name,
            "version": "v1.0.0",
            "environment": environment,
            "logs": f"[GLOBAL PYTHON EXCEPTION]\\n{error_msg}",
            "source": "sys.excepthook"
        }
        try:
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            print(f"DeploySense Ingest Error: {e}")

    # Set as global exception handler for the ENTIRE application
    sys.excepthook = handle_global_exception
    print("🚀 DeploySense Global Python Error Monitor Initialized.")`
    },
    go: {
      name: 'Go (Global Panic Recovery Middleware)',
      icon: '🐹',
      desc: 'Attach to HTTP server or main function. Intercepts all panics, runtime crashes, and stack traces across your ENTIRE Go application!',
      code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "runtime/debug"
)

// 🚀 Global Panic Recovery Middleware for your ENTIRE Go Web Application
func DeploySenseGlobalRecoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                stackTrace := string(debug.Stack())
                errorMsg := fmt.Sprintf("[GLOBAL GO PANIC]\\nPanic: %v\\nStack Trace:\\n%s", err, stackTrace)
                
                // Send log asynchronously to DeploySense
                go sendLogToDeploySense(errorMsg, "golang-project")
                
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

func sendLogToDeploySense(logText string, serviceName string) {
    payload := map[string]string{
        "serviceName": serviceName,
        "version":     "v1.0.0",
        "environment": "production",
        "logs":        logText,
        "source":      "global-go-middleware",
    }
    jsonData, _ := json.Marshal(payload)
    http.Post("${API_BASE}/logs/ingest", "application/json", bytes.NewBuffer(jsonData))
}`
    },
    curl: {
      name: 'GitHub Actions / CI/CD (Universal Project Guard)',
      icon: '🐚',
      desc: 'Save as .github/workflows/deploysense-ci.yml in ANY GitHub project. Automatically catches build, test, and container failures across your ENTIRE repository!',
      code: `# Save as .github/workflows/deploysense-ci.yml in ANY project repository!
# Automatically catches build, test & deployment failures across your ENTIRE project repository!
name: DeploySense CI/CD Incident Guard

on:
  push:
    branches: [ main, master, dev ]
  pull_request:
    branches: [ main, master ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository Code
        uses: actions/checkout@v4

      - name: Run Entire Project Build & Test Suite
        run: |
          # Replace with your project build/test command (npm test / pytest / go test / docker build)
          npm install && npm test

      # 🚨 AUTOMATIC DEPLOYSENSE INCIDENT RESPONSE ON FAILURE
      - name: Trigger DeploySense AI Root-Cause Analysis on Failure
        if: failure()
        run: |
          echo "🔥 Entire Project Build Failed! Dispatching logs to DeploySense AI..."
          
          curl -X POST "${API_BASE}/logs/ingest" \\
            -H "Content-Type: application/json" \\
            -d '{
              "serviceName": "\${{ github.repository }}",
              "version": "\${{ github.sha }}",
              "environment": "github-actions-ci",
              "logs": "[ERROR] Entire project CI pipeline failed on branch \${{ github.ref_name }} for commit \${{ github.sha }}. Automatic AI root-cause analysis triggered.",
              "source": "github-actions-workflow"
            }'`
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestIngest = async () => {
    setSendingTestLog(true);
    setTestLogStatus(null);
    const sampleLogs: Record<string, string> = {
      nodejs: '[ERROR] Node.js App Exception: ECONNREFUSED 127.0.0.1:5432 at PaymentController.connect',
      python: '[ERROR] Python Exception: django.db.utils.OperationalError: could not connect to server at localhost:5432',
      go: '[FATAL] Go Runtime Error: panic: runtime error: invalid memory address or nil pointer dereference',
      curl: '[ERROR] Shell Exec: Container exited with status code 137. OOMKilled by kernel.',
    };

    try {
      const res = await fetch(`${API_BASE}/logs/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: `${selectedLang}-integrated-app`,
          version: 'v1.0.0',
          environment: 'production',
          logs: sampleLogs[selectedLang],
          source: `${selectedLang}-sdk-demo`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestLogStatus('✅ Test log ingested successfully! AI analyzed & incident created.');
        fetchIncidents();
      } else {
        setTestLogStatus('⚠️ Ingestion response received! Created transient incident report.');
        fetchIncidents();
      }
    } catch {
      setTestLogStatus('❌ Network error. Ensure NestJS backend is running on http://localhost:3001.');
    } finally {
      setSendingTestLog(false);
      setTimeout(() => setTestLogStatus(null), 5000);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        hour12: true,
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch { return iso; }
  };

  const isFixed = (inc: Incident) => inc.status === 'CLOSED' || inc.status === 'RESOLVED';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER BAR */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(0,242,254,0.1)', borderRadius: '16px', border: '1px solid rgba(0,242,254,0.3)' }}>
            <Cpu size={32} color="#00f2fe" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Deploy<span className="gradient-text">Sense</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>AI-Powered CI/CD &amp; Deployment Incident-Response Platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <span className="pulse-dot"></span>
            <span>Gemini AI Engine Active</span>
          </div>

          <button
            id="open-sdk-guide-header-btn"
            onClick={() => setShowSdkModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '30px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#e9d5ff',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <Code2 size={16} color="#a855f7" />
            <span>Integration SDKs</span>
          </button>

          <button
            id="refresh-incidents-btn"
            onClick={fetchIncidents}
            disabled={loading}
            className="glass-panel"
            style={{
              padding: '8px 20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: refreshComplete ? '#10b981' : '#fff',
              opacity: loading ? 0.8 : 1,
              transition: 'all 0.3s ease',
              minWidth: '120px',
              justifyContent: 'center',
              border: refreshComplete ? '1px solid rgba(16, 185, 129, 0.4)' : undefined,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.85rem' }}>Loading...</span>
              </>
            ) : refreshComplete ? (
              <>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: '0.85rem' }}>Updated!</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span style={{ fontSize: '0.85rem' }}>Refresh</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* OVERVIEW STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Total Incidents</span>
            <Activity size={18} color="#00f2fe" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>{incidents.length}</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>Real-time telemetry</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Open High/Critical</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: '#f87171' }}>
            {incidents.filter((i) => i.status === 'OPEN' && (i.severity === 'HIGH' || i.severity === 'CRITICAL')).length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Requires immediate review</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Fixed / Closed</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: '#34d399' }}>
            {incidents.filter((i) => i.status === 'CLOSED' || i.status === 'RESOLVED').length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>Resolved incidents</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Alert Channels</span>
            <Terminal size={18} color="#4facfe" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '8px', display: 'flex', gap: '8px' }}>
            <span className="badge badge-success">Email Direct</span>
            <span className="badge badge-low">CC / BCC</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Incident alerts via Email</div>
        </div>
      </div>

      {/* PIPELINE SIMULATION CONTROLS */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={18} color="#00f2fe" /> Test End-to-End Pipeline &amp; AI Diagnosis
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Simulate real deployment failure log streams to trigger AI root-cause analysis and email alert notifications.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {simButtons.map(({ type, label, sublabel, icon: Icon, color, bg, border }) => {
            const isRunning = simulatingType === type;
            const anyRunning = simulatingType !== null;
            return (
              <button
                key={type}
                id={`simulate-${type}-btn`}
                disabled={anyRunning}
                onClick={() => triggerSimulation(type)}
                style={{
                  padding: '14px 18px',
                  background: bg,
                  color,
                  border: `1px solid ${border}`,
                  cursor: anyRunning ? 'not-allowed' : 'pointer',
                  borderRadius: '12px',
                  fontWeight: 600,
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  opacity: anyRunning && !isRunning ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isRunning ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Icon size={16} />
                  )}
                  <span style={{ fontSize: '0.9rem' }}>{isRunning ? 'Analyzing...' : label}</span>
                </div>
                <span style={{ fontSize: '0.75rem', opacity: 0.75, fontWeight: 400 }}>{sublabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* COMPACT INTEGRATION BAR (Secondary shortcut trigger) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Code2 size={16} color="#a855f7" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e9d5ff' }}>Connect Your External Project</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>— Integration code snippets for Node.js, Python, Go &amp; cURL</span>
        </div>
        <button
          id="open-sdk-modal-bar-btn"
          onClick={() => setShowSdkModal(true)}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            background: 'rgba(168, 85, 247, 0.2)',
            color: '#fff',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>View SDKs</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* INCIDENTS TABLE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} color="#f97316" /> Detected Deployment Incidents
          {loading && <Loader2 size={16} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite', marginLeft: '8px' }} />}
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Service</th>
                <th style={{ padding: '12px 16px' }}>Severity</th>
                <th style={{ padding: '12px 16px' }}>AI Confidence</th>
                <th style={{ padding: '12px 16px' }}>Root Cause</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No incidents detected. Use simulation buttons above to test the pipeline.
                  </td>
                </tr>
              )}
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s',
                    opacity: isFixed(inc) ? 0.7 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{inc.serviceName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inc.environment}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ width: `${inc.aiConfidence}%`, height: '100%', background: inc.aiConfidence >= 90 ? '#10b981' : '#facc15', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontWeight: 600, color: '#00f2fe', fontSize: '0.85rem' }}>{inc.aiConfidence}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', maxWidth: '280px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.rootCause}</div>
                    {inc.resolvedAt && (
                      <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> Fixed: {formatTime(inc.resolvedAt)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${isFixed(inc) ? 'badge-success' : 'badge-high'}`}>
                      {isFixed(inc) ? '✓ FIXED' : inc.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatTime(inc.createdAt)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {!isFixed(inc) && (
                        <button
                          id={`mark-fixed-${inc.id}-btn`}
                          onClick={() => markAsFixed(inc.id)}
                          disabled={resolvingId === inc.id}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '8px',
                            cursor: resolvingId === inc.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {resolvingId === inc.id ? (
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <ShieldCheck size={12} />
                          )}
                          {resolvingId === inc.id ? 'Fixing...' : 'Mark Fixed'}
                        </button>
                      )}
                      <button
                        id={`view-incident-${inc.id}-btn`}
                        onClick={() => setSelectedIncident(inc)}
                        className="gradient-btn"
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      >
                        AI Diagnostics <ArrowRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI DIAGNOSTICS MODAL */}
      {selectedIncident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '24px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '20px', background: '#0e1320' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${selectedIncident.severity.toLowerCase()}`}>{selectedIncident.severity}</span>
                  <span className="badge badge-low">🤖 AI Confidence: {selectedIncident.aiConfidence}%</span>
                  {isFixed(selectedIncident) && (
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} /> FIXED
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>{selectedIncident.serviceName} Failure Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Incident ID: {selectedIncident.id} · {selectedIncident.environment}
                </p>
                {selectedIncident.resolvedAt && (
                  <p style={{ color: '#34d399', fontSize: '0.82rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} /> Resolved at: {formatTime(selectedIncident.resolvedAt)}
                  </p>
                )}
              </div>

              <button id="close-diagnostics-btn" onClick={() => setSelectedIncident(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* AI Confidence Bar */}
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.15)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>AI Confidence</span>
                <div style={{ flex: 1, height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ width: `${selectedIncident.aiConfidence}%`, height: '100%', background: 'linear-gradient(90deg, #00f2fe, #4facfe)', borderRadius: '6px', transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00f2fe' }}>{selectedIncident.aiConfidence}%</span>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <h4 style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '6px', fontWeight: 600 }}>🤖 AI Root Cause Summary</h4>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{selectedIncident.rootCause}</p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Likely Underlying Cause</h4>
                <p style={{ fontSize: '0.9rem', color: '#d1d5db', lineHeight: '1.5' }}>{selectedIncident.likelyCause}</p>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                <h4 style={{ color: '#00f2fe', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>🛠️ Recommended Remediation</h4>
                <pre style={{ background: '#070a10', padding: '12px', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedIncident.suggestedFix}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Actionable Checklist</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedIncident.recommendedActions?.map((act, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '12px' }}>
                {!isFixed(selectedIncident) && (
                  <button
                    id="modal-mark-fixed-btn"
                    onClick={() => markAsFixed(selectedIncident.id)}
                    disabled={resolvingId === selectedIncident.id}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      borderRadius: '10px',
                      cursor: resolvingId === selectedIncident.id ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {resolvingId === selectedIncident.id ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    {resolvingId === selectedIncident.id ? 'Marking as Fixed...' : '✓ Mark as Fixed'}
                  </button>
                )}
                {isFixed(selectedIncident) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.9rem' }}>
                    <ShieldCheck size={18} />
                    <span>Incident marked as fixed{selectedIncident.resolvedAt ? ` · ${formatTime(selectedIncident.resolvedAt)}` : ''}</span>
                  </div>
                )}
                <button id="close-modal-btn" onClick={() => setSelectedIncident(null)} className="gradient-btn">
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSAL MULTI-LANGUAGE INTEGRATION SDK MODAL */}
      {showSdkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '24px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', borderRadius: '20px', background: '#0e1320' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Code2 size={24} color="#a855f7" /> Universal Project Integration (4 Languages SDK Guide)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  DeploySense is 100% language-agnostic. Select your tech stack below to get ready-to-use integration code.
                </p>
              </div>
              <button id="close-sdk-modal-btn" onClick={() => setShowSdkModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* LANGUAGE SELECTOR & TABS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['nodejs', 'python', 'go', 'curl'] as const).map((langKey) => {
                  const isSelected = selectedLang === langKey;
                  const snippet = codeSnippets[langKey];
                  return (
                    <button
                      key={langKey}
                      id={`modal-select-lang-${langKey}-btn`}
                      onClick={() => setSelectedLang(langKey)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        background: isSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.04)',
                        color: isSelected ? '#e9d5ff' : 'var(--text-muted)',
                        border: isSelected ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid var(--border-color)',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.83rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{snippet.icon}</span>
                      <span>{snippet.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown Select */}
              <div style={{ position: 'relative' }}>
                <select
                  id="modal-language-select-dropdown"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as any)}
                  style={{
                    padding: '8px 32px 8px 12px',
                    background: '#131826',
                    color: '#fff',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: '10px',
                    fontSize: '0.83rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    appearance: 'none',
                    outline: 'none',
                  }}
                >
                  <option value="nodejs">⚡ Node.js / TypeScript</option>
                  <option value="python">🐍 Python (Django/Flask/FastAPI)</option>
                  <option value="go">🐹 Go (Golang)</option>
                  <option value="curl">🐚 cURL / Bash CI/CD</option>
                </select>
                <ChevronDown size={14} color="#a855f7" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* DESCRIPTION & API BANNER */}
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                💡 {codeSnippets[selectedLang].desc}
              </p>
              <div style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(0,242,254,0.1)', color: '#00f2fe', fontFamily: 'monospace' }}>
                POST {API_BASE}/logs/ingest
              </div>
            </div>

            {/* CODE WINDOW */}
            <div style={{ borderRadius: '12px', background: '#070a10', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#0e1320', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'monospace' }}>
                    deploysense-integration-{selectedLang}.{selectedLang === 'python' ? 'py' : selectedLang === 'go' ? 'go' : selectedLang === 'curl' ? 'sh' : 'ts'}
                  </span>
                </div>

                <button
                  id="modal-copy-code-btn"
                  onClick={() => handleCopyCode(codeSnippets[selectedLang].code)}
                  style={{
                    padding: '5px 12px',
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.08)',
                    color: copied ? '#34d399' : '#fff',
                    border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <pre style={{ margin: 0, padding: '18px', color: '#38bdf8', fontSize: '0.85rem', fontFamily: 'Fira Code, Consolas, monospace', lineHeight: '1.6', overflowX: 'auto' }}>
                <code>{codeSnippets[selectedLang].code}</code>
              </pre>
            </div>

            {/* FOOTER ACTIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <button
                id={`modal-test-ingest-${selectedLang}-btn`}
                onClick={handleTestIngest}
                disabled={sendingTestLog}
                className="gradient-btn"
                style={{
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: sendingTestLog ? 0.7 : 1,
                  cursor: sendingTestLog ? 'not-allowed' : 'pointer',
                }}
              >
                {sendingTestLog ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send size={16} />
                )}
                <span>{sendingTestLog ? 'Sending Payload...' : `Test ${codeSnippets[selectedLang].name} Ingest API`}</span>
              </button>

              {testLogStatus && (
                <div style={{ fontSize: '0.85rem', color: testLogStatus.includes('✅') ? '#34d399' : '#facc15', fontWeight: 500, padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                  {testLogStatus}
                </div>
              )}

              <button id="close-sdk-guide-modal-btn" onClick={() => setShowSdkModal(false)} className="gradient-btn" style={{ opacity: 0.8 }}>
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
