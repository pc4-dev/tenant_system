import { Request, Response } from 'express';
import { Company } from '../models/Company';
import { mockStorage, isUsingMockData } from '../src/mockData';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

export const getCompanies = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      return res.json(mockStorage.companies);
    }
    const companies = await Company.find().sort({ companyName: 1 });
    res.json(companies.map(c => ({ ...c.toObject(), id: c._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      const company = mockStorage.companies.find((c: any) => c.id === req.params.id);
      if (!company) return res.status(404).json({ error: 'Company not found' });
      return res.json(company);
    }
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ ...company.toObject(), id: company._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const companyData = { ...req.body };
    const file = (req as any).file;

    // Handle boolean conversion for Multipart form data
    if (companyData.status !== undefined) {
      companyData.status = companyData.status === 'true' || companyData.status === true;
    }

    if (file) {
      if (!isCloudinaryConfigured) {
        const stats = fs.statSync(file.path);
        if (stats.size > 14 * 1024 * 1024) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: 'File too large for database (Max 14MB).' });
        }
        const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
        companyData.logoUrl = `data:${file.mimetype};base64,${base64}`;
        fs.unlinkSync(file.path);
      } else {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'companies/logos',
          resource_type: 'auto',
          public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/\s+/g, '_')}`
        });
        companyData.logoUrl = result.secure_url;
        fs.unlinkSync(file.path);
      }
    }

    if (isUsingMockData.value) {
      const company = { ...companyData, _id: `c${Date.now()}`, id: `c${Date.now()}`, createdAt: new Date() };
      mockStorage.companies.push(company);
      return res.status(201).json(company);
    }
    const company = new Company(companyData);
    await company.save();
    res.status(201).json({ ...company.toObject(), id: company._id });
  } catch (err: any) {
    console.error('Error creating company:', err);
    res.status(400).json({ error: err.message });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    const file = (req as any).file;

    // Handle boolean conversion for Multipart form data
    if (updateData.status !== undefined) {
      updateData.status = updateData.status === 'true' || updateData.status === true;
    }

    if (file) {
      if (!isCloudinaryConfigured) {
        const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
        updateData.logoUrl = `data:${file.mimetype};base64,${base64}`;
        fs.unlinkSync(file.path);
      } else {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'companies/logos',
          resource_type: 'auto',
          public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/\s+/g, '_')}`
        });
        updateData.logoUrl = result.secure_url;
        fs.unlinkSync(file.path);
      }
    }

    if (isUsingMockData.value) {
      const index = mockStorage.companies.findIndex((c: any) => c.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Company not found' });
      mockStorage.companies[index] = { ...mockStorage.companies[index], ...updateData };
      return res.json(mockStorage.companies[index]);
    }
    
    const company = await Company.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ ...company.toObject(), id: company._id });
  } catch (err: any) {
    console.error('Error updating company:', err);
    res.status(400).json({ error: err.message });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      mockStorage.companies = mockStorage.companies.filter((c: any) => c.id !== req.params.id);
      return res.json({ success: true });
    }
    await Company.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
