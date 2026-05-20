import express from 'express';
import { getTenants, createTenant, getTenantById, updateTenant, deleteTenant, getTenantDetails } from '../controllers/tenant.controller';
import { upload } from '../middleware/multer';

const router = express.Router();

const tenantUpload = (req: any, res: any, next: any) => {
  upload.single('agreementFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    next();
  });
};

router.get('/', getTenants);
router.post('/', tenantUpload, createTenant);
router.get('/:id', getTenantById);
router.get('/:id/details', getTenantDetails);
router.put('/:id', tenantUpload, updateTenant);
router.delete('/:id', deleteTenant);

export default router;
