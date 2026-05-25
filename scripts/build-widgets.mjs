import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const watch = process.argv.includes('--watch');
const dev = watch || process.argv.includes('--dev');

function loadEnvFile(path) {
	if (!existsSync(path)) return {};
	const out = {};
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		let v = m[2];
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		out[m[1]] = v;
	}
	return out;
}

const envFiles = [
	resolve(root, '.env'),
	resolve(root, '.env.local'),
	resolve(root, dev ? '.env.development' : '.env.production'),
];
const envVars = Object.assign({}, ...envFiles.map(loadEnvFile), process.env);
const publicDefines = Object.fromEntries(
	Object.entries(envVars)
		.filter(([k]) => k.startsWith('NEXT_PUBLIC_'))
		.map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]),
);

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
		...publicDefines,
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
