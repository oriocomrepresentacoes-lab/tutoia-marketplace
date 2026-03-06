const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true }
        });
        users.forEach(u => console.log(u.email));
    } catch (error) {
        console.error('ERRO:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
