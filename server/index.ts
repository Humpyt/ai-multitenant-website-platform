import 'reflect-metadata';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { initializeDatabase, getTenantRepository } from './database';
import { NextServer } from 'next/dist/server/next';
import path from 'path';

const PORT = process.env.PORT || 3000;
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || 'localhost:3000';
const dev = process.env.NODE_ENV !== 'production';

const app = express();
let nextServer: NextServer;

// Initialize database connection
const initializeApp = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// Parse subdomain from hostname
const extractSubdomain = (hostname: string): string | null => {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // Remove main domain
  const domainParts = MAIN_DOMAIN.split(':')[0].split('.');
  const mainDomain = domainParts.slice(-2).join('.'); // Get last two parts (e.g., example.com)

  // If the host is exactly the main domain, no subdomain
  if (hostWithoutPort === mainDomain || hostWithoutPort === `www.${mainDomain}`) {
    return null;
  }

  // Extract subdomain by removing main domain
  const subdomain = hostWithoutPort.replace(`.${mainDomain}`, '');

  // Return null if it's just www or empty
  if (subdomain === 'www' || !subdomain) {
    return null;
  }

  return subdomain;
};

// Middleware to identify tenant from subdomain
const tenantMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const hostname = req.headers.host || '';
  const subdomain = extractSubdomain(hostname);

  if (!subdomain) {
    // This is the main domain, handle with Next.js
    return next();
  }

  try {
    const tenantRepo = getTenantRepository();
    const tenant = await tenantRepo.findOne({
      where: { subdomain },
      relations: ['website']
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: `No tenant found for subdomain: ${subdomain}`
      });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({
        error: 'Tenant inactive',
        message: `Tenant ${subdomain} is not active`
      });
    }

    // Attach tenant to request object
    (req as any).tenant = tenant;
    next();
  } catch (error) {
    console.error('Error finding tenant:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error retrieving tenant information'
    });
  }
};

// Serve tenant websites
const serveTenantWebsite = async (req: express.Request, res: express.Response) => {
  const tenant = (req as any).tenant;

  try {
    // If tenant has a generated website, serve it
    if (tenant.website && tenant.website.status === 'completed') {
      // For now, return a simple HTML page with tenant info
      // In a real implementation, you would fetch from S3 or file storage
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${tenant.businessName || tenant.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .container { max-width: 800px; margin: 0 auto; }
              .header { border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .content { margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ${tenant.businessName || tenant.name}</h1>
                <p>Subdomain: ${tenant.subdomain}</p>
              </div>
              <div class="content">
                <p>This is the generated website for ${tenant.businessName || tenant.name}.</p>
                <p>Website generation status: ${tenant.website.status}</p>
                <p>Generated at: ${tenant.website.generatedAt || 'Not yet generated'}</p>
              </div>
            </div>
          </body>
        </html>
      `);
    } else {
      // Show placeholder page for tenants without websites
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${tenant.name} - Website Coming Soon</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
              .container { max-width: 600px; margin: 0 auto; }
              .coming-soon { color: #666; font-size: 18px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${tenant.name}</h1>
              <p class="coming-soon">Website is being generated...</p>
              <p>Status: ${tenant.website?.status || 'Not started'}</p>
            </div>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error serving tenant website:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error serving website content'
    });
  }
};

// API routes for tenant management
app.use('/api/tenants', express.json(), async (req, res, next) => {
  // These routes will be handled by Next.js API routes
  next();
});

// Initialize Next.js
const initNext = async () => {
  nextServer = new NextServer({
    dev,
    dir: path.join(__dirname, '../'),
    hostname: 'localhost',
    port: PORT,
    customServer: true,
  });

  await nextServer.prepare();
};

// Setup middleware and routes
const setupRoutes = () => {
  // Apply tenant middleware for all subdomain requests
  app.use(tenantMiddleware);

  // Serve tenant websites for subdomains (excluding main domain)
  app.use('*', (req, res, next) => {
    const hostname = req.headers.host || '';
    const subdomain = extractSubdomain(hostname);

    if (subdomain && (req as any).tenant) {
      // This is a tenant subdomain request
      return serveTenantWebsite(req, res);
    }

    // This is the main domain, proxy to Next.js
    const nextHandler = nextServer.getRequestHandler();
    return nextHandler(req, res);
  });
};

// Start server
const startServer = async () => {
  await initializeApp();
  await initNext();
  setupRoutes();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Main domain: http://${MAIN_DOMAIN}`);
    console.log(`📱 Tenant subdomains will be served from: *.${MAIN_DOMAIN.split(':')[0]}`);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (nextServer) {
    await nextServer.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (nextServer) {
    await nextServer.close();
  }
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});