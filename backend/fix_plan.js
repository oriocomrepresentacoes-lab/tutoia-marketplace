const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    // 1. Releasing the orphaned plan for teste@teste.com
    const result = await prisma.transaction.update({
      where: { id: 'c91ac28e-0029-4894-a310-439098f5592d' },
      data: { 
        status: 'APPROVED', 
        ad_id: null 
      }
    });
    console.log('Transaction fixed for teste@teste.com:', result.id);

  } catch (e) {
    console.error('Error during manual fix:', e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
