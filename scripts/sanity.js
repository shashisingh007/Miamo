#!/usr/bin/env node
// ─── Miamo Sanity Check Script ───────────────────────
const { execSync } = require('child_process');

const checks = [];
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: '✓' });
    passed++;
  } catch (e) {
    checks.push({ name, status: '✗', error: e.message });
    failed++;
  }
}

console.log('\n🔍 Miamo Sanity Check\n' + '─'.repeat(50));

check('API package.json exists', () => {
  require('../api/package.json');
});

check('Web package.json exists', () => {
  require('../web/package.json');
});

check('Prisma schema exists', () => {
  const fs = require('fs');
  if (!fs.existsSync('./api/prisma/schema.prisma')) throw new Error('Missing');
});

check('Docker compose exists', () => {
  const fs = require('fs');
  if (!fs.existsSync('./docker-compose.yml')) throw new Error('Missing');
});

check('K8s manifests exist', () => {
  const fs = require('fs');
  if (!fs.existsSync('./k8s/base/api.yaml')) throw new Error('Missing');
});

check('API health endpoint', () => {
  try {
    execSync('curl -sf http://localhost:3200/health', { timeout: 5000 });
  } catch {
    throw new Error('API not responding (run: npm run dev:api)');
  }
});

check('Web responds', () => {
  try {
    execSync('curl -sf http://localhost:3100', { timeout: 5000 });
  } catch {
    throw new Error('Web not responding (run: npm run dev:web)');
  }
});

check('Database connection', () => {
  try {
    execSync('cd api && npx prisma db execute --stdin <<< "SELECT 1"', { timeout: 10000 });
  } catch {
    throw new Error('Database not reachable');
  }
});

console.log('');
checks.forEach(c => {
  const status = c.status === '✓' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${status} ${c.name}${c.error ? ` (${c.error})` : ''}`);
});

console.log(`\n  Result: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
