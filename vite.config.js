
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

function rootFallbackPlugin() {
  return {
    name: 'root-fallback',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || importer.includes('node_modules') || source.startsWith('\0') || source.startsWith('node:')) return null;

      // Handle relative, alias, or absolute paths like @/, ./, ../, /
      if (source.startsWith('@/') || source.startsWith('./') || source.startsWith('../') || source.startsWith('/')) {
        const filename = path.basename(source);
        const extensions = ['', '.jsx', '.js', '.jsonc', '.json', '.tsx', '.ts'];

        for (const ext of extensions) {
          const nameWithExt = filename.endsWith(ext) && ext !== '' ? filename : filename + ext;
          const candidate = path.resolve(__dirname, nameWithExt);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
          }
        }
      }
      return null;
    }
  }
}

function jsoncPlugin() {
  return {
    name: 'jsonc-loader',
    transform(code, id) {
      if (id.endsWith('.jsonc')) {
        const clean = code
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '');
        try {
          const parsed = JSON.parse(clean);
          return {
            code: `export default ${JSON.stringify(parsed)};`,
            map: null
          };
        } catch (e) {
          return {
            code: `export default {};`,
            map: null
          };
        }
      }
      return null;
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  },
  plugins: [
    rootFallbackPlugin(),
    jsoncPlugin(),
    react(),
  ]
});