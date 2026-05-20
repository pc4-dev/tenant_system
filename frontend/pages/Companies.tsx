import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Globe, 
  ChevronRight,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { type Company } from '../src/types';
import { cn } from '@/lib/utils';
import axios from 'axios';

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Company>>();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/companies');
      if (Array.isArray(res.data)) {
        setCompanies(res.data);
      } else {
        setCompanies([]);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch companies');
      setCompanies([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openAddModal = () => {
    setSelectedCompany(null);
    setLogoPreview(null);
    reset({
      status: true,
      state: 'Maharashtra'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setLogoPreview(company.logoUrl || null);
    reset({
      ...company
    });
    setIsModalOpen(true);
  };

  const openViewModal = (company: Company) => {
    setSelectedCompany(company);
    setViewModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });

      const logoInput = document.getElementById('logoFile') as HTMLInputElement;
      if (logoInput?.files?.[0]) {
        formData.append('logoFile', logoInput.files[0]);
      }

      if (selectedCompany) {
        await axios.put(`/api/companies/${selectedCompany.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('/api/companies', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error saving company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
      await axios.delete(`/api/companies/${id}`);
      fetchCompanies();
    } catch (err) {
      alert('Failed to delete company');
    }
  };

  const filteredCompanies = Array.isArray(companies) ? companies.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter ? c.state === stateFilter : true;
    return matchesSearch && matchesState;
  }) : [];

  const states = Array.isArray(companies) ? Array.from(new Set(companies.map(c => c.state).filter(Boolean))) : [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Company Master</h1>
          <p className="text-slate-500 mt-1">Manage multiple business entities and branding.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#F97316] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95"
        >
          <Plus size={20} />
          Add Company
        </button>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{companies.length}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Entities</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{companies.filter(c => c.status).length}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Companies</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <Globe size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{states.length || 0}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">State Presence</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">All States</option>
              {states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white h-64 rounded-3xl border border-slate-100 animate-pulse" />
          ))
        ) : filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <motion.div 
              layout
              key={company.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-2">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.companyName} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Building2 className="text-slate-300" size={24} />
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(company)} className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-500 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => openViewModal(company)} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleDelete(company.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-1">{company.companyName}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    <CheckCircle2 size={12} className={cn(company.status ? "text-green-500" : "text-slate-300")} />
                    {company.status ? 'Active Unit' : 'Inactive'}
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <MapPin size={14} />
                      </div>
                      <span className="line-clamp-1 truncate">{company.address || 'Address not listed'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <CreditCard size={14} />
                      </div>
                      <span className="font-mono text-[11px] font-bold tracking-tight text-slate-600">
                        {company.gstNumber || 'GSTIN PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-orange-600 text-[10px] font-bold">BK</div>
                  <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600 text-[10px] font-bold">TX</div>
                </div>
                <button 
                  onClick={() => openViewModal(company)}
                  className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 group/btn"
                >
                  View Profile 
                  <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="inline-flex w-16 h-16 bg-slate-50 rounded-2xl items-center justify-center text-slate-200 mb-4">
              <Building2 size={32} />
            </div>
            <p className="text-slate-400 font-medium">No companies found match your criteria.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full md:w-[95vw] max-w-4xl max-h-[92vh] md:max-h-[90vh] rounded-none md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    {selectedCompany ? 'Update Company Profile' : 'New Company Registration'}
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm mt-0.5">Enter business details and branding assets.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 md:static w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>


              <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-8 pt-6">
                <div className="space-y-10">
                  {/* Basic Info Seciton */}
                  <section>
                    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-4 h-px bg-orange-200"></span>
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Company Name *</label>
                        <input 
                          {...register('companyName', { required: 'Company name is required' })}
                          className={cn(
                            "w-full px-5 py-3.5 bg-slate-50 border rounded-2xl focus:outline-none transition-all",
                            errors.companyName ? "border-rose-200 bg-rose-50/30" : "border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          )}
                          placeholder="e.g. Swastik Grah Nirman Company"
                        />
                        {errors.companyName && <p className="text-rose-500 text-[10px] mt-1.5 ml-2 font-bold uppercase tracking-tight">{errors.companyName.message}</p>}
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Office Address</label>
                        <textarea 
                          {...register('address')}
                          rows={3}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          placeholder="Full address for invoice header..."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">GSTIN Number</label>
                        <input 
                          {...register('gstNumber')}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800 font-mono"
                          placeholder="27AAAAA0000A1Z5"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">State</label>
                        <input 
                          {...register('state')}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          placeholder="e.g. Maharashtra"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            {...register('status')} 
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                          <span className="ms-3 text-sm font-bold text-slate-600 uppercase tracking-tight">Active Business Unit</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Contact Section */}
                  <section>
                    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-4 h-px bg-orange-200"></span>
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            {...register('phoneNumber')}
                            className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            {...register('email')}
                            className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Bank Details */}
                  <section>
                    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-4 h-px bg-orange-200"></span>
                      Bank Details (For Payments)
                    </h3>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Account Holder Name</label>
                          <input 
                            {...register('accountHolderName')}
                            className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Bank Name</label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              {...register('bankName')}
                              className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Account Number</label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              {...register('accountNumber')}
                              className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">IFSC Code</label>
                          <input 
                            {...register('ifscCode')}
                            className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Branch</label>
                          <input 
                            {...register('branchName')}
                            className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Logo Branding Section */}
                  <section>
                    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-4 h-px bg-orange-200"></span>
                      Branding & Logo
                    </h3>
                    <div className="flex flex-col md:flex-row items-center gap-10">
                      <div className="w-32 h-32 rounded-3xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden p-4">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Building2 size={40} className="text-slate-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 ml-1">Choose Company Logo (PNG, JPG, SVG)</label>
                        <label className="flex items-center justify-center bg-white border-2 border-dashed border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 px-6 py-6 rounded-3xl cursor-pointer transition-all group">
                          <input 
                            type="file" 
                            id="logoFile" 
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden" 
                          />
                          <div className="text-center">
                            <Upload className="mx-auto mb-2 text-slate-400 group-hover:text-orange-500 transition-colors" size={24} />
                            <span className="text-xs font-bold text-slate-500 block">Click to upload brand logo</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Ideal size: 400x200px (Transparent)</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex items-center justify-end gap-4 mt-12 pt-10 border-t border-slate-100 sticky bottom-0 bg-white">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-[#F97316] hover:bg-orange-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Finalizing...' : (selectedCompany ? 'Update Profile' : 'Register Company')}
                    {!isSubmitting && <ChevronRight size={18} />}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {viewModalOpen && selectedCompany && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#F8FAFC] w-full md:w-[95vw] max-w-5xl rounded-none md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto overflow-x-hidden border border-white"
            >
              {/* Profile Card UI */}
              <div className="bg-[#1A1A2E] p-6 md:p-12 text-white relative flex-shrink-0">
                <div className="absolute top-4 right-4 z-50">
                  <button onClick={() => setViewModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-4 flex items-center justify-center shadow-2xl shrink-0 mt-4 md:mt-0">
                    {selectedCompany.logoUrl ? (
                      <img src={selectedCompany.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Building2 size={40} className="text-[#1A1A2E]" />
                    )}
                  </div>
                  <div className="text-center md:text-left space-y-3">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                       <span className="px-3 py-1 bg-orange-500 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">Registered Entity</span>
                    </div>
                    <h2 className="text-2xl md:text-5xl font-black tracking-tight leading-tight break-words">{selectedCompany.companyName}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-2 pt-1"><MapPin size={14} className="text-orange-500" /> {selectedCompany.state || 'India'}</div>
                      <div className="flex items-center gap-2 pt-1"><FileText size={14} className="text-orange-500" /> {selectedCompany.gstNumber || 'NO GSTIN'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-10 -mt-6">
                <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-xl p-4 md:p-8 space-y-10">
                  {/* Grid of details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1: Contact */}
                    <div className="space-y-6">
                      <div className="overflow-hidden break-all">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contact Details</h4>
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                              <Mail size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Primary Email</div>
                              <div className="text-sm font-bold text-slate-700 truncate md:whitespace-normal">{selectedCompany.email || '--'}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                              <Phone size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Business Phone</div>
                              <div className="text-sm font-bold text-slate-700">{selectedCompany.phoneNumber || '--'}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                              <MapPin size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Office Address</div>
                              <div className="text-sm font-bold text-slate-700 leading-relaxed">{selectedCompany.address || '--'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Bank */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Settlement Details</h4>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[32px] p-4 md:p-5 space-y-4 overflow-hidden">
                           <div className="flex justify-between items-center border-b border-white pb-3 gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Bank Name</span>
                              <span className="text-xs font-bold text-slate-700 text-right">{selectedCompany.bankName || '--'}</span>
                           </div>
                           <div className="flex justify-between items-center border-b border-white pb-3 gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Account No</span>
                              <span className="text-xs font-bold text-slate-700 font-mono break-all text-right">{selectedCompany.accountNumber || '--'}</span>
                           </div>
                           <div className="flex justify-between items-center border-b border-white pb-3 gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">IFSC</span>
                              <span className="text-xs font-bold text-slate-700 text-right">{selectedCompany.ifscCode || '--'}</span>
                           </div>
                           <div className="flex flex-col gap-1 pt-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Account Holder</span>
                              <span className="text-xs font-bold text-slate-700 break-words">{selectedCompany.accountHolderName || '--'}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex items-center justify-center sticky bottom-0 bg-white py-4 md:static md:bg-transparent">
                     <button 
                      onClick={() => { setViewModalOpen(false); openEditModal(selectedCompany); }}
                      className="w-full md:w-auto px-10 py-4 bg-[#1A1A2E] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                     >
                       <Edit size={16} /> Full Edit Profile
                     </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
