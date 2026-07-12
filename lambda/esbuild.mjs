import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  const outdir = path.join(__dirname, 'dist');

  await esbuild.build({
    entryPoints: {
      reconcile: path.join(__dirname, 'handlers/reconcile.handler.ts'),
      webhook: path.join(__dirname, 'handlers/webhook.handler.ts'),
    },
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir,
    sourcemap: true,
    treeShaking: true,
    logLevel: 'info',
  });

  console.log(`Lambda bundles written to ${outdir}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
