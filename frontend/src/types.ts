import { LucideIcon } from 'lucide-react';

export interface Company {
  id: string;
  _id?: string;
  companyName: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  gstNumber?: string;
  state?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  logoUrl?: string;
  status: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  code: string;
  name: string;
  company: string;
  property: string;
  contactPerson: string;
  mobile: string;
  email: string;
  leaseStart: string;
  leaseEnd: string;
  tenure: number;
  lockIn: number;
  noticePeriod: number;
  escalationPercent: number;
  nextEscalationDate: string;
  securityDeposit: number;
  currentRent: number;
  gstNo: string;
  legalName?: string;
  billingAddress?: string;
  state?: string;
  pincode?: string;
  agreementStatus: 'Active' | 'Expired' | 'Pending';
  agreementFileUrl?: string;
  agreementFileType?: string;
  rentFreePeriodDays?: number;
  alternateContactPerson?: string;
  rentalPurpose?: string;
  openingBalanceAmount?: number;
  openingBalanceType?: 'Debit' | 'Credit';
  openingBalanceDate?: string;
  openingBalanceNotes?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  tenantId: string;
  date: string;
  type: 'OPENING_BALANCE' | 'INVOICE' | 'PAYMENT' | 'TDS' | 'ADJUSTMENT';
  particular: string;
  refId?: string;
  refNo?: string;
  debit: number;
  credit: number;
  tds: number;
  runningBalance: number;
  notes?: string;
}

export interface LedgerSummary {
  openingBalance: number;
  totalInvoiced: number;
  totalAdjustments: number;
  totalReceived: number;
  totalTds: number;
  closingBalance: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  billDate: string;
  tenantId: string;
  companyId?: string;
  partyName: string;
  company: string;
  property: string;
  gstNo: string;
  taxOption: 'GST' | 'None';
  items?: {
    particular: string;
    hsnSac: string;
    month: string;
    fromDate: string;
    toDate: string;
    amount: number;
  }[];
  baseRent: number;
  cgst: number;
  sgst: number;
  totalInvoice: number;
  received: number;
  receivedAmount: number;
  tdsAmount: number;
  balance: number;
  balanceAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  paymentDate?: string;
  paymentMode?: string;
  transactionRef?: string;
  latePenaltyPercentage?: number;
  latePenaltyAmount?: number;
  remarks?: string;
}

export interface NavItem {
  title: string;
  icon: LucideIcon;
  path: string;
}
