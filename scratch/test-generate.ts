import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  if (categories.length === 0) {
    console.log("No categories found");
    return;
  }
  
  // Pick the last one
  const category = categories[categories.length - 1];

  const matchCount = await prisma.match.count({ where: { categoryId: category.id } });
  console.log(`Category ${category.name} has ${matchCount} matches`);

  if (matchCount > 0) {
    console.log("Matches already exist. Deleting them to test generation...");
    await prisma.matchSet.deleteMany({ where: { match: { categoryId: category.id } } });
    await prisma.match.deleteMany({ where: { categoryId: category.id } });
    await prisma.pool.deleteMany({ where: { categoryId: category.id } });
  }

  try {
    const res = await fetch(`http://localhost:3000/api/tournaments/${category.tournamentId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: category.id })
    });

    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error(err);
  }
}

main().finally(() => prisma.$disconnect());
