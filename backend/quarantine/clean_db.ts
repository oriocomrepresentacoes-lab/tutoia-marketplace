import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    // Use Session port 5432 locally for heavy operations
    datasources: { db: { url: "postgresql://postgres.asaesarragbfpjetznpl:A%2BfTzBSqny65ZcL@aws-1-us-east-2.pooler.supabase.com:5432/postgres?pgbouncer=true" } }
});

async function cleanDatabase() {
    console.log('--- STARTING SURGICAL DATABASE CLEANUP ---');
    try {
        // 1. Get all ADMIN users
        const adminUsers = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, name: true, email: true }
        });

        const adminIds = adminUsers.map(a => a.id);
        
        console.log(`Found ${adminUsers.length} ADMIN users. They will be PRESERVED:`);
        adminUsers.forEach(a => console.log(`- ${a.name} (${a.email})`));

        if (adminIds.length === 0) {
            console.log('WARNING: No admin users found. The script will wipe EVERYTHING if you proceed. Exiting for safety.');
            return;
        }

        // 2. Clear Push Subscriptions (orphan or non-admin)
        const pushResult = await prisma.pushSubscription.deleteMany({
            where: {
                OR: [
                    { user_id: null },
                    { user_id: { notIn: adminIds } }
                ]
            }
        });
        console.log(`Deleted ${pushResult.count} Push Subscriptions.`);

        // 3. Clear all Ads (this cascades and deletes Messages)
        // Wait, did the user want to keep any ads? "O resto pode limpar tudo."
        // We delete all ads.
        const adsResult = await prisma.ad.deleteMany({});
        console.log(`Deleted ${adsResult.count} Ads (Messages deleted via cascade).`);

        // 4. Clear Banners not created by Admins
        const bannersResult = await prisma.banner.deleteMany({
            where: {
                OR: [
                    { user_id: null },
                    { user_id: { notIn: adminIds } }
                ]
            }
        });
        console.log(`Deleted ${bannersResult.count} Banners.`);

        // 5. Clear Transactions not from Admins
        const txResult = await prisma.transaction.deleteMany({
            where: {
                user_id: { notIn: adminIds }
            }
        });
        console.log(`Deleted ${txResult.count} Transactions.`);

        // 6. Delete all non-admin users
        const usersResult = await prisma.user.deleteMany({
            where: {
                role: { not: 'ADMIN' }
            }
        });
        console.log(`Deleted ${usersResult.count} Standard Users.`);

        console.log('--- DATABASE CLEANUP COMPLETED SUCCESSFULLY ---');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
