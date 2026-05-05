const { PrismaClient } = require('../api/node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  const user1 = 'd6640ee0-d85f-4415-b7b6-389a3d10fe63';
  const allUsers = await p.user.findMany({ where: { id: { not: user1 } }, select: { id: true, displayName: true }, take: 20 });
  const existingMatches = await p.match.findMany({ where: { OR: [{ user1Id: user1 }, { user2Id: user1 }] } });
  const matchedIds = new Set(existingMatches.map(m => m.user1Id === user1 ? m.user2Id : m.user1Id));
  const existingLikesBoth = await p.like.findMany({ where: { OR: [{ fromUserId: user1 }, { toUserId: user1, fromUserId: { in: Array.from(matchedIds) } }] } });
  const likedBackIds = new Set(existingLikesBoth.filter(l => l.fromUserId === user1).map(l => l.toUserId));
  
  const unmatchedUsers = allUsers.filter(u => !matchedIds.has(u.id));
  console.log('Unmatched users available:', unmatchedUsers.length);
  
  const targets = unmatchedUsers.slice(0, 5);
  for (const u of targets) {
    try {
      await p.like.create({ data: { fromUserId: u.id, toUserId: user1, targetType: 'profile' } });
      console.log('  Created like from:', u.displayName);
    } catch (e) { console.log('  Like already exists from:', u.displayName); }
  }
  
  // Create match requests with messages from first two
  if (targets[0]) {
    try {
      await p.matchRequest.create({ data: { fromUserId: targets[0].id, toUserId: user1, type: 'comment', message: 'Your photography really caught my eye! Would love to connect.', status: 'pending' } });
      console.log('  Created move from:', targets[0].displayName);
    } catch (e) { console.log('  Move exists from:', targets[0].displayName); }
  }
  if (targets[1]) {
    try {
      await p.matchRequest.create({ data: { fromUserId: targets[1].id, toUserId: user1, type: 'comment', message: "Fellow coffee lover here! What's your go-to order?", status: 'pending' } });
      console.log('  Created move from:', targets[1].displayName);
    } catch (e) { console.log('  Move exists from:', targets[1].displayName); }
  }
  
  console.log('\nDone! User1 now has incoming likes to review.');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
