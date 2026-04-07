const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearTransactions() {
    try {
        const deleted = await prisma.transaction.deleteMany({});
        console.log(`Deleted ${deleted.count} transactions. All plans cleared.`);
    } catch (error) {
        console.error('Error clearing transactions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearTransactions();
