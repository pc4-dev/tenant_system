import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant';
import { Invoice } from '../models/Invoice';
import { Ledger } from '../models/Ledger';
import { mockStorage, isUsingMockData } from '../src/mockData';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

const parseNum = (val: any) => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? undefined : parsed;
};

export const getTenants = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      return res.json(mockStorage.tenants);
    }
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants.map(t => ({ ...t.toObject(), id: t._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTenantDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let tenant;
    let invoices;

    if (isUsingMockData.value) {
      tenant = mockStorage.tenants.find((t: any) => t.id === id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      invoices = mockStorage.invoices.filter((i: any) => String(i.tenantId) === id);
    } else {
      tenant = await Tenant.findById(id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      invoices = await Invoice.find({ tenantId: id }).sort({ billDate: -1 });
    }

    const tenantObj = isUsingMockData.value ? tenant : { ...tenant.toObject(), id: tenant._id };
    const invoicesArr = isUsingMockData.value ? invoices : invoices.map(i => ({ ...i.toObject(), id: i._id }));

    // NEW: Calculate comprehensive summary using Ledger entries
    let ledgerEntries = [];
    if (isUsingMockData.value) {
      ledgerEntries = mockStorage.ledgers?.filter((l: any) => String(l.tenantId) === id) || [];
    } else {
      ledgerEntries = await Ledger.find({ tenantId: id }).sort({ date: 1 });
    }

    const totalInvoiced = ledgerEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalReceived = ledgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const totalTds = ledgerEntries.reduce((sum, entry) => sum + (entry.tds || 0), 0);
    const closingBalance = totalInvoiced - (totalReceived + totalTds);

    const paymentSummary = {
      totalInvoiced,
      totalReceived,
      totalTds,
      pendingAmount: closingBalance, // Unified pending balance from ledger
      lastPaymentDate: invoicesArr.filter(inv => (inv.receivedAmount || inv.received || 0) > 0).sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime())[0]?.billDate || null
    };

    // Analytics: Monthly payment trend (last 12 months)
    const analytics = {
      monthlyTrend: invoicesArr.slice(0, 12).map(inv => ({
        month: inv.billDate ? new Date(inv.billDate).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'N/A',
        invoiced: inv.totalInvoice || 0,
        received: (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0)
      })).reverse()
    };

    res.json({
      tenant: tenantObj,
      invoices: invoicesArr,
      paymentSummary,
      analytics
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const tenantData = { ...req.body };
    delete tenantData._id;
    delete tenantData.id;
    if (tenantData.code === '') delete tenantData.code;
    
    const file = (req as any).file;

    if (tenantData.currentRent !== undefined) tenantData.currentRent = parseNum(tenantData.currentRent);
    if (tenantData.securityDeposit !== undefined) tenantData.securityDeposit = parseNum(tenantData.securityDeposit);
    if (tenantData.escalationPercent !== undefined) tenantData.escalationPercent = parseNum(tenantData.escalationPercent);
    if (tenantData.tenure !== undefined) tenantData.tenure = parseNum(tenantData.tenure);
    if (tenantData.lockIn !== undefined) tenantData.lockIn = parseNum(tenantData.lockIn);
    if (tenantData.noticePeriod !== undefined) tenantData.noticePeriod = parseNum(tenantData.noticePeriod);
    if (tenantData.rentFreePeriodDays !== undefined) tenantData.rentFreePeriodDays = parseNum(tenantData.rentFreePeriodDays);
    if (tenantData.openingBalanceAmount !== undefined) tenantData.openingBalanceAmount = parseNum(tenantData.openingBalanceAmount);
    
    if (file) {
      if (!isCloudinaryConfigured) {
        const stats = fs.statSync(file.path);
        if (stats.size > 14 * 1024 * 1024) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: 'File too large for database storage without Cloudinary (Max 14MB).' });
        }
        const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
        tenantData.agreementFileUrl = `data:${file.mimetype};base64,${base64}`;
        fs.unlinkSync(file.path);
      } else {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'tenants/agreements',
          resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'auto',
          public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/\s+/g, '_')}`
        });
        tenantData.agreementFileUrl = result.secure_url;
        fs.unlinkSync(file.path);
      }
      tenantData.agreementFileType = file.mimetype.includes('pdf') ? 'PDF' : 'IMAGE';
    } else if (isUsingMockData.value && !tenantData.agreementFileUrl) {
      tenantData.agreementFileUrl = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
      tenantData.agreementFileType = 'IMAGE';
    }

    if (isUsingMockData.value) {
      const tenant = { ...tenantData, _id: `m${Date.now()}`, id: `m${Date.now()}`, createdAt: new Date() };
      mockStorage.tenants.push(tenant);

      // Create Opening Balance for Mock Data
      if (tenant.openingBalanceAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}`,
          id: `l${Date.now()}`,
          tenantId: tenant.id,
          date: tenant.openingBalanceDate || new Date(),
          type: 'OPENING_BALANCE',
          particular: 'Opening Balance',
          debit: tenant.openingBalanceType === 'Debit' ? tenant.openingBalanceAmount : 0,
          credit: tenant.openingBalanceType === 'Credit' ? tenant.openingBalanceAmount : 0,
          notes: tenant.openingBalanceNotes
        });
      }

      return res.status(201).json(tenant);
    }
    
    const tenant = new Tenant(tenantData);
    await tenant.save();

    // Create Opening Balance Ledger Entry
    if (tenant.openingBalanceAmount > 0) {
      const ledgerEntry = new Ledger({
        tenantId: tenant._id,
        date: tenant.openingBalanceDate || new Date(),
        type: 'OPENING_BALANCE',
        particular: 'Opening Balance',
        debit: tenant.openingBalanceType === 'Debit' ? tenant.openingBalanceAmount : 0,
        credit: tenant.openingBalanceType === 'Credit' ? tenant.openingBalanceAmount : 0,
        notes: tenant.openingBalanceNotes
      });
      await ledgerEntry.save();
    }

    res.status(201).json({ ...tenant.toObject(), id: tenant._id });
  } catch (err: any) {
    console.error('Error in createTenant:', err);
    let message = err.message;
    if (err.code === 11000) message = 'Duplicate tenant code. Please use a unique code.';
    if (err.name === 'ValidationError') {
      const firstError = Object.values(err.errors)[0] as any;
      message = firstError?.message || message;
    }
    res.status(400).json({ error: message });
  }
};

