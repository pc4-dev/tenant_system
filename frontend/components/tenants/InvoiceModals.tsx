import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Select from 'react-select';
import axios from 'axios';
import {
  Plus, X, Trash2, Download, ShieldCheck, Loader2,
  ReceiptIndianRupee, Upload, Calendar, Building, AlertCircle,
  Eye, FileText, IndianRupee, CheckCircle2, Clock, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import imageCompression from 'browser-image-compression';
import { type Invoice, type Tenant, type Company } from '../../src/types';


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
  
  const integerPart = Math.floor(num);
  return convert(integerPart);
}


// ── Invoice Form Modal ───────────────────────────────────────────────────────
export function InvoiceFormModal({ tenants, companies, onClose, onSuccess, initialData }: any) {
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
      property: initialData?.property || '',
      gstNo: initialData?.gstNo || '',
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
      baseRent: initialData?.baseRent || 0,
      cgst: initialData?.cgst || 0,
      sgst: initialData?.sgst || 0,
      totalInvoice: initialData?.totalInvoice || 0,
      receivedAmount: initialData?.receivedAmount || initialData?.received || 0,
      tdsAmount: initialData?.tdsAmount || 0,
      balanceAmount: initialData?.balanceAmount || initialData?.balance || 0,
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
  const watchedReceived = watch("receivedAmount");
  const watchedTds = watch("tdsAmount");

  // Auto calculation logic
  useEffect(() => {
    const subTotal = watchedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const isGST = watchedTaxOption === 'GST';
    const cgstValue = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const sgstValue = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const totalValue = Number((subTotal + cgstValue + sgstValue).toFixed(2));
    const balanceValue = Number((totalValue - (watchedReceived + watchedTds)).toFixed(2));
    
    let status: any = 'Pending';
    if (balanceValue <= 0) status = 'Paid';
    else if (watchedReceived > 0) status = 'Partial';

    setValue('baseRent', subTotal);
    setValue('cgst', cgstValue);
    setValue('sgst', sgstValue);
    setValue('totalInvoice', totalValue);
    setValue('balanceAmount', balanceValue);
    setValue('paymentStatus', status);
  }, [watchedItems, watchedTaxOption, watchedReceived, watchedTds, setValue]);

  const handleTenantChange = (id: string) => {
    const tenant = tenants.find((t: Tenant) => t.id === id);
    if (tenant) {
      const companyRef = companies.find((c: any) => c.companyName === tenant.company);
      setValue('tenantId', id);
      setValue('companyId', companyRef?.id || '');
      setValue('partyName', tenant.name);
      setValue('company', tenant.company);
      setValue('property', tenant.property);
      setValue('gstNo', tenant.gstNo);
      
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
      const url = initialData?.id ? `/api/invoices/${initialData.id}` : '/api/invoices';
      const method = initialData?.id ? 'PUT' : 'POST';
      
      const res = await axios({
        url,
        method,
        data
      });
      if (res.status === 200 || res.status === 201) onSuccess();
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
  const watchBalance = watch("balanceAmount");
  const watchPaymentStatus = watch("paymentStatus");
  const watchPartyName = watch("partyName");
  const watchCompany = watch("company");

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
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
                         {...register("receivedAmount", { valueAsNumber: true })}
                         className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-sm font-bold focus:bg-white/20 outline-none transition-all"
                       />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">TDS Deducted</span>
                      <input 
                         type="number" 
                         {...register("tdsAmount", { valueAsNumber: true })}
                         className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-xs font-bold focus:bg-white/20 outline-none transition-all mt-1"
                       />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance Due</span>
                      <p className={cn("text-lg font-black", watchBalance > 0 ? "text-rose-400" : "text-emerald-400")}>
                        ₹{watchBalance.toLocaleString()}
                      </p>
                    </div>
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
              {...register("remarks")}
              placeholder="Internal notes or specific instructions..."
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

// ── View Invoice Modal ───────────────────────────────────────────────────────
export function ViewInvoiceModal({ invoice, tenant, company, onClose }: { invoice: Invoice, tenant?: Tenant, company?: Company, onClose: () => void }) {
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
                // More robust regex for oklch/oklab with nested parens
                s.textContent = s.textContent.replace(/okl(ch|ab)\s*\([^)]+\)/g, '#000000');
              }
            } catch (e) {
              s.remove(); // Remove problematic styles if they can't be scrubbed
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

  const invoiceItems = (invoice as any).items && (invoice as any).items.length > 0 
    ? (invoice as any).items 
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
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="min-h-screen py-12 px-4 md:px-8 flex justify-center items-start">
        <div className="fixed top-6 right-6 flex gap-3 z-[160]">
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
          <button onClick={onClose} className="bg-slate-800 text-white p-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <motion.div 
          ref={invoiceRef}
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-[850px] shadow-2xl p-6 md:p-16 font-sans text-[#1a1a1a] rounded-sm my-8"
        >
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold mb-1">{company?.companyName || invoice.company}</h1>
            <div className="text-[12px] text-[#4a4a4a] leading-relaxed">
              <p>{company?.address || 'Property Address Not Set'}</p>
              <p>Phone no. : {company?.phoneNumber || 'N/A'}</p>
              <p>Email : {company?.email || 'N/A'}</p>
              <p>GSTIN : {company?.gstNumber || 'N/A'}</p>
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
            <thead style={{ backgroundColor: '#f2f2f2' }} className="text-[#1a1a1a] font-bold border-y border-[#d2d2d2]">
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
              {invoiceItems.map((item: any, idx: number) => (
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
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-12 text-[12px]">
          <div>
            <div className="mb-6">
              <h4 className="font-bold mb-1">Invoice Amount In Words</h4>
              <p className="text-[#1a1a1a] italic capitalize">{numberToWords(totalAmount)} Rupees only</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#4a4a4a]">Sub Total</span>
              <span className="font-bold">₹ {invoice.baseRent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#4a4a4a]">GST ({invoice.taxOption === 'None' ? '0%' : '18%'})</span>
              <span className="font-bold">₹ {(invoice.cgst + invoice.sgst).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 px-4 bg-[#b4b4b4] text-white rounded font-bold text-base mt-4 shadow-inner">
              <span>Total</span>
              <span className="text-xl">₹ {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#eeeeee] grid grid-cols-2 gap-12 text-[11px]">
          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-[#4a4a4a]">Bank Details</h4>
            <div className="space-y-1.5 text-[#333]">
              <p className="flex justify-between">
                <span className="text-slate-400">Account Name:</span>
                <span className="font-bold">{company?.accountHolderName || company?.companyName || invoice.company}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Bank Name:</span>
                <span className="font-bold">{company?.bankName || 'N/A'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Account Number:</span>
                <span className="font-bold tracking-wider">{company?.accountNumber || 'N/A'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">IFSC Code:</span>
                <span className="font-bold tracking-widest text-primary">{company?.ifscCode || 'N/A'}</span>
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-end items-end">
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-400 mb-8">For {company?.companyName || invoice.company}</p>
              <div className="h-12"></div>
              <p className="font-bold text-slate-800 border-t border-slate-200 pt-2 px-4">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-4 bg-slate-50 rounded-lg text-[10px] text-slate-400 text-center">
            <p className="font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Notes & Terms</p>
            <p>Please pay the invoice by the due date. LATE PAYMENT INTEREST of 18% p.a. will be charged after due date.</p>
            <p>This is a computer generated invoice and does not require a physical signature.</p>
        </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

