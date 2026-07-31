import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

function resolveGithubPagesBase() {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]

  if (!repositoryName || repositoryName.endsWith('.github.io')) {
    return '/'
  }

  return `/${repositoryName}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? resolveGithubPagesBase() : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
