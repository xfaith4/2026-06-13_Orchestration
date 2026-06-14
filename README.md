# UnifiedAIToolbox - Phase 0.1 Monorepo Bootstrap

This is the root of the UnifiedAIToolbox monorepo, organized as an npm workspace with three packages: `frontend`, `backend`, and `shared`.

## Prerequisites

- Node.js 24.13.1 (see `.nvmrc`)
- npm 10.8.2

## Project Structure

```
.
├── frontend/              # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx       # Entry point
│   │   ├── App.tsx        # Root component
│   │   └── index.css      # Tailwind styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── backend/               # Express + TypeScript
│   ├── src/
│   │   └── server.ts      # Express bootstrap
│   └── package.json
├── shared/                # Shared types and schemas
│   ├── src/
│   │   ├── types/         # TypeScript type definitions
│   │   ├── schemas/       # Runtime validators
│   │   └── index.ts
│   └── package.json
├── data/                  # Data and configuration files (Phase 1+)
├── docs/                  # Documentation (Phase 1+)
├── agents/                # Agent definitions (preserved from Phase 0.0)
├── contracts/             # Contract schemas (preserved from Phase 0.0)
├── lib/                   # Library modules (preserved from Phase 0.0)
├── Prompts/               # Prompt templates (preserved from Phase 0.0)
├── LessonsLearnedKnowledge/ # Knowledge base (preserved from Phase 0.0)
├── package.json           # Root workspace configuration
├── tsconfig.json          # Shared TypeScript configuration
├── .eslintrc.json         # ESLint configuration
├── .prettierrc.json       # Prettier configuration
└── .env.example           # Environment variables template
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This installs all dependencies for all workspaces (frontend, backend, shared).

### 2. Development Mode

Start all development servers:

```bash
npm run dev
```

This will start:
- **Frontend:** Vite dev server on `http://localhost:5173`
- **Backend:** Express server on `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

Builds all workspaces with TypeScript strict mode enabled.

## Available Scripts

### Root Level (all workspaces)

- `npm install` - Install dependencies for all workspaces
- `npm run build` - Build all workspaces
- `npm run dev` - Start development servers
- `npm run lint` - Lint all TypeScript/TSX files
- `npm run lint:fix` - Fix linting issues
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run tests (Phase 2+)
- `npm run clean` - Remove build artifacts and dependencies

### Frontend Workspace

```bash
cd frontend
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run typecheck
npm run lint
```

### Backend Workspace

```bash
cd backend
npm run dev      # Start Express dev server (port 3000)
npm run build    # Compile TypeScript
npm run start    # Run compiled server
npm run typecheck
npm run lint
```

### Shared Workspace

```bash
cd shared
npm run build    # Compile TypeScript
npm run typecheck
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-14T12:00:00.000Z",
  "environment": "development"
}
```

### API Version

```bash
curl http://localhost:3000/api/v1
```

Response:
```json
{
  "message": "UnifiedAIToolbox API v1",
  "version": "0.1.0",
  "phase": "Phase 0.1 - Bootstrap"
}
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

### TypeScript Strict Mode

All workspaces are configured with TypeScript strict mode:

- `strict: true` - Enable all strict type checking options
- `noImplicitAny: true` - Disallow implicit `any` types
- `noImplicitThis: true` - Raise error on `this` with implicit `any`
- `strictNullChecks: true` - Strict null/undefined checks
- `strictFunctionTypes: true` - Strict function type checking
- `noUnusedLocals: true` - Report unused local variables
- `noUnusedParameters: true` - Report unused parameters
- `noImplicitReturns: true` - Report missing return statements

### Linting

All files are linted with ESLint configured for React + TypeScript:

```bash
npm run lint      # Check for issues
npm run lint:fix  # Auto-fix issues
```

Code is formatted with Prettier:

```bash
npm run format    # (via ESLint --fix)
```

## Frontend Details

### Vite Configuration

- Dev server: `http://localhost:5173`
- Build output: `frontend/dist/`
- JSX mode: `react-jsx` (automatic JSX runtime)

### React + Router

- React 18.3.1
- React Router v6 for client-side routing
- React Router DOM for browser integration

