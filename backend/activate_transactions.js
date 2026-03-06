const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find PENDING transactions that should be activated
    const transactions = await prisma.transaction.findMany({
        where: { status: 'PENDING' },
        include: {
            user: { select: { name: true, email: true } }
        }
    });

    if (transactions.length === 0) {
        console.log('No pending transactions found.');
        return;
    }

    console.log(`Found ${transactions.length} pending transactions.`);

    for (const t of transactions) {
        console.log(`Activating transaction ${t.id} for user ${t.user.name} (${t.user.email})...`);
        await prisma.transaction.update({
            where: { id: t.id },
            data: {
                status: 'APPROVED',
                expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
            }
        });
    }

    console.log('Done!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
