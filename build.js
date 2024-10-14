
const esbuild = require('esbuild');
const path = require('path');

// Define entry and output paths
const entryFile = 'src/extension.js';
const outDir = 'dist';

async function main() {
  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    platform: 'node', // Targeting Node.js for VS Code
    target: 'es2020',
    outfile: path.join(outDir, 'extension.js'),
    external: [ // Exclude VS Code modules and dependencies
      'vscode'
    ],
    sourcemap: true, // Helpful for debugging
    minify: false, // Set to true for production builds
    format: 'cjs' // CommonJS is typically used for Node.js
  }).catch(() => process.exit(1));
}

main();