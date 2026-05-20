import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Users, 
  ReceiptIndianRupee, 
  Building2,
  Settings, 
  Menu, 
  X, 
  Bell, 
  User,
  ChevronRight,
  LogOut,
  Plus,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// Components
import Dashboard from '../pages/Dashboard';
import TenantList from '../pages/Tenants';
import TenantFormPage from '../pages/TenantFormPage';
import InvoiceList from '../pages/Invoices';
import CompanyList from '../pages/Companies';
import Reports from '../pages/Reports';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [dbStatus, setDbStatus] = useState<{ isDemo: boolean; database: string } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(setDbStatus)
      .catch(() => setDbStatus({ isDemo: true, database: 'Failed to check' }));

    // On mobile, close sidebar on route change
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { title: 'Tenants', icon: Users, path: '/tenants' },
    { title: 'Invoices', icon: ReceiptIndianRupee, path: '/invoices' },
    { title: 'Reports', icon: FileText, path: '/reports' },
    { title: 'Companies', icon: Building2, path: '/companies' },
    { title: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-bg-light overflow-hidden flex-col">
      <Toaster position="top-right" />
      {/* System Warning Banner */}
      {dbStatus?.isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-3 text-[10px] md:text-[11px] text-amber-800 font-medium">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="hidden xs:inline">DEMO MODE ACTIVE</span>
          </div>
          <span className="opacity-40 hidden xs:inline">|</span>
          <p className="truncate">MongoDB Atlas connection failed. Check whitelist.</p>
          <a 
            href="https://cloud.mongodb.com" 
            target="_blank" 
            rel="noreferrer"
            className="underline hover:text-amber-950 ml-1 shrink-0"
          >
            Atlas →
          </a>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {isSidebarOpen && window.innerWidth <= 1024 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-[40] lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: isSidebarOpen ? (window.innerWidth <= 1024 ? 260 : 240) : (window.innerWidth <= 1024 ? 0 : 72),
            x: isSidebarOpen || window.innerWidth > 1024 ? 0 : -260
          }}
          className={cn(
            "bg-sidebar text-white flex flex-col transition-all duration-300 z-50 overflow-hidden shrink-0",
            window.innerWidth <= 1024 ? "fixed inset-y-0 left-0" : "relative"
          )}
        >
          <div className="p-6 pb-2 flex items-center justify-between">
            <div className="text-xl font-extrabold text-primary tracking-tighter">
              {(isSidebarOpen || window.innerWidth <= 1024) ? 'NEOTERIC' : 'N'}
            </div>
            {window.innerWidth <= 1024 && (
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="flex-1 mt-6">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "nav-item group relative flex items-center gap-3 px-6 py-3",
                  location.pathname === item.path && "nav-item-active"
                )}
              >
                <item.icon size={18} className="shrink-0" />
                {(isSidebarOpen || window.innerWidth <= 1024) && (
                  <span className="font-medium whitespace-nowrap">{item.title}</span>
                )}
              </Link>
            ))}
          </nav>

          {(isSidebarOpen || window.innerWidth <= 1024) && (
            <div className="p-6 border-t border-white/5 opacity-50 text-[10px] tracking-wider">
              {isSidebarOpen ? 'v2.4.0 RELEASE' : 'V2'}
            </div>
          )}
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Topbar */}
          <header className="h-14 bg-white border-b border-border-card flex items-center justify-between px-4 md:px-6 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)] w-full">
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center text-sm overflow-hidden truncate">
                <span className="text-slate-400 hidden xs:inline">Dashboard / </span>
                <span className="text-text-main font-bold capitalize ml-1 truncate">
                  {location.pathname === '/' ? 'Overview' : location.pathname.substring(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-100 border border-border-card rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs text-text-main shrink-0">
                  AD
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/companies" element={<CompanyList />} />
              <Route path="/tenants" element={<TenantList />} />
              <Route path="/tenants/create" element={<TenantFormPage />} />
              <Route path="/tenants/edit/:id" element={<TenantFormPage />} />
              <Route path="/tenants/:id" element={<TenantList />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<div className="p-20 text-center text-slate-400">Page under construction...</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
