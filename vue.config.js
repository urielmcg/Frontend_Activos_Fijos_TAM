const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pwa: {
    name: 'SIAEM Activos Fijos',
    themeColor: '#003366',
    msTileColor: '#003366',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black-translucent',
    manifestOptions: {
      background_color: '#003366'
    },
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: new RegExp('^https?://.*/api/.*'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            networkTimeoutSeconds: 5
          }
        },
        {
          urlPattern: new RegExp('^https?://.*/media/.*'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'media-cache',
            expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
          }
        }
      ]
    }
  }
})
