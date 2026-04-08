import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const families = await prisma.family.findMany({});
  console.log('--- FAMILIES ---');
  console.dir(families, { depth: null });
}
main().finally(() => prisma.$disconnect());
