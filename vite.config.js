
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

      // First check if standard relative/alias path exists
      let targetPath;
      if (source.startsWith('@/')) {
        targetPath = path.resolve(__dirname, source.slice(2));
      } else if (source.startsWith('./') || source.startsWith('../')) {
        targetPath = path.resolve(path.dirname(importer), source);
      } else if (source.startsWith('/')) {
        targetPath = path.resolve(__dirname, '.' + source);
      } else {
        return null;
      }

      const extensions = ['', '.jsx', '.js', '.jsonc', '.json', '.tsx', '.ts'];
      for (const ext of extensions) {
        const p = targetPath.endsWith(ext) && ext !== '' ? targetPath : targetPath + ext;
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          // Explicit target exists! Return it directly or let Vite resolve it
          return p;
        }
      }

      // Fallback: search at root only if explicit path did not exist
      const filename = path.basename(source);
      for (const ext of extensions) {
        const nameWithExt = filename.endsWith(ext) && ext !== '' ? filename : filename + ext;
        const candidate = path.resolve(__dirname, nameWithExt);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
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