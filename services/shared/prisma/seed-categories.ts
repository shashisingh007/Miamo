// ─── Idempotent CreativityCategory seed ──────────────────────────────
// Non-destructive. Safe to run on prod. Only inserts rows that don't already
// exist (unique on `name`). Runs inside the `migrate` container:
//   docker compose run --rm --entrypoint '' migrate \
//     npx tsx /app/prisma/seed-categories.ts
import { PrismaClient } from '@prisma/client';

const CATEGORIES = [
  { name: 'Singing',          icon: 'mic',         color: '#EC4899' },
  { name: 'Dance',            icon: 'music',       color: '#8B5CF6' },
  { name: 'Poetry',           icon: 'feather',     color: '#6366F1' },
  { name: 'Photography',      icon: 'camera',      color: '#06B6D4' },
  { name: 'Art',              icon: 'palette',     color: '#F59E0B' },
  { name: 'Fashion',          icon: 'shirt',       color: '#EC4899' },
  { name: 'Fitness',          icon: 'dumbbell',    color: '#10B981' },
  { name: 'Cooking',          icon: 'chef-hat',    color: '#EF4444' },
  { name: 'Travel',           icon: 'plane',       color: '#3B82F6' },
  { name: 'Comedy',           icon: 'laugh',       color: '#F97316' },
  { name: 'Music',            icon: 'headphones',  color: '#A78BFA' },
  { name: 'Writing',          icon: 'pen-tool',    color: '#8B5CF6' },
  { name: 'Tech Projects',    icon: 'cpu',         color: '#14B8A6' },
  { name: 'Acting',           icon: 'drama',       color: '#F43F5E' },
  { name: 'Sports',           icon: 'trophy',      color: '#22C55E' },
  { name: 'Lifestyle',        icon: 'heart',       color: '#D946EF' },
  { name: 'Public Speaking',  icon: 'megaphone',   color: '#0EA5E9' },
  { name: 'Career Highlights',icon: 'briefcase',   color: '#6366F1' },
  { name: 'Date Ideas',       icon: 'sparkles',    color: '#EC4899' },
  { name: 'Nature',           icon: 'leaf',        color: '#16A34A' },
];

async function main() {
  const prisma = new PrismaClient();
  let added = 0, kept = 0;
  for (const c of CATEGORIES) {
    const existing = await prisma.creativityCategory.findFirst({ where: { name: c.name } });
    if (existing) { kept++; continue; }
    await prisma.creativityCategory.create({ data: c });
    added++;
  }
  console.log(`Seed complete — added=${added} kept=${kept} total=${CATEGORIES.length}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
