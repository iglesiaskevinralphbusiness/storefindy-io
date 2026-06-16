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

// Pre-bundle Leaflet's stylesheet into a single string (with its marker/layer
// .png images inlined as data URLs) so the widget can inject it INTO its shadow
// root. The `import 'leaflet/dist/leaflet.css'` in LocatorMap only ever lands in
// the document <head>, which cannot cross the shadow boundary — leaving the
// map's tiles without `position:absolute` and rendering them in a diagonal
// staircase. We hand this CSS to the bundle via a `define` (see below).
const leafletCssResult = await build({
	entryPoints: [resolve(root, 'node_modules/leaflet/dist/leaflet.css')],
	bundle: true,
	minify: !dev,
	loader: { '.png': 'dataurl' },
	write: false,
});
const leafletCss = leafletCssResult.outputFiles[0].text;

/** @type {import('esbuild').BuildOptions} */
const config = {
	entryPoints: [resolve(root, 'src/widgets/index.tsx')],
	outfile: resolve(root, 'public/widgets.js'),
	bundle: true,
	format: 'iife',
	target: ['es2020'],
	platform: 'browser',
	jsx: 'automatic',
	// `.js: jsx` lets our JSX-in-.js components (e.g. components/Locator) build;
	// `.png: dataurl` inlines Leaflet's bundled marker/layer images so the
	// imported leaflet.css resolves them inside the single widget bundle.
	loader: { '.tsx': 'tsx', '.ts': 'ts', '.js': 'jsx', '.png': 'dataurl' },
	minify: !dev,
	sourcemap: dev,
	// `next/link` (pulled in via components/Locator) references runtime
	// `process.env.*` keys like `__NEXT_ROUTER_BASEPATH` that we don't statically
	// define. In a plain HTML page there's no `process` global, so those throw.
	// Shim a minimal `process` so any leftover lookups resolve to `undefined`.
	banner: { js: 'var process=typeof process!=="undefined"?process:{env:{}};' },
	define: {
		'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
		// Leaflet's CSS, inlined so index.tsx can inject it into the shadow root.
		'process.env.__LEAFLET_CSS__': JSON.stringify(leafletCss),
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
