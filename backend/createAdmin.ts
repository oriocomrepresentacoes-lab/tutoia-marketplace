import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@marketplace.com';
    let admin = await prisma.user.findFirst({ where: { email } });
    if (!admin) {
        const password_hash = await bcrypt.hash('admin123', 10);
        admin = await prisma.user.create({
            data: {
                name: 'System Admin',
                email,
                password_hash,
                role: 'ADMIN'
            }
        });
        console.log('Created admin:', admin.email);
    } else {
        await prisma.user.update({
            where: { id: admin.id },
            data: { password_hash: await bcrypt.hash('admin123', 10), role: 'ADMIN' }
        });
        console.log('Reset admin password for:', admin.email);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
