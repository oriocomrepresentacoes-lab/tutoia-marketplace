const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    if (!user) return;

    // Deleta transaçoes de banner anteriores deste usuario
    await prisma.transaction.deleteMany({
        where: { user_id: user.id, type: 'BANNER' }
    });

    // Cria uma nova transação de banner aprovada para este usuario testador
    const tx = await prisma.transaction.create({
        data: {
            user_id: user.id,
            type: 'BANNER',
            status: 'APPROVED',
            transaction_amount: 50.0,
            expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        }
    });

    console.log('Test Banner transaction created for user: ' + user.name + ' - tx_id: ' + tx.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
