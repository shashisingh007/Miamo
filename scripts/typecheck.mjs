#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const PACKAGES = [
  'shared', 'auth', 'content', 'gateway', 'ingest',
  'messaging', 'notifications', 'social', 'tracking-worker', 'users', 'web',
];

function runOne(pkg) {
  return new Promise((resolve) => {
    const start = performance.now();
    const child = spawn('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], {
      cwd: `services/${pkg}`,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      resolve({ pkg, code, stdout, stderr, ms: Math.round(performance.now() - start) });
    });
  });
}

const t0 = performance.now();
const results = await Promise.all(PACKAGES.map(runOne));
const totalMs = Math.round(performance.now() - t0);

const failed = results.filter((r) => r.code !== 0);
for (const r of results) {
  const tag = r.code === 0 ? 'OK  ' : 'FAIL';
  console.log(`[${tag}] ${r.pkg.padEnd(16)} ${r.ms}ms`);
}

if (failed.length > 0) {
  console.log(`\n${failed.length} package(s) failed typecheck:\n`);
  for (const r of failed) {
    console.log(`=== ${r.pkg} ===`);
    if (r.stdout.trim()) console.log(r.stdout);
    if (r.stderr.trim()) console.error(r.stderr);
  }
  process.exit(1);
}

console.log(`\nAll ${PACKAGES.length} packages typecheck clean in ${totalMs}ms.`);
