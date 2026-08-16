import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldAlert, Cpu, Terminal, RefreshCw, 
  CheckCircle2, AlertTriangle, Play, Zap, ArrowRight, X, ExternalLink,
  Database, MemoryStick, Settings, Loader2
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
}

type SimType = 'db_timeout' | 'memory_leak' | 'missing_config' | null;

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);
  const [simulatingType, setSimulatingType] = useState<SimType>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const API_BASE = 'http://localhost:3001/api/v1';

  // Seed sample mock incidents if backend DB is empty
  const defaultIncidents: Incident[] = [
    {
      id: 'inc-demo-101',
      serviceName: 'payment-service',
      environment: 'production',
      status: 'OPEN',
      severity: 'HIGH',
      rootCause: 'PaymentService could not establish a PostgreSQL connection on port 5432.',
      likelyCause: 'The database service container was unready or restarting during the deployment roll-out.',
      aiConfidence: 94,
      suggestedFix: 'Add a wait-for-it health check container entrypoint before launching PaymentService node application.',
      recommendedActions: [
        'Verify PostgreSQL container status with docker ps',
        'Inspect DATABASE_URL environment secret',
        'Check database connection pool limits'
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'inc-demo-102',
      serviceName: 'analytics-worker',
      environment: 'staging',
      status: 'RESOLVED',
      severity: 'CRITICAL',
      rootCause: 'JavaScript Heap Memory limit exceeded resulting in container OOMKilled (Exit 137).',
      likelyCause: 'High throughput batch event payload caused rapid uncollected object allocation.',
      aiConfidence: 91,
      suggestedFix: 'Increase max_old_space_size flag to --max-old-space-size=4096 and enable memory garbage collection stats.',
      recommendedActions: [
        'Increase container RAM allocation from 2GB to 4GB',
        'Audit large batch payload queries',
        'Enable Node.js memory profiling'
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    }
  ];

  const fetchIncidents = async () => {
    setLoading(true);
    setRefreshComplete(false);
    try {
      // Artificial minimum 800ms for visual feedback
      const [res] = await Promise.all([
        fetch(`${API_BASE}/incidents`),
        new Promise((r) => setTimeout(r, 800)),
      ]);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.length > 0 ? data : defaultIncidents);
      } else {
        setIncidents(defaultIncidents);
      }
    } catch {
      setIncidents(defaultIncidents);
    } finally {
      setLoading(false);
      setRefreshComplete(true);
      setTimeout(() => setRefreshComplete(false), 2000);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

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

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', { hour12: true, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

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
            <span>AI Mean Diagnosis Time</span>
            <Zap size={18} color="#e100ff" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>0.84s</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>Automated stack parsing</div>
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
            Simulate real deployment failure log streams to trigger Gemini AI root-cause analysis and email alert notifications.
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
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No incidents detected. Use the simulation buttons above to test your pipeline.
                  </td>
                </tr>
              )}
              {incidents.map((inc) => (
                <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
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
                  <td style={{ padding: '16px', maxWidth: '300px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.rootCause}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${inc.status === 'RESOLVED' ? 'badge-success' : 'badge-high'}`}>{inc.status}</span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatTime(inc.createdAt)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      id={`view-incident-${inc.id}-btn`}
                      onClick={() => setSelectedIncident(inc)}
                      className="gradient-btn"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      View AI Diagnostics <ArrowRight size={14} />
                    </button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge badge-${selectedIncident.severity.toLowerCase()}`}>{selectedIncident.severity}</span>
                  <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🤖 AI Confidence: {selectedIncident.aiConfidence}%
                  </span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>{selectedIncident.serviceName} Failure Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Incident ID: {selectedIncident.id} · {selectedIncident.environment}</p>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button id="close-modal-btn" onClick={() => setSelectedIncident(null)} className="gradient-btn">
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
