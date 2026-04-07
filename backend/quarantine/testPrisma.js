const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({ where: { email: 'admin@marketplace.com' } });
        console.log('User found:', user ? user.id : 'None');

        const calculatedEndDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

        const banner = await prisma.banner.create({
            data: {
                title: 'Test',
                link: 'https://test',
                image: '/uploads/test.jpg',
                position: 'home_topo',
                start_date: new Date(),
                end_date: calculatedEndDate,
                user_id: user?.id
            }
        });
        console.log('SUCCESS:', banner);
    } catch (e) {
        console.error('PRISMA ERROR:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
