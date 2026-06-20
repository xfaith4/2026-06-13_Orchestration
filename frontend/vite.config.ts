import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envRoot = path.resolve(__dirname, '..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envRoot, '')
  const frontendPort = Number.parseInt(env.FRONTEND_PORT ?? '5176', 10)
  const apiBaseUrl = env.VITE_API_BASE_URL ?? 'http://localhost:3007/api'
  const proxyTarget = apiBaseUrl.replace(/\/api\/?$/, '')

  if (Number.isNaN(frontendPort)) {
    throw new Error(`FRONTEND_PORT must be a valid number. Received "${env.FRONTEND_PORT}".`)
  }

  return {
    envDir: envRoot,
    plugins: [react()],
    server: {
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})
