import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    cloudflare({ remoteBindings: mode === 'live', inspectorPort: mode === 'live' ? 9231 : 9230 }),
  ],
  server: { port: 5173, strictPort: true },
}));
