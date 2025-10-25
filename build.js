import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const minify = process.argv.includes('--minify');

const buildOptions = {
  entryPoints: ['unimap.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  globalName: 'UniMap',
  minify: minify,
  sourcemap: !minify,
  outfile: minify ? 'build/unimap.mini.js' : 'build/unimap.bundle.js',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  treeShaking: true
};

try {
  await esbuild.build(buildOptions);
  console.log(`✓ Build complete: ${buildOptions.outfile}`);
  
  if (minify) {
    const size = readFileSync(buildOptions.outfile).length;
    console.log(`✓ Minified size: ${(size / 1024).toFixed(2)} KB`);
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
