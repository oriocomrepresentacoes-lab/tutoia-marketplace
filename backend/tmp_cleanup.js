const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const targetEmail = 'orio.comrepresentacoes@gmail.com';

    console.log(`Starting cleanup JS... Keeping user: ${targetEmail}`);

    const userToKeep = await prisma.user.findUnique({
        where: { email: targetEmail }
    });

    if (!userToKeep) {
        console.error(`CRITICAL: User ${targetEmail} not found!`);
        return;
    }

    const userIdToKeep = userToKeep.id;

    console.log('Deleting other data...');
    await prisma.banner.deleteMany({ where: { user_id: { not: userIdToKeep } } });
    await prisma.ad.deleteMany({ where: { user_id: { not: userIdToKeep } } });
    await prisma.transaction.deleteMany({ where: { user_id: { not: userIdToKeep } } });
    await prisma.message.deleteMany({
        where: {
            OR: [
                { sender_id: { not: userIdToKeep } },
                { receiver_id: { not: userIdToKeep } }
            ]
        }
    });
    await prisma.pushSubscription.deleteMany({ where: { user_id: { not: userIdToKeep } } });
    await prisma.user.deleteMany({ where: { id: { not: userIdToKeep } } });

    console.log('Cleanup finished JS!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