export const getTenantById = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      const tenant = mockStorage.tenants.find((t: any) => t.id === req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      return res.json(tenant);
    }
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ ...tenant.toObject(), id: tenant._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    if (updateData.code === '') delete updateData.code;

    const file = (req as any).file;

    if (updateData.currentRent !== undefined) updateData.currentRent = parseNum(updateData.currentRent);
    if (updateData.securityDeposit !== undefined) updateData.securityDeposit = parseNum(updateData.securityDeposit);
    if (updateData.escalationPercent !== undefined) updateData.escalationPercent = parseNum(updateData.escalationPercent);
    if (updateData.tenure !== undefined) updateData.tenure = parseNum(updateData.tenure);
    if (updateData.lockIn !== undefined) updateData.lockIn = parseNum(updateData.lockIn);
    if (updateData.noticePeriod !== undefined) updateData.noticePeriod = parseNum(updateData.noticePeriod);
    if (updateData.rentFreePeriodDays !== undefined) updateData.rentFreePeriodDays = parseNum(updateData.rentFreePeriodDays);
    if (updateData.openingBalanceAmount !== undefined) updateData.openingBalanceAmount = parseNum(updateData.openingBalanceAmount);

    if (file) {
      if (!isCloudinaryConfigured) {
        const stats = fs.statSync(file.path);
        if (stats.size > 14 * 1024 * 1024) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: 'File too large for database (Max 14MB).' });
        }
        const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
        updateData.agreementFileUrl = `data:${file.mimetype};base64,${base64}`;
        fs.unlinkSync(file.path);
      } else {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'tenants/agreements',
          resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'auto',
          public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/\s+/g, '_')}`
        });
        updateData.agreementFileUrl = result.secure_url;
        fs.unlinkSync(file.path);
      }
      updateData.agreementFileType = file.mimetype.includes('pdf') ? 'PDF' : 'IMAGE';
    }

    if (isUsingMockData.value) {
      const index = mockStorage.tenants.findIndex((t: any) => t.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Tenant not found' });
      mockStorage.tenants[index] = { ...mockStorage.tenants[index], ...updateData };
      const tenant = mockStorage.tenants[index];

      // Sync Opening Balance for Mock Data
      if (updateData.openingBalanceAmount !== undefined) {
        mockStorage.ledgers = mockStorage.ledgers.filter((l: any) => 
          String(l.tenantId) === req.params.id && l.type !== 'OPENING_BALANCE'
        );
        if (tenant.openingBalanceAmount > 0) {
          mockStorage.ledgers.push({
            _id: `l${Date.now()}`,
            id: `l${Date.now()}`,
            tenantId: tenant.id,
            date: tenant.openingBalanceDate || new Date(),
            type: 'OPENING_BALANCE',
            particular: 'Opening Balance',
            debit: tenant.openingBalanceType === 'Debit' ? tenant.openingBalanceAmount : 0,
            credit: tenant.openingBalanceType === 'Credit' ? tenant.openingBalanceAmount : 0,
            notes: tenant.openingBalanceNotes
          });
        }
      }

      return res.json(mockStorage.tenants[index]);
    }
    
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Sync Opening Balance Ledger Entry for Real DB
    if (updateData.openingBalanceAmount !== undefined) {
      await Ledger.deleteMany({ tenantId: tenant._id, type: 'OPENING_BALANCE' });
      if (tenant.openingBalanceAmount > 0) {
        const ledgerEntry = new Ledger({
          tenantId: tenant._id,
          date: tenant.openingBalanceDate || new Date(),
          type: 'OPENING_BALANCE',
          particular: 'Opening Balance',
          debit: tenant.openingBalanceType === 'Debit' ? tenant.openingBalanceAmount : 0,
          credit: tenant.openingBalanceType === 'Credit' ? tenant.openingBalanceAmount : 0,
          notes: tenant.openingBalanceNotes
        });
        await ledgerEntry.save();
      }
    }

    res.json({ ...tenant.toObject(), id: tenant._id });
  } catch (err: any) {
    console.error('Error in updateTenant:', err);
    let message = err.message;
    if (err.code === 11000) message = 'Duplicate tenant code. Please use a unique code.';
    if (err.name === 'ValidationError') {
      const firstError = Object.values(err.errors)[0] as any;
      message = firstError?.message || message;
    }
    res.status(400).json({ error: message });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      mockStorage.tenants = mockStorage.tenants.filter((t: any) => t.id !== req.params.id);
      return res.json({ success: true });
    }
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
