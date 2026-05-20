import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ReceiptIndianRupee, 
  MoreVertical, 
  Edit2,
  Trash2,
  Eye,
  X,
  Calendar,
  Building,
  User as UserIcon,
  Download,
  AlertCircle,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { type Invoice, type Tenant, type Company } from '../src/types';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '../src/lib/exportUtils';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchTenants();
    fetchCompanies();
  }, []);

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const dataToExport = filteredInvoices.map(inv => ({
        'Date': inv.billDate,
        'Invoice No.': inv.invoiceNo,
        'Tenant': inv.partyName,
        'Company': inv.company,
        'Invoice Amount': inv.totalInvoice,
        'Received': inv.received || 0,
        'TDS': inv.tdsAmount || 0,
        'Balance': inv.balance || 0,
        'Status': inv.paymentStatus
      }));
      
      exportToExcel(dataToExport, `Invoices_Export_${new Date().toISOString().split('T')[0]}`, 'Invoices');
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const fetchInvoices = () => {
    setLoading(true);
    fetch('/api/invoices')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch invoices'))
      .then(data => {
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          setInvoices([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching invoices:', err);
        setInvoices([]);
        setLoading(false);
      });
  };

  const fetchTenants = () => {
    fetch('/api/tenants')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setTenants(data);
        } else {
          setTenants([]);
        }
      })
      .catch(err => {
        console.error('Error fetching tenants:', err);
        setTenants([]);
      });
  };

  const fetchCompanies = () => {
    fetch('/api/companies')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          setCompanies([]);
        }
      })
      .catch(err => {
        console.error('Error fetching companies:', err);
        setCompanies([]);
      });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingInvoice(null);
        fetchInvoices();
      }
    } catch (err) {
      alert('Failed to delete invoice');
    }
  };

  const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter(inv => {
    const matchesSearch = inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) || 
      inv.partyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.company.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All Status' || inv.paymentStatus === statusFilter;
    
    let matchesMonth = true;
    if (monthFilter !== 'All Months' && inv.billDate) {
      const billDate = new Date(inv.billDate);
      const selectedMonth = parseInt(monthFilter);
      matchesMonth = billDate.getMonth() === selectedMonth;
    }

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const totalInvoiced = filteredInvoices.reduce((acc, inv) => acc + (inv.totalInvoice || 0), 0);
  const totalReceived = filteredInvoices.reduce((acc, inv) => acc + (inv.received || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pt-0 md:pt-0 lg:pt-0 w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-slate-500 text-sm">Track monthly rent payments and outstanding balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="bg-emerald-500 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download size={18} />
            )}
            <span>{exporting ? 'Exporting...' : 'Download Excel'}</span>
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-orange-600 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>+ New Invoice</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <ReceiptIndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-bold text-slate-800">₹{totalInvoiced.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <ReceiptIndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
            <p className="text-2xl font-bold text-slate-800">₹{totalReceived.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <ReceiptIndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</p>
            <p className="text-2xl font-bold text-slate-800">₹{totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-border-card">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search invoice or tenant name..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select 
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="All Months">All Months</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
          <select 
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Pending</option>
          </select>
          <div className="h-8 w-px bg-slate-200"></div>
          <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
            {filteredInvoices.length} invoices found
          </span>
        </div>
      </div>

      <div className="card-saas overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th hidden md:table-cell">Invoice No</th>
          <th className="table-th">Tenant Name</th>
                  <th className="table-th !text-right">Total Amount</th>
                  <th className="table-th text-center hidden sm:table-cell">Status</th>
                  <th className="table-th !text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-muted">
                      <ReceiptIndianRupee className="mx-auto mb-3 opacity-20" size={48} />
                      <p>No invoices generated yet.</p>
                    </td>
                  </tr>
                ) : filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="table-td text-slate-400 font-medium whitespace-nowrap hidden md:table-cell">#{inv.invoiceNo}</td>
                    <td className="table-td font-bold">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">{inv.partyName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{inv.billDate}</span>
                      </div>
                    </td>
                    <td className="table-td text-right font-bold text-primary whitespace-nowrap px-4">
                      ₹{(inv.totalInvoice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-td text-center hidden sm:table-cell">
                      <PaymentStatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="table-td text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                         <button 
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 md:p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
                          title="View Invoice"
                        >
                          <Eye size={16} />
                          <span className="hidden md:inline">View</span>
                        </button>
                        <button 
                          onClick={() => setEditingInvoice(inv)}
                          className="p-1.5 md:p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
                          title="Edit Invoice"
                        >
                          <Edit2 size={16} />
                          <span className="hidden md:inline">Edit</span>
                        </button>
                        <button 
                          onClick={() => setDeletingInvoice(inv)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <InvoiceFormModal 
            tenants={tenants}
            companies={companies}
            onClose={() => setShowForm(false)} 
            onSuccess={() => { setShowForm(false); fetchInvoices(); }} 
          />
        )}
        {editingInvoice && (
          <InvoiceFormModal 
            tenants={tenants}
            companies={companies}
            initialData={editingInvoice}
            onClose={() => setEditingInvoice(null)} 
            onSuccess={() => { setEditingInvoice(null); fetchInvoices(); }} 
          />
        )}
        {selectedInvoice && (
          <ViewInvoiceModal 
            invoice={selectedInvoice}
            tenant={tenants.find(t => t.id === selectedInvoice.tenantId)}
            company={companies.find(c => c.id === selectedInvoice.companyId || c.companyName === selectedInvoice.company)}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
        {deletingInvoice && (
          <DeleteConfirmationModal
            invoiceNo={deletingInvoice.invoiceNo}
            onConfirm={() => handleDelete(deletingInvoice.id as string)}
            onCancel={() => setDeletingInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: any = {
    Paid: 'badge-paid',
    Partial: 'badge-partial',
    Pending: 'badge-pending',
  };
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none",
      styles[status]
    )}>
      {status}
    </span>
  );
}

function InvoiceFormModal({ tenants, companies, onClose, onSuccess, initialData }: any) {
  const [loading, setLoading] = useState(false);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  
  const billDate = new Date();
  const fromDate = `${currentYear}-${(billDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear, billDate.getMonth() + 1, 0).getDate();
  const toDate = `${currentYear}-${(billDate.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      invoiceNo: initialData?.invoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      billDate: initialData?.billDate || new Date().toISOString().split('T')[0],
      tenantId: initialData?.tenantId || '',
      companyId: initialData?.companyId || '',
      partyName: initialData?.partyName || '',
      company: initialData?.company || '',
      taxOption: initialData?.taxOption || 'None',
      items: initialData?.items || [
        { 
          particular: 'Rental Charges', 
          hsnSac: '997212', 
          month: `${currentMonthName}'${currentYear}`, 
          fromDate: fromDate, 
          toDate: toDate, 
          amount: initialData?.baseRent || 0 
        }
      ],
      baseRent: initialData?.baseRent || 0, // This will be our SubTotal
      cgst: initialData?.cgst || 0,
      sgst: initialData?.sgst || 0,
      totalInvoice: initialData?.totalInvoice || 0,
      received: initialData?.received || 0,
      balance: initialData?.balance || 0,
      paymentStatus: initialData?.paymentStatus || 'Pending',
      remarks: initialData?.remarks || ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items");
  const watchedTaxOption = watch("taxOption");
  const watchedReceived = watch("received");

  // Auto calculation logic
  useEffect(() => {
    const subTotal = watchedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const isGST = watchedTaxOption === 'GST';
    const cgstValue = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const sgstValue = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    
    const totalValue = Number((subTotal + cgstValue + sgstValue).toFixed(2));
    const balanceValue = Number((totalValue - watchedReceived).toFixed(2));
    
    let status: any = 'Pending';
    if (balanceValue <= 0) status = 'Paid';
    else if (watchedReceived > 0) status = 'Partial';

    setValue('baseRent', subTotal);
    setValue('cgst', cgstValue);
    setValue('sgst', sgstValue);
    setValue('totalInvoice', totalValue);
    setValue('balance', balanceValue);
    setValue('paymentStatus', status);
  }, [watchedItems, watchedTaxOption, watchedReceived, setValue]);

  const handleTenantChange = (id: string) => {
    const tenant = tenants.find((t: Tenant) => t.id === id);
    if (tenant) {
      const companyRef = companies.find((c: any) => c.companyName === tenant.company);
      setValue('tenantId', id);
      setValue('companyId', companyRef?.id || '');
      setValue('partyName', tenant.name);
      setValue('company', tenant.company);
      
      // Update first item amount if it's "Rental Charges"
      if (watchedItems.length > 0 && watchedItems[0].particular === 'Rental Charges') {
        setValue(`items.0.amount`, tenant.currentRent);
      }
    }
  };

  const handleCompanyChange = (id: string) => {
    const company = companies.find((c: Company) => c.id === id);
    if (company) {
      setValue('companyId', id);
      setValue('company', company.companyName);
    }
  };

  const onFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const url = initialData ? `/api/invoices/${initialData.id}` : '/api/invoices';
      const method = initialData ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) onSuccess();
      else toast.error('Failed to save invoice');
    } catch (err) {
      toast.error('Error saving invoice');
    } finally {
      setLoading(false);
    }
  };

  const watchBaseRent = watch("baseRent");
  const watchCgst = watch("cgst");
  const watchSgst = watch("sgst");
  const watchTotalInvoice = watch("totalInvoice");
  const watchBalance = watch("balance");
  const watchPaymentStatus = watch("paymentStatus");
  const watchPartyName = watch("partyName");
  const watchCompany = watch("company");

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Edit Invoice' : 'Generate Invoice'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {/* Main Form Rows */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Invoice No</label>
                <input {...register("invoiceNo")} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Bill Date</label>
                <input type="date" {...register("billDate")} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billed From (Company)</label>
                <select 
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                  {...register("companyId")}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                >
                  <option value="">Select Billing Entity...</option>
                  {Array.isArray(companies) && companies.map((c: Company) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Tenant</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                  {...register("tenantId")}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  required
                >
                  <option value="">Choose a tenant...</option>
                  {Array.isArray(tenants) && tenants.map((t: Tenant) => (
                    <option key={t.id} value={t.id}>{t.name} (Code: {t.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Tenant Name</label>
                <input {...register("partyName")} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70" />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ReceiptIndianRupee size={18} className="text-primary" />
                Invoice Items
              </h3>
              <button 
                type="button"
                onClick={() => append({ particular: '', hsnSac: '997212', month: `${currentMonthName}'${currentYear}`, fromDate: fromDate, toDate: toDate, amount: 0 })}
                className="text-xs font-bold text-primary hover:text-orange-600 flex items-center gap-1 py-1 px-3 bg-primary/5 rounded-lg border border-primary/20 transition-all"
              >
                <Plus size={14} /> Add Charge Item
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Particular</th>
                    <th className="px-4 py-3">HSN/SAC</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">From Date</th>
                    <th className="px-4 py-3">To Date</th>
                    <th className="px-4 py-3 w-32">Amount</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-2 py-2">
                        <input 
                          {...register(`items.${index}.particular` as const)} 
                          placeholder="e.g. Rental Charges"
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          {...register(`items.${index}.hsnSac` as const)} 
                          placeholder="HSN/SAC"
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          {...register(`items.${index}.month` as const)} 
                          placeholder="Month'Year"
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="date"
                          {...register(`items.${index}.fromDate` as const)} 
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="date"
                          {...register(`items.${index}.toDate` as const)} 
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.amount` as const, { valueAsNumber: true })} 
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-bold text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        {fields.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => remove(index)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
             <div className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Tax Calculation Mode</label>
                  <select 
                    className="w-full px-4 py-2 bg-white border-2 border-primary/40 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-primary shadow-sm hover:bg-slate-50 cursor-pointer"
                    {...register("taxOption")}
                  >
                    <option value="None">None (0% Tax)</option>
                    <option value="GST">GST (CGST 9% + SGST 9%)</option>
                  </select>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Information Preview</h3>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Party Name</p>
                    <p className="font-bold text-slate-700">{watchPartyName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Company</p>
                    <p className="font-bold text-slate-700">{watchCompany || 'N/A'}</p>
                  </div>
                </div>
             </div>

             <div className="bg-slate-900 rounded-[28px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-slate-400 text-sm">
                    <span>SubTotal (All Items)</span>
                    <span className="font-bold text-white">₹{watchBaseRent.toLocaleString()}</span>
                  </div>
                  
                  {watchedTaxOption === 'GST' && (
                    <>
                      <div className="flex justify-between items-center text-slate-400 text-xs">
                        <span>CGST (9%)</span>
                        <span className="font-bold text-white">₹{watchCgst.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-xs">
                        <span>SGST (9%)</span>
                        <span className="font-bold text-white">₹{watchSgst.toLocaleString()}</span>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-white/10 my-4"></div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-primary font-black uppercase tracking-wider">Total Payable</p>
                      <p className="text-3xl font-black">₹{watchTotalInvoice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Received</p>
                       <input 
                         type="number" 
                         {...register("received", { valueAsNumber: true })}
                         className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-sm font-bold focus:bg-white/20 outline-none transition-all"
                       />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-slate-400">Balance Amount</span>
                    <span className={cn("text-lg font-black", watchBalance > 0 ? "text-rose-400" : "text-emerald-400")}>
                      ₹{watchBalance.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status:</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      watchPaymentStatus === 'Paid' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      watchPaymentStatus === 'Partial' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    )}>
                      {watchPaymentStatus}
                    </span>
                  </div>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description / Remarks</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-32 md:h-24"
              {...register("remarks")}
              placeholder="What this invoice is for? Specific instructions or description..."
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-md font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
          <button 
            onClick={handleSubmit(onFormSubmit)}
            disabled={loading}
            className="px-10 py-3 bg-primary text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-[0_10px_20px_-10px_rgba(249,115,22,0.5)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {loading ? 'Processing...' : (initialData ? 'Update & Finalize' : 'Generate & Save Invoice')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteConfirmationModal({ invoiceNo, onConfirm, onCancel }: { invoiceNo: string, onConfirm: () => void, onCancel: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Invoice?</h2>
        <p className="text-slate-500 mb-8">Are you sure you want to delete invoice <span className="font-mono font-bold text-slate-700">#{invoiceNo}</span>? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-md"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ViewInvoiceModal({ invoice, tenant, company, onClose }: { invoice: Invoice, tenant?: Tenant, company?: Company, onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 850,
        onclone: (clonedDoc) => {
          // Remove all link tags with external stylesheets that might contain oklch
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(l => l.remove());

          // Force a complete override of styles to avoid oklab/oklch issues
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              color-scheme: light !important;
              -webkit-print-color-adjust: exact !important;
              color: #000000 !important;
            }
            #invoice-capture-area {
              box-shadow: none !important;
              border: none !important;
              padding: 40px !important;
              background: white !important;
            }
            .shadow-2xl, .shadow-md, .shadow-lg, .shadow-inner {
              box-shadow: none !important;
            }
            .backdrop-blur-sm {
              backdrop-filter: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // Scrub okl colors from style tags and stylesheets
          clonedDoc.querySelectorAll('style').forEach(s => {
            try {
              if (s.textContent?.includes('okl')) {
                // More robust regex for oklch/oklab
                s.textContent = s.textContent.replace(/okl(ch|ab)\s*\([^)]+\)/g, '#000000');
              }
            } catch (e) {
              s.remove();
            }
          });

          // Deep search and replace in ALL style attributes
          const all = clonedDoc.querySelectorAll('*');
          all.forEach((el: any) => {
            try {
              const styles = el.getAttribute('style') || '';
              if (styles.includes('okl')) {
                 el.setAttribute('style', styles.replace(/okl(ch|ab)\s*\([^)]+\)/g, '#000000'));
              }
            } catch (e) {}
          });
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
      toast.success('Invoice PDF generated successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const billDate = new Date(invoice.billDate);
  const dueDate = new Date(billDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const currentMonth = `${monthNames[billDate.getMonth()]}'${billDate.getFullYear()}`;
  
  const fromDate = `01/${(billDate.getMonth() + 1).toString().padStart(2, '0')}/${billDate.getFullYear()}`;
  const lastDay = new Date(billDate.getFullYear(), billDate.getMonth() + 1, 0).getDate();
  const toDate = `${lastDay}/${(billDate.getMonth() + 1).toString().padStart(2, '0')}/${billDate.getFullYear()}`;

  const finalTotal = Math.round(invoice.totalInvoice);
  const diff = finalTotal - invoice.totalInvoice;
  const roundOff = Math.abs(diff).toFixed(2);
  const totalAmount = finalTotal;

  const invoiceItems = invoice.items && invoice.items.length > 0 
    ? invoice.items 
    : [{ 
        particular: 'Rental Charges', 
        hsnSac: '997212', 
        month: currentMonth, 
        fromDate: fromDate, 
        toDate: toDate, 
        amount: invoice.baseRent 
      }];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white"
    >
      <div className="min-h-screen py-12 px-4 md:px-8 flex justify-center items-start">
        {/* Top Toolbar */}
        <div className="fixed top-6 right-6 flex gap-3 print:hidden z-[110]">
          <button 
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-white text-slate-800 px-4 py-2 rounded-lg shadow-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-bold text-sm disabled:opacity-50"
          >
            {downloading ? (
               <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></div>
            ) : (
              <Download size={18} />
            )}
            <span>{downloading ? 'Preparing...' : 'Download PDF'}</span>
          </button>
          <button 
            onClick={onClose}
            className="bg-slate-800 text-white p-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <motion.div 
          ref={invoiceRef}
          id="invoice-capture-area"
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-[850px] shadow-2xl p-6 md:p-16 font-sans text-[#1a1a1a] print:shadow-none print:w-full print:max-w-none print:p-8 rounded-sm my-8"
        >
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold mb-1">{company?.companyName || invoice.company}</h1>
            <div className="text-[12px] text-[#4a4a4a] leading-relaxed">
              <p>{company?.address || 'D-2, Silver Estate, University Road, Gwalior'}</p>
              <p>Phone no. : {company?.phoneNumber || '7898988252'}</p>
              <p>Email : {company?.email || 'backoffice3@neotericgrp.in'}</p>
              <p>GSTIN : {company?.gstNumber || '23ACLPG9284H1ZC'}</p>
              <p>State: {company?.state || '23-Madhya Pradesh'}</p>
            </div>
          </div>
          {company?.logoUrl && (
            <div className="w-24 h-24 overflow-hidden flex items-center justify-center shrink-0 ml-4">
               <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>

        <div className="border-t border-[#e2e2e2] pt-4 mb-8 text-center">
          <h2 className="text-[32px] font-bold text-[#b4b4b4] tracking-[0.2em] uppercase">INVOICE</h2>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-8 mb-8 text-[12px]">
          <div>
            <h3 className="font-bold mb-2">Bill To</h3>
            <p className="font-bold">{tenant?.name || invoice.partyName}</p>
            <div className="space-y-1 mt-1 text-[#4a4a4a]">
              <p className="whitespace-pre-line leading-relaxed mb-2">{tenant?.billingAddress || 'N/A'}</p>
              <p>GSTIN : {tenant?.gstNo || 'Unregistered'}</p>
              <p>State: 23-Madhya Pradesh</p>
              <p>Security Deposit : {tenant?.securityDeposit ? `${tenant.securityDeposit}/-` : '-'}</p>
              {tenant?.leaseStart && <p>Rent Start Date : {new Date(tenant.leaseStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
              {tenant?.leaseEnd && <p>Agreement End Date: {new Date(tenant.leaseEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
            </div>
          </div>
          
          <div>
            <h3 className="font-bold mb-2">Ship To</h3>
            <div className="space-y-1 text-[#4a4a4a]">
              <p className="font-bold">{tenant?.name || invoice.partyName}</p>
              <p className="whitespace-pre-line leading-relaxed">{tenant?.property || 'N/A'}</p>
            </div>
          </div>

          <div className="text-right">
            <h3 className="font-bold mb-2">Invoice Details</h3>
            <div className="space-y-1 text-[#4a4a4a]">
              <p>Invoice No. : {invoice.invoiceNo}</p>
              <p>Date : {new Date(invoice.billDate).toLocaleDateString('en-GB')}</p>
              <p>Due Date : {dueDate.toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full text-[12px] border-collapse">
            <thead className="bg-slate-800 text-white font-bold border-y border-slate-700">
              <tr>
                <th className="py-2 px-3 text-left w-10">#</th>
                <th className="py-2 px-3 text-left">Particular</th>
                <th className="py-2 px-3 text-left">HSN/ SAC</th>
                <th className="py-2 px-3 text-left">Month</th>
                <th className="py-2 px-3 text-left">From</th>
                <th className="py-2 px-3 text-left">To</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className="border-b border-[#eeeeee]">
                  <td className="py-3 px-3">{idx + 1}</td>
                  <td className="py-3 px-3 font-bold text-[#1a1a1a]">{item.particular}</td>
                  <td className="py-3 px-3">{item.hsnSac}</td>
                  <td className="py-3 px-3">{item.month}</td>
                  <td className="py-3 px-3">{item.fromDate ? new Date(item.fromDate).toLocaleDateString('en-GB') : '-'}</td>
                  <td className="py-3 px-3">{item.toDate ? new Date(item.toDate).toLocaleDateString('en-GB') : '-'}</td>
                  <td className="py-3 px-3 text-right">₹ {(item.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-b-2 border-[#1a1a1a] bg-[#fdfdfd]">
                <td colSpan={6} className="py-2 px-3 font-bold text-right">Total</td>
                <td className="py-2 px-3 text-right font-bold text-lg">₹ {invoice.baseRent.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer info and totals */}
        <div className="grid grid-cols-2 gap-12 text-[12px]">
          <div>
            <div className="mb-6 min-h-[60px]">
              <h4 className="font-bold mb-1">Description</h4>
              <p className="text-[#4a4a4a] whitespace-pre-line">
                {invoice.remarks || `Period - ${fromDate} to ${toDate}`}
              </p>
            </div>
            
            <div className="mb-6">
               <h4 className="font-bold mb-1">Invoice Amount In Words</h4>
               <p className="text-[#1a1a1a] italic capitalize leading-relaxed">
                 {numberToWords(totalAmount)} Rupees only
               </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-1">Terms and Conditions</h4>
              <p className="text-[#4a4a4a]">Please pay before due date.</p>
              <p className="text-[#4a4a4a]">Late payment penalty charges # 1.5% Per Month</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-[#4a4a4a]">Sub Total</span>
              <span className="font-bold">₹ {invoice.baseRent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#4a4a4a]">SGST@9%</span>
              <span className="font-bold">₹ {invoice.sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#4a4a4a]">CGST@9%</span>
              <span className="font-bold">₹ {invoice.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#4a4a4a]">Round off</span>
              <span className="font-bold">₹ {roundOff}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-4 bg-[#b4b4b4] text-white rounded font-bold text-base mt-4 shadow-inner">
              <span className="uppercase tracking-widest">Total</span>
              <span className="text-xl">₹ {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mt-12 flex justify-between items-end text-[12px]">
          <div className="space-y-1">
            <h4 className="font-bold text-[#1a1a1a] uppercase text-[10px] mb-2 tracking-wider">Pay To:</h4>
            <p>Bank Name : {company?.bankName || 'STATE BANK OF INDIA, D R D E'}</p>
            <p>{company?.branchName || 'GWALIOR, GWALIOR'}</p>
            <p>Bank Account No. : {company?.accountNumber || '32511320706'}</p>
            <p>Bank IFSC code : {company?.ifscCode || 'SBIN0010216'}</p>
            <p>Account holder's name : {company?.accountHolderName || company?.companyName || 'Swastik Grah Nirman Company'}</p>
          </div>
          
          <div className="text-center">
            <p className="font-bold mb-4">For :{company?.companyName || invoice.company}</p>
            <div className="h-16 flex items-center justify-center">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Seal" className="w-16 h-16 opacity-30 object-contain grayscale" referrerPolicy="no-referrer" />
              ) : (
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-[10px] font-bold rotate-12"
                  style={{ border: '2px solid rgba(249, 115, 22, 0.2)', color: 'rgba(249, 115, 22, 0.3)' }}
                >
                  SEAL
                </div>
              )}
            </div>
            <p className="font-bold border-t border-[#1a1a1a] pt-2 px-4">Authorized Signatory</p>
          </div>
        </div>
      </motion.div>
    </div>
  </motion.div>
);
}

function numberToWords(num: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  function convert(n: number): string {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }
  
  return convert(num);
}

function FormInput({ label, type = 'text', value, onChange, disabled }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <input 
        type={type} 
        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-60 disabled:bg-slate-100 font-medium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
