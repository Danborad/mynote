import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/@tiptap/')) return 'tiptap-core'
                    if (id.includes('node_modules/prosemirror-')) return 'tiptap-prosemirror'
                    if (id.includes('node_modules/html2canvas')) return 'share-image'
                    if (id.includes('node_modules/turndown')) return 'export-markdown'
                    return undefined
                }
            }
        }
    }
})
