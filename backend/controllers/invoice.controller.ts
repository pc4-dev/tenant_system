import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { Ledger } from '../models/Ledger';
import { mockStorage, isUsingMockData } from '../src/mockData';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      return res.json(mockStorage.invoices);
    }
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices.map(i => ({ ...i.toObject(), id: i._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getInvoicesByTenant = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    if (isUsingMockData.value) {
      const filtered = mockStorage.invoices.filter((i: any) => String(i.tenantId) === tenantId);
      return res.json(filtered);
    }
    const invoices = await Invoice.find({ tenantId }).sort({ billDate: -1 });
    res.json(invoices.map(i => ({ ...i.toObject(), id: i._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    const total = data.totalInvoice || 0;
    const received = (data.receivedAmount || 0) + (data.tdsAmount || 0);
    const balance = total - received;
    
    data.balanceAmount = balance;
    data.balance = balance; // Sync legacy field
    data.received = (data.receivedAmount || 0); // Sync legacy field

    if (received >= total && total > 0) {
      data.paymentStatus = 'Paid';
    } else if (data.receivedAmount > 0) {
      data.paymentStatus = 'Partial';
    } else {
      data.paymentStatus = 'Pending';
    }

    if (isUsingMockData.value) {
      const invoice = { ...data, _id: `i${Date.now()}`, id: `i${Date.now()}` };
      mockStorage.invoices.push(invoice);

      // Add to mock ledgers
      mockStorage.ledgers.push({
        _id: `l${Date.now()}_1`,
        tenantId: invoice.tenantId,
        date: invoice.billDate || new Date(),
        type: 'INVOICE',
        particular: `Invoice #${invoice.invoiceNo}`,
        refId: invoice.id,
        refNo: invoice.invoiceNo,
        debit: invoice.totalInvoice || 0,
        credit: 0,
        tds: 0
      });

      if (invoice.receivedAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_2`,
          tenantId: invoice.tenantId,
          date: invoice.billDate || new Date(),
          type: 'PAYMENT',
          particular: `Payment Received - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: invoice.receivedAmount,
          tds: 0
        });
      }

      if (invoice.tdsAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_3`,
          tenantId: invoice.tenantId,
          date: invoice.billDate || new Date(),
          type: 'TDS',
          particular: `TDS Deduction - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: 0,
          tds: invoice.tdsAmount
        });
      }

      return res.status(201).json(invoice);
    }
    const invoice = new Invoice(data);
    await invoice.save();

    // Create Ledger Entries for the new Invoice
    const ledgerEntries = [];
    
    // 1. Invoice Debit Entry
    ledgerEntries.push({
      tenantId: invoice.tenantId,
      date: invoice.billDate || new Date(),
      type: 'INVOICE',
      particular: `Invoice #${invoice.invoiceNo}`,
      refId: invoice._id,
      refNo: invoice.invoiceNo,
      debit: invoice.totalInvoice || 0,
      credit: 0,
      tds: 0
    });

    // 2. Receipt Entry (if payment was received at creation)
    if (invoice.receivedAmount > 0) {
      ledgerEntries.push({
        tenantId: invoice.tenantId,
        date: invoice.paymentDate || invoice.billDate || new Date(),
        type: 'PAYMENT',
        particular: `Payment Received - #${invoice.invoiceNo}`,
        refId: invoice._id,
        refNo: invoice.invoiceNo,
        debit: 0,
        credit: invoice.receivedAmount,
        tds: 0
      });
    }

    // 3. TDS Entry
    if (invoice.tdsAmount > 0) {
      ledgerEntries.push({
        tenantId: invoice.tenantId,
        date: invoice.paymentDate || invoice.billDate || new Date(),
        type: 'TDS',
        particular: `TDS Deduction - #${invoice.invoiceNo}`,
        refId: invoice._id,
        refNo: invoice.invoiceNo,
        debit: 0,
        credit: 0,
        tds: invoice.tdsAmount
      });
    }

    if (ledgerEntries.length > 0) {
      await Ledger.insertMany(ledgerEntries);
    }

    res.status(201).json({ ...invoice.toObject(), id: invoice._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      const invoice = mockStorage.invoices.find((i: any) => i.id === req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(invoice);
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ...invoice.toObject(), id: invoice._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    // Recalculate status and balance if financial fields are present
    if (updateData.totalInvoice !== undefined || updateData.receivedAmount !== undefined || updateData.tdsAmount !== undefined || updateData.latePenaltyAmount !== undefined) {
      // We might need existing data if partial update
      let currentTotal, currentReceivedAmt, currentTds, currentPenalty;
      
      if (isUsingMockData.value) {
        const inv = mockStorage.invoices.find((i: any) => i.id === req.params.id);
        currentTotal = updateData.totalInvoice ?? inv?.totalInvoice ?? 0;
        currentReceivedAmt = updateData.receivedAmount ?? inv?.receivedAmount ?? inv?.received ?? 0;
        currentTds = updateData.tdsAmount ?? inv?.tdsAmount ?? 0;
        currentPenalty = updateData.latePenaltyAmount ?? inv?.latePenaltyAmount ?? 0;
      } else {
        const inv = await Invoice.findById(req.params.id);
        currentTotal = updateData.totalInvoice ?? inv?.totalInvoice ?? 0;
        currentReceivedAmt = updateData.receivedAmount ?? inv?.receivedAmount ?? inv?.received ?? 0;
        currentTds = updateData.tdsAmount ?? inv?.tdsAmount ?? 0;
        currentPenalty = updateData.latePenaltyAmount ?? inv?.latePenaltyAmount ?? 0;
      }

      const totalReceivable = currentTotal + currentPenalty;
      const totalReceived = currentReceivedAmt + currentTds;
      const balance = totalReceivable - totalReceived;
      
      updateData.balanceAmount = balance;
      updateData.balance = balance;
      updateData.received = currentReceivedAmt;

      if (totalReceived >= totalReceivable && totalReceivable > 0) {
        updateData.paymentStatus = 'Paid';
      } else if (currentReceivedAmt > 0) {
        updateData.paymentStatus = 'Partial';
      } else {
        updateData.paymentStatus = 'Pending';
      }
    }

    if (isUsingMockData.value) {
      const index = mockStorage.invoices.findIndex((i: any) => i.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Invoice not found' });
      mockStorage.invoices[index] = { ...mockStorage.invoices[index], ...updateData };
      const invoice = mockStorage.invoices[index];

      // Update mock ledgers
      mockStorage.ledgers = mockStorage.ledgers.filter((l: any) => l.refId !== req.params.id);
      
      mockStorage.ledgers.push({
        _id: `l${Date.now()}_1`,
        tenantId: invoice.tenantId,
        date: invoice.billDate || new Date(),
        type: 'INVOICE',
        particular: `Invoice #${invoice.invoiceNo}`,
        refId: invoice.id,
        refNo: invoice.invoiceNo,
        debit: invoice.totalInvoice || 0,
        credit: 0,
        tds: 0
      });

      if (invoice.latePenaltyAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_pen`,
          tenantId: invoice.tenantId,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'ADJUSTMENT',
          particular: `Late Payment Penalty (${invoice.latePenaltyPercentage}%) - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: invoice.latePenaltyAmount,
          credit: 0,
          tds: 0
        });
      }

      if (invoice.receivedAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_2`,
          tenantId: invoice.tenantId,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'PAYMENT',
          particular: `Payment Received - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: invoice.receivedAmount,
          tds: 0
        });
      }

      if (invoice.tdsAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_3`,
          tenantId: invoice.tenantId,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'TDS',
          particular: `TDS Deduction - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: 0,
          tds: invoice.tdsAmount
        });
      }

      return res.json(mockStorage.invoices[index]);
    }
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Sync Ledger Entries
    await Ledger.deleteMany({ refId: invoice._id });
    
    const ledgerEntries = [];
    // 1. Invoice Debit
    ledgerEntries.push({
      tenantId: invoice.tenantId,
      date: invoice.billDate || new Date(),
      type: 'INVOICE',
      particular: `Invoice #${invoice.invoiceNo}`,
      refId: invoice._id,
      refNo: invoice.invoiceNo,
      debit: invoice.totalInvoice || 0,
      credit: 0,
      tds: 0
    });

    // 1.5 Late Penalty Entry (New)
    if (invoice.latePenaltyAmount > 0) {
      ledgerEntries.push({
        tenantId: invoice.tenantId,
        date: invoice.paymentDate || invoice.billDate || new Date(),
        type: 'ADJUSTMENT',
        particular: `Late Payment Penalty (${invoice.latePenaltyPercentage}%) - #${invoice.invoiceNo}`,
        refId: invoice._id,
        refNo: invoice.invoiceNo,
        debit: invoice.latePenaltyAmount,
        credit: 0,
        tds: 0
      });
    }

    // 2. Receipt
    if (invoice.receivedAmount > 0) {
      ledgerEntries.push({
        tenantId: invoice.tenantId,
        date: invoice.paymentDate || invoice.billDate || new Date(),
        type: 'PAYMENT',
        particular: `Payment Received - #${invoice.invoiceNo}`,
        refId: invoice._id,
        refNo: invoice.invoiceNo,
        debit: 0,
        credit: invoice.receivedAmount,
        tds: 0
      });
    }

    // 3. TDS
    if (invoice.tdsAmount > 0) {
      ledgerEntries.push({
        tenantId: invoice.tenantId,
        date: invoice.paymentDate || invoice.billDate || new Date(),
        type: 'TDS',
        particular: `TDS Deduction - #${invoice.invoiceNo}`,
        refId: invoice._id,
        refNo: invoice.invoiceNo,
        debit: 0,
        credit: 0,
        tds: invoice.tdsAmount
      });
    }

    if (ledgerEntries.length > 0) {
      await Ledger.insertMany(ledgerEntries);
    }

    res.json({ ...invoice.toObject(), id: invoice._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      mockStorage.invoices = mockStorage.invoices.filter((i: any) => i.id !== req.params.id);
      mockStorage.ledgers = mockStorage.ledgers.filter((l: any) => l.refId !== req.params.id);
      return res.json({ success: true });
    }
    await Invoice.findByIdAndDelete(req.params.id);
    await Ledger.deleteMany({ refId: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
