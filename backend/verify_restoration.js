const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true }
    });
    console.log('--- USERS IN POSTGRES ---');
    console.log(JSON.stringify(users, null, 2));

    const banners = await prisma.banner.findMany();
    console.log('\n--- BANNERS IN POSTGRES ---');
    console.log(JSON.stringify(banners, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
