import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Redirige /api/* → backend Express en 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Redirige /ws → WebSocket server en 8080
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Aumentar límite de advertencia (Three.js siempre supera 500KB)
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js core — muy estable, se cachea indefinidamente
          'three-core': ['three'],
          // R3F + Drei — helpers React de Three.js
          'r3f': ['@react-three/fiber', '@react-three/drei'],
          // Postprocessing — efectos visuales
          'postprocessing': ['@react-three/postprocessing', 'postprocessing'],
          // React + estado
          'react-vendor': ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
})
