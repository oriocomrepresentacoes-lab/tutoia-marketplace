import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@tutshop.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
        const password_hash = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                name: 'Admin TutShop',
                email: adminEmail,
                password_hash,
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin user created (admin@tutshop.com / admin123)');
    }

    const categories = [
        { name: 'Eletrônicos', icon: '💻' },
        { name: 'Serviços', icon: '🔧' },
        { name: 'Móveis', icon: '🛋️' },
        { name: 'Veículos', icon: '🚗' },
    ];

    for (const cat of categories) {
        const existingCat = await prisma.category.findFirst({ where: { name: cat.name } });
        if (!existingCat) {
            await prisma.category.create({ data: cat });
        }
    }
    console.log('✅ Categories seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
