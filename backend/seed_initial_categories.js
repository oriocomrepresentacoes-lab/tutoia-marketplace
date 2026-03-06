const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial categories...');

    const categories = [
        { name: 'Eletrônicos', icon: 'Smartphone' },
        { name: 'Veículos', icon: 'Car' },
        { name: 'Imóveis', icon: 'Home' },
        { name: 'Empregos', icon: 'Briefcase' },
        { name: 'Serviços', icon: 'Tool' },
        { name: 'Móveis & Decoração', icon: 'Layout' },
        { name: 'Roupas & Acessórios', icon: 'ShoppingBag' },
        { name: 'Esportes', icon: 'Dribbble' },
        { name: 'Pets', icon: 'Dog' }
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { id: 'dummy' + cat.name }, // This is just for upsert, but we just want to create
            update: {},
            create: {
                name: cat.name,
                icon: cat.icon
            }
        }).catch(async () => {
            // If upsert fails due to id, just create
            await prisma.category.create({
                data: {
                    name: cat.name,
                    icon: cat.icon
                }
            });
        });
    }

    console.log('Categories seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
