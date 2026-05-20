import { cn } from '@/lib/utils';
import { type Tenant } from '../../src/types';

// ── Status Badge (Agreement Status) ──────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    Active:  'badge-active',
    Expired: 'badge-expired',
    Pending: 'badge-partial',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none', styles[status])}>
      {status}
    </span>
  );
}

// ── Ledger Type Badge ─────────────────────────────────────────────────────────
export function TypeBadge({ type }: { type: string }) {
  const styles: any = {
    OPENING_BALANCE: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    INVOICE:         'bg-blue-50   text-blue-600   border-blue-100',
    PAYMENT:         'bg-emerald-50 text-emerald-600 border-emerald-100',
    TDS:             'bg-purple-50 text-purple-600  border-purple-100',
    ADJUSTMENT:      'bg-amber-50  text-amber-600   border-amber-100',
  };
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border', styles[type] || 'bg-slate-50 text-slate-500 border-slate-100')}>
      {type.replace('_', ' ')}
    </span>
  );
}

// ── Invoice Status Badge ──────────────────────────────────────────────────────
export function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: any = {
    Paid:    'badge-paid',
    Partial: 'badge-partial',
    Pending: 'badge-pending',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border', styles[status] || 'bg-slate-50 text-slate-500 border-slate-100')}>
      {status}
    </span>
  );
}

// ── Info Field (label + value row) ───────────────────────────────────────────
export function InfoField({ label, value, icon: Icon, status }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="text-slate-300" size={16} />}
        {status ? <StatusBadge status={value} /> : <p className="text-sm font-bold text-slate-700">{value || '—'}</p>}
      </div>
    </div>
  );
}

// ── Summary Item (rupee value row in ledger) ─────────────────────────────────
export function SummaryItem({ label, value, color }: any) {
  const colors: any = {
    slate:   'text-slate-700',
    emerald: 'text-emerald-600',
    purple:  'text-purple-600',
    rose:    'text-rose-600',
    blue:    'text-blue-600',
    primary: 'text-primary',
  };
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn('text-sm font-black', colors[color])}>₹{value?.toLocaleString()}</p>
    </div>
  );
}

// ── Timeline Item (small) ─────────────────────────────────────────────────────
export function TimelineItem({ label, date, active, danger }: any) {
  return (
    <div className="flex gap-4 relative z-10 pl-1">
      <div className={cn('w-5 h-5 rounded-full border-4 border-white shadow-sm flex-shrink-0 mt-0.5',
        active ? 'bg-primary' : danger ? 'bg-red-500' : 'bg-slate-200')}
      />
      <div className="space-y-0.5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">{label}</p>
        <p className={cn('text-xs font-bold', danger ? 'text-red-500' : 'text-slate-700')}>{date || '—'}</p>
      </div>
    </div>
  );
}

// ── Timeline Item Large (in detail view) ─────────────────────────────────────
export function TimelineItemLarge({ label, date, desc, active, danger }: any) {
  return (
    <div className="flex gap-4 relative z-10">
      <div className={cn('w-8 h-8 rounded-full border-4 border-white shadow flex-shrink-0 flex items-center justify-center',
        active ? 'bg-primary' : danger ? 'bg-red-500' : 'bg-slate-200')}
      />
      <div className="space-y-0.5 pt-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={cn('text-sm font-bold', danger ? 'text-red-500' : 'text-slate-700')}>{date || '—'}</p>
        {desc && <p className="text-[10px] text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}

// ── Config Block (lease config tile) ─────────────────────────────────────────
export function ConfigBlock({ label, value, sub, highlight }: any) {
  return (
    <div className={cn('p-4 rounded-2xl border', highlight ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100')}>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn('text-lg font-black', highlight ? 'text-primary' : 'text-slate-800')}>{value}</p>
      {sub && <p className="text-[9px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Profile Item (icon + label + value) ──────────────────────────────────────
export function ProfileItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-700 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

// ── Summary Card (stat tile in detail view) ───────────────────────────────────
export function SummaryCard({ title, value, icon: Icon, color, trend }: any) {
  const colors: any = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100'    },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100'    },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100'   },
    primary: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100'  },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={cn('p-4 rounded-2xl border flex flex-col gap-3', c.bg, c.border)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.text, 'bg-white/70')}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className={cn('text-xl font-black mt-0.5', c.text)}>{value}</p>
        {trend && <p className="text-[9px] text-slate-400 mt-1">{trend}</p>}
      </div>
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────
export function TabButton({ active, onClick, label, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border',
        active
          ? 'bg-primary text-white border-primary shadow-sm shadow-orange-200'
          : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
      )}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}

// ── Tabs Nav Item (sidebar tabs) ──────────────────────────────────────────────
export function TabsNavItem({ active, onClick, label, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all text-left',
        active ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'
      )}
    >
      {Icon && <Icon size={15} />}
      {label}
    </button>
  );
}

// ── Stat Card (detail header stat) ───────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color, isAlert }: any) {
  return (
    <div className={cn('rounded-2xl p-4 flex flex-col gap-2', isAlert ? 'bg-rose-50 border border-rose-100' : 'bg-white border border-slate-100')}>
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', isAlert ? 'bg-rose-100 text-rose-500' : 'bg-slate-50 text-slate-400')}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={cn('text-lg font-black mt-0.5', isAlert ? 'text-rose-600' : 'text-slate-800')}>{value}</p>
      </div>
    </div>
  );
}

// ── Dossier Item ──────────────────────────────────────────────────────────────
export function DossierItem({ label, value, icon: Icon, isAddress }: any) {
  return (
    <div className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
          <Icon size={13} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn('text-sm font-bold text-slate-700 mt-0.5', isAddress && 'whitespace-pre-line')}>{value || '—'}</p>
      </div>
    </div>
  );
}

// ── Form Input helper ─────────────────────────────────────────────────────────
export function FormInput({ label, type = 'text', value, onChange, options, disabled, required, placeholder }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">{label}</label>
      {type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className="form-input-saas"
        >
          {options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className="form-input-saas"
        />
      )}
    </div>
  );
}
