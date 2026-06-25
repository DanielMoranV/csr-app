import { fileURLToPath, URL } from 'node:url';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    optimizeDeps: {
        // Con noDiscovery activo, Vite NO descubre dependencias automáticamente:
        // hay que listar aquí todo CJS que deba pre-empaquetarse a ESM. `quill` y
        // `quill-delta` (CommonJS) son requeridos por el Editor de PrimeVue; sin
        // esto, quill-delta no expone `export default` y rompe en el dev server.
        include: ['laravel-echo', 'pusher-js', 'quill', 'quill-delta'],
        noDiscovery: true
    },
    plugins: [
        vue(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    build: {
        target: 'esnext'
    }
});
