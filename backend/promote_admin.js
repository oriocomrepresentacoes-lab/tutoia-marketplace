const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote() {
    const email = 'orio.comrepresentacaoes@gmail.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });
        console.log(`SUCESSO: O usuário ${user.name} (${user.email}) agora é ADMINISTRADOR.`);
    } catch (error) {
        console.error('ERRO: Não foi possível encontrar ou atualizar o usuário. Verifique se o e-mail está correto e cadastrado no site.');
    } finally {
        await prisma.$disconnect();
    }
}

promote();
