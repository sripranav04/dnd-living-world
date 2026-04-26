import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['dnd-living-world.braveriver-d5a37ba2.eastus2.azurecontainerapps.io'],
  },
})