import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldAlert, Cpu, Terminal, RefreshCw, 
  CheckCircle2, AlertTriangle, Play, Zap, ArrowRight, X, ExternalLink
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

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
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
    try {
      const res = await fetch(`${API_BASE}/incidents`);
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
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const triggerSimulation = async (type: string) => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/logs/simulate-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureType: type, serviceName: type === 'db_timeout' ? 'payment-service' : type === 'memory_leak' ? 'analytics-worker' : 'auth-service' }),
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
      setSimulating(false);
    }
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>AI-Powered CI/CD & Deployment Incident-Response Platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <span className="pulse-dot"></span>
            <span>Gemini AI Engine Active</span>
          </div>

          <button onClick={fetchIncidents} className="glass-panel" style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={18} color="#00f2fe" /> Test End-to-End Pipeline & AI Diagnosis
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Simulate real deployment failure log streams to trigger Gemini AI root-cause analysis and alert notifications.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              disabled={simulating}
              onClick={() => triggerSimulation('db_timeout')}
              className="glass-panel" 
              style={{ padding: '10px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', borderRadius: '8px', fontWeight: 600 }}
            >
              Simulate DB Connection Timeout
            </button>

            <button 
              disabled={simulating}
              onClick={() => triggerSimulation('memory_leak')}
              className="glass-panel" 
              style={{ padding: '10px 16px', background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)', cursor: 'pointer', borderRadius: '8px', fontWeight: 600 }}
            >
              Simulate Container OOM Failure
            </button>

            <button 
              disabled={simulating}
              onClick={() => triggerSimulation('missing_config')}
              className="glass-panel" 
              style={{ padding: '10px 16px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', cursor: 'pointer', borderRadius: '8px', fontWeight: 600 }}
            >
              Simulate Missing Env Config
            </button>
          </div>
        </div>
      </div>

      {/* INCIDENTS TABLE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} color="#f97316" /> Detected Deployment Incidents
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
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{inc.serviceName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inc.environment}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#00f2fe' }}>
                    {inc.aiConfidence}%
                  </td>
                  <td style={{ padding: '16px', maxWidth: '340px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.rootCause}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${inc.status === 'RESOLVED' ? 'badge-success' : 'badge-high'}`}>{inc.status}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
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
                  <span className="badge badge-low">AI Confidence: {selectedIncident.aiConfidence}%</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>{selectedIncident.serviceName} Failure Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Incident ID: {selectedIncident.id}</p>
              </div>

              <button onClick={() => setSelectedIncident(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                <pre style={{ background: '#070a10', padding: '12px', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem', overflowX: 'auto' }}>
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
                <button onClick={() => setSelectedIncident(null)} className="gradient-btn">
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
