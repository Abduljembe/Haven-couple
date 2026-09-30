import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const silenceViteHmrPlugin: Plugin = {
  name: 'silence-vite-hmr',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: `
            (function() {
              if (typeof window === 'undefined') return;
              var isViteMsg = function(item) {
                if (!item) return false;
                var str = '';
                if (typeof item === 'string') str = item;
                else if (item instanceof Error) str = (item.message || '') + ' ' + (item.stack || '');
                else {
                  try { str = String(item); } catch(e) { str = ''; }
                }
                return str.indexOf('[vite]') !== -1 ||
                       str.indexOf('failed to connect to websocket') !== -1 ||
                       str.indexOf('WebSocket connection to') !== -1 ||
                       str.indexOf('vite-hmr') !== -1 ||
                       str.indexOf('vite-ping') !== -1;
              };

              var origError = console.error;
              var origWarn = console.warn;
              console.error = function() {
                for (var i = 0; i < arguments.length; i++) {
                  if (isViteMsg(arguments[i])) return;
                }
                origError.apply(console, arguments);
              };
              console.warn = function() {
                for (var i = 0; i < arguments.length; i++) {
                  if (isViteMsg(arguments[i])) return;
                }
                origWarn.apply(console, arguments);
              };

              window.addEventListener('error', function(event) {
                if (isViteMsg(event.message) || isViteMsg(event.error)) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  return true;
                }
              }, true);

              window.addEventListener('unhandledrejection', function(event) {
                if (isViteMsg(event.reason)) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  return true;
                }
              }, true);

              if (window.WebSocket) {
                var NativeWS = window.WebSocket;
                window.WebSocket = function(url, protocols) {
                  var isVite = false;
                  if (protocols === 'vite-hmr' || protocols === 'vite-ping') isVite = true;
                  if (Array.isArray(protocols) && (protocols.indexOf('vite-hmr') !== -1 || protocols.indexOf('vite-ping') !== -1)) isVite = true;
                  if (typeof url === 'string' && (url.indexOf('token=') !== -1 || url.indexOf('/@vite') !== -1)) isVite = true;

                  if (isVite) {
                    var listeners = {};
                    var mockWs = {
                      CONNECTING: 0,
                      OPEN: 1,
                      CLOSING: 2,
                      CLOSED: 3,
                      readyState: 1,
                      protocol: typeof protocols === 'string' ? protocols : 'vite-hmr',
                      url: String(url),
                      bufferedAmount: 0,
                      extensions: '',
                      binaryType: 'blob',
                      send: function() {},
                      close: function() {
                        mockWs.readyState = 3;
                        mockWs.dispatchEvent(new Event('close'));
                      },
                      addEventListener: function(type, fn) {
                        if (!listeners[type]) listeners[type] = [];
                        listeners[type].push(fn);
                      },
                      removeEventListener: function(type, fn) {
                        if (!listeners[type]) return;
                        listeners[type] = listeners[type].filter(function(l) { return l !== fn; });
                      },
                      dispatchEvent: function(event) {
                        var list = listeners[event.type] || [];
                        for (var i = 0; i < list.length; i++) {
                          try { list[i].call(mockWs, event); } catch(e) {}
                        }
                        if (typeof mockWs['on' + event.type] === 'function') {
                          try { mockWs['on' + event.type].call(mockWs, event); } catch(e) {}
                        }
                        return true;
                      }
                    };
                    setTimeout(function() {
                      mockWs.dispatchEvent(new Event('open'));
                    }, 0);
                    return mockWs;
                  }
                  return new NativeWS(url, protocols);
                };
                window.WebSocket.CONNECTING = 0;
                window.WebSocket.OPEN = 1;
                window.WebSocket.CLOSING = 2;
                window.WebSocket.CLOSED = 3;
                window.WebSocket.prototype = NativeWS.prototype;
              }
            })();
          `,
        },
      ];
    },
  },
};

export default defineConfig(() => {
  return {
    plugins: [
      silenceViteHmrPlugin,
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Haven - Private Couple Space',
          short_name: 'Haven',
          description: 'End-to-end encrypted private space for couples with audio and video calls, synchronized watch parties, and private notes.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 4000,
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
