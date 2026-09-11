import { sveltekit } from '@sveltejs/kit/vite';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [tailwind(), sveltekit()],
  server: {
    // Runtime files and test/report writes must not reload an applicant's form.
    watch: {
      ignored: [
        '**/data/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/docs/**',
        '**/e2e/**',
        '**/tests/**',
      ],
    },
  },
});
