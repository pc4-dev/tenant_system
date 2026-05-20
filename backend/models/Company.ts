import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, unique: true },
  address: String,
  phoneNumber: String,
  email: String,
  gstNumber: String,
  state: String,
  bankName: String,
  branchName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String,
  logoUrl: String,
  status: { type: Boolean, default: true },
}, { timestamps: true });

export const Company = mongoose.model('Company', companySchema);
