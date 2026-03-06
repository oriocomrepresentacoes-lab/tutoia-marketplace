const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning database...');

    // The order matters due to foreign keys if not using CASCADE in DB
    // But deleteMany handles it well if we follow dependendies

    await prisma.message.deleteMany();
    console.log('Deleted messages');

    await prisma.transaction.deleteMany();
    console.log('Deleted transactions');

    await prisma.ad.deleteMany();
    console.log('Deleted ads');

    await prisma.banner.deleteMany();
    console.log('Deleted banners');

    await prisma.category.deleteMany();
    console.log('Deleted categories');

    await prisma.user.deleteMany();
    console.log('Deleted users');

    console.log('Database is now empty.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
