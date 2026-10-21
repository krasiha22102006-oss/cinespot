import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { executeApiCore } from './src/api/apiCore.js'

function mockApiPlugin() {
  const handler = async (req, res, next) => {
    const url = req.url || ''
    if (!url.startsWith('/api')) {
      return next()
    }

    const method = (req.method || 'GET').toLowerCase()

    // Read body if POST, PUT, PATCH
    let body = {}
    if (['post', 'put', 'patch'].includes(method)) {
      try {
        const buffers = []
        for await (const chunk of req) {
          buffers.push(chunk)
        }
        const text = Buffer.concat(buffers).toString('utf-8')
        body = text ? JSON.parse(text) : {}
      } catch {
        body = {}
      }
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (method === 'options') {
      res.statusCode = 204
      return res.end()
    }

    try {
      const result = executeApiCore({
        method,
        url,
        params: {},
        headers: req.headers,
        body
      })
      res.statusCode = result.status || 200
      res.end(JSON.stringify(result.data))
    } catch (err) {
      res.statusCode = err.status || 500
      res.end(JSON.stringify(err.data || { error: err.message, success: false }))
    }
  }

  return {
    name: 'vite-mock-api-plugin',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
  },
})
