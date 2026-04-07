const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const targetEmail = 'orio.comrepresentacoes@gmail.com'.toLowerCase().trim();

    console.log(`Starting ROBUST cleanup JS... Target: ${targetEmail}`);

    // Find user with case-insensitive check
    const users = await prisma.user.findMany();
    const userToKeep = users.find(u => u.email.toLowerCase().trim() === targetEmail);

    if (!userToKeep) {
        console.error(`CRITICAL: User ${targetEmail} not found! Current users:`, users.map(u => u.email));
        return;
    }

    const userIdToKeep = userToKeep.id;
    console.log(`Keeping user ID: ${userIdToKeep} (${userToKeep.email})`);

    // Delete everything else
    const results = await Promise.all([
        prisma.banner.deleteMany({ where: { user_id: { not: userIdToKeep } } }),
        prisma.ad.deleteMany({ where: { user_id: { not: userIdToKeep } } }),
        prisma.transaction.deleteMany({ where: { user_id: { not: userIdToKeep } } }),
        prisma.message.deleteMany({
            where: {
                OR: [
                    { sender_id: { not: userIdToKeep } },
                    { receiver_id: { not: userIdToKeep } }
                ]
            }
        }),
        prisma.pushSubscription.deleteMany({ where: { user_id: { not: userIdToKeep } } }),
        prisma.user.deleteMany({ where: { id: { not: userIdToKeep } } })
    ]);

    console.log('Robust Cleanup finished!');
    console.log(`Summary: Users left: 1. Deleted others.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
