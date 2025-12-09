import { build } from 'bun';

await build({
  entrypoints: ['./src/aidbox-forms-renderer-csiro-webcomponent.js'],
  outdir: './dist',
  format: 'esm',
  target: 'browser',
  minify: true,
  splitting: false,
  sourcemap: 'external',
});

console.log('Build completed successfully!');
