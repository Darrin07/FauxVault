import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
    extensions: ['.js', '.jsx'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    globals: true,
    include: ['src/tests/**/*.test.js', 'src/tests/**/*.test.jsx'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    deps: {
      optimizer: {
        web: {
          include: [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
            'react-router',
            'react-router-dom',
          ],
        },
      },
    },
    server: {
      deps: {
        inline: ['react-router', 'react-router-dom'],
      },
    },
  },
})
