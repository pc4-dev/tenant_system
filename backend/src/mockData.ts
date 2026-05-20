export const mockStorage = {
  tenants: [
    { _id: 'm1', id: 'm1', code: 'T001', name: 'Alpha Corp', company: 'Alpha Group', property: 'Wing A', currentRent: 45000, agreementStatus: 'Active' },
    { _id: 'm2', id: 'm2', code: 'T002', name: 'Beta Systems', company: 'Beta LLC', property: 'Wing B', currentRent: 62500, agreementStatus: 'Pending' }
  ] as any[],
  invoices: [
    { _id: 'i1', id: 'i1', invoiceNo: 'INV-2026-001', billDate: '2026-05-01', partyName: 'Alpha Corp', totalInvoice: 45000, balance: 0, paymentStatus: 'Paid', latePenaltyPercentage: 0, latePenaltyAmount: 0 }
  ] as any[],
  ledgers: [
    { _id: 'l1', id: 'l1', tenantId: 'm1', date: '2026-05-01', type: 'OPENING_BALANCE', particular: 'Opening Balance', debit: 10000, credit: 0, notes: 'Previous dues' },
    { _id: 'l2', id: 'l2', tenantId: 'm1', date: '2026-05-01', type: 'INVOICE', particular: 'Rent for May 2026', refNo: 'INV-2026-001', debit: 45000, credit: 0, notes: '' },
    { _id: 'l3', id: 'l3', tenantId: 'm1', date: '2026-05-05', type: 'PAYMENT', particular: 'Payment Received', refNo: 'TXN-8822', debit: 0, credit: 45000, notes: 'Online Transfer' }
  ] as any[],
  companies: [
    { _id: 'c1', id: 'c1', companyName: 'Swastik Grah Nirman Company', status: true, address: '123 Main St, Central City', phoneNumber: '9876543210', email: 'contact@swastik.com', gstNumber: '27AAAAA0000A1Z5', state: 'Maharashtra', bankName: 'HDFC Bank', accountNumber: '50100012345678', logoUrl: 'https://placehold.co/200x100?text=SGC', createdAt: new Date() },
    { _id: 'c2', id: 'c2', companyName: 'GLR Real Estate Pvt Ltd.', status: true, address: '456 Business Hub, West Side', phoneNumber: '9876500000', email: 'realestate@glr.com', gstNumber: '27BBBBB1111B1Z6', state: 'Maharashtra', bankName: 'ICICI Bank', accountNumber: '0001234567890', logoUrl: 'https://placehold.co/200x100?text=GLR', createdAt: new Date() },
    { _id: 'c3', id: 'c3', companyName: 'Neoteric Properties Pvt Ltd.', status: true, logoUrl: 'https://placehold.co/200x100?text=NP', createdAt: new Date() },
    { _id: 'c4', id: 'c4', companyName: 'Gravity Infrastructure Pvt. Ltd.', status: true, logoUrl: 'https://placehold.co/200x100?text=GIPL', createdAt: new Date() },
    { _id: 'c5', id: 'c5', companyName: 'Reyan Infrastructure Company', status: true, logoUrl: 'https://placehold.co/200x100?text=RIC', createdAt: new Date() },
    { _id: 'c6', id: 'c6', companyName: 'Rahul Gupta', status: true, logoUrl: 'https://placehold.co/200x100?text=RG', createdAt: new Date() },
    { _id: 'c7', id: 'c7', companyName: 'Ramjidas Gupta', status: true, logoUrl: 'https://placehold.co/200x100?text=RJG', createdAt: new Date() },
    { _id: 'c8', id: 'c8', companyName: 'Heaven Heights Pvt Ltd', status: true, logoUrl: 'https://placehold.co/200x100?text=HHPL', createdAt: new Date() },
    { _id: 'c9', id: 'c9', companyName: 'Neoteric Housing India LLP', status: true, logoUrl: 'https://placehold.co/200x100?text=NHIL', createdAt: new Date() },
    { _id: 'c10', id: 'c10', companyName: 'Neoteric Recreational and Hospitality Service Pvt Ltd.', status: true, logoUrl: 'https://placehold.co/200x100?text=NRHS', createdAt: new Date() }
  ] as any[]
};

export const isUsingMockData = { value: true }; // Wrapped in object to be mutable/shared if needed or just use a flag
