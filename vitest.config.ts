import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'test/',
				'*.config.*',
				'*.test.ts',
				'*.spec.ts',
				'esbuild.config.mjs',
				'version-bump.mjs'
			]
		}
	}
});
