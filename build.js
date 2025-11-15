import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const minify = process.argv.includes('--minify');

// Build main UniMap bundle
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
  treeShaking: true,
  banner: {
    js: '// UniMap Bundle'
  },
  footer: {
    js: minify ? ';window.UniMap=UniMap.UniMap||UniMap;' : ';window.UniMap = UniMap.UniMap || UniMap;'
  }
};

// Build custom element bundle
const elementBuildOptions = {
  entryPoints: ['unimap-element.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  globalName: 'UniMapElement',
  minify: minify,
  sourcemap: !minify,
  outfile: minify ? 'build/unimap-element.mini.js' : 'build/unimap-element.bundle.js',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  treeShaking: true,
  banner: {
    js: '// UniMap Custom Element Bundle'
  },
  footer: {
    js: minify ? ';window.UniMapElement=UniMapElement.UniMapElement||UniMapElement;' : ';window.UniMapElement = UniMapElement.UniMapElement || UniMapElement;'
  }
};

// Build unified complete bundle (JS API + Custom Element)
const completeBuildOptions = {
  entryPoints: ['unimap-complete.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  globalName: 'UniMapComplete',
  minify: minify,
  sourcemap: !minify,
  outfile: minify ? 'build/unimap-complete.mini.js' : 'build/unimap-complete.bundle.js',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  treeShaking: true,
  banner: {
    js: '// UniMap Complete Bundle - JavaScript API + Custom HTML Element'
  },
  footer: {
    js: minify 
      ? ';if(typeof window!=="undefined"){window.UniMap=UniMapComplete.UniMap||UniMapComplete;window.UniMapElement=UniMapComplete.UniMapElement||UniMapComplete;}'
      : ';if (typeof window !== "undefined") { window.UniMap = UniMapComplete.UniMap || UniMapComplete; window.UniMapElement = UniMapComplete.UniMapElement || UniMapComplete; }'
  }
};

try {
  // Build main bundle (JS API only)
  await esbuild.build(buildOptions);
  console.log(`✓ Build complete: ${buildOptions.outfile}`);
  
  // Build custom element bundle
  await esbuild.build(elementBuildOptions);
  console.log(`✓ Build complete: ${elementBuildOptions.outfile}`);
  
  // Build unified complete bundle (JS API + Custom Element)
  await esbuild.build(completeBuildOptions);
  console.log(`✓ Build complete: ${completeBuildOptions.outfile}`);
  
  if (minify) {
    const size = readFileSync(buildOptions.outfile).length;
    const elementSize = readFileSync(elementBuildOptions.outfile).length;
    const completeSize = readFileSync(completeBuildOptions.outfile).length;
    console.log(`✓ Minified size: ${(size / 1024).toFixed(2)} KB (main - JS API only)`);
    console.log(`✓ Minified size: ${(elementSize / 1024).toFixed(2)} KB (element - Custom Element only)`);
    console.log(`✓ Minified size: ${(completeSize / 1024).toFixed(2)} KB (complete - JS API + Custom Element)`);
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
