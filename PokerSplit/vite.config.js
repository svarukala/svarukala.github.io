import { defineConfig } from 'vite';

export default defineConfig({
    // Development server settings
    server: {
        port: 3000,
        open: true
    },

    // Build settings
    build: {
        outDir: 'dist',
        sourcemap: true
    },

    // Resolve settings
    resolve: {
        alias: {
            '@': '/js'
        }
    }
});
