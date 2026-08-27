// cspell:ignore onwarn, pdfobject
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, UserConfig } from 'vite';
import { ViteUserConfig } from 'vitest/config';

export default defineConfig(({ mode }): UserConfig & Pick<ViteUserConfig, 'test'> => {
  const env = loadEnv(mode, process.cwd());
  const isCI = process.env.CIRCLECI === 'true';

  /* Both dev proxies target the shopper's own store, resolved from VITE_STORE_HASH
   * rather than a hardcoded one, so the same code serves any instance. A proxy is
   * only registered once its target is known: without that guard the target becomes
   * `store-undefined.mybigcommerce.com` and every proxied request fails opaquely. */
  const storeUrl = env.VITE_STORE_HASH
    ? `https://store-${env.VITE_STORE_HASH}.mybigcommerce.com`
    : undefined;
  const shoppingUrl = env.VITE_PROXY_SHOPPING_URL || storeUrl;

  return {
    plugins: [
      legacy({
        modernTargets: 'since 2022',
        renderLegacyChunks: false,
        modernPolyfills: true,
      }),
      react(),
    ],
    experimental: {
      renderBuiltUrl(filename: string) {
        const isCustomBuyerPortal = env.VITE_ASSETS_ABSOLUTE_PATH !== undefined;
        return isCustomBuyerPortal
          ? `${env.VITE_ASSETS_ABSOLUTE_PATH}${filename}`
          : {
              runtime: `window.b2b.__get_asset_location(${JSON.stringify(filename)})`,
            };
      },
    },
    server: {
      port: 3001,
      cors: true,
      proxy: {
        ...(shoppingUrl && {
          '/bigcommerce': {
            target: shoppingUrl,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/bigcommerce/, ''),
          },
        }),
        ...(storeUrl && {
          '/bc-graphql': {
            target: storeUrl,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/bc-graphql/, '/graphql'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.removeHeader('origin');
                // Strip the storefront shopper session cookie. If BigCommerce sees
                // SHOP_SESSION_TOKEN it scopes the request to that session and ignores
                // the storefront bearer token, making token-created carts/checkouts
                // invisible ("Checkout does not exist." / null redirectUrls).
                proxyReq.removeHeader('cookie');
              });
            },
          },
        }),
      },
    },
    test: {
      // We override the default timeout in CI to account for slower test execution.
      // This is necessary because the default timeout of 5 seconds is not enough for some tests
      // that involve network requests or complex component interactions.
      testTimeout: isCI ? 40_000 : 5_000,
      slowTestThreshold: 3_000,
      env: {
        VITE_B2B_URL: 'https://api-b2b.bigcommerce.com',
        VITE_IS_LOCAL_ENVIRONMENT: 'TRUE',
      },
      clearMocks: true,
      mockReset: true,
      restoreMocks: true,
      globals: true,
      environment: 'jsdom',
      globalSetup: './tests/global-setup.ts',
      setupFiles: ['./tests/jsdom-polyfills.ts', './tests/setup-test-environment.ts'],
      reporters: isCI ? ['default', 'junit'] : ['default'],
      outputFile: {
        junit: 'coverage/junit.xml',
      },
      coverage: {
        provider: 'istanbul',
        cleanOnRerun: isCI,
        reporter: ['text', 'html', 'clover', 'json', 'lcov'],
      },
      deps: {
        optimizer: {
          web: {
            include: ['react-intl'],
          },
        },
      },
      maxWorkers: isCI ? process.env.MAX_WORKERS : undefined,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        tests: path.resolve(__dirname, './tests'),
      },
    },
    build: {
      manifest: true,
      minify: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          index: 'src/main.ts',
          headless: 'src/headless.ts',
        },
        output: {
          entryFileNames({ name }) {
            if (name.includes('headless') || env.VITE_DISABLE_BUILD_HASH) {
              return '[name].js';
            }
            return '[name].[hash].js';
          },
          experimentalMinChunkSize: 10_000,
          manualChunks: {
            reactVendor: ['react', 'react-dom'],
            intl: ['react-intl'],
            mui: ['@emotion/react', '@emotion/styled', '@mui/material'],
            muiIcon: ['@mui/icons-material'],
            redux: ['react-redux'],
            dateFns: ['date-fns'],
            pdfobject: ['pdfobject'],
            resizable: ['react-resizable'],
            toolkit: ['@reduxjs/toolkit'],
            form: ['react-hook-form'],
            router: ['react-router-dom'],
            lodashEs: ['lodash-es'],
            dropzone: ['react-dropzone'],
            eCache: ['@emotion/cache'],
          },
          chunkFileNames(chunk) {
            const id = chunk.facadeModuleId;

            if (id && /\/lib\/lang\/locales\/[^/]+\.json$/.test(id)) {
              const base = path.basename(id, '.json');

              return `chunks/locale-${base}.[hash].js`;
            }

            if (chunk.name === 'index' && id) {
              const folderName = path.basename(path.dirname(id));

              return `chunks/${folderName}.[hash].js`;
            }

            return `chunks/[name].[hash].js`;
          },
        },
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
          }
          warn(warning);
        },
        plugins: env.VITE_VISUALIZER === '1' && [
          visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ],
      },
    },
  };
});
