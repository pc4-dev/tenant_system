import { useState, useEffect } from 'react';
import { X, History, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { type Invoice, type Tenant } from '../../src/types';
import { FormInput } from './TenantPrimitives';

// ── Opening Balance Adjustment Modal ─────────────────────────────────────────
export function OpeningAdjustmentModal({ tenant, onClose, onSuccess }: { tenant: Tenant, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date:       new Date().toISOString().split('T')[0],
    amount:     0,
    type:       'PAYMENT',
    particular: 'Opening Balance Adjustment',
    notes:      ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    setLoading(true);
    try {
      await axios.post('/api/ledger/entry', {
        tenantId: tenant.id,
        date:      formData.date,
        type:      formData.type,
        particular: formData.particular,
        credit: formData.type === 'PAYMENT'    ? formData.amount : 0,
        debit:  formData.type === 'ADJUSTMENT' ? formData.amount : 0,
        notes:  formData.notes
      });
      toast.success('Adjustment saved successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save adjustment');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0,y:20}}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-6 md:p-8 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
              <History size={20}/>
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight">Opening Bal Adjustment</h3>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Action for {tenant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Opening Balance</p>
            <p className="text-xl font-black text-slate-800">₹{tenant.openingBalanceAmount?.toLocaleString() || 0} ({tenant.openingBalanceType})</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Entry Date"  type="date"   value={formData.date}   onChange={(v:string)=>setFormData({...formData,date:v})}  required/>
            <FormInput label="Entry Type"  type="select" options={['PAYMENT','ADJUSTMENT']} value={formData.type} onChange={(v:string)=>setFormData({...formData,type:v})} required/>
          </div>
          <FormInput label="Adjustment Amount" type="number" value={formData.amount}     onChange={(v:string)=>setFormData({...formData,amount:parseFloat(v)||0})} required/>
          <FormInput label="Particular"                      value={formData.particular} onChange={(v:string)=>setFormData({...formData,particular:v})} required/>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Notes / Remarks</label>
            <textarea className="form-input-saas min-h-[100px] py-3 h-auto"
              value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})}
              placeholder="e.g. Received from client or manual reconciliation"/>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}
            {loading ? 'Processing...' : 'Save Manual Entry'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Payment Entry Modal ───────────────────────────────────────────────────────
export function PaymentEntryModal({ invoice, onClose, onSuccess }: { invoice: Invoice, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receivedAmount:      invoice.receivedAmount || invoice.received || 0,
    tdsAmount:           invoice.tdsAmount || 0,
    paymentDate:         invoice.paymentDate || new Date().toISOString().split('T')[0],
    paymentMode:         invoice.paymentMode || 'NEFT',
    transactionRef:      invoice.transactionRef || '',
    latePenaltyPercentage: invoice.latePenaltyPercentage ?? 1.5,
    latePenaltyAmount:   invoice.latePenaltyAmount || 0,
    remarks:             invoice.remarks || ''
  });

  const rentBase = invoice.baseRent || invoice.totalInvoice;
  const calculatedPenalty = Number((rentBase * (formData.latePenaltyPercentage / 100)).toFixed(2));

  useEffect(() => {
    if (calculatedPenalty !== formData.latePenaltyAmount) {
      setFormData(prev => ({ ...prev, latePenaltyAmount: calculatedPenalty }));
    }
  }, [calculatedPenalty]);

  const remainingBalance = (invoice.totalInvoice + calculatedPenalty) - (formData.receivedAmount + formData.tdsAmount);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await axios.put(`/api/invoices/${String(invoice.id)}`, formData);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error recording payment');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[200] flex items-start md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-10 md:pt-4">
      <motion.div initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}}
        className="bg-white w-full max-w-lg rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100 my-auto max-h-[90vh]">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Record Payment</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Invoice #{invoice.invoiceNo}</p>
            <p className="text-[11px] text-primary font-black uppercase tracking-tight">{invoice.partyName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24}/></button>
        </div>

        {/* Summary row */}
        <div className="px-6 md:px-8 py-4 bg-slate-50/50 border-b border-slate-50 grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Payable (+Penalty)</p>
            <p className="text-base font-black text-slate-800">₹{(invoice.totalInvoice + calculatedPenalty).toLocaleString()}</p>
          </div>
          <div className={cn('p-3 rounded-xl border shadow-sm', remainingBalance<=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100')}>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Final Balance Due</p>
            <p className={cn('text-base font-black', remainingBalance<=0?'text-emerald-600':'text-rose-600')}>₹{remainingBalance.toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Penalty */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Late Payment Penalty (%)</span>
              <input type="number" step="0.1" value={formData.latePenaltyPercentage}
                onChange={e=>setFormData({...formData,latePenaltyPercentage:parseFloat(e.target.value)||0})}
                className="bg-transparent border-b border-amber-200 text-lg font-black text-amber-900 focus:border-amber-500 outline-none w-20"/>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block">Penalty Charge</span>
              <span className="text-xl font-black text-amber-900">₹{calculatedPenalty.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <FormInput label="Received Amount" type="number" value={formData.receivedAmount} onChange={(v:string)=>setFormData({...formData,receivedAmount:parseFloat(v)||0})} required/>
            <FormInput label="TDS Amount"       type="number" value={formData.tdsAmount}      onChange={(v:string)=>setFormData({...formData,tdsAmount:parseFloat(v)||0})}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <FormInput label="Payment Date" type="date"   value={formData.paymentDate} onChange={(v:string)=>setFormData({...formData,paymentDate:v})}/>
            <FormInput label="Payment Mode" type="select" options={['NEFT','IMPS','UPI','Cheque','Cash']} value={formData.paymentMode} onChange={(v:string)=>setFormData({...formData,paymentMode:v})}/>
          </div>
          <FormInput label="Transaction Reference" value={formData.transactionRef} onChange={(v:string)=>setFormData({...formData,transactionRef:v})} placeholder="UTR Number / Cheque No."/>
          <FormInput label="Remarks"                value={formData.remarks}        onChange={(v:string)=>setFormData({...formData,remarks:v})}        placeholder="Internal notes..."/>
        </form>

        <div className="sticky bottom-0 z-20 bg-white border-t border-slate-50 p-6 md:p-8">
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={20} className="animate-spin"/> : <ShieldCheck size={20}/>}
            {loading ? 'Processing...' : 'Save Payment & Penalty'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
