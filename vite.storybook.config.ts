import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * Storybook must not load the application Vite config: that config starts the
 * Cloudflare development runtime. This deliberately contains only the browser
 * build pieces needed to render the client in isolation.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify('storybook'),
  },
});
