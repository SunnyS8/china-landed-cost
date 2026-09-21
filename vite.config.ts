import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

// Dev-only proxy for /api/cbr — mirrors api/cbr.ts (Vercel serverless in production)
function cbrProxyPlugin(): Plugin {
  const extract = (xml: string, code: string): number | null => {
    const re = new RegExp(
      `<Valute[^>]*>\\s*<NumCode>[^<]*</NumCode>\\s*<CharCode>${code}</CharCode>\\s*<Nominal>(\\d+)</Nominal>\\s*<Name>[^<]*</Name>\\s*<Value>([\\d,]+)</Value>`,
    );
    const m = xml.match(re);
    if (!m) return null;
    const nominal = parseInt(m[1], 10);
    const value = parseFloat(m[2].replace(',', '.'));
    return nominal > 0 && value > 0 ? value / nominal : null;
  };

  return {
    name: 'vite-plugin-cbr-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/cbr')) return next();
        const u = new URL(req.url, 'http://localhost');
        const date = u.searchParams.get('date') || '';
        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({error: 'date must be DD.MM.YYYY'}));
          return;
        }
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 12000);
          const r = await fetch(
            `https://www.cbr.ru/scripts/XML_daily.asp?date_req=${date}`,
            {signal: ctrl.signal},
          );
          clearTimeout(timer);
          if (!r.ok) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: `cbr.ru ${r.status}`}));
            return;
          }
          const xml = await r.text();
          const usd = extract(xml, 'USD');
          const eur = extract(xml, 'EUR');
          const cny = extract(xml, 'CNY');
          if (usd == null) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 'USD not found'}));
            return;
          }
          const dateMatch = xml.match(/<ValCurs[^>]+date="(\d{2}\.\d{2}\.\d{4})"/);
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              date: dateMatch?.[1] || date,
              usdRub: usd,
              eurRub: eur ?? usd * 1.08,
              cnyRub: cny ?? usd / 7.1,
            }),
          );
        } catch (e: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({error: e?.message || 'fetch failed'}));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/china-landed-cost/',
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), cbrProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
