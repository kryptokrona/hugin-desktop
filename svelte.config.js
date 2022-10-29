import sveltePreprocess from 'svelte-preprocess'
import adapter from '@sveltejs/adapter-static'

/** @type {import("@sveltejs/kit").Config} */
const config = {
    kit: {
        adapter: adapter({}),
    },
    preprocess: sveltePreprocess({
        scss: {
            prependData: `@import 'src/lib/theme/global.scss';`,
        },
    }),
    onwarn: (warning, handler) => {
        const { code } = warning
        if (
            code === 'css-semicolonexpected' ||
            code === 'css-ruleorselectorexpected' ||
            code === 'css-unused-selector'
        )
            return
        handler(warning)
    },
}
export default config
