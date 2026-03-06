const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote() {
    const email = 'orio.comrepresentacoes@gmail.com'; // E-mail confirmado agora
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });
        console.log(`SUCESSO: O usuário ${user.name} (${user.email}) agora é ADMINISTRADOR oficial!`);
    } catch (error) {
        console.error('ERRO: Não foi possível encontrar o usuário. Verifique se você já concluiu o cadastro no site.');
    } finally {
        await prisma.$disconnect();
    }
}

promote();
