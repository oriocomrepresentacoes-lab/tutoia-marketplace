const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Buscando usuário...');
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('Nenhum usuário encontrado. Crie um no sistema primeiro.');
        return;
    }

    console.log('Buscando categorias...');
    const categories = await prisma.category.findMany({ take: 3 });
    if (categories.length === 0) {
        console.error('Nenhuma categoria. Rode o script de seed de categorias primeiro.');
        return;
    }

    console.log('Criando anúncios de teste...');
    const adsToCreate = [
        {
            title: 'iPhone 13 Pro Max 256GB Seminovo',
            description: 'Aparelho em excelente estado, bateria 92%. Acompanha caixa e carregador.',
            price: 4500.00,
            type: 'PRODUCT',
            images: JSON.stringify(['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg']),
            city: 'Tutoia',
            user_id: user.id,
            category_id: categories[0].id,
            status: 'ACTIVE'
        },
        {
            title: 'Serviço de Limpeza de Estofados',
            description: 'Limpeza profunda de sofás, tapetes e colchões. Atendimento a domicílio.',
            price: 150.00,
            type: 'SERVICE',
            images: JSON.stringify(['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg']),
            city: 'Tutoia',
            user_id: user.id,
            category_id: categories[1] ? categories[1].id : categories[0].id,
            status: 'ACTIVE'
        },
        {
            title: 'Honda Civic LXS 2014 Automático',
            description: 'Carro impecável, único dono, todas revisões na concessionária.',
            price: 58000.00,
            type: 'PRODUCT',
            images: JSON.stringify(['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg']),
            city: 'Tutoia',
            user_id: user.id,
            category_id: categories[2] ? categories[2].id : categories[0].id,
            status: 'ACTIVE'
        }
    ];

    for (const adData of adsToCreate) {
        await prisma.ad.create({ data: adData });
    }

    console.log(`3 anúncios criados com sucesso para o usuário ${user.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
