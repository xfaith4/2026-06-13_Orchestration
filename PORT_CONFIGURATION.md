# Port Configuration

## Current Ports (Updated 2026-06-14)

This document outlines the ports used by the UnifiedAIToolbox application.

### Application Ports

| Service | Port | Environment Variable | Default | Notes |
|---------|------|----------------------|---------|-------|
| Backend API | 3001 | `PORT` | 3001 | Express.js server running on `http://localhost:3001` |
| Frontend Dev | 5174 | (Vite) | 5174 | Vite dev server running on `http://localhost:5174` |

### Port Selection Rationale

Ports were selected based on availability testing on 2026-06-14:

**Backend: Port 3001**
- Previous port (3000) was in use by another service
- Port 3001 is available and commonly used for development APIs
- Configured in `backend/src/server.ts`

**Frontend: Port 5174**
- Port 5173 (Vite default) was available but chosen to differentiate
- Port 5174 is part of the ephemeral/dynamic port range
- Configured in `frontend/vite.config.ts`

### Configuration Files

**Environment Variables (.env.example)**
```
BACKEND_PORT=3001
BACKEND_CORS_ORIGIN=http://localhost:5174
FRONTEND_PORT=5174
VITE_API_BASE_URL=http://localhost:3001
```

**Backend Configuration (backend/src/server.ts)**
```typescript
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`✓ Backend server running on http://localhost:${port}`);
  // ...
});
```

**Frontend Configuration (frontend/vite.config.ts)**
```typescript
export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
```

### Starting the Application

**Backend**
```bash
cd backend
npm install
npm run build
npm start
# Server will run on http://localhost:3001
```

**Frontend (Development)**
```bash
cd frontend
npm install
npm run dev
# Dev server will run on http://localhost:5174
# API requests automatically proxied to http://localhost:3001
```

**Frontend (Production)**
```bash
cd frontend
npm install
npm run build
# Build output in frontend/dist/
# Can be served statically (update API base URL if needed)
```

### Available Alternative Ports

If ports 3001 or 5174 become unavailable, the following alternatives are available:

**Backend Alternatives**
- 3002, 3003, 3004 (use `PORT=3002 npm start`)
- 4000, 4001, 5000, 5001 (update VITE_API_BASE_URL accordingly)

**Frontend Alternatives**
- 5173, 5175, 5176, 5200, 5201 (update `vite.config.ts` port and CORS origin)

### Troubleshooting

**Port Already in Use**

If you get an "Address already in use" error:

1. **Find what's using the port:**
   ```bash
   # Windows (PowerShell)
   Get-NetTCPConnection -LocalPort 3001 | Select-Object -Property State,OwningProcess
   
   # macOS/Linux
   lsof -i :3001
   ```

2. **Kill the process (if safe):**
   ```bash
   # Windows (PowerShell, as admin)
   Stop-Process -Id <PID> -Force
   
   # macOS/Linux
   kill -9 <PID>
   ```

3. **Or use a different port:**
   ```bash
   PORT=3002 npm start  # backend
   # Update frontend/vite.config.ts for frontend
   ```

### Network Access

- **Local Development:** `http://localhost:3001` (backend), `http://localhost:5174` (frontend)
- **Machine Network:** `http://<machine-ip>:3001` (backend), `http://<machine-ip>:5174` (frontend)
- **Cross-Origin (CORS):** Backend allows frontend on `http://localhost:5174`

### SSL/TLS (Production)

For production deployment, configure SSL/TLS:

**Backend (Express)**
```typescript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('/path/to/key.pem'),
  cert: fs.readFileSync('/path/to/cert.pem')
};

https.createServer(options, app).listen(443, () => {
  console.log('Secure server running on https://...');
});
```

**Frontend (Vite)**
```typescript
export default defineConfig({
  server: {
    https: true,  // for dev server
    // or use actual certificates
  }
});
```

### Related Documentation

- [.env.example](./.env.example) - Environment variable template
- [frontend/vite.config.ts](./frontend/vite.config.ts) - Frontend build config
- [backend/src/server.ts](./backend/src/server.ts) - Backend server initialization
