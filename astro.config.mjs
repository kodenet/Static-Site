import { defineConfig } from 'astro/config';
import image from '@astrojs/image';

export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true
    }
  },
  integrations: [
    image({
      serviceEntryPoint: '@astrojs/image/sharp'
    })
  ],
  site: 'http://localhost:3000',
  base: '/',
  outDir: './dist',
  publicDir: './public',
}); 