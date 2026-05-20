import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  Calendar,
  Building2,
  PieChart as PieChartIcon,
  TrendingUp,
  ReceiptIndianRupee,
  ShieldCheck,
  ChevronRight,
  Printer,
  Loader2,
  Clock
} from 'lucide-react';
import axios from 'axios';
import { type Tenant, type Invoice, type Company } from '../src/types';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { exportToExcel } from '../src/lib/exportUtils';
import { toast } from 'react-hot-toast';

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('collection'); // collection, pending, gst, tds
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const dataToExport = filteredInvoices.map(inv => {
        const base = {
          'Date': new Date(inv.billDate).toLocaleDateString('en-GB'),
          'Invoice No.': inv.invoiceNo,
          'Stakeholder': inv.partyName,
          'Invoiced Amount': inv.totalInvoice
        };

        if (reportType === 'collection') {
          return { ...base, 'Collected': (inv.receivedAmount || inv.received || 0), 'Balance': (inv.balanceAmount || inv.balance || 0), 'Status': inv.paymentStatus };
        }
        if (reportType === 'gst') {
          return { ...base, 'Base Rent': inv.baseRent, 'CGST': inv.cgst, 'SGST': inv.sgst, 'Total GST': (inv.cgst + inv.sgst) };
        }
        if (reportType === 'tds') {
          return { ...base, 'TDS Deducted': (inv.tdsAmount || 0), 'Net Received': (inv.receivedAmount || inv.received || 0) };
        }
        if (reportType === 'pending') {
          return { ...base, 'Outstanding Balance': (inv.balanceAmount || inv.balance || 0), 'Status': inv.paymentStatus };
        }
        return base;
      });

      exportToExcel(dataToExport, `${reportType.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}`, 'Report');
      toast.success('Report exported to Excel');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, tenRes] = await Promise.all([
          axios.get('/api/invoices'),
          axios.get('/api/tenants')
        ]);
        setInvoices(invRes.data);
        setTenants(tenRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.partyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (reportType === 'pending') return matchesSearch && inv.paymentStatus !== 'Paid';
    if (reportType === 'gst') return matchesSearch && (inv.cgst + inv.sgst) > 0;
    if (reportType === 'tds') return matchesSearch && (inv.tdsAmount || 0) > 0;
    return matchesSearch;
  });

  if (loading) return <div className="p-20 text-center text-slate-400">Genertaing Intelligence Reports...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financial Intelligence</h1>
          <p className="text-slate-400 font-medium">Enterprise reporting and tax compliance engine</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
            <span>Export Excel</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-2xl font-bold text-xs hover:bg-slate-900 transition-all shadow-xl"
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Report Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportTab 
           active={reportType === 'collection'} 
           onClick={() => setReportType('collection')} 
           icon={TrendingUp} 
           title="Rent Collection" 
           subtitle="Monthly billing vs recovery"
           color="emerald"
        />
        <ReportTab 
           active={reportType === 'pending'} 
           onClick={() => setReportType('pending')} 
           icon={Clock} 
           title="Pending Dues" 
           subtitle="Aging analysis of receivables"
           color="rose"
        />
        <ReportTab 
           active={reportType === 'gst'} 
           onClick={() => setReportType('gst')} 
           icon={ReceiptIndianRupee} 
           title="GST Audit" 
           subtitle="Calculated taxes for filing"
           color="indigo"
        />
        <ReportTab 
           active={reportType === 'tds'} 
           onClick={() => setReportType('tds')} 
           icon={ShieldCheck} 
           title="TDS Compliance" 
           subtitle="Withholding tax summary"
           color="purple"
        />
      </div>

      {/* Report Filter Bar */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="Search within report..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-slate-600 font-bold text-xs uppercase tracking-widest">
            <option>Last 30 Days</option>
            <option>Current FY (2024-25)</option>
            <option>Last Quarter</option>
            <option>All Time</option>
          </select>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Invoiced</th>
                  {reportType === 'collection' && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Collected</th>}
                  {reportType === 'gst' && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">GST (18%)</th>}
                  {reportType === 'tds' && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">TDS Ded.</th>}
                  {(reportType === 'collection' || reportType === 'pending') && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>}
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-slate-400">{new Date(inv.billDate).toLocaleDateString('en-GB')}</td>
                    <td className="px-8 py-5">
                       <span className="text-xs font-black text-slate-800">#{inv.invoiceNo}</span>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{inv.partyName}</p>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700 text-right">₹{inv.totalInvoice.toLocaleString()}</td>
                    {reportType === 'collection' && <td className="px-8 py-5 text-sm font-bold text-emerald-600 text-right">₹{(inv.receivedAmount || inv.received || 0).toLocaleString()}</td>}
                    {reportType === 'gst' && <td className="px-8 py-5 text-sm font-bold text-indigo-600 text-right">₹{(inv.cgst + inv.sgst).toLocaleString()}</td>}
                    {reportType === 'tds' && <td className="px-8 py-5 text-sm font-bold text-purple-600 text-right">₹{(inv.tdsAmount || 0).toLocaleString()}</td>}
                    {(reportType === 'collection' || reportType === 'pending') && <td className="px-8 py-5 text-sm font-bold text-rose-500 text-right">₹{(inv.balanceAmount || inv.balance || 0).toLocaleString()}</td>}
                    <td className="px-8 py-5 text-center">
                       <StatusBadge status={inv.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}

function ReportTab({ active, onClick, icon: Icon, title, subtitle, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 active:bg-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 active:bg-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 active:bg-indigo-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 active:bg-purple-100',
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-6 rounded-[28px] border text-left transition-all relative overflow-hidden group",
        active ? `${colors[color]} border-2 scale-[1.02] shadow-lg shadow-black/5` : "bg-white border-slate-100 hover:border-slate-300"
      )}
    >
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", active ? "bg-white/50" : "bg-slate-50 text-slate-400")}>
        <Icon size={20} />
      </div>
      <h4 className={cn("text-sm font-black transition-colors", active ? "text-inherit" : "text-slate-800")}>{title}</h4>
      <p className={cn("text-[10px] font-bold mt-1 uppercase tracking-wider opacity-60")}>{subtitle}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    Paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Partial: 'bg-amber-50 text-amber-600 border-amber-100',
    Pending: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", styles[status] || 'bg-slate-50 text-slate-500')}>
      {status}
    </span>
  );
}

