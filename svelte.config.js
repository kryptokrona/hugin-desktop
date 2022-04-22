import sveltePreprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';

/** @type {import("@sveltejs/kit").Config} */
const config = {
	kit: {
		adapter: adapter({}),
		vite: {
			server: {
				fs: {
					allow: ['..']
				}
			}
		}
	},
	preprocess: sveltePreprocess({
		scss: {
			prependData: `@import 'src/lib/theme/global.scss';`
		}
	}),

	onwarn: (warning, handler) => {
		const { code } = warning;
		if (code === 'css-semicolonexpected' || code === 'css-ruleorselectorexpected' || code === 'css-unused-selector')
			return;
		handler(warning);
	}
};
export default config;

/* Sveltekit SSR can be disabled in the handle function */
export async function handle({ request, resolve }) {
	const response = await resolve(request, {
		ssr: false,
	});
	return response;
}