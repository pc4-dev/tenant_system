import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ReceiptIndianRupee, FileText,
  Building2, Settings, ChevronDown, ChevronRight,
  Home, BarChart2, FileCheck, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Nav Structure ─────────────────────────────────────────────────────────────
const NAV = [
  {
    group: 'Main',
    items: [
      { title: 'Dashboard',  icon: LayoutDashboard, path: '/'         },
      { title: 'Tenants',    icon: Users,           path: '/tenants'  },
      { title: 'Invoices',   icon: ReceiptIndianRupee, path: '/invoices'},
      { title: 'Reports',    icon: FileText,        path: '/reports'  },
    ]
  },
  {
    group: 'Configuration',
    items: [
      { title: 'Companies',  icon: Building2,  path: '/companies' },
      { title: 'Settings',   icon: Settings,   path: '/settings'  },
    ]
  }
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface SidebarProps {
  open:      boolean;
  onClose:   () => void;
  isMobile:  boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Sidebar({ open, onClose, isMobile }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  const sidebarWidth = isMobile ? 260 : (open ? 240 : 68);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth, x: isMobile && !open ? -260 : 0 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        style={{
          background:    '#ffffff',
          borderRight:   '1px solid #f0f2f5',
          display:       'flex',
          flexDirection: 'column',
          zIndex:        50,
          flexShrink:    0,
          overflow:      'hidden',
          position:      isMobile ? 'fixed' : 'relative',
          top: 0, bottom: 0, left: 0,
          boxShadow:     isMobile && open ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {/* ── Logo ── */}
        <div style={{
          padding:       '16px 18px',
          borderBottom:  '1px solid #f5f6f8',
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          height:        64,
          flexShrink:    0,
        }}>
          {/* Nexora N logo */}
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#f97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>N</span>
          </div>

          {(open || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden' }}
            >
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', margin: 0, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                Neoteric Properties
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontWeight: 500, whiteSpace: 'nowrap' }}>
                Company Portal
              </p>
            </motion.div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
          {NAV.map(group => (
            <div key={group.group}>
              {/* Group Label */}
              {(open || isMobile) && (
                <p style={{
                  fontSize: 9, fontWeight: 800, color: '#c8cdd5',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  padding: '14px 20px 5px', margin: 0,
                }}>
                  {group.group}
                </p>
              )}
              {!open && !isMobile && <div style={{ height: 12 }} />}

              {group.items.map(item => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!open && !isMobile ? item.title : undefined}
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        10,
                      padding:    !open && !isMobile ? '9px 0' : '8px 14px',
                      margin:     '1px 8px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      justifyContent: !open && !isMobile ? 'center' : 'flex-start',
                      background:  active ? 'rgba(249,115,22,0.07)' : 'transparent',
                      borderLeft:  active ? '3px solid #f97316' : '3px solid transparent',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {/* Icon */}
                    <item.icon
                      size={17}
                      color={active ? '#f97316' : '#9ba8b5'}
                      style={{ flexShrink: 0 }}
                    />

                    {/* Label */}
                    {(open || isMobile) && (
                      <span style={{
                        fontSize:   13,
                        fontWeight: active ? 700 : 500,
                        color:      active ? '#f97316' : '#5a6474',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </span>
                    )}

                    {/* Active dot (collapsed) */}
                    {!open && !isMobile && active && (
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#f97316',
                        position: 'absolute', right: 6, top: '50%',
                        transform: 'translateY(-50%)',
                      }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        {(open || isMobile) && (
          <div style={{
            padding:     '14px 18px',
            borderTop:   '1px solid #f5f6f8',
            flexShrink:  0,
          }}>
            {/* User Row */}
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         10,
              padding:     '8px 10px',
              background:  '#fafafa',
              borderRadius: 10,
              border:      '1px solid #f0f2f5',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: '#f97316',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                AD
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', margin: 0, whiteSpace: 'nowrap' }}>Admin</p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Super Admin</p>
              </div>
            </div>
            <p style={{ fontSize: 9, color: '#d1d5db', textAlign: 'center', marginTop: 10, fontWeight: 600, letterSpacing: '0.1em' }}>
              v2.4.0 RELEASE
            </p>
          </div>
        )}

        {/* Collapsed footer avatar */}
        {!open && !isMobile && (
          <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid #f5f6f8', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
              AD
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
}
