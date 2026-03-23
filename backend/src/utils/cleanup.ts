import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetEmail = 'orio.comrepresentacoes@gmail.com';

    console.log(`Starting cleanup... Keeping user: ${targetEmail}`);

    // 1. Find the user ID to keep
    const userToKeep = await prisma.user.findUnique({
        where: { email: targetEmail }
    });

    if (!userToKeep) {
        console.error(`CRITICAL: User ${targetEmail} not found! Aborting cleanup to prevent accidental total data loss.`);
        return;
    }

    const userIdToKeep = userToKeep.id;

    // 2. Delete all data associated with other users
    // Using cascade if defined, but being explicit for safety

    console.log('Deleting Banners from other users...');
    const banners = await prisma.banner.deleteMany({
        where: { user_id: { not: userIdToKeep } }
    });
    console.log(`Deleted ${banners.count} banners.`);

    console.log('Deleting Ads from other users...');
    const ads = await prisma.ad.deleteMany({
        where: { user_id: { not: userIdToKeep } }
    });
    console.log(`Deleted ${ads.count} ads.`);

    console.log('Deleting Transactions from other users...');
    const transactions = await prisma.transaction.deleteMany({
        where: { user_id: { not: userIdToKeep } }
    });
    console.log(`Deleted ${transactions.count} transactions.`);

    console.log('Deleting Messages involving other users...');
    const messages = await prisma.message.deleteMany({
        where: {
            OR: [
                { sender_id: { not: userIdToKeep } },
                { receiver_id: { not: userIdToKeep } }
            ]
        }
    });
    console.log(`Deleted ${messages.count} messages.`);

    console.log('Deleting Push Subscriptions from other users...');
    const subs = await prisma.pushSubscription.deleteMany({
        where: { user_id: { not: userIdToKeep } }
    });
    console.log(`Deleted ${subs.count} push subscriptions.`);

    console.log('Finally, deleting other Users...');
    const users = await prisma.user.deleteMany({
        where: { id: { not: userIdToKeep } }
    });
    console.log(`Deleted ${users.count} users.`);

    console.log('Cleanup finished successfully!');
}

main()
    .catch((e) => {
        console.error('Error during cleanup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
