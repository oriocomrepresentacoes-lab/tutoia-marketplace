const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
            user: {
                select: { email: true, name: true }
            }
        }
    });

    console.log('--- LATEST TRANSACTIONS ---');
    transactions.forEach(t => {
        console.log(`ID: ${t.id}`);
        console.log(`User: ${t.user.name} (${t.user.email})`);
        console.log(`Type: ${t.type}`);
        console.log(`Amount: ${t.transaction_amount}`);
        console.log(`Status: ${t.status}`);
        console.log(`MP Payment ID: ${t.payment_id}`);
        console.log(`Created At: ${t.created_at}`);
        console.log('---------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
