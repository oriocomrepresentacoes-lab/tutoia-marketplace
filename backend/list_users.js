const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, name: true }
        });
        console.log('USUÁRIOS CADASTRADOS:');
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('ERRO:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
