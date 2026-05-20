import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Eye, Edit2, Trash2, Download, History, MessageSquare,
  Receipt, FileText, TrendingUp, ArrowUpRight, ArrowDownRight,
  User as UserIcon, Phone, Mail, MapPin, IndianRupee, Building,
  Calendar, Clock, ShieldCheck, FileCheck, CheckCircle2, PieChart,
  ChevronRight, MoreHorizontal, Filter, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { type Tenant, type Company, type Invoice, type LedgerEntry, type LedgerSummary } from '../../src/types';
import { exportToExcel } from '../../src/lib/exportUtils';
import {
  StatusBadge, TypeBadge, InvoiceStatusBadge, InfoField, SummaryItem,
  TimelineItem, TimelineItemLarge, ConfigBlock, ProfileItem, SummaryCard,
  TabButton, TabsNavItem, StatCard, DossierItem
} from './TenantPrimitives';
import { InvoiceFormModal, ViewInvoiceModal } from './InvoiceModals';
import { OpeningAdjustmentModal, PaymentEntryModal } from './PaymentModals';


export function TenantDetailsView({ tenant, onClose, companies, allTenants }: { tenant: Tenant, onClose: () => void, companies: Company[], allTenants: Tenant[] }) {
  const [details, setDetails] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<{ ledger: LedgerEntry[], summary: LedgerSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showOpeningAdjustment, setShowOpeningAdjustment] = useState(false);

  // Internal Invoice states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);

  const lockInExpiryDate = tenant.leaseStart ? (() => {
    const d = new Date(tenant.leaseStart);
    d.setMonth(d.getMonth() + (tenant.lockIn || 0));
    return d.toISOString().split('T')[0];
  })() : '';

  const handleExportLedgerExcel = () => {
    setExportingExcel(true);
    try {
      if (!ledgerData) {
        toast.error('Ledger data not loaded');
        return;
      }

      const dataToExport = ledgerData.ledger.map((entry) => {
        return {
          'Date': new Date(entry.date).toLocaleDateString('en-GB'),
          'Particular': entry.particular,
          'Type': entry.type.replace('_', ' '),
          'Ref No.': entry.refNo || '-',
          'Debit': entry.debit,
          'Credit': entry.credit,
          'TDS': entry.tds,
          'Balance': entry.runningBalance
        };
      });

      // Add summary row
      dataToExport.push({
        'Date': 'TOTAL',
        'Particular': '',
        'Type': '',
        'Ref No.': '',
        'Debit': ledgerData.summary.totalInvoiced,
        'Credit': ledgerData.summary.totalReceived,
        'TDS': ledgerData.summary.totalTds,
        'Balance': ledgerData.summary.closingBalance
      });
      
      exportToExcel(dataToExport, `Ledger_${tenant.name}_${new Date().toISOString().split('T')[0]}`, 'Ledger');
      toast.success('Ledger exported to Excel');
    } catch (error) {
      toast.error('Excel Export Failed');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportLedgerPDF = async () => {
    if (!ledgerRef.current) return;
    setExportingPDF(true);
    try {
      const canvas = await html2canvas(ledgerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(l => l.remove());
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
             * { color: #000000 !important; color-scheme: light !important; }
             .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
             .backdrop-blur-md, .backdrop-blur-sm { backdrop-filter: none !important; }
             .bg-primary { background-color: #FB923C !important; color: white !important; }
             th { background-color: #f8fafc !important; border-bottom: 2px solid #e2e8f0 !important; }
          `;
          clonedDoc.head.appendChild(style);
          const all = clonedDoc.querySelectorAll('*');
          all.forEach((el: any) => {
            const styles = el.getAttribute('style') || '';
            if (styles.includes('okl')) {
               el.setAttribute('style', styles.replace(/okl(ch|ab)\s*\([^)]+\)/g, '#000000'));
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Ledger_${tenant.name}.pdf`);
      toast.success('Ledger exported to PDF');
    } catch (error) {
      toast.error('PDF Export Failed');
    } finally {
      setExportingPDF(false);
    }
  };

  const fetchDetails = () => {
    setLoading(true);
    axios.get(`/api/tenants/${tenant.id}/details`)
      .then(res => {
        setDetails(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching tenant details:', err);
        setLoading(false);
      });
  };

  const fetchLedger = () => {
    setLedgerLoading(true);
    axios.get(`/api/ledger/tenant/${tenant.id}`)
      .then(res => {
        setLedgerData(res.data);
        setLedgerLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ledger:', err);
        setLedgerLoading(false);
      });
  };

  const company = companies.find(c => c.companyName === tenant.company);

  useEffect(() => {
    fetchDetails();
    fetchLedger();
  }, [tenant.id]);

  const handleDeleteInvoice = async (id: string) => {
    try {
      await axios.delete(`/api/invoices/${id}`);
      setDeletingInvoice(null);
      fetchDetails(); // Refresh list after delete
    } catch (err) {
      console.error(err);
      alert('Failed to delete invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <h3 className="text-xl font-black text-slate-800">Compiling Tenant Dossier...</h3>
        <p className="text-sm font-medium text-slate-400 mt-2">Retrieving all financial and legal records.</p>
      </div>
    );
  }

  const { invoices = [], paymentSummary = {}, analytics = {} } = details || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 0 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 0 }}
      className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-0 space-y-8 pb-10"
    >
      {/* Workspace Header - Flush modern header */}
      <div className="bg-white border-b border-slate-200 -mx-4 md:-mx-6 lg:-mx-8 -mt-0 pt-8 px-8 pb-0 relative overflow-hidden flex flex-col gap-6">
        {/* Abstract background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[28px] flex items-center justify-center font-black text-3xl text-primary shadow-inner shrink-0 ring-4 ring-white">
              {tenant.name.charAt(0)}
            </div>
            <div className="text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{tenant.name}</h2>
                <StatusBadge status={tenant.agreementStatus} />
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                  <Building size={12} className="text-primary" /> {tenant.company}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                  <Clock size={12} className="text-primary" /> ID: {tenant.code}
                </span>
                {tenant.gstNo && (
                   <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-emerald-50/50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100">
                    <FileText size={12} /> {tenant.gstNo}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 pb-2 md:pb-0">
            <button 
              onClick={handleExportLedgerPDF}
              disabled={exportingPDF}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {exportingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Ledger PDF
            </button>
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg flex items-center gap-2"
            >
              <X size={14} />
              Close
            </button>
          </div>
        </div>

        {/* Integrated Tabs */}
        <div className="relative z-10 mt-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2">
            <TabsNavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" icon={PieChart} />
            <TabsNavItem active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label="Ledger" icon={FileText} />
            <TabsNavItem active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} label="Billing" icon={Receipt} />
            <TabsNavItem active={activeTab === 'lease'} onClick={() => setActiveTab('lease')} label="Lease" icon={Calendar} />
            <TabsNavItem active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} label="Documents" icon={FileCheck} />
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="min-h-[500px] px-1 md:px-0 pt-4">
        <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    label="Total Invoiced" 
                    value={paymentSummary.totalInvoiced || 0} 
                    icon={Receipt} 
                    color="blue"
                  />
                  <StatCard 
                    label="Total Received" 
                    value={paymentSummary.totalReceived || 0} 
                    icon={CheckCircle2} 
                    color="emerald"
                  />
                  <StatCard 
                    label="Total TDS" 
                    value={paymentSummary.totalTds || 0} 
                    icon={ShieldCheck} 
                    color="purple"
                  />
                  <StatCard 
                    label="Pending Balance" 
                    value={paymentSummary.pendingBalance || 0} 
                    icon={Clock} 
                    color="rose"
                    isAlert={paymentSummary.pendingBalance > 0}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Analytics Section */}
                  <div className="lg:col-span-8 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800">Financial Analytics</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue Trends (6 Months)</p>
                    </div>
                    <div className="h-[350px] w-full">
                      {analytics.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.monthlyTrend}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FB923C" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#FB923C" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                              tickFormatter={(val) => `₹${val/1000}k`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                padding: '12px'
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="invoiced" 
                              stroke="#FB923C" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorValue)" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="received" 
                              stroke="#10B981" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorValue)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-bold italic">
                          Not enough transaction data for analytics.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Dossier */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                      <h3 className="text-xl font-bold text-slate-800">Contact Dossier</h3>
                      <div className="space-y-6">
                        <DossierItem label="Contact Person" value={tenant.contactPerson} icon={UserIcon} />
                        <DossierItem label="Alternate Contact" value={tenant.alternateContactPerson} icon={UserIcon} />
                        <DossierItem label="Mobile Number" value={tenant.mobile} icon={Phone} />
                        <DossierItem label="Email Address" value={tenant.email} icon={Mail} />
                        <DossierItem label="Billing Address" value={tenant.billingAddress} icon={MapPin} isAddress />
                      </div>
                    </div>

                    <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/10 space-y-4">
                      <h4 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} /> GST Compliance
                      </h4>
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Registered Entity Name</p>
                        <p className="text-sm font-black text-slate-800">{tenant.legalName || tenant.name}</p>
                      </div>
                      <div className="pt-2">
                         <div className="px-4 py-2 bg-white rounded-xl border border-primary/10 inline-block">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">GST Number</p>
                           <p className="text-xs font-black text-primary tracking-widest">{tenant.gstNo || 'Not Provided'}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div 
                key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col"
                ref={ledgerRef}
              >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                  <div className="flex items-center gap-4">
                    {company?.logoUrl && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 bg-white">
                        <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Financial Ledger</h3>
                      <p className="text-xs text-slate-400 font-medium">Statement for {tenant.name} | {tenant.company}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 print:hidden">
                     <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opening Bal</span>
                        <span className="text-sm font-black text-slate-700">₹{ledgerData?.summary.openingBalance?.toLocaleString() || '0.00'}</span>
                     </div>
                     <div className="px-6 py-3 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{ledgerData?.summary.closingBalance && ledgerData.summary.closingBalance < 0 ? 'Advance Bal' : 'Closing Bal'}</span>
                        <span className="text-sm font-black text-primary">₹{Math.abs(ledgerData?.summary.closingBalance || 0).toLocaleString()}</span>
                     </div>
                  </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar">
                  {ledgerLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Calculating Ledger...</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-20 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Date</th>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Particular</th>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ref No.</th>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-slate-800 uppercase tracking-widest text-right">Debit</th>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest text-right">Credit</th>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-purple-600 uppercase tracking-widest text-right">TDS</th>
                          <th className="px-8 py-5 text-[10px] font-extrabold text-slate-800 uppercase tracking-widest text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {!ledgerData || ledgerData.ledger.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                              No ledger entries found.
                            </td>
                          </tr>
                        ) : ledgerData.ledger.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-8 py-5 text-sm font-bold text-slate-400">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                             <td className="px-8 py-5">
                                <p className="text-sm font-bold text-slate-700">{entry.particular}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <TypeBadge type={entry.type} />
                                  {entry.notes && <span className="text-[10px] text-slate-400 italic">"{entry.notes}"</span>}
                                </div>
                             </td>
                             <td className="px-8 py-5 text-xs font-bold text-slate-400">{entry.refNo ? `#${entry.refNo}` : '-'}</td>
                             <td className="px-8 py-5 text-sm font-bold text-slate-800 text-right">
                                {entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}
                             </td>
                             <td className="px-8 py-5 text-sm font-bold text-emerald-600 text-right">
                                {entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}
                             </td>
                             <td className="px-8 py-5 text-sm font-bold text-purple-600 text-right">
                                {entry.tds > 0 ? `₹${entry.tds.toLocaleString()}` : '-'}
                             </td>
                             <td className={`px-8 py-5 text-sm font-black text-right ${entry.runningBalance < 0 ? 'text-blue-600' : 'text-slate-800'}`}>
                                ₹{Math.abs(entry.runningBalance || 0).toLocaleString()} {entry.runningBalance < 0 ? 'Cr' : 'Dr'}
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 w-full md:w-auto">
                     <SummaryItem label="Invoiced" value={ledgerData?.summary.totalInvoiced} color="slate" />
                     <SummaryItem label="Adjusted" value={ledgerData?.summary.totalAdjustments} color="amber" />
                     <SummaryItem label="Received" value={ledgerData?.summary.totalReceived} color="emerald" />
                     <SummaryItem label="Total TDS" value={ledgerData?.summary.totalTds} color="purple" />
                     <SummaryItem 
                       label={ledgerData?.summary.closingBalance && ledgerData.summary.closingBalance < 0 ? 'Advance' : 'Balance'} 
                       value={Math.abs(ledgerData?.summary.closingBalance || 0)} 
                       color={ledgerData?.summary.closingBalance && ledgerData.summary.closingBalance < 0 ? 'blue' : 'primary'} 
                     />
                  </div>
                  <div className="flex flex-wrap gap-3">
                     <button 
                       onClick={() => setShowOpeningAdjustment(true)}
                       className="px-5 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2"
                     >
                        <Plus size={14} /> 
                        Adjustment
                     </button>
                     <button 
                       onClick={handleExportLedgerExcel}
                       disabled={exportingExcel}
                       className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                     >
                        {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                        Download Excel
                     </button>
                     <button 
                       onClick={handleExportLedgerPDF}
                       disabled={exportingPDF}
                       className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                     >
                        {exportingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} 
                        Generate PDF
                     </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'invoices' && (
              <motion.div 
                key="invoices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Billing History</h3>
                    <p className="text-xs text-slate-400 font-medium">Complete record of generated invoices</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase mr-2">Status Key:</span>
                    <InvoiceStatusBadge status="Paid" />
                    <InvoiceStatusBadge status="Partial" />
                    <InvoiceStatusBadge status="Pending" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inv No.</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill Date</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Invoice</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Received</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">TDS</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Balance</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                            No billing records found for this tenant.
                          </td>
                        </tr>
                      ) : invoices.map((inv: Invoice) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 text-sm font-bold text-slate-400">#{inv.invoiceNo}</td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-700">{inv.billDate}</td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-700 text-right">₹{inv.totalInvoice?.toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-bold text-emerald-600 text-right">₹{(inv.receivedAmount || inv.received || 0).toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-bold text-purple-600 text-right">₹{(inv.tdsAmount || 0).toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-bold text-rose-500 text-right">₹{(inv.balanceAmount || inv.balance || 0).toLocaleString()}</td>
                          <td className="px-8 py-5 text-center">
                            <InvoiceStatusBadge status={inv.paymentStatus} />
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1" title="Add Payment" onClick={() => setPayingInvoice(inv)}>
                                  <Plus size={14} />
                                  <span className="text-[10px] font-bold uppercase">Payment</span>
                                </button>
                                <button 
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" 
                                  title="WhatsApp Reminder" 
                                  onClick={() => {
                                    const msg = `Hi ${tenant.name}, this is a reminder regarding Invoice #${inv.invoiceNo} for ₹${inv.totalInvoice.toLocaleString()}. Pending Balance: ₹${(inv.balanceAmount || inv.balance || 0).toLocaleString()}. Please ignore if already paid.`;
                                    window.open(`https://wa.me/${tenant.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                >
                                  <MessageSquare size={14} />
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="View" onClick={() => setSelectedInvoice(inv)}>
                                  <Eye size={14} />
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors" title="Edit" onClick={() => setEditingInvoice(inv)}>
                                  <Edit2 size={14} />
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Delete" onClick={() => setDeletingInvoice(inv)}>
                                  <Trash2 size={14} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'lease' && (
              <motion.div 
                key="lease" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Lease Roadmap</h3>
                  </div>
                  <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
                    <TimelineItemLarge label="Lease Commencement" date={tenant.leaseStart} desc="Initial move-in and rent start date" active />
                    <TimelineItemLarge label="Lock-in Period" date={lockInExpiryDate} desc="Minimum commitment period ends" />
                    <TimelineItemLarge label="Lease Expiration" date={tenant.leaseEnd} desc="Agreement renewal or termination date" danger />
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <IndianRupee size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Financial Configuration</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <ConfigBlock label="Current Monthly Rent" value={`₹${tenant.currentRent?.toLocaleString()}`} sub="Pre-GST Amount" highlight />
                    <ConfigBlock label="Security Deposit" value={`₹${tenant.securityDeposit?.toLocaleString()}`} sub="Refundable Amount" highlight />
                    <ConfigBlock label="Rent Free Period" value={`${tenant.rentFreePeriodDays} Days`} sub="Non-billing period" />
                    <ConfigBlock label="Notice Period" value={`${tenant.noticePeriod} Days`} sub="Termination notice" />
                    <ConfigBlock label="Lease Tenure" value={`${tenant.tenure} Months`} sub="Total duration" />
                    <ConfigBlock label="Lock-in Period" value={`${tenant.lockIn} Months`} sub="Minimum stay requirement" />
                    <ConfigBlock label="Escalation Clause" value={`${tenant.escalationPercent}%`} sub="Annual increment" />
                    <ConfigBlock label="Purpose of Lease" value={tenant.rentalPurpose} sub="Business category" />
                    <ConfigBlock label="Shipping Address" value={tenant.property} sub="Premises Address" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <motion.div 
                key="documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {tenant.agreementFileUrl ? (
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center shadow-inner">
                      <FileCheck size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Lease Agreement</h4>
                      <p className="text-xs text-slate-400 font-medium mt-1">Digital scanned copy of original contract</p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <a href={tenant.agreementFileUrl} target="_blank" className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-all border border-slate-100">Preview</a>
                      <a href={tenant.agreementFileUrl} download className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Download</a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center opacity-60">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                      <FileText size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No documents uploaded</p>
                  </div>
                )}
              </motion.div>
            )}
        </AnimatePresence>
      </div>
      
      {/* Internal Overlay Modals */}
      <AnimatePresence>
        {payingInvoice && (
          <PaymentEntryModal
             invoice={payingInvoice}
             onClose={() => setPayingInvoice(null)}
             onSuccess={() => { setPayingInvoice(null); fetchDetails(); }}
          />
        )}
        {selectedInvoice && (
          <ViewInvoiceModal 
             invoice={selectedInvoice}
             tenant={tenant}
             company={companies.find(c => c.id === selectedInvoice.companyId || c.companyName === selectedInvoice.company)}
             onClose={() => setSelectedInvoice(null)}
          />
        )}
        {editingInvoice && (
          <InvoiceFormModal 
             initialData={editingInvoice}
             tenants={allTenants}
             companies={companies}
             onClose={() => setEditingInvoice(null)}
             onSuccess={() => { setEditingInvoice(null); fetchDetails(); }}
          />
        )}
        {showOpeningAdjustment && (
          <OpeningAdjustmentModal 
            tenant={tenant}
            onClose={() => setShowOpeningAdjustment(false)}
            onSuccess={() => {
              setShowOpeningAdjustment(false);
              fetchLedger();
              fetchDetails();
            }}
          />
        )}
        {deletingInvoice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.95 }} animate={{ scale: 1 }}
               className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center"
             >
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <Trash2 size={32} />
               </div>
               <h4 className="text-xl font-bold text-slate-800 mb-2">Delete Invoice?</h4>
               <p className="text-sm text-slate-400 mb-8">This will permanently remove invoice <span className="font-bold text-slate-600">#{deletingInvoice.invoiceNo}</span>. This action is irreversible.</p>
               <div className="flex gap-3">
                 <button onClick={() => setDeletingInvoice(null)} className="flex-1 py-3 font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">Cancel</button>
                 <button onClick={() => handleDeleteInvoice(deletingInvoice.id as string)} className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors">Delete</button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

