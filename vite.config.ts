import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const rawEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminEmailHash = rawEmail ? crypto.createHash('sha256').update(rawEmail).digest('hex') : '';

  return {
    plugins: [
      react(),
      {
        name: 'api-config-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/config' || req.url?.startsWith('/api/config?')) {
              const config = {
                apiKey: env.FIREBASE_API_KEY || '',
                authDomain: env.FIREBASE_AUTH_DOMAIN || '',
                databaseURL: env.FIREBASE_DATABASE_URL || '',
                projectId: env.FIREBASE_PROJECT_ID || '',
                storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
                appId: env.FIREBASE_APP_ID || '',
                measurementId: env.FIREBASE_MEASUREMENT_ID || '',
                adminEmailHash,
                recaptchaSiteKey: env.RECAPTCHA_SITE_KEY || '',
                recaptchaType: env.RECAPTCHA_TYPE || 'v3',
              };
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(config));
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      port: 5173,
      open: false,
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          },
        },
      },
    },
  };
});
