import { useEffect, useState } from 'react';
import { 
  Users, 
  ReceiptIndianRupee, 
  Home, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle,
  Building2,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  PieChart as PieChartIcon
} from 'lucide-react';
import axios from 'axios';
import { type Tenant, type Invoice } from '../src/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [tenantsRes, invoicesRes] = await Promise.all([
          axios.get('/api/tenants'),
          axios.get('/api/invoices')
        ]);
        setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
        setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.error || err.message || 'Network connection failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalRevenue = tenants.reduce((acc, t) => acc + (t.currentRent || 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.balanceAmount || inv.balance || 0), 0);
  
  const now = new Date();
  const expiringSoon = tenants.filter(t => {
    if (!t.leaseEnd) return false;
    const expiry = new Date(t.leaseEnd);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const paymentStatusData = [
    { name: 'Paid', value: invoices.filter(i => i.paymentStatus === 'Paid').length, color: '#10b981' },
    { name: 'Partial', value: invoices.filter(i => i.paymentStatus === 'Partial').length, color: '#f59e0b' },
    { name: 'Pending', value: invoices.filter(i => i.paymentStatus === 'Pending').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Growth analytics (mock for trend)
  const stats = [
    { 
      title: 'Active Tenants', 
      value: tenants.length.toString(), 
      icon: Users, 
      color: 'emerald',
      trend: '+12%',
      description: 'Total leased units'
    },
    { 
      title: 'Rent Collected', 
      value: `₹${(totalRevenue - totalOutstanding > 0 ? totalRevenue - totalOutstanding : totalRevenue * 0.8).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'blue',
      trend: '+8.4%',
      description: 'Current month recovery'
    },
    { 
      title: 'Monthly Revenue', 
      value: `₹${totalRevenue.toLocaleString()}`, 
      icon: ReceiptIndianRupee, 
      color: 'indigo',
      trend: '+2.1%',
      description: 'Gross billing value'
    },
    { 
      title: 'Pending Dues', 
      value: `₹${totalOutstanding.toLocaleString()}`, 
      icon: Clock, 
      color: 'rose',
      trend: '-4.2%',
      description: 'Total accounts receivable'
    },
    { 
      title: 'Expiring Leases', 
      value: expiringSoon.toString(), 
      icon: Calendar, 
      color: 'amber',
      trend: 'Action Reqd',
      description: 'Expiring in 30 days'
    },
    { 
      title: 'Portfolio Size', 
      value: new Set(tenants.map(t => t.property)).size.toString(), 
      icon: Building2, 
      color: 'slate',
      trend: 'Stable',
      description: 'Active properties'
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <Activity className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Hydrating Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500" />
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Outage</h2>
          <p className="mt-2 text-slate-500 text-sm font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-xl"
          >
            Reconnect to Engine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pt-0 md:pt-0 lg:pt-0 w-full space-y-10 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Dashboard overview</h1>
          <p className="text-slate-400 font-medium mt-1">Strategic overview of your real estate empire</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center shadow-sm">
                <Users size={14} className="text-slate-400" />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
              +{tenants.length}
            </div>
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-primary transition-colors focus:ring-4 ring-primary/10">
            <Activity size={20} />
          </button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
        {stats.map((stat, i) => (
          <DashboardCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Financial Velocity</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly Billing vs Recovery</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 px-3 py-1.5 bg-slate-50 rounded-full">
                <div className="w-2 h-2 rounded-full bg-indigo-500" /> Billed
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 px-3 py-1.5 bg-slate-50 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Recovered
              </span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={invoices.slice(-6).map(inv => ({
                name: inv.billDate,
                billed: inv.totalInvoice,
                recovered: (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0)
              }))}>
                <defs>
                   <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                <Tooltip 
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="billed" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorBilled)" />
                <Area type="monotone" dataKey="recovered" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRecovered)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center">
            <h3 className="text-xl font-black text-slate-800 tracking-tight self-start mb-2">Collection Health</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest self-start mb-8">Payment status distribution</p>
            
            <div className="h-[250px] w-full flex items-center justify-center relative">
               {paymentStatusData.length > 0 ? (
                 <>
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                        data={paymentStatusData}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                       >
                         {paymentStatusData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                         ))}
                       </Pie>
                       <Tooltip />
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-black text-slate-800">
                        {Math.round((invoices.filter(i => i.paymentStatus === 'Paid').length / (invoices.length || 1)) * 100)}%
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</p>
                   </div>
                 </>
               ) : (
                 <div className="text-slate-300 font-bold italic">No data available</div>
               )}
            </div>

            <div className="w-full space-y-3 mt-4">
              {paymentStatusData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">{item.value} Invoices</span>
                </div>
              ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Onboarding</h3>
              <button className="text-xs font-bold text-primary px-4 py-2 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors">See Ledger</button>
           </div>
           <div className="space-y-4">
             {tenants.slice(-5).reverse().map((t, i) => (
               <div key={i} className="flex items-center justify-between p-4 rounded-[24px] border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{t.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.property}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{t.currentRent.toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Risk Signals</h3>
              <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                Priority
              </div>
           </div>
           <div className="space-y-6">
             {invoices.filter(inv => inv.paymentStatus === 'Pending').slice(0, 3).map((inv, i) => (
               <div key={i} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                       <Clock size={20} />
                    </div>
                    {i !== 2 && <div className="w-0.5 h-full bg-slate-50 my-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between">
                       <p className="text-sm font-black text-slate-800">Pending Invoice #{inv.invoiceNo}</p>
                       <span className="text-xs font-black text-rose-600">₹{inv.balanceAmount || inv.balance}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 mt-1">Bill for {inv.partyName} is overdue. Escalation recommended.</p>
                    <div className="flex gap-3 mt-3">
                       <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors">Send Reminder</button>
                       <button className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-colors">Recv. Payment</button>
                    </div>
                  </div>
               </div>
             ))}
             {expiringSoon > 0 && (
                <div className="flex gap-5">
                   <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-inner shrink-0">
                      <Calendar size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-slate-800">Lease Expiry Signals</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">{expiringSoon} agreements are ending this month. Renewals needed.</p>
                   </div>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon: Icon, color, trend, description }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  const trendPositive = trend.includes('+');
  const trendNegative = trend.includes('-');

  return (
    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", colors[color])}>
          <Icon size={20} />
        </div>
        <div className={cn(
          "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
          trendPositive ? "bg-emerald-50 text-emerald-600" : 
          trendNegative ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500"
        )}>
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
        <p className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

