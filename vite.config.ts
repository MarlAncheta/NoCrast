/// <reference types="vitest/config" />
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Also prints the friendlier address. Chrome, Edge and Firefox send any *.localhost name to this computer,
// and Vite accepts it without extra setup, so http://nocrast.localhost:PORT opens the same app.
function friendlyUrl(): Plugin {
  const add = (server: ViteDevServer | PreviewServer) => {
    const print = server.printUrls
    server.printUrls = () => {
      print()
      const local = server.resolvedUrls?.local[0]
      if (local) console.log(`  ➜  NoCrast: http://nocrast.localhost:${new URL(local).port}/`)
    }
  }
  return { name: 'nocrast-friendly-url', configureServer: add, configurePreviewServer: add }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), friendlyUrl()],
  test: { environment: 'node', include: ['src/tests/**/*.test.{ts,tsx}'] },
})
