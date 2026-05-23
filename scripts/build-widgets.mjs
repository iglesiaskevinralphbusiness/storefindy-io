import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const watch = process.argv.includes('--watch');
const dev = watch || process.argv.includes('--dev');

/** @type {import('esbuild').BuildOptions} */
const config = {
	entryPoints: [resolve(root, 'src/widgets/index.tsx')],
	outfile: resolve(root, 'public/widgets.js'),
	bundle: true,
	format: 'iife',
	target: ['es2020'],
	platform: 'browser',
	jsx: 'automatic',
	loader: { '.tsx': 'tsx', '.ts': 'ts' },
	minify: !dev,
	sourcemap: dev,
	define: {
		'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
	},
	logLevel: 'info',
};

if (watch) {
	const ctx = await context(config);
	await ctx.watch();
	console.log('[widgets] watching for changes...');
} else {
	await build(config);
	console.log('[widgets] built public/widgets.js');
}
