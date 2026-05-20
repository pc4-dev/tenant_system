import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Eye, Edit2, Trash2, Download, History, MessageSquare,
  Receipt, FileText, TrendingUp, User as UserIcon, Phone, Mail,
  MapPin, IndianRupee, Building, Calendar, Clock, ShieldCheck,
  FileCheck, CheckCircle2, PieChart, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { type Tenant, type Company, type Invoice, type LedgerEntry, type LedgerSummary } from '../../src/types';
import { exportToExcel } from '../../src/lib/exportUtils';
import { StatusBadge, TypeBadge, InvoiceStatusBadge, SummaryItem, TimelineItemLarge, ConfigBlock } from './TenantPrimitives';
import { InvoiceFormModal, ViewInvoiceModal } from './InvoiceModals';
import { OpeningAdjustmentModal, PaymentEntryModal } from './PaymentModals';

// ── Shared card style ─────────────────────────────────────────────────────────
const SC: React.CSSProperties = {
  background: '#fff', borderRadius: 16,
  border: '1px solid #f0f2f5', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const TABS = [
  { id:'overview',  label:'Overview',  icon: PieChart  },
  { id:'ledger',    label:'Ledger',    icon: FileText  },
  { id:'invoices',  label:'Billing',   icon: Receipt   },
  { id:'lease',     label:'Lease',     icon: Calendar  },
  { id:'documents', label:'Documents', icon: FileCheck },
];

// ─────────────────────────────────────────────────────────────────────────────
export function TenantDetailsView({ tenant, onClose, companies, allTenants }: {
  tenant: Tenant; onClose: () => void; companies: Company[]; allTenants: Tenant[];
}) {
  const [details,            setDetails]            = useState<any>(null);
  const [ledgerData,         setLedgerData]         = useState<{ ledger: LedgerEntry[], summary: LedgerSummary } | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [ledgerLoading,      setLedgerLoading]      = useState(true);
  const [activeTab,          setActiveTab]          = useState('overview');
  const [showOpeningAdj,     setShowOpeningAdj]     = useState(false);
  const [selectedInvoice,    setSelectedInvoice]    = useState<Invoice | null>(null);
  const [editingInvoice,     setEditingInvoice]     = useState<Invoice | null>(null);
  const [deletingInvoice,    setDeletingInvoice]    = useState<Invoice | null>(null);
  const [payingInvoice,      setPayingInvoice]      = useState<Invoice | null>(null);
  const [exportingExcel,     setExportingExcel]     = useState(false);
  const [exportingPDF,       setExportingPDF]       = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);

  const lockInExpiry = tenant.leaseStart ? (() => {
    const d = new Date(tenant.leaseStart);
    d.setMonth(d.getMonth() + (tenant.lockIn || 0));
    return d.toISOString().split('T')[0];
  })() : '';

  useEffect(() => { fetchDetails(); fetchLedger(); }, [tenant.id]);

  const fetchDetails = () => {
    setLoading(true);
    axios.get(`/api/tenants/${tenant.id}/details`)
      .then(r => { setDetails(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchLedger = () => {
    setLedgerLoading(true);
    axios.get(`/api/ledger/tenant/${tenant.id}`)
      .then(r => { setLedgerData(r.data); setLedgerLoading(false); })
      .catch(() => setLedgerLoading(false));
  };

  const handleDeleteInvoice = async (id: string) => {
    try { await axios.delete(`/api/invoices/${id}`); setDeletingInvoice(null); fetchDetails(); }
    catch { alert('Failed to delete invoice'); }
  };

  const handleExportExcel = () => {
    if (!ledgerData) return toast.error('Ledger not loaded');
    setExportingExcel(true);
    try {
      exportToExcel(
        [...ledgerData.ledger.map(e => ({ Date: new Date(e.date).toLocaleDateString('en-GB'), Particular: e.particular, Type: e.type, 'Ref No': e.refNo||'-', Debit: e.debit, Credit: e.credit, TDS: e.tds, Balance: e.runningBalance })),
         { Date:'TOTAL', Particular:'', Type:'', 'Ref No':'', Debit: ledgerData.summary.totalInvoiced, Credit: ledgerData.summary.totalReceived, TDS: ledgerData.summary.totalTds, Balance: ledgerData.summary.closingBalance }],
        `Ledger_${tenant.name}_${new Date().toISOString().split('T')[0]}`, 'Ledger'
      );
      toast.success('Exported to Excel');
    } catch { toast.error('Export failed'); }
    finally { setExportingExcel(false); }
  };

  const handleExportPDF = async () => {
    if (!ledgerRef.current) return;
    setExportingPDF(true);
    try {
      const canvas = await html2canvas(ledgerRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth() - 20;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, w, (canvas.height * w) / canvas.width);
      pdf.save(`Ledger_${tenant.name}.pdf`);
      toast.success('PDF exported');
    } catch { toast.error('PDF failed'); }
    finally { setExportingPDF(false); }
  };

  const company = companies.find(c => c.companyName === tenant.company);
  const { invoices = [], paymentSummary = {}, analytics = {} } = details || {};

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:12 }}>
      <Loader2 size={36} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
      <p style={{ fontSize:12, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.1em' }}>Loading tenant data...</p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:'#F5F7FA', minHeight:'100%' }}>

      {/* ── STICKY HEADER (below app topbar at 58px) ── */}
      <div style={{
        position: 'sticky',
        top: 0,          /* App topbar height */
        zIndex: 30,
        background: '#fff',
        borderBottom: '2px solid #f0f2f5',
        borderLeft: '4px solid #f97316',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px' }}>

          {/* Tenant info + buttons */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, paddingBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'rgba(249,115,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#f97316', border:'2px solid rgba(249,115,22,0.15)', flexShrink:0 }}>
                {tenant.name.charAt(0)}
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <h2 style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:0 }}>{tenant.name}</h2>
                  <StatusBadge status={tenant.agreementStatus}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, flexWrap:'wrap' }}>
                  {[
                    { icon:<Building size={9} color="#f97316"/>, val:tenant.company },
                    { icon:<Clock    size={9} color="#f97316"/>, val:tenant.code    },
                  ].map((b,i) => (
                    <span key={i} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, color:'#9ba8b5', background:'#f8f9fb', padding:'2px 7px', borderRadius:5, border:'1px solid #f0f2f5' }}>
                      {b.icon} {b.val}
                    </span>
                  ))}
                  {tenant.gstNo && (
                    <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, color:'#059669', background:'#f0fdf4', padding:'2px 7px', borderRadius:5, border:'1px solid #bbf7d0' }}>
                      <FileText size={9}/> {tenant.gstNo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleExportPDF} disabled={exportingPDF}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#fff', border:'1.5px solid #f0f2f5', borderRadius:9, fontSize:11, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
                {exportingPDF ? <Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/> : <Download size={12}/>} Ledger PDF
              </button>
              <button onClick={onClose}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:9, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                <X size={12}/> Close
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', overflowX:'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'9px 16px', background:'none', border:'none',
                  cursor:'pointer', fontSize:12, fontFamily:'inherit',
                  fontWeight: activeTab===t.id ? 700 : 500,
                  color: activeTab===t.id ? '#f97316' : '#9ba8b5',
                  borderBottom: activeTab===t.id ? '2px solid #f97316' : '2px solid transparent',
                  marginBottom: -2, transition:'all 0.15s', whiteSpace:'nowrap',
                }}>
                <t.icon size={12}/> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'20px 24px 40px' }}>
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="ov" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Stat cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {[
                  { label:'Total Invoiced',  val:paymentSummary.totalInvoiced||0,  color:'#6366f1', bg:'#eef2ff', Icon:Receipt      },
                  { label:'Total Received',  val:paymentSummary.totalReceived||0,  color:'#10b981', bg:'#f0fdf4', Icon:CheckCircle2 },
                  { label:'TDS Deducted',    val:paymentSummary.totalTds||0,       color:'#8b5cf6', bg:'#f5f3ff', Icon:ShieldCheck  },
                  { label:'Pending Balance', val:paymentSummary.pendingBalance||0, color:paymentSummary.pendingBalance>0?'#ef4444':'#10b981', bg:paymentSummary.pendingBalance>0?'#fff1f2':'#f0fdf4', Icon:Clock },
                ].map((s,i) => (
                  <div key={i} style={{ ...SC, borderLeft:`3px solid ${s.color}`, borderRadius:'0 16px 16px 0', padding:'16px 18px' }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                      <s.Icon size={15} color={s.color}/>
                    </div>
                    <div style={{ fontSize:9, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
                    <div style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.5px', marginTop:2 }}>₹{s.val.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Chart + Contact */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:14 }}>
                {/* Chart */}
                <div style={{ ...SC, padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Analytics</p>
                      <p style={{ fontSize:11, color:'#9ba8b5', marginTop:2 }}>Revenue trends — last 6 months</p>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {[{c:'#f97316',l:'Invoiced'},{c:'#10b981',l:'Received'}].map(x => (
                        <span key={x.l} style={{ fontSize:10, fontWeight:600, color:'#9ba8b5', background:'#f8f9fb', padding:'3px 9px', borderRadius:6, display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:x.c, display:'inline-block' }}/>{x.l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ height:210 }}>
                    {analytics.monthlyTrend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.monthlyTrend}>
                          <defs>
                            <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                            <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5"/>
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:10,fontWeight:600,fill:'#9ba8b5'}} dy={6}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fontWeight:600,fill:'#9ba8b5'}} tickFormatter={v=>`₹${v/1000}k`}/>
                          <Tooltip contentStyle={{borderRadius:12,border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.08)',fontSize:12}}/>
                          <Area type="monotone" dataKey="invoiced" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#gi)"/>
                          <Area type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gr)"/>
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#c5cdd6', gap:8 }}>
                        <TrendingUp size={28} strokeWidth={1}/>
                        <p style={{ fontSize:12 }}>Not enough data</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact + GST */}
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ ...SC, padding:16 }}>
                    <p style={{ fontSize:12, fontWeight:800, color:'#1a1a2e', margin:'0 0 10px' }}>Contact Dossier</p>
                    {[
                      { Icon:UserIcon, label:'Contact',   val:tenant.contactPerson          },
                      { Icon:UserIcon, label:'Alternate', val:tenant.alternateContactPerson  },
                      { Icon:Phone,    label:'Mobile',    val:tenant.mobile                  },
                      { Icon:Mail,     label:'Email',     val:tenant.email                   },
                      { Icon:MapPin,   label:'Address',   val:tenant.billingAddress          },
                    ].map((f,i) => (
                      <div key={i} style={{ display:'flex', gap:8, padding:'7px 0', borderBottom:i<4?'1px solid #f8f9fb':'none' }}>
                        <div style={{ width:24, height:24, borderRadius:6, background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <f.Icon size={11} color="#9ba8b5"/>
                        </div>
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:8, fontWeight:700, color:'#c5cdd6', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{f.label}</p>
                          <p style={{ fontSize:11, fontWeight:600, color:'#1a1a2e', margin:'1px 0 0', wordBreak:'break-word' }}>{f.val||'—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...SC, padding:14, background:'rgba(249,115,22,0.03)', border:'1px solid rgba(249,115,22,0.1)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                      <ShieldCheck size={12} color="#f97316"/>
                      <p style={{ fontSize:9, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>GST Compliance</p>
                    </div>
                    <p style={{ fontSize:11, fontWeight:700, color:'#1a1a2e', margin:'0 0 8px' }}>{tenant.legalName||tenant.name}</p>
                    <div style={{ background:'#fff', padding:'4px 10px', borderRadius:7, border:'1px solid rgba(249,115,22,0.12)', display:'inline-block' }}>
                      <p style={{ fontSize:8, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', margin:0 }}>GSTIN</p>
                      <p style={{ fontSize:11, fontWeight:800, color:'#f97316', margin:0 }}>{tenant.gstNo||'Not Provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LEDGER ── */}
          {activeTab === 'ledger' && (
            <motion.div key="ld" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              style={{ ...SC, overflow:'hidden' }} ref={ledgerRef}>
              {/* Ledger header */}
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f8f9fb', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {company?.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ width:36, height:36, borderRadius:8, objectFit:'contain', border:'1px solid #f0f2f5' }} referrerPolicy="no-referrer"/>}
                  <div>
                    <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Ledger</p>
                    <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>Statement for {tenant.name} | {tenant.company}</p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {[
                    { label:'Opening Bal', val:`₹${(ledgerData?.summary.openingBalance||0).toLocaleString()}`, style:{background:'#f8f9fb', border:'1px solid #f0f2f5', color:'#5a6474'} },
                    { label:(ledgerData?.summary.closingBalance||0)<0?'Advance Bal':'Closing Bal', val:`₹${Math.abs(ledgerData?.summary.closingBalance||0).toLocaleString()}`, style:{background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', color:'#f97316'} },
                  ].map((b,i) => (
                    <div key={i} style={{ padding:'8px 14px', borderRadius:10, textAlign:'center', ...b.style }}>
                      <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{b.label}</p>
                      <p style={{ fontSize:13, fontWeight:800, margin:0 }}>{b.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ledger table */}
              <div style={{ overflowX:'auto', maxHeight:'55vh', overflowY:'auto' }}>
                {ledgerLoading ? (
                  <div style={{ padding:60, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                    <Loader2 size={28} color="#f97316" style={{animation:'spin 1s linear infinite'}}/>
                    <p style={{ fontSize:11, color:'#9ba8b5', fontWeight:600 }}>Calculating Ledger...</p>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead style={{ position:'sticky', top:0, background:'#f8f9fb', zIndex:5 }}>
                      <tr>
                        {['Date','Particular','Ref No.','Debit','Credit','TDS','Running Balance'].map((h,i) => (
                          <th key={h} style={{ padding:'10px 16px', fontSize:9, fontWeight:800, color:['','','','#1a1a2e','#10b981','#8b5cf6','#1a1a2e'][i]||'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f0f2f5', textAlign:i>=3?'right':'left', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!ledgerData?.ledger.length ? (
                        <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#9ba8b5', fontSize:13 }}>No ledger entries found.</td></tr>
                      ) : ledgerData.ledger.map(e => (
                        <tr key={e.id} style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.1s' }}
                          onMouseEnter={el=>(el.currentTarget as HTMLElement).style.background='#fafbfc'}
                          onMouseLeave={el=>(el.currentTarget as HTMLElement).style.background='transparent'}>
                          <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#9ba8b5', whiteSpace:'nowrap' }}>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                          <td style={{ padding:'11px 16px' }}>
                            <p style={{ fontSize:12, fontWeight:700, color:'#1a1a2e', margin:0 }}>{e.particular}</p>
                            <TypeBadge type={e.type}/>
                            {e.notes && <span style={{ fontSize:10, color:'#9ba8b5', fontStyle:'italic' }}> "{e.notes}"</span>}
                          </td>
                          <td style={{ padding:'11px 16px', fontSize:11, color:'#9ba8b5' }}>{e.refNo?`#${e.refNo}`:'-'}</td>
                          <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#1a1a2e', textAlign:'right' }}>{e.debit>0?`₹${e.debit.toLocaleString()}`:'-'}</td>
                          <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right' }}>{e.credit>0?`₹${e.credit.toLocaleString()}`:'-'}</td>
                          <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#8b5cf6', textAlign:'right' }}>{e.tds>0?`₹${e.tds.toLocaleString()}`:'-'}</td>
                          <td style={{ padding:'11px 16px', fontSize:12, fontWeight:800, textAlign:'right', color:e.runningBalance<0?'#3b82f6':'#1a1a2e' }}>
                            ₹{Math.abs(e.runningBalance||0).toLocaleString()} {e.runningBalance<0?'Cr':'Dr'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Ledger footer */}
              <div style={{ padding:'14px 20px', background:'#fafbfc', borderTop:'1px solid #f0f2f5', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', gap:16 }}>
                  {[
                    {l:'Invoiced',  v:ledgerData?.summary.totalInvoiced,   c:'#1a1a2e'},
                    {l:'Received',  v:ledgerData?.summary.totalReceived,   c:'#10b981'},
                    {l:'TDS',       v:ledgerData?.summary.totalTds,        c:'#8b5cf6'},
                    {l:'Balance',   v:Math.abs(ledgerData?.summary.closingBalance||0), c:'#f97316'},
                  ].map((s,i) => (
                    <div key={i}>
                      <p style={{ fontSize:9, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', margin:0 }}>{s.l}</p>
                      <p style={{ fontSize:13, fontWeight:800, color:s.c, margin:0 }}>₹{(s.v||0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setShowOpeningAdj(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, fontSize:11, fontWeight:700, color:'#b45309', cursor:'pointer', fontFamily:'inherit' }}>
                    <Plus size={12}/> Adjustment
                  </button>
                  <button onClick={handleExportExcel} disabled={exportingExcel} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#fff', border:'1.5px solid #f0f2f5', borderRadius:9, fontSize:11, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
                    {exportingExcel?<Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/>:<Download size={12}/>} Excel
                  </button>
                  <button onClick={handleExportPDF} disabled={exportingPDF} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:9, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    {exportingPDF?<Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/>:<FileText size={12}/>} PDF
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── BILLING ── */}
          {activeTab === 'invoices' && (
            <motion.div key="inv" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              style={{ ...SC, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f8f9fb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Billing History</p>
                  <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>Complete record of generated invoices</p>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <InvoiceStatusBadge status="Paid"/><InvoiceStatusBadge status="Partial"/><InvoiceStatusBadge status="Pending"/>
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8f9fb' }}>
                      {['Inv No.','Bill Date','Total','Received','TDS','Balance','Status','Actions'].map((h,i)=>(
                        <th key={h} style={{ padding:'10px 16px', fontSize:9, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f0f2f5', textAlign:i>=2&&i<=5?'right':'left', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length===0 ? (
                      <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#9ba8b5', fontSize:13 }}>No billing records found.</td></tr>
                    ) : invoices.map((inv: Invoice) => (
                      <tr key={inv.id} style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.1s' }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#fafbfc'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                        <td style={{ padding:'11px 16px', fontSize:11, fontWeight:700, color:'#9ba8b5' }}>#{inv.invoiceNo}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{inv.billDate}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#1a1a2e', textAlign:'right' }}>₹{inv.totalInvoice?.toLocaleString()}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right' }}>₹{(inv.receivedAmount||inv.received||0).toLocaleString()}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#8b5cf6', textAlign:'right' }}>₹{(inv.tdsAmount||0).toLocaleString()}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#ef4444', textAlign:'right' }}>₹{(inv.balanceAmount||inv.balance||0).toLocaleString()}</td>
                        <td style={{ padding:'11px 16px' }}><InvoiceStatusBadge status={inv.paymentStatus}/></td>
                        <td style={{ padding:'11px 16px' }}>
                          <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                            <button onClick={()=>setPayingInvoice(inv)} style={{ padding:'4px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:700, color:'#15803d', display:'flex', alignItems:'center', gap:3, fontFamily:'inherit' }}><Plus size={11}/> Pay</button>
                            <button onClick={()=>setSelectedInvoice(inv)} style={{ padding:'4px 8px', background:'#f8f9fb', border:'1px solid #f0f2f5', borderRadius:6, cursor:'pointer', color:'#5a6474', display:'flex', alignItems:'center', fontFamily:'inherit' }}><Eye size={12}/></button>
                            <button onClick={()=>setEditingInvoice(inv)} style={{ padding:'4px 8px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, cursor:'pointer', color:'#b45309', display:'flex', alignItems:'center', fontFamily:'inherit' }}><History size={12}/></button>
                            <button onClick={()=>setDeletingInvoice(inv)} style={{ padding:'4px 8px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:6, cursor:'pointer', color:'#e11d48', display:'flex', alignItems:'center', fontFamily:'inherit' }}><Trash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── LEASE ── */}
          {activeTab === 'lease' && (
            <motion.div key="ls" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ ...SC, padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}><Clock size={15} color="#f97316"/></div>
                  <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Lease Roadmap</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <TimelineItemLarge label="Lease Commencement" date={tenant.leaseStart} desc="Initial move-in and rent start date" active/>
                  <TimelineItemLarge label="Lock-in Period Ends" date={lockInExpiry} desc="Minimum commitment period ends"/>
                  <TimelineItemLarge label="Lease Expiration" date={tenant.leaseEnd} desc="Agreement renewal or termination" danger/>
                </div>
              </div>
              <div style={{ ...SC, padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}><IndianRupee size={15} color="#10b981"/></div>
                  <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Configuration</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    ['Monthly Rent',      `₹${tenant.currentRent?.toLocaleString()}`, true ],
                    ['Security Deposit',  `₹${tenant.securityDeposit?.toLocaleString()}`, true],
                    ['Rent-Free Period',  `${tenant.rentFreePeriodDays} Days`, false],
                    ['Notice Period',     `${tenant.noticePeriod} Days`, false],
                    ['Lease Tenure',      `${tenant.tenure} Months`, false],
                    ['Lock-in Period',    `${tenant.lockIn} Months`, false],
                    ['Escalation',        `${tenant.escalationPercent}%`, false],
                    ['Purpose',           tenant.rentalPurpose||'—', false],
                  ].map(([l,v,h])=><ConfigBlock key={l as string} label={l as string} value={v as string} highlight={h as boolean}/>)}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (
            <motion.div key="doc" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              {tenant.agreementFileUrl ? (
                <div style={{ ...SC, padding:24, maxWidth:360, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' }}>
                  <div style={{ width:56, height:56, borderRadius:14, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}><FileCheck size={26} color="#10b981"/></div>
                  <div>
                    <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Lease Agreement</p>
                    <p style={{ fontSize:11, color:'#9ba8b5', marginTop:4 }}>Digital scanned copy of original contract</p>
                  </div>
                  <div style={{ display:'flex', gap:10, width:'100%' }}>
                    <a href={tenant.agreementFileUrl} target="_blank" style={{ flex:1, padding:'9px', background:'#f8f9fb', color:'#5a6474', borderRadius:9, fontWeight:600, fontSize:12, textAlign:'center', textDecoration:'none', border:'1px solid #f0f2f5' }}>Preview</a>
                    <a href={tenant.agreementFileUrl} download style={{ flex:1, padding:'9px', background:'#10b981', color:'#fff', borderRadius:9, fontWeight:700, fontSize:12, textAlign:'center', textDecoration:'none' }}>Download</a>
                  </div>
                </div>
              ) : (
                <div style={{ ...SC, padding:40, maxWidth:300, display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center', border:'2px dashed #f0f2f5', background:'transparent' }}>
                  <FileText size={32} color="#e0e4ea"/>
                  <p style={{ fontSize:13, fontWeight:600, color:'#9ba8b5', margin:0 }}>No documents uploaded</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {payingInvoice    && <PaymentEntryModal invoice={payingInvoice} onClose={()=>setPayingInvoice(null)} onSuccess={()=>{setPayingInvoice(null);fetchDetails();}}/>}
        {selectedInvoice  && <ViewInvoiceModal invoice={selectedInvoice} tenant={tenant} company={companies.find(c=>c.id===selectedInvoice.companyId||c.companyName===selectedInvoice.company)} onClose={()=>setSelectedInvoice(null)}/>}
        {editingInvoice   && <InvoiceFormModal initialData={editingInvoice} tenants={allTenants} companies={companies} onClose={()=>setEditingInvoice(null)} onSuccess={()=>{setEditingInvoice(null);fetchDetails();}}/>}
        {showOpeningAdj   && <OpeningAdjustmentModal tenant={tenant} onClose={()=>setShowOpeningAdj(false)} onSuccess={()=>{setShowOpeningAdj(false);fetchLedger();fetchDetails();}}/>}
        {deletingInvoice  && (
          <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
            <motion.div initial={{scale:0.95}} animate={{scale:1}} style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:360, width:'100%', textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'#fff1f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}><Trash2 size={22} color="#e11d48"/></div>
              <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:'0 0 8px' }}>Delete Invoice?</p>
              <p style={{ fontSize:12, color:'#9ba8b5', margin:'0 0 20px' }}>Invoice <strong>#{deletingInvoice.invoiceNo}</strong> will be permanently removed.</p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setDeletingInvoice(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #f0f2f5', background:'#fff', fontSize:13, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                <button onClick={()=>handleDeleteInvoice(deletingInvoice.id as string)} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
