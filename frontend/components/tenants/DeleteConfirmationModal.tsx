import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function DeleteConfirmationModal({ tenantName, onClose, onConfirm }: any) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Trash2 size={40}/>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Delete Tenant?</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800">"{tenantName}"</span>?
              This action is permanent and all lease records will be removed.
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">
              No, Keep it
            </button>
            <button onClick={handleConfirm} disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {isDeleting ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18}/>}
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Shared react-select styles (used in InvoiceFormModal + TenantList)
export const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'white',
    borderColor: state.isFocused ? '#F97316' : '#E2E8F0',
    borderRadius: '0.75rem',
    padding: '4px 8px',
    fontSize: '0.875rem',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(249,115,22,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
    '&:hover': { borderColor: '#F97316' }
  }),
  placeholder: (base: any) => ({ ...base, color: '#94A3B8' }),
  menu: (base: any) => ({
    ...base, borderRadius: '1rem', marginTop: '8px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    border: '1px solid #F1F5F9', overflow: 'hidden', zIndex: 1000
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F97316' : state.isFocused ? '#F7F9FC' : 'white',
    color: state.isSelected ? 'white' : '#475569',
    fontSize: '0.875rem',
    fontWeight: state.isSelected ? '600' : '400',
    padding: '10px 16px',
    '&:active': { backgroundColor: '#F97316' }
  })
};
