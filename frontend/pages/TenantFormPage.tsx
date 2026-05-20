import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import {
  ArrowLeft, ArrowRight, Plus, Upload, IndianRupee,
  FileCheck, FileText, Loader2, CheckCircle2, AlertCircle,
  User as UserIcon, Phone, Mail, MapPin, Building,
  Calendar, ShieldCheck, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { cn } from '@/lib/utils';
import { type Tenant, type Company } from '../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const inp = "w-full h-11 px-4 bg-white border-2 border-slate-100 rounded-xl text-sm text-slate-800 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-50 placeholder:text-slate-300 font-medium";
const lbl = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

function Field({ label, required, children, error, hint }: any) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-orange-500 ml-0.5">*</span>}</label>
      {children}
      {hint && !error && <p className="text-[10px] text-slate-400 mt-1 font-medium">{hint}</p>}
      {error && <p className="text-[10px] text-red-500 mt-1 font-bold">{error}</p>}
    </div>
  );
}

// ── Steps config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Tenant Info',     sub: 'Legal & Contact Details' },
  { id: 2, title: 'Lease & Property', sub: 'Agreement Setup'       },
  { id: 3, title: 'Financials',      sub: 'Rent & Deposits'        },
  { id: 4, title: 'Documents',       sub: 'Attachments & Status'   },
];

