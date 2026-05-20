import express from 'express';
import { getLedgerByTenant, createLedgerEntry } from '../controllers/ledger.controller';

const router = express.Router();

router.get('/tenant/:tenantId', getLedgerByTenant);
router.post('/entry', createLedgerEntry);

export default router;
