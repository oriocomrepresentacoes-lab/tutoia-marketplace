const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');
const path = require('node:path');

const prisma = new PrismaClient();
const dbPath = path.join(__dirname, 'prisma', 'dev.db');

async function main() {
    console.log('--- STARTING RECOVERY FROM SQLite TO PG ---');
    const database = new DatabaseSync(dbPath);

    try {
        // 1. RECOVER USERS
        console.log('Recovering users...');
        const users = database.prepare('SELECT * FROM users').all();
        for (const u of users) {
             await prisma.user.upsert({
                 where: { email: u.email },
                 update: {
                     name: u.name,
                     password_hash: u.password_hash,
                     phone: u.phone,
                     city: u.city,
                     role: u.role,
                     active: u.active === 1
                 },
                 create: {
                     id: u.id,
                     name: u.name,
                     email: u.email,
                     password_hash: u.password_hash,
                     phone: u.phone,
                     city: u.city,
                     role: u.role,
                     active: u.active === 1,
                     created_at: new Date(u.created_at)
                 }
             });
        }
        console.log(`- ${users.length} users processed.`);

        // 2. RECOVER CATEGORIES
        console.log('Recovering categories...');
        const categories = database.prepare('SELECT * FROM categories').all();
        for (const c of categories) {
            await prisma.category.upsert({
                where: { id: c.id },
                update: { name: c.name, icon: c.icon },
                create: { id: c.id, name: c.name, icon: c.icon }
            });
        }
        console.log(`- ${categories.length} categories processed.`);

        // 3. RECOVER BANNERS
        console.log('Recovering banners...');
        const banners = database.prepare('SELECT * FROM banners').all();
        for (const b of banners) {
            await prisma.banner.upsert({
                where: { id: b.id },
                update: {
                    title: b.title,
                    image: b.image,
                    link: b.link,
                    position: b.position,
                    active: b.active === 1
                },
                create: {
                    id: b.id,
                    title: b.title,
                    image: b.image,
                    link: b.link,
                    position: b.position,
                    active: b.active === 1,
                    user_id: b.user_id,
                    created_at: new Date(b.created_at)
                }
            });
        }
        console.log(`- ${banners.length} banners processed.`);

    } catch (err) {
        console.error('RECOVERY ERROR:', err);
    } finally {
        await prisma.$disconnect();
        console.log('--- RECOVERY COMPLETED ---');
    }
}

main();
