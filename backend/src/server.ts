import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceService } from './services/persistence.js';
import { ValidationService } from './services/validation.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, '..', '..', 'data');
const schemasDir = path.join(__dirname, '..', '..', 'shared', 'src', 'schemas');

// Services
const persistence = new PersistenceService({ dataDir });
const validation = new ValidationService(schemasDir);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'UnifiedAIToolbox API',
    version: '0.1.0',
    status: 'running',
    message: 'Phase 2: Core Data Models and Persistence'
  });
});

// Application endpoints
app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const applications = await persistence.list('applications');
    res.json({ data: applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.post('/api/applications', async (req: Request, res: Response) => {
  try {
    const schema = await validation.loadSchema('application');
    if (!schema) {
      return res.status(500).json({ error: 'Schema not found' });
    }

    const errors = validation.validate(req.body, schema);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const application = await persistence.create('applications', req.body);
    res.status(201).json({ data: application });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create application' });
  }
});

app.get('/api/applications/:id', async (req: Request, res: Response) => {
  try {
    const application = await persistence.read('applications', req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ data: application });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✓ Backend server running on http://localhost:${port}`);
  console.log(`✓ Persistence layer ready (data dir: ${dataDir})`);
  console.log(`✓ Validation service ready (schemas dir: ${schemasDir})`);
});

export default app;