### Styling

- Tailwind CSS 3.4.3 for utility-first styling
- PostCSS for CSS processing
- Autoprefixer for browser compatibility

### Path Aliases

- `@/*` - Points to `frontend/src/`
- `@shared/*` - Points to `shared/src/`

## Backend Details

### Express Configuration

- Server: `http://localhost:3000`
- Middleware: JSON parsing, CORS, logging
- Health check: `/health`
- API endpoint: `/api/v1`

### TypeScript Node Support

Uses `ts-node` for development-time TypeScript execution.

### Path Aliases

- `@/*` - Points to `backend/src/`
- `@shared/*` - Points to `shared/src/`

## Workspace Dependency Graph

The monorepo follows a strictly layered dependency structure:

```
┌─────────────┐         ┌─────────────┐
│  Frontend   │         │   Backend   │
│  (React)    │         │  (Express)  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       └───────────┬───────────┘
                   │
              ┌────▼────┐
              │  Shared  │
              │ (Types & │
              │ Schemas) │
              └──────────┘
```

- **Frontend** → depends on `@unifiedaitoolbox/shared` (types, schemas, validators)
- **Backend** → depends on `@unifiedaitoolbox/shared` (types, schemas, validators)
- **Shared** → no dependencies on other workspace packages (library boundary)

This layering ensures:
- Shared types are the single source of truth
- Frontend and Backend can be developed independently
- No circular dependencies
- Changes to shared types automatically propagate

## Shared Types and Schemas

The `shared` workspace provides:

### Types (`shared/src/types/`)

- `ApiResponse<T>` - Generic API response envelope
- `HealthCheckResponse` - Health check response type
- `ApiVersionInfo` - API version information
- `User` - User entity (placeholder)
- `RequestContext` - Request context (placeholder)

### Schemas (`shared/src/schemas/`)

- `isHealthCheckResponse()` - Type guard
- `isApiResponse<T>()` - Type guard
- `parseApiResponse<T>()` - Safe JSON parsing with validation

## TypeScript Compilation

### Root `tsconfig.json`

Defines shared configuration for all workspaces:

- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Path aliases for monorepo imports

### Workspace `tsconfig.json` files

Each workspace extends the root config with workspace-specific settings:

- **Frontend:** React JSX, DOM lib, Vite paths
- **Backend:** Node.js target, server paths
- **Shared:** Library output, declaration files

## Testing

Testing infrastructure will be added in Phase 2:

- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)

## Architecture Notes

### Monorepo Benefits

- Single `node_modules` for all workspaces (hoisted dependencies)
- Shared TypeScript configuration
- Unified linting and formatting
- Single version control repository
- Easier code sharing via `@unifiedaitoolbox/*` namespaced packages

### Workspace Dependencies

- Frontend and Backend both depend on `@unifiedaitoolbox/shared`
- Shared depends on no workspace packages (library boundary)
- All workspaces can be developed in parallel

### Build Order

1. Shared compiles first (dependency)
2. Frontend and Backend compile in parallel
3. Frontend is built with Vite (bundle optimization)
4. Backend is built with TypeScript (module compilation)

## Next Phases

- **Phase 0.2:** Database setup and ORM integration
- **Phase 1.0:** User authentication and authorization
- **Phase 1.1:** Core API endpoints
- **Phase 1.2:** Frontend UI components and pages
- **Phase 2.0:** Testing infrastructure
- **Phase 2.1:** Deployment configuration

## Troubleshooting

### Port Already in Use

If ports 3000 or 5173 are in use, update `.env`:

```bash
BACKEND_PORT=3001
FRONTEND_PORT=5174
```

### Module Not Found

Ensure all dependencies are installed:

```bash
npm install
```

Clear node_modules and reinstall if issues persist:

```bash
npm run clean
npm install
```

### TypeScript Errors

Run type checking to diagnose:

```bash
npm run typecheck
```

### Build Failures

Check that all workspaces are properly configured and dependencies are installed:

```bash
npm ls --workspaces
npm run build
```

## Contributing

See individual workspace README files for contribution guidelines (Phase 1+).

## License

Proprietary - UnifiedAIToolbox Project
