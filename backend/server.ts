import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { createApp } from './src/app';
import { isUsingMockData } from './src/mockData';
import { Company } from './models/Company';
import express from 'express';
import path from 'path';


dotenv.config();
const app = express();

// ── Existing code ke neeche add karo ──
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}
const PORT = 3000;

// Cloudinary Configuration
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary Configured');
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI?.trim();

async function seedCompanies() {
  if (isUsingMockData.value) return;
  try {
    const count = await Company.countDocuments();
    if (count === 0) {
      const companies = [
        'Swastik Grah Nirman Company', 'GLR Real Estate Pvt Ltd.', 'Neoteric Properties Pvt Ltd.',
        'Gravity Infrastructure Pvt. Ltd.', 'Reyan Infrastructure Company', 'Rahul Gupta',
        'Ramjidas Gupta', 'Heaven Heights Pvt Ltd', 'Neoteric Housing India LLP',
        'Neoteric Recreational and Hospitality Service Pvt Ltd.'
      ];
      await Company.insertMany(companies.map(name => ({ companyName: name, status: true })));
      console.log('✅ Collection seeded: Companies');
    }
  } catch (err) {
    console.error('Error seeding companies:', err);
  }
}

async function startServer() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      console.log('✅ Connected to MongoDB Atlas');
      isUsingMockData.value = false;
      seedCompanies();
    } catch (err) {
      console.error('⚠️ MongoDB Connection Failed. Fallback to DEMO MODE.');
      isUsingMockData.value = true;
    }
  } else {
    console.log('ℹ️ MONGODB_URI not found. Starting in DEMO MODE.');
    isUsingMockData.value = true;
  }

  const app = await createApp();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
