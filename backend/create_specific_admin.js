const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const email = 'orio.comrepresentacoes@gmail.com';
    const name = 'Ezequiel Admin';
    const password = 'admin123'; // Standard temporary password

    console.log(`Recreating admin account for: ${email}`);

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'ADMIN',
            password_hash,
            active: true
        },
        create: {
            email,
            name,
            password_hash,
            role: 'ADMIN',
            active: true
        }
    });

    console.log('Admin account created/updated successfully:', user.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
