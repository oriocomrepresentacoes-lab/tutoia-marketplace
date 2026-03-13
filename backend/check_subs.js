const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const userId = 'fa128064-e40d-44e1-a8ee-9a335a25c4a2';
        console.log(`Checking subscriptions for user: ${userId}`);

        const subs = await prisma.pushSubscription.findMany({
            where: { user_id: userId }
        });

        console.log('Subscriptions found:', JSON.stringify(subs, null, 2));

        const allSubs = await prisma.pushSubscription.count();
        console.log('Total subscriptions in DB:', allSubs);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
