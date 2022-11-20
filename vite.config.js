import { sveltekit } from '@sveltejs/kit/vite'
import * as path from 'path'

/** @type {import("vite").UserConfig} */
const config = {
    plugins: [sveltekit()],
    optimizeDeps: {
        include: ['dayjs/plugin/relativeTime.js'],
    },
    server: {
        fs: {
            allow: ['..'],
        },
    },
    resolve: {
        alias: {
            $lib: path.resolve('src/lib'),
            $components: path.resolve('src/components'),
            $routes: path.resolve('src/routes'),
        },
        preserveSymlinks: true
    },
    // root: '/',
}

export default config
