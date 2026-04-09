import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vitest from 'vitest'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA 配置
    {
      name: 'pwa-config',
      apply: 'build',
      enforce: 'pre',
      config: () => ({
        build: {
          rollupOptions: {
            input: {
              main: './index.html'
            }
          }
        }
      })
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // PWA 资源前缀
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['axios', 'socket.io-client']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
})
