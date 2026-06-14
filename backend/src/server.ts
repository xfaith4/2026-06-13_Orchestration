import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'UnifiedAIToolbox API',
    version: '0.1.0',
    status: 'running'
  });
});

// Start server
app.listen(port, () => {
  console.log(`✓ Backend server running on http://localhost:${port}`);
});

export default app;
