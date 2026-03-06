const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote() {
    const emails = ['orio.comrepresentacaoes@gmail.com', 'oriocomrepresentacoes@gmail.com', 'orio.dev@gmail.com'];
    for (const email of emails) {
        try {
            const user = await prisma.user.update({
                where: { email },
                data: { role: 'ADMIN' }
            });
            console.log(`SUCESSO: ${email} agora é ADMIN.`);
            return;
        } catch (e) { }
    }
    console.log('Nenhum desses e-mails foi encontrado.');
}

promote();
