import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true },
  billDate: String,
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  partyName: String,
  company: String,
  property: String,
  gstNo: String,
  taxOption: { type: String, enum: ['GST', 'None'], default: 'GST' },
  items: [{
    particular: String,
    hsnSac: String,
    month: String,
    fromDate: String,
    toDate: String,
    amount: Number
  }],
  baseRent: Number,
  cgst: Number,
  sgst: Number,
  totalInvoice: Number,
  received: Number, // Legacy field, keeping for compatibility
  receivedAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  balance: Number, // Legacy/Current field
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Pending' },
  paymentDate: String,
  paymentMode: String,
  transactionRef: String,
  latePenaltyPercentage: { type: Number, default: 0 },
  latePenaltyAmount: { type: Number, default: 0 },
  status: String,
  remarks: String,
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
