import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { 
  Plus, 
  X,
  AlertCircle,
  Upload,
  Calendar,
  Building,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  ShieldCheck,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  CheckCircle2,
  Edit2,
  ArrowLeft,
  Save,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { cn } from '@/lib/utils';
import { type Tenant, type Company } from '../src/types';

async function compressPDF(file: File, onProgress: (pct: number) => void) {
  // Simple pass-through for now as true PDF compression is client-side heavy
  onProgress(100);
  return file;
}

export default function TenantFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [compressing, setCompressing] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);
  const [gstSuccess, setGstSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('0 KB/s');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const { register, handleSubmit, control, setValue, getValues, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      code: `TN${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      company: '',
      property: '',
      contactPerson: '',
      designation: '',
      mobile: '',
      email: '',
      leaseStart: '',
      leaseEnd: '',
      tenure: 12,
      lockIn: 6,
      noticePeriod: 60,
      escalationPercent: 5,
      nextEscalationDate: '',
      securityDeposit: 0,
      currentRent: 0,
      gstNo: '',
      panNumber: '',
      legalName: '',
      billingAddress: '',
      state: '',
      pincode: '',
      agreementStatus: 'Pending' as const,
      agreementFileUrl: '',
      agreementFileType: 'PDF',
      rentFreePeriodDays: 0,
      alternateContactPerson: '',
      rentalPurpose: '',
      openingBalanceAmount: 0,
      openingBalanceType: 'Debit' as const,
      openingBalanceDate: new Date().toISOString().split('T')[0],
      openingBalanceNotes: ''
    }
  });

  useEffect(() => {
    fetchCompanies();
    if (id) {
      fetchTenant();
    }
  }, [id]);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get('/api/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchTenant = async () => {
    try {
      const res = await axios.get(`/api/tenants/${id}`);
      setTenant(res.data);
      reset(res.data);
    } catch (err) {
      console.error('Error fetching tenant:', err);
      toast.error('Failed to load tenant data');
      navigate('/tenants');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleGstFetch = async (gstNo: string) => {
    if (!gstNo) return;
    
    // GST Regex validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
    if (!gstRegex.test(gstNo)) return;

    setGstLoading(true);
    setGstSuccess(false);
    try {
      const res = await fetch(`/api/gst/${gstNo}`);
      if (!res.ok) throw new Error('GST service unavailable');
      const data = await res.json();
      
      if (data.billingAddress || data.address) {
        setValue('billingAddress', data.billingAddress || data.address);
        setGstSuccess(true);
        toast.success('Business address autofilled');
      }
    } catch (err) {
      console.error('GST details fetch error:', err);
    } finally {
      setGstLoading(false);
    }
  };

  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    let finalFile = file;

    if (file.type.includes('image')) {
      setCompressing(true);
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (pct: number) => setUploadProgress(pct)
        };
        finalFile = await imageCompression(file, options);
      } catch (err) {
        console.error('Image compression failed:', err);
      } finally {
        setCompressing(false);
      }
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
    setUploadProgress(0);
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && key !== 'agreementFile') {
          formData.append(key, data[key]);
        }
      });

      if (agreementFile) {
        formData.append('agreementFile', agreementFile);
      }
      
      const config = {
        timeout: 300000,
        onUploadProgress: (progressEvent: any) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(pct);
          const elapsed = (Date.now() - startTime) / 1000;
          const bytesPerSec = progressEvent.loaded / elapsed;
          setUploadSpeed(bytesPerSec > 1024 * 1024 
            ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s` 
            : `${(bytesPerSec / 1024).toFixed(0)} KB/s`);
        }
      };

      if (id) {
        await axios.put(`/api/tenants/${id}`, formData, config);
        toast.success('Tenant updated successfully');
      } else {
        await axios.post('/api/tenants', formData, config);
        toast.success('Tenant created successfully');
      }
      navigate('/tenants');
    } catch (err: any) {
      console.error('Error saving tenant:', err);
      toast.error(err.response?.data?.error || 'Failed to save tenant');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Section - Flush Sticky SaaS Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 -mx-4 md:-mx-6 lg:-mx-8 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/tenants')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to Tenant List"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {id ? 'Update Tenant Record' : 'Create New Tenant'}
              </h1>
              <p className="text-sm text-gray-500">
                {id ? 'Modify existing tenant details' : 'Add tenant details and configure setup'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => navigate('/tenants')}
              className="h-[44px] px-6 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all text-sm border border-slate-200 bg-white"
            >
              Cancel
            </button>
            <button 
              type="submit"
              onClick={handleSubmit(onFormSubmit)}
              disabled={loading || compressing}
              className="h-[44px] px-8 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{id ? 'Save Changes' : 'Create Tenant'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full">
        <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Registration & Legal Details</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Legal / Registered Name <span className="text-red-500">*</span></label>
                  <input {...register('name', { required: true })} className="form-input-compact" placeholder="Enter legal entity name" />
                  {errors.name && <span className="text-[10px] text-red-500 px-1 font-bold">This field is mandatory</span>}
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Registered Company</label>
                  <Controller
                    name="company"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={companies.map(c => ({ value: c.companyName, label: c.companyName }))}
                        placeholder="Select registered company..."
                        isClearable
                        value={companies.map(c => ({ value: c.companyName, label: c.companyName })).find(o => o.value === field.value)}
                        onChange={(opt: any) => field.onChange(opt ? opt.value : '')}
                        styles={customSelectStylesCompact}
                      />
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">State / Region <span className="text-red-500">*</span></label>
                  <input {...register('state', { required: true })} className="form-input-compact" placeholder="Select state" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Pincode <span className="text-red-500">*</span></label>
                  <input {...register('pincode', { required: true })} className="form-input-compact" placeholder="Enter pincode" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">GST Number (Optional)</label>
                  <div className="relative">
                    <input 
                      {...register('gstNo')} 
                      className="form-input-compact pr-10" 
                      placeholder="Enter GSTIN" 
                      onBlur={(e) => handleGstFetch(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {gstLoading ? <Loader2 size={14} className="animate-spin text-primary" /> : (gstSuccess && <CheckCircle2 size={14} className="text-emerald-500" />)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">PAN Number (Optional)</label>
                  <input {...register('panNumber')} className="form-input-compact" placeholder="Enter PAN" />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Billing / Office Address <span className="text-red-500">*</span></label>
                  <textarea 
                    {...register('billingAddress', { required: true })} 
                    rows={4}
                    className="form-input-compact min-h-[120px] py-3 leading-relaxed resize-none" 
                    placeholder="Enter complete office address for billing..."
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Contact Information</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Primary Point of Contact</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Contact Person <span className="text-red-500">*</span></label>
                  <input {...register('contactPerson', { required: true })} className="form-input-compact" placeholder="Full Name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Designation</label>
                  <input {...register('designation')} className="form-input-compact" placeholder="Position / Role" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input {...register('mobile', { required: true })} className="form-input-compact" placeholder="+91" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email <span className="text-red-500">*</span></label>
                  <input {...register('email', { required: true })} type="email" className="form-input-compact" placeholder="email@address.com" />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Alternate Contact Person</label>
                  <input {...register('alternateContactPerson')} className="form-input-compact" placeholder="Secondary contact information" />
                </div>
              </div>
            </div>

            {/* Lease & Property Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Lease & Property</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Agreement & Location Setup</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Monthly Rent</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input {...register('currentRent')} type="number" className="form-input-compact pl-9" placeholder="0.00" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Escalation %</label>
                  <input {...register('escalationPercent')} type="number" step="0.1" className="form-input-compact" placeholder="5.0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Rent Free (Days)</label>
                  <input {...register('rentFreePeriodDays')} type="number" className="form-input-compact" placeholder="0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Lease Start</label>
                  <input {...register('leaseStart')} type="date" className="form-input-compact" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Lease End</label>
                  <input {...register('leaseEnd')} type="date" className="form-input-compact" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Tenure (Mo)</label>
                  <input {...register('tenure')} type="number" className="form-input-compact" />
                </div>
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Rental Purpose</label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <select 
                      className="form-input-compact flex-1"
                      value={['Office', 'Bank', 'Nescafe', 'ATM', 'Retail Shop', 'Restaurant', 'Warehouse', 'Clinic', 'Salon', 'Showroom'].includes(watch('rentalPurpose')) ? watch('rentalPurpose') : (watch('rentalPurpose') ? 'Other' : '')}
                      onChange={(e) => {
                        if (e.target.value !== 'Other') {
                          setValue('rentalPurpose', e.target.value);
                        } else {
                          setValue('rentalPurpose', '');
                        }
                      }}
                    >
                      <option value="">Select Purpose...</option>
                      <option value="Office">Office</option>
                      <option value="Bank">Bank</option>
                      <option value="Nescafe">Nescafe</option>
                      <option value="ATM">ATM</option>
                      <option value="Retail Shop">Retail Shop</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Clinic">Clinic</option>
                      <option value="Salon">Salon</option>
                      <option value="Showroom">Showroom</option>
                      <option value="Other">Other</option>
                    </select>
                    {(!['Office', 'Bank', 'Nescafe', 'ATM', 'Retail Shop', 'Restaurant', 'Warehouse', 'Clinic', 'Salon', 'Showroom'].includes(watch('rentalPurpose')) || watch('rentalPurpose') === 'Other') && (
                      <input 
                        {...register('rentalPurpose')} 
                        className="form-input-compact flex-1" 
                        placeholder="Please specify..." 
                      />
                    )}
                  </div>
                </div>
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Premises Address</label>
                  <textarea {...register('property')} rows={2} className="form-input-compact min-h-[100px] py-3 resize-none" placeholder="Exact unit / premises details..." />
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Attachments</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Lease Agreement Document</p>
              </div>

              <div className="space-y-4">
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf,image/*" 
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer text-center group",
                    agreementFile ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-50"
                  )}
                >
                  {agreementFile || filePreview ? (
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border border-slate-100">
                        {agreementFile?.type.includes('image') ? <FileText size={24} /> : <FileCheck size={24} />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 truncate max-w-[280px]">
                          {agreementFile ? agreementFile.name : 'Agreement Attachment'}
                        </p>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setAgreementFile(null); setFilePreview(null); }}
                          className="text-[11px] font-bold text-red-500 hover:underline uppercase tracking-widest"
                        >
                          Remove and Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors border border-slate-100 mb-3">
                        <Upload size={20} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">Click to Upload Agreement</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">PDF or High-res Image (Max 25MB)</p>
                    </div>
                  )}
                </div>

                {loading && uploadProgress > 0 && (
                  <div className="space-y-2">
                     <div className="flex justify-between text-[10px] font-bold">
                       <span className="text-slate-400 uppercase tracking-widest italic">{uploadSpeed}</span>
                       <span className="text-primary">{uploadProgress}% Complete</span>
                     </div>
                     <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${uploadProgress}%` }}
                         className="h-full bg-primary"
                       />
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area - Sticky Right Rail */}
          <div className="space-y-6">
            <div className="sticky top-[88px] space-y-6">
              {/* Initial Balance Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 flex flex-col">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Opening Balance</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Financial Handover</p>
                </div>
                
                <div className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Balance Amount <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input {...register('openingBalanceAmount')} type="number" className="form-input-compact pl-9" placeholder="0.00" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Transaction Type</label>
                    <select {...register('openingBalanceType')} className="form-input-compact">
                      <option value="Debit">Debit (Pending Dues)</option>
                      <option value="Credit">Credit (Advance Fee)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Reference Date</label>
                    <input {...register('openingBalanceDate')} type="date" className="form-input-compact" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Notes</label>
                    <textarea 
                      {...register('openingBalanceNotes')} 
                      rows={2}
                      className="form-input-compact py-3 resize-none leading-relaxed text-sm" 
                      placeholder="Add brief details..."
                    />
                  </div>
                </div>

                <div className="p-4 bg-orange-50/80 rounded-xl border border-orange-100 flex gap-3">
                  <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-orange-900/80 leading-normal font-medium">
                    This balance will initialize the tenant ledger.
                  </p>
                </div>
              </div>

              {/* Status & Secondary Details */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                 <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Agreement Lifecycle</label>
                    <select {...register('agreementStatus')} className="form-input-compact">
                      <option value="Pending">Pending Verification</option>
                      <option value="Active">Operational / Active</option>
                      <option value="Expired">Record Expired</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">System Tenant Code</label>
                    <input {...register('code')} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-mono text-xs cursor-not-allowed select-none" />
                  </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

}

const customSelectStylesCompact = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'white',
    borderColor: state.isFocused ? '#F97316' : '#E2E8F0',
    borderRadius: '0.75rem',
    minHeight: '48px',
    padding: '0 8px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    transition: 'all 0.15s ease',
    '&:hover': {
      borderColor: '#F97316'
    }
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#94A3B8'
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    marginTop: '4px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
    zIndex: 1000
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F97316' : state.isFocused ? '#F7F9FC' : 'white',
    color: state.isSelected ? 'white' : '#475569',
    fontSize: '0.875rem',
    fontWeight: state.isSelected ? '600' : '400',
    padding: '8px 16px',
    '&:active': {
      backgroundColor: '#F97316'
    }
  })
};
