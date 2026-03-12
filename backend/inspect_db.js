const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE INSPECTION ---');
    const users = await prisma.user.findMany({
        select: { email: true, name: true }
    });
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(` - ${u.email}`));
    console.log('--- END INSPECTION ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
