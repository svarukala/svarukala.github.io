import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Development server settings
    server: {
        port: 3000,
        open: true
    },

    // Build settings
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                resources: resolve(__dirname, 'resources.html')
            }
        }
    },

    // Resolve settings
    resolve: {
        alias: {
            '@': '/js'
        }
    }
});
