const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- CLEANING BROKEN LOCAL IMAGE PATHS ---');
    
    // Find ads with local paths
    const adsToClean = await prisma.ad.findMany({
        where: {
            images: { contains: '/uploads/' }
        }
    });
    
    console.log(`Found ${adsToClean.length} ads with local image paths.`);
    for (const ad of adsToClean) {
        console.log(`- Removing local ad: ${ad.title}`);
        await prisma.ad.delete({ where: { id: ad.id } });
    }

    // Find banners with local paths
    const bannersToClean = await prisma.banner.findMany({
        where: {
            image: { contains: '/uploads/' }
        }
    });

    console.log(`Found ${bannersToClean.length} banners with local image paths.`);
    for (const b of bannersToClean) {
        console.log(`- Removing local banner: ${b.title}`);
        await prisma.banner.delete({ where: { id: b.id } });
    }

    console.log('--- CLEANUP COMPLETED ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
