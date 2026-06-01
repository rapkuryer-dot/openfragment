import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'app',
  envDir: projectRoot,
  define: {
    // Preview tokens on /launchpad unless explicitly disabled at build time.
    'import.meta.env.VITE_LAUNCHPAD_DEMO': JSON.stringify(
      process.env.VITE_LAUNCHPAD_DEMO ?? 'true',
    ),
  },
  // NOTE: TONCENTER_* keys are intentionally NOT exposed to the client bundle.
  // They are consumed server-side only by the /api/toncenter proxy.
  envPrefix: ['VITE_'],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@wrappers': path.resolve(projectRoot, 'wrappers-ts'),
      '@': path.resolve(projectRoot, 'app/src'),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: '../dist',
    // Single app chunk — avoids infinite spinner when a split chunk fails to preload.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    fs: {
      allow: ['.', path.resolve(projectRoot, 'wrappers-ts')],
    },
    port: 5173,
    proxy: {
      // Browser-side metadata upload: extensions/firewalls/VPNs often block
      // jsonblob.com. Going through Vite server-side proxy avoids any
      // browser-level blocking and CORS preflight overhead.
      '/_meta': {
        target: 'https://jsonblob.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/_meta/, '/api/jsonBlob'),
      },
      '/_img': {
        target: 'https://catbox.moe',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/_img/, '/user/api.php'),
      },
    },
  },
});
