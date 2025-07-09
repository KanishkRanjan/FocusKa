import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for assets
  build : {
    outDir:'dist-react',
  },
  server: {
    port: 5123,
    strictPort: true, // Ensure the port is not already in use
  }
})
