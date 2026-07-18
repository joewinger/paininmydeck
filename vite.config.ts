import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { faviconPathForMode } from './build/favicon';

function buildVersion(): string {
  if (process.env.VITE_COMMIT_HASH) return process.env.VITE_COMMIT_HASH;

  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const currentBuildVersion = buildVersion();

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    cloudflare(),
    {
      name: 'environment-favicon',
      transformIndexHtml(html) {
        return html.replace('/favicon.svg', faviconPathForMode(mode));
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(currentBuildVersion),
    __PAIN_IN_MY_DECK_BUILD_VERSION__: JSON.stringify(currentBuildVersion),
  },
  server: {
    watch: {
      ignored: [
        '**/.wrangler/**',
        '**/dist/**',
        '**/playwright-report/**',
        '**/storybook-static/**',
        '**/test-results/**',
        '**/tests/visual/**',
      ],
    },
  },
  build: {
    sourcemap: false,
    target: 'es2022',
  },
}));
