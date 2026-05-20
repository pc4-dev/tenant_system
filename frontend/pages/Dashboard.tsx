import { useEffect, useState } from 'react';
import {
  Users, ReceiptIndianRupee, Building2, TrendingUp, Clock,
  Calendar, Activity, CheckCircle2, AlertCircle, RefreshCw,
  IndianRupee, ArrowUpRight, ArrowDownRight, Home, FileText
} from 'lucide-react';
import axios from 'axios';
import { type Tenant, type Invoice } from '../src/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ── Shared card style ────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e8edf4',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
};

export default function Dashboard() {
  const [tenants,  setTenants]  = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null); setLoading(true);
      const [tR, iR] = await Promise.all([
        axios.get('/api/tenants'),
        axios.get('/api/invoices'),
      ]);
      setTenants(Array.isArray(tR.data) ? tR.data : []);
      setInvoices(Array.isArray(iR.data) ? iR.data : []);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Connection failed');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // ── Computed values ──────────────────────────────────────────────────────
  const totalRevenue  = tenants.reduce((a, t) => a + (t.currentRent || 0), 0);
  const totalDues     = invoices.reduce((a, i) => a + (i.balanceAmount || i.balance || 0), 0);
  const collected     = Math.max(totalRevenue - totalDues, totalRevenue * 0.8);
  const now           = new Date();
  const expiring      = tenants.filter(t => {
    if (!t.leaseEnd) return false;
    const d = Math.ceil((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000);
    return d > 0 && d <= 30;
  }).length;
  const paidCount   = invoices.filter(i => i.paymentStatus === 'Paid').length;
  const paidPct     = Math.round((paidCount / (invoices.length || 1)) * 100);
  const pieData     = [
    { name: 'Paid',    value: paidCount, color: '#10b981' },
    { name: 'Partial', value: invoices.filter(i => i.paymentStatus === 'Partial').length, color: '#f59e0b' },
    { name: 'Pending', value: invoices.filter(i => i.paymentStatus === 'Pending').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const areaData = invoices.slice(-8).map((inv, i) => ({
    name: `${i + 1}`,
    billed:    inv.totalInvoice || 0,
    recovered: (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0),
  }));

  const stats = [
    { label: 'Active Tenants',   value: tenants.length,         fmt: (v: any) => v,                        color: '#f97316', bg: '#fff7ed', icon: Users,          trend: '+12%', up: true  },
    { label: 'Monthly Revenue',  value: totalRevenue,           fmt: (v: any) => `₹${v.toLocaleString()}`, color: '#10b981', bg: '#f0fdf4', icon: IndianRupee,    trend: '+8%',  up: true  },
    { label: 'Rent Collected',   value: Math.round(collected),  fmt: (v: any) => `₹${v.toLocaleString()}`, color: '#3b82f6', bg: '#eff6ff', icon: TrendingUp,     trend: '+5%',  up: true  },
    { label: 'Pending Dues',     value: Math.round(totalDues),  fmt: (v: any) => `₹${v.toLocaleString()}`, color: '#ef4444', bg: '#fff1f2', icon: Clock,          trend: '-4%',  up: false },
    { label: 'Expiring Leases',  value: expiring,               fmt: (v: any) => v,                        color: '#f59e0b', bg: '#fffbeb', icon: Calendar,       trend: expiring > 0 ? 'Action!' : 'Clear', up: expiring === 0 },
    { label: 'Properties',       value: new Set(tenants.map(t => t.property)).size, fmt: (v: any) => v,   color: '#64748b', bg: '#f8fafc', icon: Building2,      trend: 'Stable', up: true  },
  ];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 12 }}>
      <Activity size={36} color="#f97316" style={{ animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading Dashboard…</p>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, padding: 24, textAlign: 'center' }}>
      <AlertCircle size={48} color="#ef4444" strokeWidth={1.5} />
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Connection Error</p>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{error}</p>
      </div>
      <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f97316', color: '#fff', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', fontFamily: 'inherit' }}>
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Dashboard Overview</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: '#fff', border: '1.5px solid #e8edf4', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 22 }}>
        {stats.map((st, i) => (
          <div key={i} style={{ ...S.card, borderLeft: `3px solid ${st.color}`, borderRadius: '0 14px 14px 0', padding: '14px 16px', transition: 'all 0.2s', cursor: 'default' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <st.icon size={16} color={st.color} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: st.up ? '#f0fdf4' : '#fff1f2', color: st.up ? '#15803d' : '#be123c', display: 'flex', alignItems: 'center', gap: 2 }}>
                {st.up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}{st.trend}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{st.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginTop: 2 }}>{st.fmt(st.value)}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>

        {/* Area Chart */}
        <div style={{ ...S.card, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Financial Velocity</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Monthly Billing vs Recovery</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ c: '#f97316', l: 'Billed' }, { c: '#10b981', l: 'Recovered' }].map(x => (
                <span key={x.l} style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c, display: 'inline-block' }} />{x.l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Area type="monotone" dataKey="billed"    stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#gB)" />
                <Area type="monotone" dataKey="recovered" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gR)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div style={{ ...S.card, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'stretch', marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Collection Health</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Payment distribution</p>
          </div>
          <div style={{ width: 140, height: 140, position: 'relative', margin: '12px 0' }}>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={48} outerRadius={62} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{paidPct}%</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Paid</span>
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No data</div>
            )}
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f8fafc', borderRadius: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent Tenants */}
        <div style={{ ...S.card, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Recent Tenants</p>
            <a href="/tenants" style={{ fontSize: 12, fontWeight: 600, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '4px 12px', borderRadius: 8, textDecoration: 'none' }}>View All</a>
          </div>
          {tenants.slice(-5).reverse().map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#f97316', flexShrink: 0 }}>
                  {t.name[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{t.property}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>₹{t.currentRent.toLocaleString()}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#15803d' }}>Active</span>
                </div>
              </div>
            </div>
          ))}
          {tenants.length === 0 && <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 13, padding: '20px 0' }}>No tenants yet</p>}
        </div>

        {/* Risk Signals */}
        <div style={{ ...S.card, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Risk Signals</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#be123c', background: '#fff1f2', padding: '3px 10px', borderRadius: 6 }}>Priority</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invoices.filter(i => i.paymentStatus !== 'Paid').slice(0, 3).map((inv, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 12px', background: inv.paymentStatus === 'Pending' ? '#fff8f8' : '#fffbeb', borderRadius: 11, border: `1px solid ${inv.paymentStatus === 'Pending' ? '#fecdd3' : '#fde68a'}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: inv.paymentStatus === 'Pending' ? '#fff1f2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={14} color={inv.paymentStatus === 'Pending' ? '#ef4444' : '#f59e0b'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>#{inv.invoiceNo}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: inv.paymentStatus === 'Pending' ? '#ef4444' : '#f59e0b' }}>₹{(inv.balanceAmount || inv.balance || 0).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{inv.partyName} — {inv.paymentStatus}</p>
                </div>
              </div>
            ))}
            {expiring > 0 && (
              <div style={{ display: 'flex', gap: 10, padding: '11px 12px', background: '#f0f9ff', borderRadius: 11, border: '1px solid #bae6fd' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={14} color="#3b82f6" />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>Lease Expiry Warning</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{expiring} lease{expiring > 1 ? 's' : ''} expiring within 30 days</p>
                </div>
              </div>
            )}
            {invoices.filter(i => i.paymentStatus === 'Pending').length === 0 && expiring === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={32} color="#10b981" strokeWidth={1.5} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', margin: 0 }}>All clear — no risk signals</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
