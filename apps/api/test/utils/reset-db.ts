import type { PrismaClient } from '@prisma/client';

export const resetDatabase = async (prisma: PrismaClient) => {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;

  const tableNames = tables
    .map((row) => row.tablename)
    .filter((name) => name !== '_prisma_migrations');

  if (tableNames.length === 0) {
    return;
  }

  const quoted = tableNames.map((name) => `"${name}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
};