import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import companyRoutes from '../routes/company.routes';
import tenantRoutes from '../routes/tenant.routes';
import invoiceRoutes from '../routes/invoice.routes';
import statsRoutes from '../routes/stats.routes';
import gstRoutes from '../routes/gst.routes';
import ledgerRoutes from '../routes/ledger.routes';
import { isUsingMockData } from './mockData';

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Debug Logging Middleware
  app.use((req, res, next) => {
    console.log(`[API-DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
  });

  // Simple Ping for external check
  app.get('/ping', (req, res) => res.send('pong'));

  // Status API
  app.get('/api/status', (req, res) => {
    res.json({ isDemo: isUsingMockData.value, database: isUsingMockData.value ? 'Local/Mock' : 'MongoDB Atlas' });
  });

  // API Routes
  app.use('/api/companies', companyRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/gst', gstRoutes);
  app.use('/api/ledger', ledgerRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  // Vite / Static Handling
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: 'frontend',
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  return app;
}
