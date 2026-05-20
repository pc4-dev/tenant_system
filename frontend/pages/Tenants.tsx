import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye, Edit2, Trash2, Users, IndianRupee, ShieldCheck, Download } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '../src/lib/exportUtils';
import { type Tenant, type Company } from '../src/types';
import { TenantDetailsView }   from '../components/tenants/TenantDetailsView';
import { StatusBadge }         from '../components/tenants/TenantPrimitives';
import { DeleteConfirmationModal } from '../components/tenants/DeleteConfirmationModal';

export default function TenantList() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [tenants,           setTenants]          = useState<Tenant[]>([]);
  const [companies,         setCompanies]         = useState<Company[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [search,            setSearch]            = useState('');
  const [monthFilter,       setMonthFilter]       = useState('All Months');
  const [selectedTenant,    setSelectedTenant]    = useState<Tenant | null>(null);
  const [showDetails,       setShowDetails]       = useState(false);
  const [tenantToDelete,    setTenantToDelete]    = useState<Tenant | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting,         setExporting]         = useState(false);

  useEffect(() => { fetchTenants(); fetchCompanies(); }, []);

  useEffect(() => {
    if (id && tenants.length > 0) {
      const t = tenants.find(x => x.id === id);
      if (t) { setSelectedTenant(t); setShowDetails(true); }
    } else if (!id) {
      setShowDetails(false); setSelectedTenant(null);
    }
  }, [id, tenants]);

  const fetchTenants = () => {
    setLoading(true);
    axios.get('/api/tenants')
      .then(r => { setTenants(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchCompanies = () => {
    axios.get('/api/companies')
      .then(r => setCompanies(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      await axios.delete(`/api/tenants/${tenantToDelete.id}`);
      toast.success('Tenant deleted');
      setShowDeleteConfirm(false); setTenantToDelete(null);
      fetchTenants();
    } catch { toast.error('Delete failed'); }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(
        filtered.map(t => ({ Code: t.code, Name: t.name, Company: t.company, Property: t.property, Mobile: t.mobile, Email: t.email, Rent: t.currentRent, 'Lease Start': t.leaseStart, 'Lease End': t.leaseEnd, Status: t.agreementStatus })),
        `Tenants_${new Date().toISOString().split('T')[0]}`, 'Tenants'
      );
      toast.success('Exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const mQ = t.name.toLowerCase().includes(q) || t.company.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
    const mM = monthFilter === 'All Months' || (t.leaseStart && new Date(t.leaseStart).getMonth() === parseInt(monthFilter));
    return mQ && mM;
  });

  const activeCount = filtered.filter(t => t.agreementStatus === 'Active').length;
  const rentTotal   = filtered.reduce((a, t) => a + (t.currentRent || 0), 0);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen" style={{ background: '#F4F6FA', padding: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>Tenants</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', fontWeight: 500 }}>Manage Neoteric Properties' leasing records.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={() => navigate('/tenants/create')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', fontFamily: 'inherit' }}>
            <Plus size={15} /> New Tenant
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Tenants',     value: filtered.length,              icon: <Users size={17} color="#f97316" />,     color: '#f97316', bg: '#fff7ed' },
          { label: 'Active Agreements', value: activeCount,                  icon: <ShieldCheck size={17} color="#10b981" />, color: '#10b981', bg: '#f0fdf4' },
          { label: 'Monthly Rent Roll', value: `₹${rentTotal.toLocaleString()}`, icon: <IndianRupee size={17} color="#3b82f6" />, color: '#3b82f6', bg: '#eff6ff' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '0 14px 14px 0', borderLeft: `3px solid ${s.color}`, border: `1px solid #e8edf4`, borderLeftWidth: 3, borderLeftColor: s.color, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: 12, border: '1px solid #e8edf4' }}>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8, height: 40, background: '#f8fafc', border: '1.5px solid #e8edf4', borderRadius: 10, padding: '0 14px' }}>
          <Search size={14} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company or code..."
            style={{ border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', background: 'transparent', flex: 1, fontFamily: 'inherit' }} />
        </div>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          style={{ height: 40, padding: '0 12px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#475569', background: '#f8fafc', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value="All Months">All Lease Starts</option>
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={`${i}`}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>{filtered.length} tenants</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf4', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Code', 'Tenant Name', 'Property', 'Rent', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 18px', textAlign: h === 'Rent' || h === 'Actions' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => <tr key={i}><td colSpan={6} style={{ padding: 16 }}><div style={{ height: 14, background: '#e8edf4', borderRadius: 7 }} /></td></tr>)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <Users size={40} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                  <p style={{ fontSize: 13 }}>No tenants found.</p>
                </td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfd'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}>
                  <td style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#f97316' }}>{t.code}</td>
                  <td style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#f97316', flexShrink: 0 }}>{t.name[0].toUpperCase()}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t.name}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#475569' }}>{t.property}</td>
                  <td style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>₹{t.currentRent.toLocaleString()}</td>
                  <td style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9' }}><StatusBadge status={t.agreementStatus} /></td>
                  <td style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <button onClick={() => { setSelectedTenant(t); setShowDetails(true); navigate(`/tenants/${t.id}`); }}
                        style={{ padding: '5px 12px', background: 'rgba(249,115,22,0.08)', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#f97316', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                        <Eye size={13} /> View
                      </button>
                      <button onClick={() => navigate(`/tenants/edit/${t.id}`)}
                        style={{ padding: '5px 12px', background: '#fffbeb', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#b45309', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                        <Edit2 size={13} /> Edit
                      </button>
                      <button onClick={() => { setTenantToDelete(t); setShowDeleteConfirm(true); }}
                        style={{ padding: '5px 8px', background: '#fff1f2', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#be123c', display: 'flex', alignItems: 'center', fontFamily: 'inherit' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Panels ── */}
      <AnimatePresence>
        {showDetails && selectedTenant && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
            <div style={{ minHeight: '100vh', background: '#F4F6FA' }}>
              <TenantDetailsView
                tenant={selectedTenant}
                companies={companies}
                allTenants={tenants}
                onClose={() => { setShowDetails(false); setSelectedTenant(null); navigate('/tenants'); }}
              />
            </div>
          </div>
        )}
        {showDeleteConfirm && tenantToDelete && (
          <DeleteConfirmationModal
            tenantName={tenantToDelete.name}
            onClose={() => { setShowDeleteConfirm(false); setTenantToDelete(null); }}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
