const { PrismaClient } = require('../api/node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
  const user1 = 'd6640ee0-d85f-4415-b7b6-389a3d10fe63';
  
  const matches = await p.match.findMany({ where: { OR: [{ user1Id: user1 }, { user2Id: user1 }] } });
  console.log('Matches for user1:', matches.length);
  const matchedIds = matches.map(m => m.user1Id === user1 ? m.user2Id : m.user1Id);
  
  const incomingLikes = await p.like.findMany({ where: { toUserId: user1 }, include: { fromUser: { select: { displayName: true } } } });
  console.log('Total likes TO user1:', incomingLikes.length);
  
  const notMatched = incomingLikes.filter(l => matchedIds.indexOf(l.fromUserId) === -1);
  console.log('Likes from unmatched users:', notMatched.length);
  notMatched.forEach(l => console.log('  -', l.fromUser.displayName, l.fromUserId));
  
  const user1Likes = await p.like.findMany({ where: { fromUserId: user1 }, select: { toUserId: true } });
  console.log('\nUser1 has liked:', user1Likes.length, 'users');
  const likedBackIds = user1Likes.map(l => l.toUserId);
  
  const trueIncoming = notMatched.filter(l => likedBackIds.indexOf(l.fromUserId) === -1);
  console.log('True incoming (not liked back):', trueIncoming.length);
  trueIncoming.forEach(l => console.log('  -', l.fromUser.displayName));
  
  // If no true incoming, create likes from users 10-15 (who user1 hasn't interacted with)
  if (trueIncoming.length === 0) {
    const allUsers = await p.user.findMany({ where: { id: { not: user1 } }, select: { id: true, displayName: true }, take: 20, skip: 8 });
    const candidates = allUsers.filter(u => matchedIds.indexOf(u.id) === -1 && likedBackIds.indexOf(u.id) === -1);
    console.log('\nCreating likes from', candidates.length, 'new users...');
    for (const u of candidates.slice(0, 5)) {
      try {
        await p.like.create({ data: { fromUserId: u.id, toUserId: user1, targetType: 'profile' } });
        console.log('  Created like from:', u.displayName);
      } catch (e) { console.log('  Already exists from:', u.displayName); }
    }
    // Create moves with messages
    if (candidates[0]) {
      try {
        await p.matchRequest.create({ data: { fromUserId: candidates[0].id, toUserId: user1, type: 'comment', message: 'Your photography really caught my eye! Would love to connect.', status: 'pending' } });
        console.log('  Created move from:', candidates[0].displayName);
      } catch (e) { console.log('  Move exists from:', candidates[0].displayName); }
    }
    if (candidates[1]) {
      try {
        await p.matchRequest.create({ data: { fromUserId: candidates[1].id, toUserId: user1, type: 'comment', message: "Fellow coffee lover here! What is your go-to order?", status: 'pending' } });
        console.log('  Created move from:', candidates[1].displayName);
      } catch (e) { console.log('  Move exists from:', candidates[1].displayName); }
    }
  }
  
  await p.$disconnect();
})();
