import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: fileURLToPath(new URL('./test/__mocks__/obsidian.ts', import.meta.url)),
		},
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
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
