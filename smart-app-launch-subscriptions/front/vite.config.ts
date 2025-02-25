import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'SmartAppLaunchSubscriptions',
      fileName: (format) => `smart-app-launch.subscriptions.${format}.js`,
      formats: ['umd', 'iife']
    },
    rollupOptions: {
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        name: 'SmartAppLaunchSubscriptions',
        exports: 'named'
      }
    }
  }
})