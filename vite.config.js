import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

// After build, copy index.html to 404.html so hosts that serve 404.html for missing paths load the SPA
function copyIndexTo404() {
  return {
    name: 'copy-404',
    closeBundle() {
      const outDir = join(process.cwd(), 'dist')
      const index = join(outDir, 'index.html')
      const notFound = join(outDir, '404.html')
      if (existsSync(index)) {
        copyFileSync(index, notFound)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), copyIndexTo404()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled']
        }
      }
    }
  },
  server: {
    proxy: {
      '/StoryTeller': {
        target: 'http://160.187.80.154:8081',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message);
          });
        },
      },
    },
  },
})
