import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant';
import { Invoice } from '../models/Invoice';
import { mockStorage, isUsingMockData } from '../src/mockData';

export const getStats = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      return res.json({
        totalTenants: mockStorage.tenants.length,
        activeAgreements: mockStorage.tenants.filter((t: any) => t.agreementStatus === 'Active').length,
        monthlyRent: mockStorage.tenants.reduce((s: number, t: any) => s + (t.currentRent || 0), 0),
        pendingPayments: 0,
        trends: [{ month: 'May 2026', total: 107500 }]
      });
    }

    const totalTenants = await Tenant.countDocuments();
    const activeAgreements = await Tenant.countDocuments({ agreementStatus: 'Active' });
    
    const rentResult = await Tenant.aggregate([
      { $group: { _id: null, total: { $sum: '$currentRent' } } }
    ]);
    const monthlyRent = rentResult[0]?.total || 0;

    const balanceResult = await Invoice.aggregate([
      { $match: { paymentStatus: { $ne: 'Paid' } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);
    const pendingPayments = balanceResult[0]?.total || 0;
    
    const trends = await Invoice.aggregate([
      {
        $group: {
          _id: { $substr: ['$billDate', 0, 7] }, // YYYY-MM
          total: { $sum: '$received' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 6 },
      { $project: { month: '$_id', total: 1, _id: 0 } }
    ]);

    res.json({
      totalTenants,
      activeAgreements,
      monthlyRent,
      pendingPayments,
      trends
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
