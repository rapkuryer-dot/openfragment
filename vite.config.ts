import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'app',
  envDir: projectRoot,
  envPrefix: ['VITE_', 'TONCENTER_'],
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/'))
            return 'react';
          if (id.includes('/@ton/ton/') || id.includes('/@ton/core/'))
            return 'ton-sdk';
          if (id.includes('/@tonconnect/')) return 'tonconnect';
          return undefined;
        },
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
