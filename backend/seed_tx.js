const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ad = await prisma.ad.findFirst({ include: { user: true } });
    if (!ad) return;

    console.log('Found ad by id: ' + ad.id + ' user: ' + ad.user.name);

    const tx = await prisma.transaction.create({
        data: {
            user_id: ad.user.id,
            type: 'AD_IMAGES',
            status: 'APPROVED',
            transaction_amount: 10.0,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    });

    console.log('Created transaction:', tx.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
