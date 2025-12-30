import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild', // Default, but explicit for clarity
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
                pdf: ['pdf-lib', 'jspdf'] 
            }
        }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''), // Backend expects /api prefix
      },
    },
  },
})