const SELECT_STYLES = {
  control: (b: any, s: any) => ({ ...b, minHeight: 44, borderRadius: 12, borderWidth: 2, borderColor: s.isFocused ? '#FB923C' : '#f1f5f9', backgroundColor: '#fff', boxShadow: s.isFocused ? '0 0 0 4px rgba(251,146,60,0.1)' : 'none', fontSize: 14, fontWeight: 500, '&:hover': { borderColor: '#FB923C' } }),
  placeholder: (b: any) => ({ ...b, color: '#cbd5e1', fontSize: 13 }),
  menu: (b: any) => ({ ...b, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', zIndex: 1000 }),
  option: (b: any, s: any) => ({ ...b, background: s.isSelected ? '#f97316' : s.isFocused ? '#fff7ed' : '#fff', color: s.isSelected ? '#fff' : '#475569', fontWeight: s.isSelected ? 700 : 500, fontSize: 13 }),
};

export default function TenantFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [step,            setStep]           = useState(1);
  const [loading,         setLoading]        = useState(false);
  const [initialLoading,  setInitialLoading] = useState(!!id);
  const [compressing,     setCompressing]    = useState(false);
  const [gstLoading,      setGstLoading]     = useState(false);
  const [gstSuccess,      setGstSuccess]     = useState(false);
  const [uploadProgress,  setUploadProgress] = useState(0);
  const [uploadSpeed,     setUploadSpeed]    = useState('0 KB/s');
  const [agreementFile,   setAgreementFile]  = useState<File | null>(null);
  const [filePreview,     setFilePreview]    = useState<string | null>(null);
  const [companies,       setCompanies]      = useState<Company[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      code: `TN${Math.floor(1000 + Math.random() * 9000)}`,
      name: '', company: '', property: '', contactPerson: '', designation: '',
      mobile: '', email: '', alternateContactPerson: '', rentalPurpose: '',
      leaseStart: '', leaseEnd: '', tenure: 12, lockIn: 6, noticePeriod: 60,
      escalationPercent: 5, nextEscalationDate: '', securityDeposit: 0,
      currentRent: 0, rentFreePeriodDays: 0, gstNo: '', panNumber: '',
      legalName: '', billingAddress: '', state: '', pincode: '',
      agreementStatus: 'Pending' as const, agreementFileUrl: '', agreementFileType: 'PDF',
      openingBalanceAmount: 0, openingBalanceType: 'Debit' as const,
      openingBalanceDate: new Date().toISOString().split('T')[0], openingBalanceNotes: ''
    }
  });

  useEffect(() => { fetchCompanies(); if (id) fetchTenant(); }, [id]);

  const fetchCompanies = async () => {
    try { const r = await axios.get('/api/companies'); setCompanies(r.data); } catch {}
  };

  const fetchTenant = async () => {
    try { const r = await axios.get(`/api/tenants/${id}`); reset(r.data); }
    catch { toast.error('Failed to load tenant'); navigate('/tenants'); }
    finally { setInitialLoading(false); }
  };

  const handleGstFetch = async (gstNo: string) => {
    if (!gstNo || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/.test(gstNo)) return;
    setGstLoading(true); setGstSuccess(false);
    try {
      const r = await fetch(`/api/gst/${gstNo}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.billingAddress || d.address) { setValue('billingAddress', d.billingAddress || d.address); setGstSuccess(true); toast.success('Address autofilled'); }
    } catch {} finally { setGstLoading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ── File size check ──
 const maxSize = 20 * 1024 * 1024; // 10MB limit
  if (file.size > maxSize) {
    toast.error('File too large! Please upload under 10MB.');
    return;
  }

  let finalFile = file;

  if (file.type.includes('image')) {
    setCompressing(true);
    try {
      finalFile = await imageCompression(file, {
        maxSizeMB: 1,           // ← 1MB tak compress
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        onProgress: p => setUploadProgress(p)
      });
      toast.success(`Compressed: ${(finalFile.size/1024).toFixed(0)} KB`);
    } catch { 
      toast.error('Compression failed');
    } finally { setCompressing(false); }
  }

  // PDF bhi check karo
if (file.type === 'application/pdf' && file.size > 20 * 1024 * 1024) {
  toast.error('PDF too large! Max 20MB allowed.');
}

  setAgreementFile(finalFile);
  setUploadProgress(0);

  if (finalFile.type.includes('image')) {
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(finalFile);
  } else {
    setFilePreview(null);
  }
};

  const onFormSubmit = async (data: any) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const formData = new FormData();
      Object.keys(data).forEach(k => { if (data[k] !== null && data[k] !== undefined) formData.append(k, data[k]); });
      if (agreementFile) formData.append('agreementFile', agreementFile);
      const config = { timeout: 300000, onUploadProgress: (e: any) => { const pct = Math.round((e.loaded * 100) / (e.total || 1)); setUploadProgress(pct); const bps = e.loaded / ((Date.now() - startTime) / 1000); setUploadSpeed(bps > 1048576 ? `${(bps/1048576).toFixed(1)} MB/s` : `${(bps/1024).toFixed(0)} KB/s`); } };
      if (id) { await axios.put(`/api/tenants/${id}`, formData, config); toast.success('Tenant updated'); }
      else     { await axios.post('/api/tenants', formData, config);    toast.success('Tenant created'); }
      navigate('/tenants');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to save tenant'); }
    finally { setLoading(false); }
  };

  if (initialLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <Loader2 size={36} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
    </div>
  );

  const totalSteps = STEPS.length;
  const canNext = step < totalSteps;
  const canPrev = step > 1;

  return (
    <div style={{ minHeight:'100vh', background:'#F4F6FA', paddingBottom:60 }}>

      {/* ── Orange Top Bar ── */}
      <div style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', height:8, width:'100%' }}/>

      {/* ── Sticky Header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8edf4', position:'sticky', top:0, zIndex:50, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => navigate('/tenants')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:6, borderRadius:8, display:'flex' }}>
              <ArrowLeft size={18}/>
            </button>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.2px' }}>{id ? 'Update Tenant Record' : 'Create New Tenant'}</p>
              <p style={{ fontSize:10, color:'#94a3b8', margin:0, fontWeight:500 }}>Step {step} of {totalSteps} — {STEPS[step-1].sub}</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={() => navigate('/tenants')} style={{ padding:'7px 16px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:12, fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
            {step === totalSteps && (
              <button onClick={handleSubmit(onFormSubmit)} disabled={loading || compressing}
                style={{ padding:'7px 18px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, boxShadow:'0 2px 8px rgba(249,115,22,0.3)', fontFamily:'inherit', opacity: loading ? 0.6 : 1 }}>
                {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Save size={14}/>}
                {id ? 'Save Changes' : 'Create Tenant'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div onClick={() => setStep(s.id)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 14px', borderRadius:10, background: step === s.id ? 'rgba(249,115,22,0.08)' : 'transparent', transition:'all 0.15s' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background: step > s.id ? '#10b981' : step === s.id ? '#f97316' : '#e8edf4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
                  {step > s.id ? <CheckCircle2 size={15} color="#fff"/> : <span style={{ fontSize:11, fontWeight:800, color: step === s.id ? '#fff' : '#94a3b8' }}>{s.id}</span>}
                </div>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <span style={{ fontSize:11, fontWeight:700, color: step === s.id ? '#f97316' : step > s.id ? '#10b981' : '#94a3b8', whiteSpace:'nowrap' }}>{s.title}</span>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex:1, height:2, background: step > s.id ? '#10b981' : '#e8edf4', transition:'background 0.3s', minWidth:16 }}/>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Form Card ── */}
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
              style={{ background:'#fff', borderRadius:20, border:'1px solid #e8edf4', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>

              {/* Card section header */}
              <div style={{ borderBottom:'2px solid #f8fafc', padding:'20px 28px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'rgba(249,115,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {[<UserIcon size={15} color="#f97316"/>, <Building size={15} color="#f97316"/>, <IndianRupee size={15} color="#f97316"/>, <FileCheck size={15} color="#f97316"/>][step-1]}
                </div>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>{STEPS[step-1].title}</p>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:0, fontWeight:500 }}>{STEPS[step-1].sub}</p>
                </div>
              </div>

              <div style={{ padding:'28px' }}>

                {/* ── STEP 1: Tenant Info ── */}
                {step === 1 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <div style={{ gridColumn:'1/-1' }}>
                        <Field label="Legal / Registered Name" required error={errors.name && 'Required'}>
                          <input {...register('name', { required:true })} className={inp} placeholder="e.g. Arjun Mehta Enterprises Pvt. Ltd."/>
                        </Field>
                      </div>
                      <div style={{ gridColumn:'1/-1' }}>
                        <Field label="Registered Company">
                          <Controller name="company" control={control} render={({ field }) => (
                            <Select options={companies.map(c=>({ value:c.companyName, label:c.companyName }))} placeholder="Select company..." isClearable
                              value={companies.map(c=>({ value:c.companyName, label:c.companyName })).find(o=>o.value===field.value)}
                              onChange={(opt:any) => field.onChange(opt?.value || '')} styles={SELECT_STYLES}/>
                          )}/>
                        </Field>
                      </div>
                      <Field label="Contact Person Name" required error={errors.contactPerson && 'Required'}>
                        <input {...register('contactPerson', { required:true })} className={inp} placeholder="Full Name"/>
                </Field>
                      <Field label="Designation">
                        <input {...register('designation')} className={inp} placeholder="Position / Role"/>
                      </Field>
                      <Field label="Mobile" required error={errors.mobile && 'Required'}>
                        <input {...register('mobile', { required:true })} className={inp} placeholder="+91 98765 43210"/>
                      </Field>
                      <Field label="Email" required error={errors.email && 'Required'}>
                        <input {...register('email', { required:true })} type="email" className={inp} placeholder="email@company.com"/>
                      </Field>
                      <div style={{ gridColumn:'1/-1' }}>
                        <Field label="Alternate Contact">
                          <input {...register('alternateContactPerson')} className={inp} placeholder="Secondary contact name / number"/>
                        </Field>
                      </div>
                      <Field label="GST Number" hint="Address will autofill on valid GSTIN">
                        <div style={{ position:'relative' }}>
                          <input {...register('gstNo')} className={inp} placeholder="e.g. 27AABCA1234Z1Z5" onBlur={e=>handleGstFetch(e.target.value)}/>
                          <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
                            {gstLoading ? <Loader2 size={14} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/> : gstSuccess ? <CheckCircle2 size={14} color="#10b981"/> : null}
                          </div>
                        </div>
                      </Field>
                      <Field label="PAN Number">
                        <input {...register('panNumber')} className={inp} placeholder="e.g. AABCA1234Z"/>
                      </Field>
                      <Field label="State" required error={errors.state && 'Required'}>
                        <input {...register('state', { required:true })} className={inp} placeholder="e.g. Madhya Pradesh"/>
                      </Field>
                      <Field label="Pincode" required error={errors.pincode && 'Required'}>
                        <input {...register('pincode', { required:true })} className={inp} placeholder="e.g. 474001"/>
                      </Field>
                      <div style={{ gridColumn:'1/-1' }}>
                        <Field label="Billing / Office Address" required error={errors.billingAddress && 'Required'}>
                          <textarea {...register('billingAddress', { required:true })} rows={3} className={inp} style={{ height:'auto', padding:'12px 16px', resize:'none', lineHeight:1.6 }} placeholder="Complete office address for billing..."/>
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Lease & Property ── */}
                {step === 2 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <Field label="Premises / Property Address" required error={errors.property && 'Required'}>
                        <textarea {...register('property', { required:true })} rows={2} className={inp} style={{ height:'auto', padding:'12px 16px', resize:'none', lineHeight:1.6 }} placeholder="e.g. Tower A, 3rd Floor, Neo Meridian, Gwalior (M.P)"/>
                      </Field>
                    </div>
                    <Field label="Lease Start Date">
                      <input {...register('leaseStart')} type="date" className={inp}/>
                    </Field>
                    <Field label="Lease End Date">
                      <input {...register('leaseEnd')} type="date" className={inp}/>
                    </Field>
                    <Field label="Tenure (Months)">
                      <input {...register('tenure')} type="number" className={inp} placeholder="12"/>
                    </Field>
                    <Field label="Lock-in Period (Months)">
                      <input {...register('lockIn')} type="number" className={inp} placeholder="6"/>
                    </Field>
                    <Field label="Notice Period (Days)">
                      <input {...register('noticePeriod')} type="number" className={inp} placeholder="60"/>
                    </Field>
                    <Field label="Rent-Free Period (Days)">
                      <input {...register('rentFreePeriodDays')} type="number" className={inp} placeholder="0"/>
                    </Field>
                    <div style={{ gridColumn:'1/-1' }}>
                      <Field label="Rental Purpose">
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <select className={inp} style={{ cursor:'pointer' }}
                            value={['Office','Bank','Nescafe','ATM','Retail Shop','Restaurant','Warehouse','Clinic','Salon','Showroom'].includes(watch('rentalPurpose')) ? watch('rentalPurpose') : (watch('rentalPurpose') ? 'Other' : '')}
                            onChange={e => { if (e.target.value !== 'Other') setValue('rentalPurpose', e.target.value); else setValue('rentalPurpose',''); }}>
                            <option value="">Select purpose...</option>
                            {['Office','Bank','Nescafe','ATM','Retail Shop','Restaurant','Warehouse','Clinic','Salon','Showroom','Other'].map(o => <option key={o}>{o}</option>)}
                          </select>
                          {!['Office','Bank','Nescafe','ATM','Retail Shop','Restaurant','Warehouse','Clinic','Salon','Showroom'].includes(watch('rentalPurpose')) && (
                            <input {...register('rentalPurpose')} className={inp} placeholder="Specify purpose..."/>
                          )}
                        </div>
                      </Field>
                    </div>
                    <Field label="Next Escalation Date">
                      <input {...register('nextEscalationDate')} type="date" className={inp}/>
                    </Field>
                    <Field label="Agreement Status">
                      <select {...register('agreementStatus')} className={inp} style={{ cursor:'pointer' }}>
                        <option value="Pending">Pending Verification</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </Field>
                    <div style={{ gridColumn:'1/-1' }}>
                      <Field label="System Tenant Code">
                        <input {...register('code')} readOnly className={inp} style={{ background:'#f8fafc', color:'#94a3b8', cursor:'not-allowed', fontFamily:'monospace', fontSize:13 }}/>
                      </Field>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Financials ── */}
                {step === 3 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <Field label="Monthly Rent (₹)" required>
                      <div style={{ position:'relative' }}>
                        <IndianRupee size={14} color="#94a3b8" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
                        <input {...register('currentRent')} type="number" className={inp} style={{ paddingLeft:32 }} placeholder="0.00"/>
                      </div>
                    </Field>
                    <Field label="Escalation (% per year)">
                      <input {...register('escalationPercent')} type="number" step="0.1" className={inp} placeholder="5"/>
                    </Field>
                    <Field label="Security Deposit (₹)">
                      <div style={{ position:'relative' }}>
                        <IndianRupee size={14} color="#94a3b8" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
                        <input {...register('securityDeposit')} type="number" className={inp} style={{ paddingLeft:32 }} placeholder="0.00"/>
                      </div>
                    </Field>
                    <div/>
                    {/* Opening Balance */}
                    <div style={{ gridColumn:'1/-1', paddingTop:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                        <div style={{ width:3, height:16, background:'#f97316', borderRadius:2 }}/>
                        <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Opening Balance</p>
                      </div>
                      <div style={{ background:'#f8fafc', borderRadius:14, padding:'20px', border:'1px solid #e8edf4' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                          <Field label="Balance Amount (₹)">
                            <div style={{ position:'relative' }}>
                              <IndianRupee size={14} color="#94a3b8" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
                              <input {...register('openingBalanceAmount')} type="number" className={inp} style={{ paddingLeft:32 }} placeholder="0.00"/>
                            </div>
                          </Field>
                          <Field label="Transaction Type">
                            <select {...register('openingBalanceType')} className={inp} style={{ cursor:'pointer' }}>
                              <option value="Debit">Debit (Pending Dues)</option>
                              <option value="Credit">Credit (Advance)</option>
                            </select>
                          </Field>
                          <Field label="Reference Date">
                            <input {...register('openingBalanceDate')} type="date" className={inp}/>
                          </Field>
                          <Field label="Notes">
                            <input {...register('openingBalanceNotes')} className={inp} placeholder="Brief note..."/>
                          </Field>
                        </div>
                        <div style={{ marginTop:14, padding:'10px 14px', background:'#fff7ed', borderRadius:10, border:'1px solid #fed7aa', display:'flex', alignItems:'flex-start', gap:8 }}>
                          <AlertCircle size={14} color="#f97316" style={{ flexShrink:0, marginTop:1 }}/>
                          <p style={{ fontSize:11, color:'#92400e', margin:0, fontWeight:500, lineHeight:1.5 }}>This initializes the tenant ledger with any prior balance carried forward.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Documents ── */}
                {step === 4 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" style={{ display:'none' }}/>

                    {/* Upload zone */}
                    <div onClick={() => fileInputRef.current?.click()}
                      style={{ border:`2px dashed ${agreementFile ? '#10b981' : '#e2e8f0'}`, borderRadius:16, padding:'36px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background: agreementFile ? '#f0fdf4' : '#fafbfd', textAlign:'center', transition:'all 0.15s' }}>
                      {agreementFile ? (
                        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{ width:44, height:44, background:'#fff', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                            {agreementFile.type.includes('image') ? <FileText size={22} color="#10b981"/> : <FileCheck size={22} color="#10b981"/>}
                          </div>
                          <div style={{ textAlign:'left' }}>
                            <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>{agreementFile.name}</p>
                            <button type="button" onClick={e => { e.stopPropagation(); setAgreementFile(null); setFilePreview(null); }}
                              style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'none', border:'none', cursor:'pointer', padding:0, marginTop:2 }}>
                              Remove File
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ width:48, height:48, background:'#fff', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:12 }}>
                            <Upload size={22} color="#94a3b8"/>
                          </div>
                          <p style={{ fontSize:14, fontWeight:700, color:'#475569', margin:0 }}>Click to Upload Agreement</p>
                          <p style={{ fontSize:11, color:'#94a3b8', marginTop:5, fontWeight:500 }}>PDF or Image — Max 25MB</p>
                        </>
                      )}
                    </div>

                    {/* Upload progress */}
                    {loading && uploadProgress > 0 && (
                      <div style={{ padding:'14px 16px', background:'#f8fafc', borderRadius:12, border:'1px solid #e8edf4' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                          <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8' }}>{uploadSpeed}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:'#f97316' }}>{uploadProgress}%</span>
                        </div>
                        <div style={{ height:6, background:'#e8edf4', borderRadius:6, overflow:'hidden' }}>
                          <motion.div initial={{ width:0 }} animate={{ width:`${uploadProgress}%` }} style={{ height:'100%', background:'#f97316', borderRadius:6 }}/>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div style={{ background:'#f8fafc', borderRadius:14, padding:'20px', border:'1px solid #e8edf4' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                        <div style={{ width:3, height:16, background:'#f97316', borderRadius:2 }}/>
                        <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Summary</p>
                      </div>
                      {[
                        ['Tenant Name',    watch('name')],
                        ['Company',        watch('company')],
                        ['Property',       watch('property')],
                        ['Monthly Rent',   watch('currentRent') ? `₹${Number(watch('currentRent')).toLocaleString()}` : '—'],
                        ['Lease Period',   watch('leaseStart') ? `${watch('leaseStart')} → ${watch('leaseEnd')}` : '—'],
                        ['Status',         watch('agreementStatus')],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #e8edf4' }}>
                          <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{k}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', maxWidth:200, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Navigation Footer ── */}
              <div style={{ borderTop:'1px solid #f1f5f9', padding:'16px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafbfd' }}>
                <button type="button" onClick={() => setStep(s => s - 1)} disabled={!canPrev}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background: canPrev ? '#fff' : 'transparent', border: canPrev ? '1.5px solid #e2e8f0' : 'none', borderRadius:10, fontSize:13, fontWeight:600, color: canPrev ? '#475569' : 'transparent', cursor: canPrev ? 'pointer' : 'default', fontFamily:'inherit' }}>
                  <ArrowLeft size={14}/> Previous
                </button>
                <div style={{ display:'flex', gap:6 }}>
                  {STEPS.map(s => (
                    <div key={s.id} style={{ width: step === s.id ? 20 : 6, height:6, borderRadius:4, background: step >= s.id ? '#f97316' : '#e8edf4', transition:'all 0.3s' }}/>
                  ))}
                </div>
                {canNext ? (
                  <button type="button" onClick={() => setStep(s => s + 1)}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(249,115,22,0.3)', fontFamily:'inherit' }}>
                    Next: {STEPS[step].title} <ArrowRight size={14}/>
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit(onFormSubmit)} disabled={loading || compressing}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(249,115,22,0.3)', fontFamily:'inherit', opacity: loading ? 0.7 : 1 }}>
                    {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Save size={14}/>}
                    {id ? 'Save Changes' : 'Create Tenant'}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
