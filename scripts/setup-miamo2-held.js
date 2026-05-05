const { PrismaClient } = require(__dirname + '/../services/social/node_modules/.prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev' }}});

async function main() {
  const miamo2 = await prisma.user.findUnique({ where: { username: 'miamo2' }, select: { id: true } });
  const miamo6 = await prisma.user.findUnique({ where: { username: 'miamo6' }, select: { id: true } });
  console.log('miamo2:', miamo2.id);
  console.log('miamo6:', miamo6.id);

  // Clear ALL held items for miamo2 first
  const deleted = await prisma.matchRequest.deleteMany({ where: { toUserId: miamo2.id, status: 'held' } });
  console.log('Cleared', deleted.count, 'old held items');

  // Create a Like from miamo6 -> miamo2 (so miamo6 appears in incoming)
  try {
    await prisma.like.create({ data: { fromUserId: miamo6.id, toUserId: miamo2.id, targetType: 'profile' } });
    console.log('Created Like from miamo6 to miamo2');
  } catch (e) {
    console.log('Like already exists:', e.message.slice(0, 50));
  }

  // Create held MatchRequest (miamo6 -> miamo2, status: held)
  await prisma.matchRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId: miamo6.id, toUserId: miamo2.id } },
    create: { fromUserId: miamo6.id, toUserId: miamo2.id, type: 'like', status: 'held' },
    update: { status: 'held' }
  });
  console.log('miamo6 is now HELD by miamo2');

  // Verify final state
  const allHeld = await prisma.matchRequest.findMany({ where: { toUserId: miamo2.id, status: 'held' } });
  console.log('Total held for miamo2:', allHeld.length);
  for (const h of allHeld) {
    const u = await prisma.user.findUnique({ where: { id: h.fromUserId }, select: { username: true, displayName: true } });
    console.log('  -', u.displayName, '(' + u.username + ')');
  }
}

main().then(() => process.exit()).catch(e => { console.error(e.message); process.exit(1); });
