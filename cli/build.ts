import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.join(import.meta.dirname, '..', 'src');
const distDir = path.join(import.meta.dirname, '..', 'dist');

if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });

const entrypoint = path.join(srcDir, 'index.ts');

await Bun.build({
    entrypoints: [entrypoint],
    outdir: distDir,
    target: 'node',
    external: [],
    minify: {
        whitespace: false,
        syntax: true,
        keepNames: true
    },
    splitting: false,
    format: 'esm'
});

console.log('\x1b[32m✓ built node\x1b[0m');

const typeFile = path.join(distDir, 'index.d.ts');
await Bun.$`bunx --bun dts-bundle-generator -o ${typeFile} --silent ${entrypoint}`;

console.log('\x1b[32m✓ generated types\x1b[0m');