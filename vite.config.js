import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Plugin to generate HTML files at dist root after build
function generateExtensionHtml() {
  return {
    name: 'generate-extension-html',
    closeBundle() {
      // Sidepanel HTML
      const sidepanelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hanzi Browse</title>
  <link rel="stylesheet" href="./sidepanel.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./sidepanel.js"></script>
</body>
</html>`;
      writeFileSync(resolve(__dirname, 'dist/sidepanel.html'), sidepanelHtml);
      console.log('Generated dist/sidepanel.html');

      // Onboarding HTML
      const onboardingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hanzi Browse</title>
  <link rel="stylesheet" href="./onboarding.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./onboarding.js"></script>
</body>
</html>`;
      writeFileSync(resolve(__dirname, 'dist/onboarding.html'), onboardingHtml);
      console.log('Generated dist/onboarding.html');
    }
  };
}

export default defineConfig({
  plugins: [preact(), generateExtensionHtml()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel-preact/index.html'),
        onboarding: resolve(__dirname, 'src/onboarding/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/sidepanel-preact'),
    },
  },
});
