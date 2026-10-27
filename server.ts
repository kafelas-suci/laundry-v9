import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const rootDir = import.meta.dirname || process.cwd();

function loadFirebaseAppletConfig(): Record<string, string> {
  try {
    const raw = fs.readFileSync(path.join(rootDir, 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function startServer() {
  const app = express();
  const port = 3000;

  // Endpoint konfigurasi Firebase publik dari firebase-applet-config.json / env
  app.get('/api/firebase-config', (_req, res) => {
    const appletCfg = loadFirebaseAppletConfig();
    res.json({
      apiKey:
        process.env.VITE_FIREBASE_API_KEY ||
        process.env.FIREBASE_API_KEY ||
        appletCfg.apiKey ||
        '',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || appletCfg.authDomain || '',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || appletCfg.projectId || '',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || appletCfg.storageBucket || '',
      messagingSenderId:
        process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletCfg.messagingSenderId || '',
      appId: process.env.VITE_FIREBASE_APP_ID || appletCfg.appId || '',
    });
  });

  // 1. Proxy endpoint untuk mengambil gambar tanpa masalah CORS
  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      res.send(`data:${contentType};base64,${base64}`);
    } catch (error) {
      console.error('Proxy image error:', error);
      res.status(500).send('Failed to proxy image');
    }
  });

  // Route langsung untuk Web Landing Page berdiri sendiri
  app.get(['/landing', '/beranda'], (_req, res) => {
    res.redirect('/landing.html');
  });

  // Route langsung untuk Web Tutorial Bergaris Penunjuk berdiri sendiri
  app.get(['/tutorial', '/panduan'], (_req, res) => {
    res.redirect('/tutorial.html');
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // 2. Setup Vite (untuk frontend)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
