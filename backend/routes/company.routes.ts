import express from 'express';
import { getCompanies, createCompany, getCompanyById, updateCompany, deleteCompany } from '../controllers/company.controller';
import { upload } from '../middleware/multer';

const router = express.Router();

const logoUpload = upload.single('logoFile');

router.get('/', getCompanies);
router.post('/', logoUpload, createCompany);
router.get('/:id', getCompanyById);
router.put('/:id', logoUpload, updateCompany);
router.delete('/:id', deleteCompany);

export default router;
