// Setup incoming likes + hold one for whichever user is currently logged in
const BASE = 'http://localhost:3200';

async function main() {
  const targetUser = process.argv[2] || 'miamo9';
  const targetPass = process.argv[3] || targetUser;
  
  // Login as target
  const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${targetUser}@miamo.test`, password: targetPass }),
  });
  const loginData = await loginRes.json();
  const targetToken = loginData.data.accessToken;
  const targetId = loginData.data.user.id;
  console.log(`Target: ${loginData.data.user.displayName} (${targetUser}) id=${targetId}`);

  // Get all users to find likers
  const likerAccounts = ['miamo2', 'miamo4', 'miamo6', 'miamo10'];
  
  for (const liker of likerAccounts) {
    try {
      const res = await fetch(`${BASE}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `${liker}@miamo.test`, password: liker }),
      });
      const d = await res.json();
      if (!d.data) { console.log(`  ${liker}: login failed`); continue; }
      const likerToken = d.data.accessToken;
      
      // This user likes target
      const likeRes = await fetch(`${BASE}/api/v1/discover/like`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${likerToken}` },
        body: JSON.stringify({ toUserId: targetId }),
      });
      const likeData = await likeRes.json();
      if (likeData.data?.like) {
        console.log(`  ${liker} (${d.data.user.displayName}) liked ${targetUser} - mutual: ${likeData.data.isMutual}`);
      } else {
        console.log(`  ${liker}: like failed -`, likeData.error?.message || 'unknown');
      }
    } catch (e) {
      console.log(`  ${liker}: error -`, e.message);
    }
  }

  // Check incoming now
  const incRes = await fetch(`${BASE}/api/v1/matches/incoming`, {
    headers: { 'Authorization': `Bearer ${targetToken}` },
  });
  const incData = await incRes.json();
  console.log(`\nIncoming for ${targetUser}: ${incData.data?.length || 0}`);
  
  if (incData.data && incData.data.length > 0) {
    // Hold the first one
    const firstIncoming = incData.data[0];
    console.log(`\nHolding: ${firstIncoming.user.displayName} (id=${firstIncoming.user.id})`);
    
    const holdRes = await fetch(`${BASE}/api/v1/matches/incoming/${firstIncoming.user.id}/hold`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${targetToken}` },
    });
    const holdData = await holdRes.json();
    console.log('Hold result:', holdData);
    
    // Verify held tab
    const heldRes = await fetch(`${BASE}/api/v1/matches/incoming?showHeld=true`, {
      headers: { 'Authorization': `Bearer ${targetToken}` },
    });
    const heldData = await heldRes.json();
    const heldItems = (heldData.data || []).filter(i => i.isHeld);
    console.log(`\nOn Hold tab would show: ${heldItems.length} items`);
    heldItems.forEach(i => console.log(`  ✓ ${i.user.displayName} (isHeld=true)`));
    
    const normalItems = (heldData.data || []).filter(i => !i.isHeld);
    console.log(`Incoming tab would show: ${normalItems.length} items`);
  } else {
    console.log('No incoming likes! Cannot hold anyone.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
