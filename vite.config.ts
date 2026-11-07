import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import { readFile } from 'node:fs/promises'
import type { Plugin } from 'vite'

// Aperçu LOCAL uniquement : sert le référentiel de travail pour les tests sur ce PC.
// Rien de tout cela n'est inclus dans la version publiée (dossier dist).
const packLocal: Plugin = {
  name: 'nomina-pack-local',
  configurePreviewServer(server) {
    server.middlewares.use('/nomina/__pack-local.json', async (_req, res) => {
      try {
        const data = await readFile(new URL('../Nomina - Referentiel.json', import.meta.url))
        res.setHeader('Content-Type', 'application/json')
        res.end(data)
      } catch {
        res.statusCode = 404
        res.end('{}')
      }
    })
  },
}

export default defineConfig({
  // L'appli est servie sur https://neronoir001.github.io/nomina/
  base: '/nomina/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    packLocal,
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Nomina',
        short_name: 'Nomina',
        description: 'Fiches de personnages pour In Nomine Satanis / Magna Veritas',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#141012',
        theme_color: '#141012',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Le service worker prend la main sur la page dès sa première installation,
        // sinon le bouton « Mettre à jour » n'a aucun effet dans cette fenêtre.
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
