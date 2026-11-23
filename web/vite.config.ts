import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const api = process.env.GZ_API ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../server/src/types.ts', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Allow the shared DTO file and cloudflared tunnel hosts.
    fs: { allow: ['..'] },
    allowedHosts: true,
    proxy: {
      '/api': api,
      '/socket.io': { target: api, ws: true },
    },
  },
});
