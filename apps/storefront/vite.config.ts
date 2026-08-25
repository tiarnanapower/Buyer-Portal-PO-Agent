// cspell:ignore onwarn, pdfobject
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { appendFileSync } from 'fs';
import { defineConfig, loadEnv, UserConfig } from 'vite';
import { ViteUserConfig } from 'vitest/config';

export default defineConfig(({ mode }): UserConfig & Pick<ViteUserConfig, 'test'> => {
  const env = loadEnv(mode, process.cwd())  ;
  const isCI = process.env.CIRCLECI === 'true';
  // TEMPORARY DIAGNOSTIC: where proxied BC GraphQL traffic gets dumped.
  const BC_GRAPHQL_LOG = process.env.BC_GRAPHQL_LOG ||
    '/private/tmp/claude-502/-Users-tiarnan-power-Documents-Distributed-Ecommerce-Hub/f8d215cb-147b-4229-a549-b208cd09213e/scratchpad/bc-graphql-debug.log';

  return {
    plugins: [legacy({ targets: ['defaults'] }), react()],
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
        '/bigcommerce': {
          target:
            env?.VITE_PROXY_SHOPPING_URL || 'https://tiarnan-b2b-sandbox.mybigcommerce.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bigcommerce/, ''),
        },
        '/bc-graphql': {
          target: `https://store-${env.VITE_STORE_HASH}.mybigcommerce.com`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bc-graphql/, '/graphql'),
          configure: (proxy) => {
            // TEMPORARY DIAGNOSTIC: dump every proxied BC GraphQL call so we can see
            // exactly what the browser sends and what BigCommerce answers.
            // Remove this `log` helper and the two listeners below once debugging is done.
            const log = (obj: unknown) => {
              try {
                appendFileSync(BC_GRAPHQL_LOG, `${JSON.stringify(obj)}\n`);
              } catch {
                /* ignore logging failures */
              }
            };

            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.removeHeader('origin');
              // Strip the storefront shopper session cookie. If BigCommerce sees
              // SHOP_SESSION_TOKEN it scopes the request to that session and ignores
              // the storefront bearer token, making token-created carts/checkouts
              // invisible ("Checkout does not exist." / null redirectUrls).
              proxyReq.removeHeader('cookie');

              const chunks: Buffer[] = [];
              req.on('data', (c: Buffer) => chunks.push(c));
              req.on('end', () => {
                log({
                  t: new Date().toISOString(),
                  dir: 'req',
                  incomingHeaders: req.headers,
                  forwardedHeaders: proxyReq.getHeaders(),
                  body: Buffer.concat(chunks).toString('utf8').slice(0, 2000),
                });
              });
            });

            proxy.on('proxyRes', (proxyRes, req) => {
              const chunks: Buffer[] = [];
              proxyRes.on('data', (c: Buffer) => chunks.push(c));
              proxyRes.on('end', () => {
                log({
                  t: new Date().toISOString(),
                  dir: 'res',
                  url: req.url,
                  status: proxyRes.statusCode,
                  body: Buffer.concat(chunks).toString('utf8').slice(0, 2000),
                });
              });
            });
          },
        },
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
            if (chunk.name === 'index' && chunk.facadeModuleId) {
              const folderName = path.basename(path.dirname(chunk.facadeModuleId));

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
