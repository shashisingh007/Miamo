const jwt = require('../api/node_modules/jsonwebtoken');

const userId = 'd155b595-cd57-4817-9cfd-385e8a4dd52b';
const token = jwt.sign({ userId }, 'miamo-dev-jwt-secret-change-in-production-2026', { expiresIn: '1h' });

async function test() {
  // Test incoming
  const inc = await (await globalThis.fetch('http://localhost:3200/api/v1/matches/incoming', { headers: { Authorization: 'Bearer ' + token } })).json();
  console.log('=== INCOMING ===');
  console.log('Total:', inc.meta.total, '| Held:', inc.meta.heldCount);
  inc.data.forEach(i => {
    console.log(' ', i.type.padEnd(6), '|', i.user.displayName.padEnd(28), '|', (i.message || '-').substring(0, 45));
  });

  // Test matches
  const mtch = await (await globalThis.fetch('http://localhost:3200/api/v1/matches', { headers: { Authorization: 'Bearer ' + token } })).json();
  console.log('\n=== MY MATCHES ===');
  console.log('Total:', mtch.data.length);
  mtch.data.forEach(m => {
    console.log(' ', m.matchedUser.displayName.padEnd(28), '| chatId:', m.chatId || 'none');
  });

  // Test hold
  console.log('\n=== HOLD miamo9 ===');
  const holdRes = await (await globalThis.fetch('http://localhost:3200/api/v1/matches/incoming/1bf00a98-05aa-4d83-8865-64561ed19346/hold', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } })).json();
  console.log('Hold result:', holdRes.data.success);

  // Test incoming after hold
  const inc2 = await (await globalThis.fetch('http://localhost:3200/api/v1/matches/incoming', { headers: { Authorization: 'Bearer ' + token } })).json();
  console.log('After hold - Incoming:', inc2.meta.total, '| Held:', inc2.meta.heldCount);
}

test().catch(console.error);
