import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu, Bell, ChevronRight, Settings } from 'lucide-react';
import { motion } from 'motion/react';

// ── Sidebar Component ─────────────────────────────────────────────────────────
import Sidebar from '../components/Sidebar';

// ── Pages ─────────────────────────────────────────────────────────────────────
import Dashboard    from '../pages/Dashboard';
import TenantList   from '../pages/Tenants';
import TenantFormPage from '../pages/TenantFormPage';
import InvoiceList  from '../pages/Invoices';
import CompanyList  from '../pages/Companies';
import Reports      from '../pages/Reports';

// ── Page title map ────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/':          'Overview',
  '/tenants':   'Tenants',
  '/invoices':  'Invoices',
  '/reports':   'Reports',
  '/companies': 'Companies',
  '/settings':  'Settings',
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 1024);
  const [dbStatus,    setDbStatus]    = useState<{ isDemo: boolean } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch('/api/status').then(r => r.json()).then(setDbStatus).catch(() => setDbStatus({ isDemo: true }));
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = PAGE_TITLES[location.pathname]
    || (location.pathname.startsWith('/tenants') ? 'Tenants' : location.pathname.replace('/', '').replace(/-/g, ' ') || 'Overview');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F7FA', overflow: 'hidden', flexDirection: 'column' }}>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: 'system-ui,sans-serif', fontSize: 13, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }
      }}/>

      {/* ── Demo Banner ── */}
      {dbStatus?.isDemo && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 11, color: '#92400e', fontWeight: 600, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }}/>
          DEMO MODE — MongoDB not connected.
          <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" style={{ color: '#b45309', textDecoration: 'underline' }}>Configure Atlas →</a>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        {/* ── Main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* ── Topbar ── */}
          <header style={{
            height:       58,
            background:   '#ffffff',
            borderBottom: '1px solid #f0f2f5',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            padding:      '0 20px',
            flexShrink:   0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, display: 'flex', color: '#9ba8b5', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f5f7fa'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <Menu size={19} />
              </button>

              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ color: '#9ba8b5', fontWeight: 500 }}>Neoteric Properties</span>
                <ChevronRight size={13} color="#d1d5db" />
                <span style={{ color: '#1a1a2e', fontWeight: 700, textTransform: 'capitalize' }}>{pageTitle}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Team avatars */}
              
              

              {/* Bell */}
              <div style={{ position: 'relative' }}>
                <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #f0f2f5', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Bell size={16} color="#9ba8b5" />
                </button>
                <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }} />
              </div>

              {/* Avatar */}
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 6px rgba(249,115,22,0.25)' }}>
                AD
              </div>
            </div>
          </header>

          {/* ── Content ── */}
          <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
            <Routes>
              <Route path="/"                 element={<Dashboard />} />
              <Route path="/companies"        element={<CompanyList />} />
              <Route path="/tenants"          element={<TenantList />} />
              <Route path="/tenants/create"   element={<TenantFormPage />} />
              <Route path="/tenants/edit/:id" element={<TenantFormPage />} />
              <Route path="/tenants/:id"      element={<TenantList />} />
              <Route path="/invoices"         element={<InvoiceList />} />
              <Route path="/reports"          element={<Reports />} />
              <Route path="*" element={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#9ba8b5' }}>
                  <Settings size={40} strokeWidth={1} />
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Page under construction</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
